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

from flask import Flask, render_template, send_from_directory, send_file, jsonify, request, redirect
from flask_cors import CORS
import os
import logging
from dotenv import load_dotenv
from flask_socketio import SocketIO

# Import routes from individual modules
from study_calendar import initialize_calendar_materials, study_calendar_routes
from chatbot import initialize_chatbot, chatbot_routes
from flashcard import initialize_course_materials, flashcard_routes
from exam import exam_routes, initialize_exam_materials, load_feedback, load_student_profiles

# Initialize logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
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

# Register blueprints
app.register_blueprint(study_calendar_routes, url_prefix='/calendar')
app.register_blueprint(chatbot_routes, url_prefix='/chat')
app.register_blueprint(flashcard_routes, url_prefix='/flashcard')
app.register_blueprint(exam_routes, url_prefix='/exam')

# Log available exam routes
logger.info("Registering exam blueprint with prefix '/exam'")
logger.info(f"Available exam routes: {[str(rule) for rule in app.url_map.iter_rules() if rule.endpoint.startswith('exam')]}")

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

# Serve Product Sans fonts
@app.route('/product-sans/<path:filename>')
def product_sans_fonts(filename):
    return send_from_directory(os.path.join(app.root_path, 'product-sans'), filename)

# Main routes to serve HTML files
@app.route('/')
def index():
    """Render the main index page."""
    return render_template('index.html')

@app.route('/chat')
def chat():
    """Redirect to the main page with the chat tool active."""
    return redirect('/#chatbot')

@app.route('/flashcard')
def flashcards():
    """Redirect to the main page with the flashcards tool active."""
    return redirect('/#flashcards')

@app.route('/exam')
def exams():
    """Redirect to the main page with the practice exams tool active."""
    return redirect('/#practice-exams')

@app.route('/exams')
def exams_redirect():
    """Redirect to the main page with the practice exams tool active."""
    return redirect('/#practice-exams')

@app.route('/calendar')
def calendar_redirect():
    """Redirect to the main page with the calendar tool active."""
    return redirect('/#study-planner')

# Special route to help with debugging
@app.route('/debug')
def debug_info():
    routes = []
    for rule in app.url_map.iter_rules():
        routes.append({
            'endpoint': rule.endpoint,
            'methods': [m for m in rule.methods if m != 'OPTIONS' and m != 'HEAD'],
            'url': str(rule)
        })
    
    return jsonify({
        'routes': routes,
        'blueprints': list(app.blueprints.keys())
    })

# Catch-all route for SPA (React) routing
@app.route('/<path:path>')
def catch_all(path):
    logger.info(f"Catch-all route accessed: /{path}")
    
    # First, try direct file match in dist directory
    file_path = os.path.join(app.static_folder, 'dist', f"{path}.html")
    if os.path.exists(file_path):
        logger.info(f"Serving specific file: {path}.html")
        return send_from_directory(os.path.join(app.static_folder, 'dist'), f"{path}.html")
    
    # Next, try direct file match (for non-HTML files like CSS/JS)
    file_path = os.path.join(app.static_folder, 'dist', path)
    if os.path.exists(file_path):
        logger.info(f"Serving asset file: {path}")
        return send_from_directory(os.path.join(app.static_folder, 'dist'), path)
    
    # If no match, default to index.html for SPA routing
    logger.info(f"No direct file match for '{path}', serving index.html (SPA routing)")
    return send_from_directory(os.path.join(app.static_folder, 'dist'), 'index.html')

def initialize_all():
    """Initialize all required components."""
    try:
        # Initialize study calendar
        initialize_calendar_materials()
        logger.info("Study calendar materials initialized")
        
        # Initialize chatbot
        initialize_chatbot()
        logger.info("Chatbot initialized")
        
        # Initialize flashcard system
        initialize_course_materials()
        logger.info("Flashcard materials initialized")
        
        # Initialize exam system
        initialize_exam_materials()
        load_feedback()
        load_student_profiles()
        logger.info("Exam materials initialized")
        
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
    port = int(os.environ.get('PORT', 8080))
    logger.info(f"Starting server on port {port}")
    try:
        socketio.run(app, host='0.0.0.0', port=port, debug=True, allow_unsafe_werkzeug=True)
    except Exception as e:
        logger.error(f"Failed to start server: {str(e)}")
        raise 