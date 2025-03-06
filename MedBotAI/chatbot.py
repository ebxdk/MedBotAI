#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Simplified Medical Chatbot
- Direct interaction with GPT-4 for medical queries
- Text-to-Speech capability
- Clean streaming responses
- RAG pipeline for course material integration
- File upload for additional context
"""

from flask import Flask, request, jsonify, Response, render_template, Blueprint, url_for, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv
from openai import OpenAI
import os
import logging
from pathlib import Path
import json
import requests
import uuid
import werkzeug
from werkzeug.utils import secure_filename

# Import RAG pipeline
from rag import initialize_rag, get_rag_pipeline

# Initialize logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ------------------------------------------------------------------------------
# Load environment variables
# ------------------------------------------------------------------------------
load_dotenv()

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

# ------------------------------------------------------------------------------
# Flask setup
# ------------------------------------------------------------------------------

# Create Blueprint for chatbot routes
chatbot_routes = Blueprint('chatbot', __name__)

# ------------------------------------------------------------------------------
# File upload configuration
# ------------------------------------------------------------------------------
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'txt', 'pdf', 'doc', 'docx'}

# Create upload folder if it doesn't exist
Path(UPLOAD_FOLDER).mkdir(parents=True, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def initialize_chatbot():
    """Initialize the chatbot module"""
    logger.info("Initializing chatbot module...")
    
    # Ensure OpenAI API key is set
    if not os.getenv('OPENAI_API_KEY'):
        logger.warning("⚠️ WARNING: OPENAI_API_KEY not set in environment")
        return False
    
    # Initialize RAG pipeline
    if not initialize_rag():
        logger.error("Failed to initialize RAG pipeline")
        return False
    
    logger.info("✅ Chatbot module initialized successfully")
    return True

@chatbot_routes.route('/')
def index():
    return render_template('chatbot.html')

@chatbot_routes.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if file and allowed_file(file.filename):
        # Generate a unique filename
        original_filename = secure_filename(file.filename)
        file_extension = original_filename.rsplit('.', 1)[1].lower()
        unique_filename = f"{str(uuid.uuid4())}.{file_extension}"
        
        filepath = os.path.join(UPLOAD_FOLDER, unique_filename)
        file.save(filepath)
        
        try:
            # Process file with RAG pipeline
            rag_pipeline = get_rag_pipeline()
            if rag_pipeline:
                rag_pipeline.add_document(filepath)
            
            return jsonify({
                'message': 'File uploaded successfully',
                'filename': unique_filename
            }), 200
            
        except Exception as e:
            logger.error(f"Error processing file: {str(e)}")
            # Clean up the file if processing failed
            if os.path.exists(filepath):
                os.remove(filepath)
            return jsonify({'error': 'Error processing file'}), 500
    
    return jsonify({'error': 'Invalid file type'}), 400

@chatbot_routes.route('/uploads/<filename>')
def get_file(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

@chatbot_routes.route('/chat', methods=['POST'])
def chat():
    try:
        data = request.get_json()
        user_input = data.get('message', '')
        conversation_history = data.get('history', [])
        
        if not user_input:
            return jsonify({'error': 'No message provided'}), 400
        
        def generate_response():
            try:
                # Get relevant context from RAG pipeline
                rag_pipeline = get_rag_pipeline()
                context = ""
                if rag_pipeline:
                    context = rag_pipeline.get_relevant_context(user_input)
                
                # Prepare conversation messages
                messages = []
                
                # Add system message with context if available
                if context:
                    messages.append({
                        "role": "system",
                        "content": f"You are a medical AI assistant. Use the following context to help answer the question, but don't mention that you're using this context: {context}"
                    })
                else:
                    messages.append({
                        "role": "system",
                        "content": "You are a medical AI assistant. Provide accurate, helpful medical information while being clear about your limitations and encouraging users to consult healthcare professionals for specific medical advice."
                    })
                
                # Add conversation history
                for msg in conversation_history:
                    messages.append({
                        "role": "user" if msg['type'] == 'user' else "assistant",
                        "content": msg['content']
                    })
                
                # Add current user message
                messages.append({
                    "role": "user",
                    "content": user_input
                })
                
                # Get streaming response from OpenAI
                response = client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=messages,
                    stream=True,
                    temperature=0.7,
                    max_tokens=1000
                )
                
                # Stream the response
                for chunk in response:
                    if chunk.choices[0].delta.content is not None:
                        yield f"data: {json.dumps({'content': chunk.choices[0].delta.content})}\n\n"
                
            except Exception as e:
                logger.error(f"Error in generate_response: {str(e)}")
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
            
            finally:
                yield "data: [DONE]\n\n"
        
        return Response(generate_response(), mimetype='text/event-stream')
        
    except Exception as e:
        logger.error(f"Error in chat endpoint: {str(e)}")
        return jsonify({'error': str(e)}), 500

@chatbot_routes.route('/speak', methods=['POST'])
def speak():
    try:
        data = request.get_json()
        text = data.get('text', '')
        
        if not text:
            return jsonify({'error': 'No text provided'}), 400
        
        # Create speech using OpenAI's text-to-speech
        response = client.audio.speech.create(
            model="tts-1",
            voice="alloy",
            input=text
        )
        
        # Save the audio file with a unique filename
        filename = f"speech_{uuid.uuid4()}.mp3"
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        
        response.stream_to_file(filepath)
        
        return jsonify({
            'audio_url': url_for('chatbot.get_file', filename=filename)
        }), 200
        
    except Exception as e:
        logger.error(f"Error in speak endpoint: {str(e)}")
        return jsonify({'error': str(e)}), 500

# ------------------------------------------------------------------------------
# Main
# ------------------------------------------------------------------------------
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    logger.info(f"Starting server on port {port}")
    try:
        app.run(host='0.0.0.0', port=port, debug=True)
    except Exception as e:
        logger.error(f"Failed to start server: {str(e)}")
        raise
