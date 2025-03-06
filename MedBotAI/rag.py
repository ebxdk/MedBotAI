#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
RAG (Retrieval Augmented Generation) Module for MedBot AI
- Loads and processes course materials
- Creates and manages vector database
- Provides retrieval functionality for the chatbot
"""

import os
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
from openai import OpenAI

# LangChain imports
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from langchain.vectorstores import FAISS
from langchain.document_loaders import TextLoader, PyPDFLoader, DirectoryLoader
from langchain.docstore.document import Document

# Initialize logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global RAG pipeline instance
_rag_pipeline = None

class RAGPipeline:
    """RAG Pipeline for MedBot AI"""
    
    def __init__(self, course_material_dir: str = None):
        """Initialize the RAG Pipeline
        
        Args:
            course_material_dir: Directory containing course materials
        """
        self.course_material_dir = course_material_dir or os.path.join(os.path.dirname(__file__), "coursematerial")
        self.client = OpenAI()
        self.embeddings = OpenAIEmbeddings()
        self.vector_store = None
        self.documents = []
        
        # Create course material directory if it doesn't exist
        os.makedirs(self.course_material_dir, exist_ok=True)
        
        # Initialize the pipeline
        self.load_documents()
        self.create_vector_store()
    
    def load_documents(self) -> None:
        """Load documents from the course material directory"""
        try:
            # Configure loaders for different file types
            loaders = {
                ".txt": (TextLoader, {}),
                ".pdf": (PyPDFLoader, {})
            }
            
            # Load all documents from the directory
            for file_path in Path(self.course_material_dir).rglob("*"):
                if file_path.suffix.lower() in loaders:
                    logger.info(f"Loading {file_path}")
                    loader_class, loader_args = loaders[file_path.suffix.lower()]
                    loader = loader_class(str(file_path), **loader_args)
                    self.documents.extend(loader.load())
            
            logger.info(f"Loaded {len(self.documents)} documents")
            
        except Exception as e:
            logger.error(f"Error loading documents: {str(e)}")
            raise
    
    def process_file(self, file_path: str) -> List[Document]:
        """Process a single file and return its documents
        
        Args:
            file_path: Path to the file to process
            
        Returns:
            List of processed documents
        """
        try:
            # Get file extension
            file_ext = Path(file_path).suffix.lower()
            
            # Configure loader based on file type
            if file_ext == ".txt":
                loader = TextLoader(file_path)
            elif file_ext == ".pdf":
                loader = PyPDFLoader(file_path)
            else:
                raise ValueError(f"Unsupported file type: {file_ext}")
            
            # Load and process the document
            documents = loader.load()
            
            # Split documents into chunks
            text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=1000,
                chunk_overlap=200,
                length_function=len,
            )
            
            return text_splitter.split_documents(documents)
            
        except Exception as e:
            logger.error(f"Error processing file {file_path}: {str(e)}")
            raise
    
    def create_vector_store(self) -> None:
        """Create the vector store from loaded documents"""
        try:
            if not self.documents:
                logger.warning("No documents to create vector store from")
                return
            
            # Split documents into chunks
            text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=1000,
                chunk_overlap=200,
                length_function=len,
            )
            
            splits = text_splitter.split_documents(self.documents)
            
            # Create vector store
            self.vector_store = FAISS.from_documents(splits, self.embeddings)
            logger.info("Vector store created successfully")
            
        except Exception as e:
            logger.error(f"Error creating vector store: {str(e)}")
            raise
    
    def add_document(self, file_path: str) -> None:
        """Add a new document to the vector store
        
        Args:
            file_path: Path to the file to add
        """
        try:
            # Process the file
            new_documents = self.process_file(file_path)
            
            if not new_documents:
                logger.warning(f"No content extracted from {file_path}")
                return
            
            # Add to vector store
            if self.vector_store is None:
                self.vector_store = FAISS.from_documents(new_documents, self.embeddings)
            else:
                self.vector_store.add_documents(new_documents)
            
            # Add to documents list
            self.documents.extend(new_documents)
            logger.info(f"Added {len(new_documents)} chunks from {file_path}")
            
        except Exception as e:
            logger.error(f"Error adding document {file_path}: {str(e)}")
            raise
    
    def get_relevant_context(self, query: str, top_k: int = 5) -> str:
        """Get relevant context for a query
        
        Args:
            query: The query to find context for
            top_k: Number of most relevant chunks to return
            
        Returns:
            String containing the relevant context
        """
        try:
            if not self.vector_store:
                logger.warning("No vector store available")
                return ""
            
            # Get relevant documents
            relevant_docs = self.vector_store.similarity_search(query, k=top_k)
            
            # Combine the content from relevant documents
            context = "\n\n".join(doc.page_content for doc in relevant_docs)
            
            return context
            
        except Exception as e:
            logger.error(f"Error getting relevant context: {str(e)}")
            return ""

def initialize_rag() -> bool:
    """Initialize the RAG pipeline
    
    Returns:
        bool: True if initialization was successful, False otherwise
    """
    try:
        global _rag_pipeline
        _rag_pipeline = RAGPipeline()
        return True
    except Exception as e:
        logger.error(f"Error initializing RAG pipeline: {str(e)}")
        return False

def get_rag_pipeline() -> Optional[RAGPipeline]:
    """Get the RAG pipeline instance
    
    Returns:
        Optional[RAGPipeline]: The RAG pipeline instance or None if not initialized
    """
    return _rag_pipeline 