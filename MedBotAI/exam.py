import os
import logging
import json
import numpy as np
import fitz  # PyMuPDF
import tiktoken
import re
import faiss
from rank_bm25 import BM25Okapi
from flask import Flask, request, jsonify, render_template, Blueprint
from flask_cors import CORS
import openai
from openai import OpenAI
import glob

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(
    __name__,
    template_folder=os.path.join(os.path.dirname(__file__), 'templates'),
    static_folder=os.path.join(os.path.dirname(__file__), 'static')
)
CORS(app)

# Create the blueprint
exam_routes = Blueprint('exam', __name__)

# Configure OpenAI
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
if not os.getenv("OPENAI_API_KEY"):
    raise ValueError("⚠️ ERROR: OPENAI_API_KEY not set in environment")

# -------------------------------------------------
# 📌 Global Variables & Filenames
# -------------------------------------------------
feedback_history = []   # Stores user feedback
improvement_history = []  # Stores GPT-generated improvements
last_generated_exam = ""  # Stores the last exam for evaluation
FEEDBACK_FILE = os.path.join(os.path.dirname(__file__), "feedback_history.json")
STUDENT_DATA_FILE = os.path.join(os.path.dirname(__file__), "student_data.json")
student_profiles = {}

# Global variables for FAISS indexes and chunks
exam_index = None
practice_exams = []
course_index = None
course_chunks = []
bm25 = None

# -------------------------------------------------
# 📌 Feedback / Student Data Persistence
# -------------------------------------------------
def save_feedback():
    """Saves feedback and improvement history to a JSON file."""
    data = {
        "feedback_history": feedback_history,
        "improvement_history": improvement_history
    }
    with open(FEEDBACK_FILE, "w") as f:
        json.dump(data, f)

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
    with open(STUDENT_DATA_FILE, "w") as f:
        json.dump(student_profiles, f)

def track_student_progress(student_id, feedback):
    """
    Logs feedback under a specific student's history.
    Currently unused in the UI, but available if you want
    to incorporate student-specific tracking.
    """
    if student_id not in student_profiles:
        student_profiles[student_id] = {"feedback": [], "difficulty_preference": "Medium"}

    student_profiles[student_id]["feedback"].append(feedback)

    # 🔥 Adjust difficulty based on feedback
    if "too easy" in feedback.lower():
        student_profiles[student_id]["difficulty_preference"] = "Hard"
    elif "too hard" in feedback.lower():
        student_profiles[student_id]["difficulty_preference"] = "Easy"

    save_student_profiles()

def get_student_difficulty(student_id):
    """Retrieves the preferred difficulty level for a student."""
    if student_id in student_profiles:
        return student_profiles[student_id]["difficulty_preference"]
    return "Medium"  # default if no data available

# -------------------------------------------------
# 📌 Function: Extract Text from PDF (No OCR)
# -------------------------------------------------
def extract_text_from_pdf(pdf_path):
    """Extracts text from PDF without OCR."""
    text_data = []
    try:
        with fitz.open(pdf_path) as doc:
            for page in doc:
                text = page.get_text("text").strip()
                # Only add if the page isn't basically empty
                if len(text) > 50:
                    text_data.append(text)
        return "\n".join(text_data)
    except Exception as e:
        logger.error(f"Error extracting text from PDF {pdf_path}: {str(e)}")
        return ""

# -------------------------------------------------
# 📌 Function: Sentence-Aware (Token-Aware) Chunking
# -------------------------------------------------
def chunk_text(text, max_tokens=500):
    """
    Splits text into chunks, ensuring each chunk is <= max_tokens
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

# -------------------------------------------------
# 📌 Function: Generate OpenAI Embeddings with Caching
# -------------------------------------------------
embedding_cache = {}
def generate_embedding(text):
    """Generates embeddings for text with caching."""
    if text in embedding_cache:
        return embedding_cache[text]
    try:
        response = client.embeddings.create(input=[text], model="text-embedding-ada-002")
        embedding = response.data[0].embedding
        embedding_cache[text] = embedding
        return embedding
    except Exception as e:
        logger.error(f"Error generating embedding: {str(e)}")
        # Return a zero vector as fallback
        return [0.0] * 1536

# -------------------------------------------------
# 📌 Function: Store Practice Exams in a Single FAISS Index
# -------------------------------------------------
def store_exams_faiss(pdf_paths):
    """
    Returns:
      exam_index: faiss.IndexFlatL2
      exam_chunks: list of dicts, each dict has:
         {
           "file_name": str,
           "chunk_text": str,
           "full_text": str  # entire PDF if needed,
         }
    """
    d = 1536  # Dimension for text-embedding-ada-002
    index = faiss.IndexFlatL2(d)
    exam_chunks = []

    # Collect all chunks first
    all_embeddings = []
    for pdf_path in pdf_paths:
        pdf_text = extract_text_from_pdf(pdf_path)
        if not pdf_text:
            logger.warning(f"No text extracted from {pdf_path}")
            continue
            
        chunks = chunk_text(pdf_text)
        for chunk in chunks:
            exam_chunks.append({
                "file_name": os.path.basename(pdf_path),
                "chunk_text": chunk,
                "full_text": pdf_text
            })

    # Compute embeddings for each chunk
    for chunk_data in exam_chunks:
        emb = generate_embedding(chunk_data["chunk_text"])
        all_embeddings.append(emb)

    # Add to FAISS if we have embeddings
    if all_embeddings:
        index.add(np.array(all_embeddings).astype("float32"))
    
    return index, exam_chunks

# -------------------------------------------------
# 📌 Function: Store Course Material in FAISS + BM25
# -------------------------------------------------
def store_course_material_faiss(pdf_path):
    """Stores course material in FAISS and BM25 indexes."""
    d = 1536
    index = faiss.IndexFlatL2(d)

    pdf_text = extract_text_from_pdf(pdf_path)
    if not pdf_text:
        logger.warning(f"No text extracted from {pdf_path}")
        # Return empty indexes with a safe BM25 initialization
        return index, [], BM25Okapi([["placeholder"]])
        
    chunks = chunk_text(pdf_text)
    chunk_embeddings = [generate_embedding(ch) for ch in chunks]
    
    if chunk_embeddings:
        index.add(np.array(chunk_embeddings).astype("float32"))

    # Build BM25 from tokenized chunks
    tokenized_corpus = [ch.split() for ch in chunks]
    if not tokenized_corpus:
        # Ensure we have at least one token to prevent division by zero
        tokenized_corpus = [["placeholder"]]
    bm25 = BM25Okapi(tokenized_corpus)

    return index, chunks, bm25

# -------------------------------------------------
# 📌 Function: Retrieve Practice Exam
# -------------------------------------------------
def retrieve_practice_exam(query, exam_index, exam_chunks, top_k=1):
    """
    Returns the full_text from the chunk that best matches `query`.
    """
    if not exam_chunks:
        logger.warning("No exam chunks available for retrieval")
        return "No past exam reference available. The exam will be generated based on general knowledge."
        
    query_emb = np.array([generate_embedding(query)]).astype("float32")
    
    try:
        distances, indices = exam_index.search(query_emb, top_k)
    except Exception as e:
        logger.error(f"Error searching exam index: {str(e)}")
        return exam_chunks[0]["full_text"] if exam_chunks else "Error retrieving past exam. The exam will be generated based on general knowledge."

    # If nothing found, default to the first chunk's full text
    if len(indices[0]) == 0:
        return exam_chunks[0]["full_text"] if exam_chunks else "No relevant past exam found. The exam will be generated based on general knowledge."

    # Return the full text of the top chunk
    top_chunk = exam_chunks[indices[0][0]]
    return top_chunk["full_text"]

# -------------------------------------------------
# 📌 Function: Retrieve Course Material (Hybrid: FAISS + BM25)
# -------------------------------------------------
def retrieve_course_material(query, course_index, course_chunks, bm25, top_k=3):
    """Retrieves relevant course material using hybrid search."""
    if not course_chunks:
        logger.warning("No course chunks available for retrieval")
        return ["No course material available. The exam will be generated based on general knowledge."]
        
    query_emb = np.array([generate_embedding(query)]).astype("float32")
    
    try:
        distances, indices = course_index.search(query_emb, top_k)
    except Exception as e:
        logger.error(f"Error searching course index: {str(e)}")
        # Fallback to BM25
        try:
            top_bm25 = bm25.get_top_n(query.split(), course_chunks, n=top_k)
            return top_bm25 if top_bm25 else ["No relevant course material found. Using general knowledge."]
        except Exception as e2:
            logger.error(f"Error with BM25 fallback: {str(e2)}")
            return ["Error retrieving course material. The exam will be generated based on general knowledge."]

    # If FAISS yields no results
    if len(indices[0]) == 0:
        # fallback to BM25
        try:
            top_bm25 = bm25.get_top_n(query.split(), course_chunks, n=top_k)
            return top_bm25 if top_bm25 else ["No relevant course material found. Using general knowledge."]
        except Exception as e:
            logger.error(f"Error with BM25 fallback: {str(e)}")
            return ["Error retrieving course material. The exam will be generated based on general knowledge."]

    # Return top K chunk texts
    results = [course_chunks[i] for i in indices[0]]
    return results

# -------------------------------------------------
# 📌 Function: Generate AI-Powered Practice Exam
# -------------------------------------------------
def generate_practice_exam(course, difficulty):
    """
    Generates an advanced exam using GPT,
    closely matching the style of past exams and course material.
    """
    global last_generated_exam

    # Retrieve practice exam reference & relevant course chunks
    exam_text = retrieve_practice_exam(course, exam_index, practice_exams)
    course_material = retrieve_course_material(course, course_index, course_chunks, bm25, top_k=3)

    # Combine improvements from negative feedback
    combined_improvements = "\n".join(improvement_history)

    # Build the context from relevant text
    context = (
        f"--- Past Exam Reference ---\n{exam_text}\n\n"
        f"--- Relevant Course Chunks ---\n" + "\n\n".join(course_material)
    )

    # Advanced Prompt Engineering
    system_prompt = """\
You are a highly specialized AI in creating university-level computer science exams.
Your primary objective:
1. Closely match the tone, style, and structure of the provided past exams. produce the same number of questions, if not, more questions than whats included in the practice exams.
2. Incorporate relevant course content from the retrieved chunks to ensure coverage of essential topics.
3. Make the resulting exam as comprehensive and realistic as possible, so that a diligent student can ACE their real exam.
4. Use rigorous academic standards, but remain accessible and properly structured.
5. Keep your chain-of-thought internal. Output only the final refined exam text.

Formatting Requirements:
- Use headings for different sections (e.g., Section A: Multiple Choice, Section B: Short Answer).
- Provide clear instructions and question numbering.
- For coding problems (Java), use valid fenced code blocks: ```java ... ```
- If needed, illustrate data structures or algorithms in text or ASCII.
- Keep explanations minimal in the final output to mirror real exam conditions unless a solution or answer key is explicitly requested (not included here by default).
"""

    # User prompt: incorporate improvements, difficulty, and context
    user_prompt = f"""\
You are tasked with generating a **{difficulty}**-level practice exam for the course: **{course}**.

**Incorporate the following improvement suggestions (if any)**:
{combined_improvements}

**Key Instructions**:
1. The exam should reflect the style and difficulty of the past exam provided in 'Past Exam Reference.'
2. Use relevant details from 'Relevant Course Chunks' to ensure proper coverage of the course material.
3. Include Multiple Choice, Short Answer, and Coding/Problem-Solving questions (with Java code blocks if appropriate).
4. Tailor the difficulty to {difficulty}:
   - For 'Easy', ensure clarity and fundamental coverage;
   - For 'Hard', push complexity in problem-solving and advanced concepts.
5. The ultimate goal: help the student fully prepare to ACE their exam.

Here is the context to inspire your practice exam:
{context}

Now, please create a single, cohesive practice exam below (without revealing your internal reasoning).
"""

    try:
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.7
        )
        
        exam_content = response.choices[0].message.content.strip()
        last_generated_exam = exam_content
        return exam_content
    except Exception as e:
        logger.error(f"Error generating exam: {str(e)}")
        return f"Error generating exam: {str(e)}"

# -------------------------------------------------
# 📌 AI Self-Evaluate Function
# -------------------------------------------------
def ai_self_evaluate(last_exam):
    """
    Takes the last exam text and returns
    AI-generated improvements.
    """
    improvement_prompt = f"""
    The user marked the last exam as 'bad'.
    Here is the exam text:
    -------------------
    {last_exam}
    -------------------
    Please provide 3 specific improvements to make future exams better:
    - Focus on question variety
    - Level of detail in solutions
    - Formatting or clarity changes

    Format your response as plain text bullet points.
    """

    try:
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are an AI specialized in creating and refining university exams."},
                {"role": "user", "content": improvement_prompt}
            ],
            temperature=0.7
        )
        evaluation = response.choices[0].message.content.strip()
        return evaluation
    except Exception as e:
        logger.error(f"Failed to generate improvements: {e}")
        return "Failed to get improvements."

# -------------------------------------------------
# 📌 Initialize FAISS Indexes
# -------------------------------------------------
def initialize_exam_materials():
    """Initialize exam materials and create necessary directories."""
    try:
        # Create directories if they don't exist
        os.makedirs(os.path.join(os.path.dirname(__file__), "static"), exist_ok=True)
        os.makedirs(os.path.join(os.path.dirname(__file__), "templates"), exist_ok=True)
        os.makedirs(os.path.join(os.path.dirname(os.path.dirname(__file__)), "exams"), exist_ok=True)
        
        # Initialize FAISS indexes and other components
        global exam_index, practice_exams, course_index, course_chunks, bm25
        
        # Path to exams directory
        exams_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "exams")
        
        # Find all PDF files in the directory
        pdf_files = glob.glob(os.path.join(exams_dir, "*.pdf"))
        
        if not pdf_files:
            logger.warning(f"No PDF files found in {exams_dir}")
            # Initialize empty indexes
            exam_index = faiss.IndexFlatL2(1536)
            practice_exams = []
            course_index = faiss.IndexFlatL2(1536)
            course_chunks = []
            
            # Create a safe empty BM25 index with at least one token
            # This prevents division by zero in the BM25Okapi initialization
            bm25 = BM25Okapi([["placeholder"]])
            
            # If no PDFs found, generate a sample exam without context
            logger.info("No PDFs found. Will generate exams without context.")
            return
        
        # Use the first PDF as the exam reference and the rest as course material
        exam_pdf = pdf_files[0]
        logger.info(f"Using {exam_pdf} as exam reference")
        
        # Store exam reference
        exam_index, practice_exams = store_exams_faiss([exam_pdf])
        
        # If there are more PDFs, use the second one as course material
        if len(pdf_files) > 1:
            course_pdf = pdf_files[1]
            logger.info(f"Using {course_pdf} as course material")
            course_index, course_chunks, bm25 = store_course_material_faiss(course_pdf)
        else:
            # If only one PDF, use it for both exam and course material
            logger.info(f"Using {exam_pdf} as both exam reference and course material")
            course_index, course_chunks, bm25 = store_course_material_faiss(exam_pdf)
        
        logger.info("Exam materials initialized successfully")
    except Exception as e:
        logger.error(f"Error initializing exam materials: {str(e)}")
        raise

# -------------------------------------------------
# 📌 Flask Routes
# -------------------------------------------------
@exam_routes.route('/')
def index():
    """Render the exam generator page."""
    return render_template('exam.html')

@exam_routes.route('/generate-exam', methods=['POST'])
def generate_exam():
    """Generate a practice exam based on user input."""
    try:
        data = request.json
        university = data.get('university', '')
        course = data.get('course', '')
        difficulty = data.get('difficulty', 'Medium')
        
        if not course:
            return jsonify({"error": "Course name is required"}), 400
            
        # Generate the exam
        exam_text = generate_practice_exam(course, difficulty)
        
        return jsonify({
            "exam": exam_text,
            "university": university,
            "course": course,
            "difficulty": difficulty
        })
    except Exception as e:
        logger.error(f"Error in generate_exam: {str(e)}")
        return jsonify({"error": str(e)}), 500

@exam_routes.route('/feedback', methods=['POST'])
def submit_feedback():
    """Submit feedback for the last generated exam."""
    try:
        data = request.json
        feedback_type = data.get('type', '')
        student_id = data.get('student_id', 'anonymous')
        
        if feedback_type == 'good':
            feedback_history.append("✅ Exam was well received.")
            save_feedback()
            return jsonify({"message": "Positive feedback recorded"})
        elif feedback_type == 'bad':
            # Call AI self-evaluation
            improvement_notes = ai_self_evaluate(last_generated_exam)
            
            # Store improvement feedback and save
            improvement_history.append(improvement_notes)
            save_feedback()
            
            # Track student progress if student_id provided
            if student_id != 'anonymous':
                track_student_progress(student_id, "Negative feedback")
                
            return jsonify({
                "message": "Negative feedback recorded",
                "improvements": improvement_notes
            })
        else:
            return jsonify({"error": "Invalid feedback type"}), 400
    except Exception as e:
        logger.error(f"Error in submit_feedback: {str(e)}")
        return jsonify({"error": str(e)}), 500

# -------------------------------------------------
# 📌 Initialize on startup
# -------------------------------------------------
# Load feedback and student profiles
load_feedback()
load_student_profiles()

# Initialize exam materials
initialize_exam_materials()

# Run the app if executed directly
if __name__ == '__main__':
    port = int(os.environ.get("PORT", 3000))
    app.run(host='0.0.0.0', port=port, debug=True)
