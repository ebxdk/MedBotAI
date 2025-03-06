import { AnimatePresence, motion } from 'framer-motion';
import React, { useEffect, useState } from 'react';
import { FaGithub, FaMoon, FaSun } from 'react-icons/fa';
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';

// Components
import ToolSelector from './components/ToolSelector';

// Pages
import ChatPage from './pages/ChatPage';
import ExamPage from './pages/ExamPage';
import FlashcardPage from './pages/FlashcardPage';
import StudyCalendarPage from './pages/StudyCalendarPage';

const App = () => {
  const [darkMode, setDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('darkMode');
    return savedMode ? JSON.parse(savedMode) : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  return (
    <Router>
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        {/* Navbar */}
        <header className="border-b border-border sticky top-0 z-10 bg-background/80 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-3 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <img src="/static/img/logo.png" alt="MedBot AI" className="h-8 w-8" />
              <h1 className="text-xl font-bold">MedBot AI</h1>
            </div>
            
            <div className="flex items-center gap-4">
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-full hover:bg-muted transition-colors"
                aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {darkMode ? <FaSun /> : <FaMoon />}
              </button>
              
              <a
                href="https://github.com/yourusername/medbot-ai"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full hover:bg-muted transition-colors"
                aria-label="GitHub repository"
              >
                <FaGithub />
              </a>
            </div>
          </div>
        </header>
        
        {/* Tool Selector */}
        <ToolSelector />
        
        {/* Main Content */}
        <main className="flex-1 container mx-auto px-4 py-6">
          <AnimatePresence mode="wait">
            <Routes>
              <Route path="/" element={<Navigate to="/chat" replace />} />
              <Route 
                path="/chat" 
                element={
                  <motion.div
                    key="chat"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChatPage />
                  </motion.div>
                } 
              />
              <Route 
                path="/flashcards" 
                element={
                  <motion.div
                    key="flashcards"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <FlashcardPage />
                  </motion.div>
                } 
              />
              <Route 
                path="/exams" 
                element={
                  <motion.div
                    key="exams"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ExamPage />
                  </motion.div>
                } 
              />
              <Route 
                path="/calendar" 
                element={
                  <motion.div
                    key="calendar"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <StudyCalendarPage />
                  </motion.div>
                } 
              />
            </Routes>
          </AnimatePresence>
        </main>
        
        {/* Footer */}
        <footer className="border-t border-border py-4 text-center text-sm text-muted-foreground">
          <div className="container mx-auto px-4">
            <p>© {new Date().getFullYear()} MedBot AI. All rights reserved.</p>
            <p className="mt-1">Powered by advanced AI to help medical students excel in their studies.</p>
          </div>
        </footer>
      </div>
    </Router>
  );
};

export default App; 