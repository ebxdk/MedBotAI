import { motion } from 'framer-motion';
import React from 'react';
import { FaRobot } from 'react-icons/fa';
import { Link } from 'react-router-dom';

const Navbar = () => {
  return (
    <nav className="bg-card border-b border-border py-4">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl">
          <motion.div
            initial={{ rotate: -10 }}
            animate={{ rotate: 10 }}
            transition={{
              repeat: Infinity,
              repeatType: "reverse",
              duration: 1.5,
            }}
          >
            <FaRobot className="text-primary text-2xl" />
          </motion.div>
          <span>MedBot AI</span>
        </Link>
        
        <div className="flex items-center gap-4">
          <button className="btn btn-secondary text-sm px-3 py-1 h-auto">
            <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
            Online
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 