#!/usr/bin/env python3

import sys
import os
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def check_environment():
    """Check Python environment and dependencies"""
    logger.info(f"Python version: {sys.version}")
    logger.info(f"Python executable: {sys.executable}")
    logger.info(f"Current working directory: {os.getcwd()}")
    
    try:
        import openai
        logger.info(f"OpenAI version: {openai.__version__}")
    except ImportError as e:
        logger.error(f"Failed to import openai: {e}")
    
    try:
        from openai import OpenAI
        client = OpenAI()
        logger.info("Successfully created OpenAI client")
    except Exception as e:
        logger.error(f"Failed to create OpenAI client: {e}")
    
    try:
        import flask
        logger.info(f"Flask version: {flask.__version__}")
    except ImportError as e:
        logger.error(f"Failed to import flask: {e}")
    
    try:
        from langchain_openai import OpenAIEmbeddings
        logger.info("Successfully imported OpenAIEmbeddings")
    except ImportError as e:
        logger.error(f"Failed to import OpenAIEmbeddings: {e}")

if __name__ == "__main__":
    check_environment() 