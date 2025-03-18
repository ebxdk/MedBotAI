#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
AI-Powered Flashcard Generator
- Processes PDF course materials
- Uses FAISS for semantic search
- Generates AI-powered flashcards
"""

from flask import Flask, request, jsonify, render_template, Blueprint, session
from flask_cors import CORS
from dotenv import load_dotenv
import openai
import os
import faiss
import numpy as np
import fitz  # PyMuPDF
import json
import logging
import tiktoken
from pathlib import Path
from openai import OpenAI

# Initialize logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(
    __name__,
    template_folder=os.path.join(os.path.dirname(__file__), 'templates'),
    static_folder=os.path.join(os.path.dirname(__file__), 'static')
)
CORS(app)

# Configure OpenAI
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
if not os.getenv("OPENAI_API_KEY"):
    raise ValueError("⚠️ ERROR: OPENAI_API_KEY not set in environment")

# Global variables for FAISS index and course chunks
faiss_index = None
course_chunks = []

# Create the blueprint
flashcard_routes = Blueprint('flashcard', __name__)

def extract_text_from_pdf(pdf_path):
    """Extracts and cleans text from a PDF file."""
    text_data = []
    try:
        with fitz.open(pdf_path) as doc:
            for page in doc:
                text = page.get_text("text").strip()
                if len(text) > 50:  # Only keep substantial chunks
                    text_data.append(text)
        return "\n".join(text_data)
    except Exception as e:
        logger.error(f"Error extracting text from PDF {pdf_path}: {str(e)}")
        raise

def chunk_text(text, max_tokens=300):
    """Splits text into chunks while preserving meaning."""
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

def process_pdf_for_rag(pdf_path, university, course):
    """Processes a PDF and returns structured text chunks."""
    try:
        raw_text = extract_text_from_pdf(pdf_path)
        chunks = chunk_text(raw_text)
        return [
            {
                "university": university,
                "course": course,
                "chunk_id": i,
                "text": chunk
            } for i, chunk in enumerate(chunks)
        ]
    except Exception as e:
        logger.error(f"Error processing PDF for RAG: {str(e)}")
        raise

def generate_embedding(text):
    """Generates an embedding for text using OpenAI's API."""
    try:
        response = client.embeddings.create(
            input=text,
            model="text-embedding-ada-002"
        )
        return response.data[0].embedding
    except Exception as e:
        logger.error(f"Error generating embedding: {str(e)}")
        # Return a zero vector as fallback (dimensionality of text-embedding-ada-002 is 1536)
        return [0.0] * 1536

def store_embeddings_faiss(data):
    """Stores embeddings in FAISS index for fast retrieval."""
    try:
        d = len(data[0]["embedding"])
        index = faiss.IndexFlatL2(d)
        embeddings = np.array([chunk["embedding"] for chunk in data]).astype("float32")
        index.add(embeddings)
        return index
    except Exception as e:
        logger.error(f"Error storing embeddings in FAISS: {str(e)}")
        raise

def search_relevant_chunks(query, top_k=3):
    """Finds most relevant course chunks using FAISS similarity search."""
    try:
        query_embedding = np.array([generate_embedding(query)]).astype("float32")
        _, indices = faiss_index.search(query_embedding, top_k)
        return [course_chunks[i] for i in indices[0]]
    except Exception as e:
        logger.error(f"Error searching relevant chunks: {str(e)}")
        raise

def generate_flashcards_with_context(context, num_cards=10, difficulty='intermediate'):
    """Generates AI-powered flashcards using retrieved course content."""
    try:
        prompt = f"""
        You are an expert flashcard creator to help undergraduate medical students study for their courses and ace their grades.
        
        Below is some course material extracted from a textbook:
        
        {context}
        
        Based off of the academic material and content from {context}, generate {num_cards} high-quality {difficulty}-level flashcards in JSON format.
        Each flashcard should:
        
        1. Focus on a key concept, definition, or relationship from the material
        2. Have a "front" field for the question/prompt
        3. Have a "back" field for the answer/explanation
        4. Be directly relevant to the provided context (don't make up information)
        5. Match the {difficulty} difficulty level in terms of complexity and detail
        6. Progress from simpler to more complex concepts
        
        Return ONLY a JSON array of flashcard objects with no additional text or explanation.
        Each object should have exactly two fields: "front" and "back".
        """

        logger.info("Sending request to OpenAI for flashcard generation")
        
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are an expert educational content creator."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=2000
        )
        
        flashcards = json.loads(response.choices[0].message.content)
        logger.info(f"Successfully generated {len(flashcards)} flashcards")
        return flashcards
    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error: {str(e)}, Content: {response.choices[0].message.content[:100]}...")
        raise ValueError(f"Failed to parse flashcards from AI response: {str(e)}")
    except Exception as e:
        logger.error(f"Error generating flashcards: {str(e)}")
        raise

# Initialize course materials on startup
def initialize_course_materials():
    """Initialize course materials and FAISS index."""
    global course_chunks, faiss_index
    try:
        # Get the coursematerial directory
        coursematerial_dir = os.path.join(os.path.dirname(__file__), "coursematerial")
        logger.info(f"Scanning directory: {coursematerial_dir}")
        
        # Initialize empty list for all chunks
        course_chunks = []
        
        # Get all PDF files from the directory
        pdf_files = [f for f in os.listdir(coursematerial_dir) if f.lower().endswith('.pdf')]
        
        if not pdf_files:
            logger.warning("No PDF files found in coursematerial directory")
            return
            
        logger.info(f"Found {len(pdf_files)} PDF files to process")
        
        # Process each PDF file
        for pdf_file in pdf_files:
            pdf_path = os.path.join(coursematerial_dir, pdf_file)
            logger.info(f"Processing PDF: {pdf_file}")
            
            # Extract course info from filename (you might want to adjust this logic)
            course_name = os.path.splitext(pdf_file)[0]
            
            # Process the PDF and add chunks to our collection
            file_chunks = process_pdf_for_rag(pdf_path, "Computer Science", course_name)
            course_chunks.extend(file_chunks)
            logger.info(f"Added {len(file_chunks)} chunks from {pdf_file}")
        
        logger.info(f"Total chunks processed: {len(course_chunks)}")
        
        # Generate embeddings for all chunks
        logger.info("Generating embeddings for chunks...")
        for chunk in course_chunks:
            chunk["embedding"] = generate_embedding(chunk["text"])
        
        # Store in FAISS
        logger.info("Storing embeddings in FAISS index...")
        faiss_index = store_embeddings_faiss(course_chunks)
        logger.info("Course materials initialized successfully")
        
    except Exception as e:
        logger.error(f"Error initializing course materials: {str(e)}")
        raise

# Routes
@flashcard_routes.route('/')
def index():
    """Render the flashcards page."""
    return render_template('flashcards.html')

@flashcard_routes.route('/generate-flashcards', methods=['POST'])
def generate_flashcards():
    """Generate flashcards based on user input."""
    try:
        data = request.json
        university = data.get('university', '').strip()
        course = data.get('course', '').strip()
        topic = data.get('topic', '').strip()
        num_cards = int(data.get('num_cards', 10))
        difficulty = data.get('difficulty', 'intermediate')

        if not all([university, course, topic]):
            return jsonify({"error": "All fields are required"}), 400

        # Search for relevant chunks
        logger.info(f"Searching for relevant chunks about: {topic}")
        relevant_chunks = search_relevant_chunks(topic)
        
        if not relevant_chunks:
            return jsonify({"error": "No relevant content found for this topic"}), 404
            
        # Extract and format context
        context = "\n\n".join([chunk["text"] for chunk in relevant_chunks])
        
        # Generate flashcards with specified parameters
        logger.info(f"Generating {num_cards} {difficulty} flashcards from context")
        flashcards = generate_flashcards_with_context(context, num_cards, difficulty)
        
        # Store context in session for regeneration
        if 'flashcard_contexts' not in session:
            session['flashcard_contexts'] = {}
        session['flashcard_contexts'][topic] = {
            'context': context,
            'num_cards': num_cards,
            'difficulty': difficulty
        }
        
        return jsonify({
            "flashcards": flashcards,
            "message": "Flashcards generated successfully"
        })

    except Exception as e:
        logger.error(f"Error in generate_flashcards endpoint: {str(e)}")
        return jsonify({"error": str(e)}), 500

@flashcard_routes.route('/regenerate-flashcards', methods=['POST'])
def regenerate_flashcards():
    """Regenerate flashcards using the same parameters."""
    try:
        data = request.json
        topic = data.get('topic', '').strip()
        num_cards = int(data.get('num_cards', 10))
        difficulty = data.get('difficulty', 'intermediate')
        
        # Get stored context for the topic
        if 'flashcard_contexts' not in session or topic not in session['flashcard_contexts']:
            # If no stored context, generate new flashcards
            return generate_flashcards()
            
        stored_data = session['flashcard_contexts'][topic]
        context = stored_data['context']
        
        logger.info(f"Regenerating {num_cards} {difficulty} flashcards")
        flashcards = generate_flashcards_with_context(context, num_cards, difficulty)
        
        return jsonify({
            "flashcards": flashcards,
            "message": "Flashcards regenerated successfully"
        })

    except Exception as e:
        logger.error(f"Error in regenerate_flashcards endpoint: {str(e)}")
        return jsonify({"error": str(e)}), 500

@flashcard_routes.route('/speak', methods=['POST'])
def speak():
    """Convert chatbot text response to speech with user-selected voice and speed."""
    try:
        data = request.json
        text = data.get('text')
        voice = data.get('voice', 'alloy')
        speed = float(data.get('speed', 1.0))

        if not text:
            return jsonify({"error": "No text provided"}), 400
        if voice not in ["alloy", "echo", "fable", "onyx", "nova", "shimmer"]:
            return jsonify({"error": "Invalid voice selected"}), 400
        if not (0.25 <= speed <= 4.0):
            return jsonify({"error": "Invalid speed value"}), 400

        speech_file_path = os.path.join(static_dir, "speech.mp3")
        os.makedirs(os.path.dirname(speech_file_path), exist_ok=True)

        # Using new OpenAI API format
        response = client.audio.speech.create(
            model="tts-1-hd",
            voice=voice,
            input=text,
            speed=speed
        )

        with open(speech_file_path, 'wb') as f:
            f.write(response.content)

        return jsonify({"audio_url": "/static/speech.mp3"}), 200

    except Exception as e:
        logger.error(f"Error in /speak endpoint: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Initialize course materials before starting server
    initialize_course_materials()
    
    # Start server
    # Use Replit's default port 3000
    port = int(os.environ.get('PORT', 3000))
    logger.info(f"Starting server on port {port}")
    try:
        app.run(
            host='0.0.0.0',
            port=port,
            debug=True
        )
    except Exception as e:
        logger.error(f"Failed to start server: {str(e)}")
        raise
