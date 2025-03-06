# MedBot AI

MedBot AI is a comprehensive medical learning platform that integrates multiple AI-powered tools to help medical students excel in their studies.

## Features

- **AI Chatbot**: Get instant answers to medical questions
- **Flashcards**: Generate AI-powered flashcards for effective studying
- **Practice Exams**: Test your knowledge with customized practice exams
- **Study Planner**: Organize your study schedule efficiently

## Tech Stack

- **Backend**: Flask, Python, OpenAI
- **Frontend**: React, Tailwind CSS, Framer Motion
- **Real-time Communication**: Socket.IO
- **Calendar**: FullCalendar

## Setup Instructions

### Prerequisites

- Python 3.8+
- Node.js 16+
- npm or yarn

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/medbot-ai.git
   cd medbot-ai
   ```

2. Create and activate a virtual environment:
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install Python dependencies:
   ```
   pip install -r requirements.txt
   ```

4. Build the frontend:
   ```
   ./build_frontend.sh
   ```

### Running the Application

#### Development Mode

```
./run.sh
```

#### Production Mode

```
./run_production.sh
```

The application will be available at http://localhost:5000

## Development

### Frontend Development

To work on the frontend with hot reloading:

1. Navigate to the static directory:
   ```
   cd static
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm run dev
   ```

4. In a separate terminal, run the Flask backend:
   ```
   python main.py
   ```

### Backend Development

The backend is organized into modules:

- `main.py`: Main application entry point
- `chatbot.py`: AI chatbot functionality
- `exam.py`: Practice exam generation
- `flashcard.py`: Flashcard generation
- `study_calendar.py`: Study planning functionality

## License

[MIT License](LICENSE)

## Acknowledgements

- OpenAI for providing the AI models
- React and Tailwind CSS for the frontend framework
- Flask for the backend framework 