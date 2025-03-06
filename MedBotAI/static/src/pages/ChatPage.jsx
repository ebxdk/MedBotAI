import axios from 'axios';
import { motion } from 'framer-motion';
import React, { useEffect, useRef, useState } from 'react';
import { FaFile, FaPaperPlane, FaRobot, FaTrash, FaUser } from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';
import io from 'socket.io-client';

const socket = io();

const ChatPage = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [file, setFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    // Connect to socket
    socket.on('connect', () => {
      console.log('Connected to server');
    });

    // Listen for bot responses
    socket.on('bot_response', (data) => {
      setMessages(prev => [...prev, { 
        id: Date.now(), 
        text: data.response, 
        sender: 'bot',
        timestamp: new Date().toISOString()
      }]);
      setIsTyping(false);
    });

    // Listen for typing indicator
    socket.on('typing', () => {
      setIsTyping(true);
    });

    return () => {
      socket.off('connect');
      socket.off('bot_response');
      socket.off('typing');
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!input.trim() && !file) return;
    
    // Add user message to chat
    const userMessage = {
      id: Date.now(),
      text: input,
      sender: 'user',
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    
    // Handle file upload if present
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('message', input);
      
      try {
        const response = await axios.post('/chat/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percentCompleted);
          }
        });
        
        setMessages(prev => [...prev, { 
          id: Date.now(), 
          text: response.data.response, 
          sender: 'bot',
          timestamp: new Date().toISOString()
        }]);
        
        setFile(null);
        setUploadProgress(0);
      } catch (error) {
        console.error('Error uploading file:', error);
        setMessages(prev => [...prev, { 
          id: Date.now(), 
          text: 'Error processing your file. Please try again.', 
          sender: 'bot',
          timestamp: new Date().toISOString(),
          isError: true
        }]);
        setFile(null);
        setUploadProgress(0);
      }
    } else {
      // Send message to server
      socket.emit('user_message', { message: input });
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  const removeFile = () => {
    setFile(null);
    fileInputRef.current.value = '';
  };

  const clearChat = () => {
    setMessages([]);
    setFile(null);
    setInput('');
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)]">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Chat with MedBot AI</h1>
        <button 
          onClick={clearChat}
          className="btn btn-secondary flex items-center gap-2 text-sm px-3 py-1 h-auto"
        >
          <FaTrash size={14} />
          Clear Chat
        </button>
      </div>
      
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="card flex-1 overflow-y-auto p-4 mb-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <FaRobot className="text-primary text-6xl mb-4 mx-auto" />
                <h2 className="text-2xl font-bold mb-2">Welcome to MedBot AI</h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  I'm your AI medical assistant. Ask me any medical questions or upload medical documents for analysis.
                </p>
              </motion.div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      message.sender === 'user' 
                        ? 'bg-primary text-primary-foreground rounded-tr-none' 
                        : message.isError 
                          ? 'bg-destructive text-destructive-foreground rounded-tl-none' 
                          : 'bg-card border border-border rounded-tl-none'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {message.sender === 'user' ? (
                        <FaUser className="text-primary-foreground" size={14} />
                      ) : (
                        <FaRobot className="text-primary" size={14} />
                      )}
                      <span className="text-xs opacity-70">
                        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>{message.text}</ReactMarkdown>
                    </div>
                  </div>
                </motion.div>
              ))}
              
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="bg-card border border-border rounded-2xl rounded-tl-none px-4 py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <FaRobot className="text-primary" size={14} />
                      <span className="text-xs opacity-70">Typing</span>
                    </div>
                    <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-primary animate-typing"></div>
                      <div className="w-2 h-2 rounded-full bg-primary animate-typing" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 rounded-full bg-primary animate-typing" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
        
        <form onSubmit={handleSubmit} className="card p-4">
          {file && (
            <div className="mb-3 p-2 bg-accent rounded-md flex items-center justify-between">
              <div className="flex items-center">
                <FaFile className="text-primary mr-2" />
                <span className="text-sm truncate max-w-[200px]">{file.name}</span>
              </div>
              <div className="flex items-center gap-2">
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="w-20 bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full" 
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                )}
                <button 
                  type="button" 
                  onClick={removeFile}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <FaTrash size={14} />
                </button>
              </div>
            </div>
          )}
          
          <div className="flex gap-2">
            <button 
              type="button"
              onClick={triggerFileInput}
              className="btn btn-secondary px-3"
            >
              <FaFile />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              className="hidden"
              accept=".pdf,.txt,.doc,.docx"
            />
            
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything about medicine..."
              className="input flex-1"
            />
            
            <button 
              type="submit"
              className="btn btn-primary px-4"
              disabled={!input.trim() && !file}
            >
              <FaPaperPlane />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatPage; 