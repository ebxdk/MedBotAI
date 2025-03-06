import axios from 'axios';
import { motion } from 'framer-motion';
import React, { useState } from 'react';
import { FaArrowLeft, FaArrowRight, FaCheck, FaClipboardCheck, FaInfoCircle, FaMagic, FaTimes } from 'react-icons/fa';

const ExamPage = () => {
  const [university, setUniversity] = useState('');
  const [course, setCourse] = useState('');
  const [topic, setTopic] = useState('');
  const [numQuestions, setNumQuestions] = useState(10);
  const [difficulty, setDifficulty] = useState('medium');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [exam, setExam] = useState(null);
  const [userAnswers, setUserAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [showExplanations, setShowExplanations] = useState({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!topic.trim()) {
      setError('Please enter a topic');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const response = await axios.post('/exam/generate', {
        university: university.trim() || undefined,
        course: course.trim() || undefined,
        topic,
        num_questions: numQuestions,
        difficulty
      });
      
      setExam(response.data);
      setUserAnswers({});
      setShowResults(false);
      setShowExplanations({});
      setCurrentQuestionIndex(0);
    } catch (error) {
      console.error('Error generating exam:', error);
      setError('Error generating exam. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerSelect = (questionIndex, optionIndex) => {
    if (showResults) return; // Prevent changing answers after submission
    
    setUserAnswers(prev => ({
      ...prev,
      [questionIndex]: optionIndex
    }));
  };

  const handleSubmitExam = () => {
    setShowResults(true);
  };

  const toggleExplanation = (questionIndex) => {
    setShowExplanations(prev => ({
      ...prev,
      [questionIndex]: !prev[questionIndex]
    }));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < exam?.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const calculateScore = () => {
    if (!exam) return 0;
    
    let correctCount = 0;
    exam.questions.forEach((question, index) => {
      if (userAnswers[index] === question.correct_answer) {
        correctCount++;
      }
    });
    
    return {
      score: correctCount,
      total: exam.questions.length,
      percentage: Math.round((correctCount / exam.questions.length) * 100)
    };
  };

  const getScoreColor = (percentage) => {
    if (percentage >= 80) return 'text-green-500';
    if (percentage >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const renderQuestion = (question, index) => {
    const isCurrentQuestion = index === currentQuestionIndex;
    const userAnswer = userAnswers[index];
    const isCorrect = showResults && userAnswer === question.correct_answer;
    const isIncorrect = showResults && userAnswer !== undefined && userAnswer !== question.correct_answer;
    
    return (
      <motion.div 
        key={index}
        className={`card p-6 ${isCurrentQuestion ? 'block' : 'hidden'}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">Question {index + 1} of {exam.questions.length}</h3>
          <span className="text-sm text-muted-foreground">{difficulty} difficulty</span>
        </div>
        
        <p className="text-lg mb-6">{question.question}</p>
        
        <div className="space-y-3 mb-6">
          {question.options.map((option, optionIndex) => (
            <div 
              key={optionIndex}
              className={`
                flex items-start p-3 rounded-lg cursor-pointer border transition-colors
                ${userAnswer === optionIndex ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}
                ${showResults && optionIndex === question.correct_answer ? 'border-green-500 bg-green-500/10' : ''}
                ${isIncorrect && optionIndex === userAnswer ? 'border-red-500 bg-red-500/10' : ''}
              `}
              onClick={() => handleAnswerSelect(index, optionIndex)}
            >
              <div className="flex-shrink-0 mr-3 mt-0.5">
                <div className={`
                  w-5 h-5 rounded-full flex items-center justify-center border
                  ${userAnswer === optionIndex ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground'}
                  ${showResults && optionIndex === question.correct_answer ? 'border-green-500 bg-green-500 text-white' : ''}
                  ${isIncorrect && optionIndex === userAnswer ? 'border-red-500 bg-red-500 text-white' : ''}
                `}>
                  {showResults && optionIndex === question.correct_answer && <FaCheck size={12} />}
                  {isIncorrect && optionIndex === userAnswer && <FaTimes size={12} />}
                </div>
              </div>
              <div className="flex-1">
                <p>{option}</p>
              </div>
            </div>
          ))}
        </div>
        
        {showResults && (
          <div className="mt-4">
            <button
              onClick={() => toggleExplanation(index)}
              className="btn btn-secondary flex items-center gap-2 text-sm"
            >
              <FaInfoCircle />
              {showExplanations[index] ? 'Hide Explanation' : 'Show Explanation'}
            </button>
            
            {showExplanations[index] && (
              <motion.div 
                className="mt-4 p-4 bg-muted rounded-lg"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ duration: 0.3 }}
              >
                <h4 className="font-bold mb-2">Explanation:</h4>
                <p>{question.explanation}</p>
              </motion.div>
            )}
          </div>
        )}
        
        <div className="flex justify-between mt-6">
          <button
            onClick={handlePrevQuestion}
            className="btn btn-secondary flex items-center gap-2"
            disabled={currentQuestionIndex === 0}
          >
            <FaArrowLeft />
            Previous
          </button>
          
          {currentQuestionIndex === exam.questions.length - 1 && !showResults ? (
            <button
              onClick={handleSubmitExam}
              className="btn btn-primary flex items-center gap-2"
              disabled={Object.keys(userAnswers).length < exam.questions.length}
            >
              <FaCheck />
              Submit Exam
            </button>
          ) : (
            <button
              onClick={handleNextQuestion}
              className="btn btn-primary flex items-center gap-2"
              disabled={currentQuestionIndex === exam.questions.length - 1}
            >
              Next
              <FaArrowRight />
            </button>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)]">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FaClipboardCheck className="text-primary" />
          AI Practice Exams
        </h1>
        
        {exam && showResults && (
          <div className="flex items-center gap-2">
            <span className="text-sm">Score:</span>
            <span className={`font-bold ${getScoreColor(calculateScore().percentage)}`}>
              {calculateScore().score}/{calculateScore().total} ({calculateScore().percentage}%)
            </span>
          </div>
        )}
      </div>
      
      {!exam ? (
        <div className="card p-6">
          <h2 className="text-xl font-bold mb-4">Generate Practice Exam</h2>
          
          {error && (
            <div className="bg-destructive/15 text-destructive px-4 py-3 rounded-md mb-4">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="university">
                  University (Optional)
                </label>
                <input
                  type="text"
                  id="university"
                  value={university}
                  onChange={(e) => setUniversity(e.target.value)}
                  placeholder="e.g., Harvard Medical School"
                  className="input"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="course">
                  Course (Optional)
                </label>
                <input
                  type="text"
                  id="course"
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                  placeholder="e.g., Anatomy 101"
                  className="input"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="topic">
                Medical Topic
              </label>
              <input
                type="text"
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Enter a medical topic (e.g., Cardiology, Neurology)"
                className="input"
                required
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="numQuestions">
                  Number of Questions
                </label>
                <select
                  id="numQuestions"
                  value={numQuestions}
                  onChange={(e) => setNumQuestions(Number(e.target.value))}
                  className="input"
                >
                  <option value={5}>5 Questions</option>
                  <option value={10}>10 Questions</option>
                  <option value={15}>15 Questions</option>
                  <option value={20}>20 Questions</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="difficulty">
                  Difficulty Level
                </label>
                <select
                  id="difficulty"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="input"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>
            
            <button
              type="submit"
              className="btn btn-primary w-full flex items-center justify-center gap-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                  Generating...
                </>
              ) : (
                <>
                  <FaMagic />
                  Generate Exam
                </>
              )}
            </button>
          </form>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {exam.questions.map((question, index) => renderQuestion(question, index))}
        </div>
      )}
    </div>
  );
};

export default ExamPage; 