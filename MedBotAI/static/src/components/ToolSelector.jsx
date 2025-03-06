import { motion } from 'framer-motion';
import React from 'react';
import { FaCalendarAlt, FaClone, FaComments, FaFileAlt } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const tools = [
  { id: 'chat', name: 'Chat', icon: FaComments, path: '/chat' },
  { id: 'flashcard', name: 'Flashcards', icon: FaClone, path: '/flashcard' },
  { id: 'exam', name: 'Practice Exams', icon: FaFileAlt, path: '/exam' },
  { id: 'calendar', name: 'Study Planner', icon: FaCalendarAlt, path: '/calendar' },
];

const ToolSelector = ({ currentTool, onToolChange }) => {
  const navigate = useNavigate();

  const handleToolClick = (tool) => {
    onToolChange(tool.id);
    navigate(tool.path);
  };

  return (
    <div className="bg-card rounded-full p-1 shadow-lg flex">
      {tools.map((tool) => (
        <button
          key={tool.id}
          className={`relative rounded-full px-4 py-2 flex items-center gap-2 transition-all ${
            currentTool === tool.id ? 'text-white' : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => handleToolClick(tool)}
        >
          {currentTool === tool.id && (
            <motion.div
              layoutId="toolHighlight"
              className="absolute inset-0 bg-primary rounded-full"
              initial={false}
              transition={{ type: 'spring', duration: 0.6 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-2">
            <tool.icon className={`${currentTool === tool.id ? 'text-white' : 'text-primary'}`} />
            <span>{tool.name}</span>
          </span>
        </button>
      ))}
    </div>
  );
};

export default ToolSelector; 