import os
import logging
import json
import pandas as pd
import nltk
import torch
import fitz  # PyMuPDF
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, render_template, session, redirect, url_for
from flask_cors import CORS
from sentence_transformers import SentenceTransformer, util
from nltk.tokenize import sent_tokenize
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
import pickle
from flask import Blueprint

# Import OpenAI using the newer style
from openai import OpenAI

# Download required NLTK resources
nltk.download('punkt')
nltk.download('punkt_tab')

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Enable insecure transport for development
os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'

# Initialize Flask app
# app = Flask(
#     __name__,
#     template_folder=os.path.join(os.path.dirname(__file__), 'templates'),
#     static_folder=os.path.join(os.path.dirname(__file__), 'static')
# )
# CORS(app)

# Configure Flask app
# app.config['SESSION_TYPE'] = 'filesystem'
# app.config['SECRET_KEY'] = os.urandom(24)

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
logger.info("OpenAI configured with API key")

# Configure Google OAuth2
CLIENT_SECRETS_FILE = os.path.join(os.path.dirname(__file__), "client_secrets.json")
SCOPES = ['https://www.googleapis.com/auth/calendar']
TOKEN_PICKLE_FILE = "token.pickle"

# Create the blueprint
study_calendar_routes = Blueprint('study_calendar', __name__)

# --- Step 1: Extract the full text from the PDF ---
def extract_pdf_text(pdf_file):
    try:
        doc = fitz.open(stream=pdf_file.read(), filetype="pdf")
        raw_text = []
        for page in doc:
            try:
                text = page.get_text("text")
                raw_text.append(text)
            except Exception as e:
                logger.error(f"Failed to extract text from a page: {e}")
        return " ".join(raw_text)
    except Exception as e:
        logger.error(f"Failed to open PDF: {e}")
        return ""

# --- Syllabus Detection ---
def is_likely_syllabus(text):
    keywords = ["syllabus", "course", "instructor", "schedule", "assignment", "exam", "reading week", "credits", "topic"]
    text_lower = text.lower()
    count = sum(1 for kw in keywords if kw in text_lower)
    return count >= 2

# --- Step 2: Semantic Filtering using Sentence Transformers ---
def filter_text_semantically(text, top_k=10):
    sentences = sent_tokenize(text)
    if not sentences:
        return text
    sem_model = SentenceTransformer('all-MiniLM-L6-v2')
    query = "important dates event lecture assignment exam"
    query_embedding = sem_model.encode(query, convert_to_tensor=True)
    sentence_embeddings = sem_model.encode(sentences, convert_to_tensor=True)
    cos_scores = util.cos_sim(query_embedding, sentence_embeddings)[0]
    top_results = torch.topk(cos_scores, k=min(top_k, len(sentences)))
    top_sentences = [sentences[idx] for idx in top_results[1].cpu().numpy()]
    return " ".join(top_sentences)

# --- Utility: Clean raw GPT response ---
def clean_response(raw_response):
    cleaned = raw_response.strip()
    if cleaned.startswith("```"):
        lines = cleaned.splitlines()
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        cleaned = "\n".join(lines).strip()
    return cleaned

# --- Step 3: Extract Events with GPT ---
def extract_events_with_gpt(filtered_text):
    events_prompt = f"""
    Extract all important dates and their corresponding event types from the following text.
    Return structured JSON in the following format exactly:
    {{
        "course_name": "Course Name",
        "events": [
            {{"date": "YYYY-MM-DD", "name": "Event Name", "type": "event_type"}}
        ]
    }}
    The event types should be one of: lecture, assignment, exam, lab, general.
    Text:
    {filtered_text}
    """
    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are an assistant that extracts structured data from academic syllabi."},
                {"role": "user", "content": events_prompt}
            ],
            temperature=0.3
        )
        raw_response = response.choices[0].message.content.strip()
        raw_response = clean_response(raw_response)
        events_data = json.loads(raw_response)
        if "events" not in events_data or not isinstance(events_data["events"], list):
            logger.error("No valid 'events' detected in extracted data!")
            return {}
        return events_data
    except Exception as e:
        logger.error(f"Error during GPT extraction of events: {e}")
        return {}

# --- Step 4: Extract Topics with GPT ---
def extract_topics(text):
    topics_prompt = f"""
    Extract the list of academic topics covered in the following syllabus text.
    These topics are usually listed under a header like "Topic Overview" or similar.
    Return structured JSON in the following format:
    {{
        "topics": [
            "Topic 1",
            "Topic 2",
            "Topic 3"
        ]
    }}
    Preserve the exact wording as found in the syllabus.
    Text:
    {text}
    """
    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are an assistant that extracts structured data from academic syllabi."},
                {"role": "user", "content": topics_prompt}
            ],
            temperature=0.3
        )
        raw_topic_response = response.choices[0].message.content.strip()
        raw_topic_response = clean_response(raw_topic_response)
        topics_data = json.loads(raw_topic_response)
        if "topics" not in topics_data or not isinstance(topics_data["topics"], list):
            logger.error("No valid topics detected!")
            return []
        return topics_data["topics"]
    except Exception as e:
        logger.error(f"Error during topics extraction: {e}")
        return []

# --- Step 5: Generate Study Plan ---
def generate_study_plan(extracted_data, course_start):
    if not extracted_data:
        logger.error("No structured data extracted. Aborting study plan generation!")
        return []
    
    plan = []
    for event in extracted_data.get("events", []):
        event_date_str = event.get("date", "").strip()
        try:
            event_date = None if event_date_str.upper() == "TBA" else datetime.strptime(event_date_str, "%Y-%m-%d")
        except Exception as e:
            logger.error(f"Invalid date format for event '{event.get('name', 'Unnamed Event')}': {e}")
            continue

        task_name = f"{event.get('name', 'Unnamed Event')} for {extracted_data.get('course_name', 'Unknown Course')}"

        if event["type"] == "lecture":
            if event_date:
                plan.append({
                    "date": (event_date - timedelta(days=2)).strftime("%Y-%m-%d"),
                    "task": f"Prepare for {task_name}",
                    "category": "study"
                })
                plan.append({
                    "date": (event_date + timedelta(days=2)).strftime("%Y-%m-%d"),
                    "task": f"Review {task_name}",
                    "category": "review"
                })
        elif event_date:
            if event["type"] == "assignment":
                for i in range(7):
                    plan.append({
                        "date": (event_date - timedelta(days=i)).strftime("%Y-%m-%d"),
                        "task": f"Work on {task_name}",
                        "category": "assignment"
                    })
            elif event["type"] == "lab":
                plan.append({
                    "date": (event_date - timedelta(days=1)).strftime("%Y-%m-%d"),
                    "task": f"Prepare for {task_name}",
                    "category": "lab prep"
                })
            elif event["type"] == "exam":
                for i in range(7):
                    plan.append({
                        "date": (event_date - timedelta(days=i)).strftime("%Y-%m-%d"),
                        "task": f"Revise for {task_name}",
                        "category": "exam prep"
                    })
            else:
                plan.append({
                    "date": event_date.strftime("%Y-%m-%d"),
                    "task": f"Review details for {task_name}",
                    "category": "general"
                })
            plan.append({
                "date": event_date.strftime("%Y-%m-%d"),
                "task": f"{event['name']}",
                "category": "major event"
            })

    return plan

# --- Step 6: Schedule Topic Revisions ---
def schedule_topic_revisions(plan, topics, start_date):
    topic_tasks = []
    for i, topic in enumerate(topics):
        revision_date = start_date + timedelta(weeks=i)
        topic_tasks.append({
            "date": revision_date.strftime("%Y-%m-%d"),
            "task": f"Revise Topic {i+1}: {topic}",
            "category": "topic revision"
        })
    return plan + topic_tasks

# --- Google Calendar Integration ---
def get_google_calendar_service():
    creds = None
    if os.path.exists(TOKEN_PICKLE_FILE):
        with open(TOKEN_PICKLE_FILE, 'rb') as token:
            creds = pickle.load(token)
    
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
            except:
                return None
        else:
            return None
            
    return build('calendar', 'v3', credentials=creds)

def insert_events_to_calendar(service, events):
    results = []
    for event in events:
        if event["date"].upper() == "TBA":
            continue

        start_date = event["date"]
        try:
            dt = datetime.strptime(start_date, "%Y-%m-%d")
        except Exception as e:
            logger.error(f"Invalid date format for event '{event['task']}': {e}")
            continue

        end_date = (dt + timedelta(days=1)).strftime("%Y-%m-%d")
        event_body = {
            "summary": f"{event['task']} ({event['category']})",
            "start": {"date": start_date, "timeZone": "UTC"},
            "end": {"date": end_date, "timeZone": "UTC"}
        }

        try:
            created_event = service.events().insert(calendarId='primary', body=event_body).execute()
            results.append({
                "success": True,
                "summary": created_event.get('summary'),
                "date": start_date,
                "link": created_event.get('htmlLink')
            })
        except Exception as e:
            results.append({
                "success": False,
                "error": str(e),
                "task": event['task'],
                "date": start_date
            })
    
    return results

# --- Flask Routes ---
@study_calendar_routes.route('/')
def index():
    """Render the study calendar generator page."""
    return render_template('study_calendar.html')

@study_calendar_routes.route('/process-syllabus', methods=['POST'])
def process_syllabus():
    """Process the uploaded syllabus and generate a study plan."""
    logger.info("=== Starting syllabus processing ===")
    logger.info(f"Request files: {request.files}")
    logger.info(f"Request form: {request.form}")
    logger.info(f"Request headers: {dict(request.headers)}")
    
    if 'file' not in request.files:
        logger.error("No file found in request.files")
        return jsonify({"error": "No file uploaded"}), 400
    
    file = request.files['file']
    logger.info(f"File received: {file.filename}, Content type: {file.content_type}")
    
    if not file or not file.filename.endswith('.pdf'):
        logger.error(f"Invalid file: {'No file' if not file else 'Not a PDF'}")
        return jsonify({"error": "Invalid file format. Please upload a PDF."}), 400

    # Extract and process text
    full_text = extract_pdf_text(file)
    logger.info(f"Extracted text length: {len(full_text) if full_text else 0}")
    
    if not full_text.strip():
        logger.error("No text could be extracted from the PDF")
        return jsonify({"error": "No text could be extracted from the PDF"}), 400

    if not is_likely_syllabus(full_text):
        logger.warning("Document may not be a syllabus")
        return jsonify({"warning": "This document may not be a syllabus. Do you want to continue?"})

    # Process the syllabus
    try:
        filtered_text = filter_text_semantically(full_text)
        extracted_events = extract_events_with_gpt(filtered_text)
        topics_list = extract_topics(full_text)

        # Store the processed data in session
        session['extracted_events'] = extracted_events
        session['topics_list'] = topics_list
        
        logger.info("Successfully processed syllabus")
        logger.info(f"Extracted events: {extracted_events}")
        logger.info(f"Topics list: {topics_list}")

        return jsonify({
            "success": True,
            "events": extracted_events,
            "topics": topics_list
        })
    except Exception as e:
        logger.error(f"Error processing syllabus: {str(e)}", exc_info=True)
        return jsonify({"error": f"Failed to process syllabus: {str(e)}"}), 500
    finally:
        logger.info("=== Finished syllabus processing ===")

@study_calendar_routes.route('/generate-plan', methods=['POST'])
def generate_plan():
    """Generate the study plan based on the processed syllabus."""
    if 'extracted_events' not in session:
        return jsonify({
            'success': False,
            'error': 'No syllabus data found. Please upload a syllabus first.'
        }), 400

    try:
        extracted_events = session.get('extracted_events')
        topics_list = session.get('topics_list', [])

        # Get the earliest date from extracted events as course start
        course_start = None
        for event in extracted_events.get('events', []):
            try:
                date = datetime.strptime(event['date'], '%Y-%m-%d')
                if course_start is None or date < course_start:
                    course_start = date
            except:
                continue

        if not course_start:
            # If no valid date found, use today's date
            course_start = datetime.now()

        # Generate the study plan
        study_plan = generate_study_plan(extracted_events, course_start)
        if topics_list:
            study_plan = schedule_topic_revisions(study_plan, topics_list, course_start)

        # Sort the plan by date
        study_plan = sorted(study_plan, key=lambda x: x["date"] if x["date"].upper() != "TBA" else "9999-12-31")

        # Store the plan in session
        session['study_plan'] = study_plan

        return jsonify({
            'success': True,
            'plan': study_plan
        })
        
    except Exception as e:
        logger.error(f"Error generating study plan: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@study_calendar_routes.route('/authorize')
def authorize():
    """Start the Google Calendar authorization flow."""
    flow = Flow.from_client_secrets_file(
        CLIENT_SECRETS_FILE, 
        scopes=SCOPES,
        redirect_uri=url_for('oauth2callback', _external=True)
    )
    
    authorization_url, state = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true'
    )
    
    # Store the state in the session
    session['state'] = state
    
    return redirect(authorization_url)

@study_calendar_routes.route('/oauth2callback')
def oauth2callback():
    """Handle the OAuth2 callback from Google."""
    state = session['state']
    
    flow = Flow.from_client_secrets_file(
        CLIENT_SECRETS_FILE,
        scopes=SCOPES,
        state=state,
        redirect_uri=url_for('oauth2callback', _external=True)
    )
    
    # Use the full URL with scheme for the authorization response
    authorization_response = request.url
    if request.headers.get('X-Forwarded-Proto') == 'https':
        authorization_response = 'https://' + authorization_response.split('://', 1)[1]
    
    flow.fetch_token(authorization_response=authorization_response)
    
    # Save the credentials
    credentials = flow.credentials
    with open(TOKEN_PICKLE_FILE, 'wb') as token:
        pickle.dump(credentials, token)
    
    # After successful authentication, get the calendar URL
    service = build('calendar', 'v3', credentials=credentials)
    try:
        calendar = service.calendars().get(calendarId='primary').execute()
        calendar_id = calendar['id']
        session['calendar_id'] = calendar_id
    except Exception as e:
        logger.error(f"Error getting calendar ID: {e}")
    
    return redirect(url_for('index'))

@study_calendar_routes.route('/add-to-calendar', methods=['POST'])
def add_to_calendar():
    """Add the generated study plan to Google Calendar."""
    service = get_google_calendar_service()
    if not service:
        return jsonify({
            'success': False,
            'error': 'Not authenticated with Google Calendar'
        }), 401
    
    try:
        study_plan = session.get('study_plan')
        if not study_plan:
            return jsonify({"error": "No study plan found. Please generate a plan first."}), 400

        results = insert_events_to_calendar(service, study_plan)
        return jsonify({
            "success": True,
            "results": results
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@study_calendar_routes.route('/check-auth')
def check_auth():
    """Check if user is authenticated with Google Calendar."""
    service = get_google_calendar_service()
    return jsonify({'authenticated': service is not None})

@study_calendar_routes.route('/get-calendar-url')
def get_calendar_url():
    """Get the authenticated user's calendar embed URL."""
    service = get_google_calendar_service()
    if not service:
        return jsonify({
            'success': False,
            'error': 'Not authenticated'
        }), 401
    
    try:
        # Get the user's primary calendar
        calendar = service.calendars().get(calendarId='primary').execute()
        calendar_id = calendar['id']
        
        # Create the embed URL with the user's calendar and additional display options
        embed_url = (
            f"https://calendar.google.com/calendar/embed"
            f"?src={calendar_id}"
            "&mode=MONTH"
            "&showTitle=0"
            "&showNav=1"
            "&showDate=1"
            "&showPrint=0"
            "&showTabs=1"
            "&showCalendars=0"
            "&showTz=1"
            "&wkst=1"
        )
        
        return jsonify({
            'success': True,
            'embed_url': embed_url
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@study_calendar_routes.route('/clear-calendar', methods=['POST'])
def clear_calendar():
    """Delete events from the user's Google Calendar within the specified date range."""
    service = get_google_calendar_service()
    if not service:
        return jsonify({
            'success': False,
            'error': 'Not authenticated with Google Calendar'
        }), 401
    
    try:
        data = request.get_json()
        from_date = data.get('fromDate')
        to_date = data.get('toDate')
        
        if not from_date or not to_date:
            return jsonify({
                'success': False,
                'error': 'From date and To date are required'
            }), 400
            
        # Convert dates to RFC3339 format with time component
        from_datetime = datetime.strptime(from_date, '%Y-%m-%d').replace(hour=0, minute=0, second=0)
        to_datetime = datetime.strptime(to_date, '%Y-%m-%d').replace(hour=23, minute=59, second=59)
        
        events_result = service.events().list(
            calendarId='primary',
            timeMin=from_datetime.isoformat() + 'Z',
            timeMax=to_datetime.isoformat() + 'Z',
            singleEvents=True,
            orderBy='startTime'
        ).execute()
        events = events_result.get('items', [])
        
        # Delete each event
        deleted_count = 0
        for event in events:
            try:
                service.events().delete(
                    calendarId='primary',
                    eventId=event['id']
                ).execute()
                deleted_count += 1
            except Exception as e:
                logger.error(f"Failed to delete event {event.get('summary', 'Unknown')}: {str(e)}")
                continue
        
        return jsonify({
            'success': True,
            'message': f'Successfully deleted {deleted_count} events between {from_date} and {to_date}'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

def initialize_calendar_materials():
    """Initialize calendar materials and create necessary directories."""
    try:
        # Create directories if they don't exist
        os.makedirs(os.path.join(os.path.dirname(__file__), "static"), exist_ok=True)
        os.makedirs(os.path.join(os.path.dirname(__file__), "templates"), exist_ok=True)
        
        # Initialize any required files
        if not os.path.exists(CLIENT_SECRETS_FILE):
            logger.warning(f"Google Calendar client secrets file not found at {CLIENT_SECRETS_FILE}")
        
        logger.info("Calendar materials initialized successfully")
    except Exception as e:
        logger.error(f"Error initializing calendar materials: {str(e)}")
        raise

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 3000))
    app.run(host='0.0.0.0', port=port, debug=True)
