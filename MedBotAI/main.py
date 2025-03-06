#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
MedBot AI - Unified Learning Platform
Integrates:
- Study Calendar
- Exam Generator
- Medical Chatbot
- Flashcard Generator
"""

from flask import Flask, render_template, send_from_directory, send_file, jsonify, request
from flask_cors import CORS
import os
import logging
from dotenv import load_dotenv
from flask_socketio import SocketIO

# Import routes from individual modules
from study_calendar import initialize_calendar_materials, study_calendar_routes
from exam import initialize_exam_materials, exam_routes
from chatbot import initialize_chatbot, chatbot_routes
from flashcard import initialize_course_materials, flashcard_routes

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

# Configure CORS
CORS(app)

# Initialize SocketIO
socketio = SocketIO(app, cors_allowed_origins="*")

# Configure Flask app
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SECRET_KEY'] = os.urandom(24)

# Enable insecure transport for development
os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'

# Register blueprints for each module
app.register_blueprint(study_calendar_routes, url_prefix='/calendar')
app.register_blueprint(exam_routes, url_prefix='/exam')
app.register_blueprint(chatbot_routes, url_prefix='/chat')
app.register_blueprint(flashcard_routes, url_prefix='/flashcard')

# Serve static files
@app.route('/static/<path:path>')
def serve_static(path):
    return send_from_directory(app.static_folder, path)

# Serve favicon and logo
@app.route('/favicon.ico')
def favicon():
    return send_from_directory(os.path.join(app.static_folder, 'dist'), 'favicon.ico')

@app.route('/logo.png')
def logo():
    return send_from_directory(os.path.join(app.static_folder, 'dist'), 'logo.png')

# API routes
@app.route('/api/chat', methods=['POST'])
def api_chat():
    data = request.json
    message = data.get('message', '')
    # This is a placeholder - actual implementation would call your chatbot
    response = f"You said: {message}. This is a placeholder response from the server."
    return jsonify({"response": response})

@app.route('/api/flashcards', methods=['POST'])
def api_flashcards():
    data = request.json
    topic = data.get('topic', '')
    count = int(data.get('count', 10))
    difficulty = data.get('difficulty', 'intermediate')
    
    # This is a placeholder - actual implementation would generate flashcards
    flashcards = []
    for i in range(count):
        flashcards.append({
            "id": i + 1,
            "question": f"{difficulty.capitalize()} question about {topic} (#{i + 1})",
            "answer": f"This is a {difficulty} answer about {topic}. It would contain detailed information relevant to the question."
        })
    
    return jsonify({"flashcards": flashcards})

@app.route('/api/exams', methods=['POST'])
def api_exams():
    data = request.json
    topic = data.get('topic', '')
    count = int(data.get('count', 10))
    difficulty = data.get('difficulty', 'intermediate')
    
    # This is a placeholder - actual implementation would generate exam questions
    questions = []
    for i in range(count):
        options = [
            f"Option A for question {i + 1}",
            f"Option B for question {i + 1}",
            f"Option C for question {i + 1}",
            f"Option D for question {i + 1}"
        ]
        
        correct_answer = i % 4  # Simple pattern for correct answers
        
        questions.append({
            "id": i + 1,
            "text": f"{difficulty.capitalize()} question about {topic} (#{i + 1})",
            "options": options,
            "correctAnswer": correct_answer,
            "explanation": f"This is the explanation for question {i + 1}. The correct answer is {chr(65 + correct_answer)} because of specific medical reasons related to {topic}."
        })
    
    return jsonify({"questions": questions})

# Main routes to serve HTML files
@app.route('/')
def index():
    return send_from_directory(os.path.join(app.static_folder, 'dist'), 'index.html')

@app.route('/chat')
def chat():
    return send_from_directory(os.path.join(app.static_folder, 'dist'), 'chat.html')

@app.route('/flashcards')
def flashcards():
    return send_from_directory(os.path.join(app.static_folder, 'dist'), 'flashcards.html')

@app.route('/exams')
def exams():
    return send_from_directory(os.path.join(app.static_folder, 'dist'), 'exams.html')

@app.route('/calendar')
def calendar():
    return send_from_directory(os.path.join(app.static_folder, 'dist'), 'calendar.html')

# Catch-all route for any other paths
@app.route('/<path:path>')
def catch_all(path):
    # Check if the path exists as an HTML file
    html_path = f"{path}.html"
    dist_dir = os.path.join(app.static_folder, 'dist')
    
    if os.path.exists(os.path.join(dist_dir, html_path)):
        return send_from_directory(dist_dir, html_path)
    
    # If not found, return the index page
    return send_from_directory(dist_dir, 'index.html')

def initialize_all():
    """Initialize all required components."""
    try:
        # Initialize study calendar
        initialize_calendar_materials()
        logger.info("Study calendar materials initialized")
        
        # Initialize exam generator
        initialize_exam_materials()
        logger.info("Exam generator materials initialized")
        
        # Initialize chatbot
        initialize_chatbot()
        logger.info("Chatbot initialized")
        
        # Initialize flashcard system
        initialize_course_materials()
        logger.info("Flashcard materials initialized")
        
        logger.info("All components initialized successfully")
    except Exception as e:
        logger.error(f"Error during initialization: {str(e)}")
        raise

# Socket.IO event handlers
@socketio.on('connect')
def handle_connect():
    logger.info('Client connected')

@socketio.on('disconnect')
def handle_disconnect():
    logger.info('Client disconnected')

@socketio.on('message')
def handle_message(data):
    # Process the message and generate a response
    message = data.get('message', '')
    
    # This is a placeholder - actual implementation would call your chatbot
    response = f"You said: {message}. This is a placeholder response from the server."
    
    socketio.emit('bot_response', {'message': response})

if __name__ == '__main__':
    # Initialize all components
    initialize_all()
    
    # Start server
    port = int(os.environ.get('PORT', 5000))
    logger.info(f"Starting unified server on port {port}")
    try:
        socketio.run(app, host='0.0.0.0', port=port, debug=True, allow_unsafe_werkzeug=True)
    except Exception as e:
        logger.error(f"Failed to start server: {str(e)}")
        raise 