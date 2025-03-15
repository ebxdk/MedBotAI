import os
import logging
import json
import datetime
import io
from pathlib import Path
import time

import requests
import numpy as np
import faiss
import fitz  # PyMuPDF
import tiktoken
import pytesseract
from PIL import Image
from rank_bm25 import BM25Okapi

from flask import Flask, request, jsonify, render_template, Blueprint, Response
from flask_cors import CORS
from dotenv import load_dotenv
from werkzeug.utils import secure_filename

# -------------------------------------------------
# Setup Logging
# -------------------------------------------------
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# -------------------------------------------------
# Flask Blueprint
# -------------------------------------------------
exam_routes = Blueprint('exam_routes', __name__)

# -------------------------------------------------
# Load Environment
# -------------------------------------------------
load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# -------------------------------------------------
# Global Variables & Filenames
# -------------------------------------------------
feedback_history = []          # Stores user feedback
improvement_history = []       # Stores GPT-generated improvements
last_generated_exam = ""       # Stores the last exam (text) for evaluation
FEEDBACK_FILE = "feedback_history.json"

STUDENT_DATA_FILE = "student_data.json"
student_profiles = {}

# The FAISS index and list of exam chunks from your PDFs
exam_index = None
practice_exams = []

# Where your exam PDFs are located
EXAMS_FOLDER = "exams"

# -------------------------------------------------
# File Upload Configuration (Optional)
# -------------------------------------------------
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'txt', 'pdf', 'doc', 'docx'}
Path(UPLOAD_FOLDER).mkdir(parents=True, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# -------------------------------------------------
# Feedback and Student Data Persistence
# -------------------------------------------------
def save_feedback():
    """Saves feedback and improvement history to a JSON file."""
    data = {
        "feedback_history": feedback_history,
        "improvement_history": improvement_history
    }
    try:
        with open(FEEDBACK_FILE, "w") as f:
            json.dump(data, f)
    except Exception as e:
        logger.error(f"Error saving feedback: {str(e)}")

def load_feedback():
    """Loads feedback and improvement history from a JSON file."""
    global feedback_history, improvement_history
    try:
        with open(FEEDBACK_FILE, "r") as f:
            data = json.load(f)
            feedback_history = data.get("feedback_history", [])
            improvement_history = data.get("improvement_history", [])
    except FileNotFoundError:
        feedback_history = []
        improvement_history = []

def load_student_profiles():
    """Loads student performance data from a JSON file."""
    global student_profiles
    try:
        with open(STUDENT_DATA_FILE, "r") as f:
            student_profiles = json.load(f)
    except FileNotFoundError:
        student_profiles = {}

def save_student_profiles():
    """Saves student performance data to a JSON file."""
    try:
        with open(STUDENT_DATA_FILE, "w") as f:
            json.dump(student_profiles, f)
    except Exception as e:
        logger.error(f"Error saving student profiles: {str(e)}")

def track_student_progress(student_id, feedback):
    """
    Logs feedback under a specific student's history and adjusts difficulty preference.
    """
    if student_id not in student_profiles:
        student_profiles[student_id] = {"feedback": [], "difficulty_preference": "Medium"}

    student_profiles[student_id]["feedback"].append(feedback)

    # Simple difficulty logic
    if "too easy" in feedback.lower():
        student_profiles[student_id]["difficulty_preference"] = "Hard"
    elif "too hard" in feedback.lower():
        student_profiles[student_id]["difficulty_preference"] = "Easy"

    save_student_profiles()

def get_student_difficulty(student_id):
    """Retrieves the preferred difficulty level for a student."""
    if student_id in student_profiles:
        return student_profiles[student_id].get("difficulty_preference", "Medium")
    return "Medium"

# -------------------------------------------------
# PDF Text Extraction (with OCR fallback)
# -------------------------------------------------
def extract_text_with_ocr(pdf_path):
    """
    Extracts text from a PDF using PyMuPDF. If a page is effectively empty,
    fallback to Tesseract OCR.
    """
    text_data = []
    try:
        with fitz.open(pdf_path) as doc:
            for page in doc:
                page_text = page.get_text("text").strip()
                if not page_text:
                    # fallback to OCR
                    pix = page.get_pixmap()
                    img = Image.open(io.BytesIO(pix.tobytes()))
                    page_text = pytesseract.image_to_string(img)
                if len(page_text) > 50:
                    text_data.append(page_text)
    except Exception as e:
        logger.error(f"Failed to read or OCR {pdf_path}: {str(e)}")
    return "\n".join(text_data)

# -------------------------------------------------
# Chunking & Direct Embeddings (via requests)
# -------------------------------------------------
embedding_cache = {}

def chunk_text(text, max_tokens=500):
    """
    Splits text into chunks, ensuring each chunk is <= max_tokens tokens,
    based on the tiktoken 'cl100k_base' tokenizer.
    """
    encoding = tiktoken.get_encoding("cl100k_base")
    words = text.split()
    chunks = []
    chunk = []
    token_count = 0

    for word in words:
        word_tokens = len(encoding.encode(word))
        if token_count + word_tokens > max_tokens:
            chunks.append(" ".join(chunk))
            chunk = []
            token_count = 0
        chunk.append(word)
        token_count += word_tokens

    if chunk:
        chunks.append(" ".join(chunk))

    return chunks

def call_openai_embedding(text):
    """
    Calls the /v1/embeddings endpoint via requests, bypassing openai.Embedding.
    """
    if text in embedding_cache:
        return embedding_cache[text]

    url = "https://api.openai.com/v1/embeddings"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {OPENAI_API_KEY}"
    }
    payload = {
        "input": text,
        "model": "text-embedding-ada-002"
    }

    try:
        resp = requests.post(url, headers=headers, json=payload, timeout=60)
        resp.raise_for_status()
        data = resp.json()
        emb = data["data"][0]["embedding"]
        embedding_cache[text] = emb
        return emb
    except Exception as e:
        logger.error(f"Failed to get embedding for text: {str(e)}")
        # Return a dummy vector if there's an error
        return [0.0]*1536

# -------------------------------------------------
# Build FAISS Index for Exam PDFs
# -------------------------------------------------
def store_exams_faiss(pdf_folder):
    """
    Extracts text from each PDF in pdf_folder, chunks it, calls embeddings,
    and stores them in a FAISS index. Returns the index and the chunk list.
    """
    import faiss
    d = 1536
    index = faiss.IndexFlatL2(d)
    exam_chunks = []

    pdf_files = [os.path.join(pdf_folder, f) for f in os.listdir(pdf_folder)
                 if f.lower().endswith(".pdf")]

    # If no PDF files are found, create a dummy chunk
    if not pdf_files:
        logger.warning("No PDF files found in exams folder. Using a default template.")
        dummy_text = """
        Medical Exam
        
        Question 1: What is the primary function of the mitochondria?
        A) Protein synthesis
        B) Cellular respiration
        C) DNA replication
        D) Cell division
        
        Answer: B
        Explanation: Mitochondria are known as the powerhouse of the cell and are responsible for cellular respiration, which produces ATP, the energy currency of the cell.
        
        Question 2: Which of the following is NOT a component of the limbic system?
        A) Amygdala
        B) Hippocampus
        C) Cerebellum
        D) Hypothalamus
        
        Answer: C
        Explanation: The cerebellum is not part of the limbic system. It is responsible for motor control and coordination.
        """
        exam_chunks.append({
            "file_name": "default_exam.pdf",
            "chunk_text": dummy_text,
            "full_text": dummy_text
        })
        
        # Compute embedding for the dummy chunk
        emb = call_openai_embedding(dummy_text)
        index.add(np.array([emb]).astype("float32"))
        return index, exam_chunks

    all_embeddings = []
    for pdf_path in pdf_files:
        pdf_text = extract_text_with_ocr(pdf_path)
        chunks = chunk_text(pdf_text)
        for ch in chunks:
            exam_chunks.append({
                "file_name": os.path.basename(pdf_path),
                "chunk_text": ch,
                "full_text": pdf_text
            })

    # Compute embeddings for each chunk
    for chunk_data in exam_chunks:
        emb = call_openai_embedding(chunk_data["chunk_text"])
        all_embeddings.append(emb)

    index.add(np.array(all_embeddings).astype("float32"))
    return index, exam_chunks

# -------------------------------------------------
# Retrieval
# -------------------------------------------------
def retrieve_practice_exam(query, exam_index, exam_chunks, top_k=1):
    """
    Searches the FAISS index for the chunk that best matches 'query',
    then returns the 'full_text' from that chunk as the reference exam text.
    """
    if exam_index is None or not exam_chunks:
        logger.warning("No exam index or chunks available. Using an empty string.")
        return ""

    try:
        query_emb = np.array([call_openai_embedding(query)]).astype("float32")
        distances, indices = exam_index.search(query_emb, top_k)

        if len(indices[0]) == 0:
            logger.warning("No matching chunks found. Using the first available chunk.")
            return exam_chunks[0]["full_text"] if exam_chunks else ""

        top_chunk = exam_chunks[indices[0][0]]
        return top_chunk["full_text"]
    except Exception as e:
        logger.error(f"Error during exam retrieval: {str(e)}")
        return ""

# -------------------------------------------------
# Chat Completion via requests (GPT-3.5-turbo)
# -------------------------------------------------
def call_openai_chat(messages, temperature=0.7, max_tokens=1500):
    """
    Directly calls the /v1/chat/completions endpoint using requests.
    """
    url = "https://api.openai.com/v1/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {OPENAI_API_KEY}"
    }
    payload = {
        "model": "gpt-3.5-turbo",
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens
    }

    try:
        resp = requests.post(url, headers=headers, json=payload, timeout=120)
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]
    except Exception as e:
        logger.error(f"Failed to get chat completion: {str(e)}")
        return "Error generating exam from Chat API."

# -------------------------------------------------
# Generate a New Exam (Mimicking Past Exams)
# -------------------------------------------------
def generate_practice_exam_realtime(course, exam_type, difficulty):
    """
    1) Retrieve a 'past exam reference' chunk by searching for 'course'.
    2) Construct a robust prompt that replicates the style, structure, and difficulty
       of that reference while introducing new but similarly challenging questions.
    3) Return the final exam text.
    """
    global last_generated_exam

    # Retrieve the chunk that best matches the 'course'
    exam_text = retrieve_practice_exam(course, exam_index, practice_exams)
    
    # If no exam text is retrieved or it's too short, use a default template
    if not exam_text or len(exam_text) < 100:
        logger.warning("No suitable exam reference found. Using a default template.")
        exam_text = """
        Medical Exam
        
        Question 1: What is the primary function of the mitochondria?
        A) Protein synthesis
        B) Cellular respiration
        C) DNA replication
        D) Cell division
        
        Answer: B
        Explanation: Mitochondria are known as the powerhouse of the cell and are responsible for cellular respiration, which produces ATP, the energy currency of the cell.
        
        Question 2: Which of the following is NOT a component of the limbic system?
        A) Amygdala
        B) Hippocampus
        C) Cerebellum
        D) Hypothalamus
        
        Answer: C
        Explanation: The cerebellum is not part of the limbic system. It is responsible for motor control and coordination.
        """

    # Combine improvements from negative feedback
    combined_improvements = "\n".join(improvement_history)

    # System instructions: replicate style/structure from reference exam
    system_prompt = f"""\
You are an advanced AI exam generator. 
Your goals:
1. Create multiple choice questions with exactly 4 options labeled as A), B), C), D)
2. Each question must start with "Question X:" where X is the question number
3. The exam type is {exam_type}, and difficulty is {difficulty}
4. Each question must have:
   - A clear question text
   - Four options labeled as A), B), C), D)
   - Each option on a new line
5. Format example:
   Question 1: What is X?
   A) First option
   B) Second option
   C) Third option
   D) Fourth option
6. Do NOT include answers or explanations
7. Do NOT reveal chain-of-thought; output only the final exam text
"""

    # User instructions: ensure advanced coverage, same complexity
    user_prompt = f"""\
TASK:
- Create a challenging exam for the course '{course}' at {difficulty} difficulty
- Each question must follow the exact format:
  Question X: [Question text]
  A) [Option text]
  B) [Option text]
  C) [Option text]
  D) [Option text]
- Ensure questions are challenging and test deep understanding
- Output only the final exam text with proper question numbering
"""

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]

    exam_output = call_openai_chat(messages, temperature=0.7, max_tokens=1500)
    last_generated_exam = exam_output
    return exam_output

# -------------------------------------------------
# AI Self-Evaluation for Bad Feedback
# -------------------------------------------------
def ai_self_evaluate(last_exam_text):
    system_prompt = "You are an AI specialized in refining university exams."
    user_prompt = f"""
The following exam was marked as unsatisfactory. Provide 3 improvements:
- question variety
- depth of challenge
- formatting or clarity
-------------------
{last_exam_text}
-------------------
"""
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]
    return call_openai_chat(messages, temperature=0.7, max_tokens=500)

# -------------------------------------------------
# Initialization
# -------------------------------------------------
def initialize_exam_materials():
    logger.info("Initializing exam materials (direct REST calls).")

    if not OPENAI_API_KEY:
        logger.error("OPENAI_API_KEY not set!")
        return False

    # Load feedback and student data
    load_feedback()
    load_student_profiles()

    # Build the FAISS index from exam PDFs
    global exam_index, practice_exams
    
    # Create the exams folder if it doesn't exist
    if not os.path.exists(EXAMS_FOLDER):
        logger.warning(f"Exam folder not found: {EXAMS_FOLDER}. Creating it.")
        os.makedirs(EXAMS_FOLDER, exist_ok=True)
    
    # Build the FAISS index
    exam_index, practice_exams = store_exams_faiss(EXAMS_FOLDER)
    logger.info(f"Exam index built with {len(practice_exams)} chunks.")

    logger.info("Initialization complete.")
    return True

# -------------------------------------------------
# Flask Routes
# -------------------------------------------------
@exam_routes.route('/')
def index():
    """Renders a page for the exam generator."""
    return render_template('exams.html')

@exam_routes.route('/generate-exam', methods=['POST'])
def generate_exam_route():
    try:
        data = request.json
        logger.info(f"Received request to generate exam: {data}")

        course = data.get("course", "").strip()
        exam_type = data.get("exam_type", "final").strip().lower()
        difficulty = data.get("difficulty", "medium").strip().lower()

        if not course:
            return jsonify({"error": "Course is required."}), 400

        def generate():
            messages = [
                {"role": "system", "content": f"""You are an advanced AI exam generator.
Your task is to create a {difficulty} difficulty {exam_type} exam for the course '{course}'.
Create a variety of question types that test different levels of understanding:
- Multiple choice questions for testing recall and basic understanding
- Short answer questions for testing explanation ability
- Problem-solving questions for testing application of knowledge
- Essay questions for testing deep understanding and analysis
- Case study questions for testing practical application

Format the exam clearly with proper numbering and spacing.
Generate thoughtful, challenging questions that require critical thinking."""},
                {"role": "user", "content": f"Create a {exam_type} exam for {course} at {difficulty} difficulty level with varied question types."}
            ]

            url = "https://api.openai.com/v1/chat/completions"
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {OPENAI_API_KEY}"
            }
            payload = {
                "model": "gpt-3.5-turbo",
                "messages": messages,
                "temperature": 0.7,
                "stream": True
            }

            response = requests.post(url, headers=headers, json=payload, stream=True)
            response.raise_for_status()

            for line in response.iter_lines():
                if line:
                    line = line.decode('utf-8')
                    if line.startswith('data: '):
                        if line == 'data: [DONE]':
                            yield 'data: [DONE]\n\n'
                            break
                        try:
                            json_data = json.loads(line[6:])
                            content = json_data['choices'][0]['delta'].get('content', '')
                            if content:
                                yield f'data: {json.dumps({"content": content})}\n\n'
                        except json.JSONDecodeError:
                            continue

        return Response(generate(), mimetype='text/event-stream')

    except Exception as e:
        logger.error(f"Error generating exam: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500

@exam_routes.route('/feedback', methods=['POST'])
def submit_feedback():
    """
    {
      "rating": "good" | "bad",
      "comments": "...",
      "student_id": "..."
    }
    """
    try:
        data = request.json
        rating = data.get('rating', '').lower()
        comments = data.get('comments', '')
        student_id = data.get('student_id', '')

        if rating not in ['good', 'bad']:
            return jsonify({"error": "Rating must be 'good' or 'bad'"}), 400

        feedback_entry = {
            "rating": rating,
            "comments": comments,
            "timestamp": datetime.datetime.now().isoformat()
        }
        feedback_history.append(feedback_entry)

        # Track student progress if needed
        if student_id:
            track_student_progress(student_id, f"Rating: {rating}, Comments: {comments}")

        # If rating is bad, generate improvements
        improvements = None
        if rating == 'bad' and last_generated_exam:
            improvements = ai_self_evaluate(last_generated_exam)
            if improvements:
                improvement_history.append(improvements)

        save_feedback()
        return jsonify({
            "success": True,
            "message": "Feedback submitted successfully",
            "improvements": improvements if improvements else None
        })
    except Exception as e:
        logger.error(f"Error submitting feedback: {str(e)}")
        return jsonify({"error": str(e)}), 500

# -------------------------------------------------
# App Factory
# -------------------------------------------------
def create_app():
    app = Flask(__name__, template_folder='templates', static_folder='static')
    CORS(app)
    app.register_blueprint(exam_routes)

    # Initialize exam materials
    success = initialize_exam_materials()
    if not success:
        logger.warning("Exam materials initialization failed or incomplete.")

    return app

if __name__ == "__main__":
    app = create_app()
    port = int(os.environ.get('PORT', 5000))
    logger.info(f"Starting server on port {port}")
    app.run(host="0.0.0.0", port=port, debug=True)
