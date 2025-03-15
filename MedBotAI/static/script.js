document.addEventListener('DOMContentLoaded', () => {
    // Initialize chat interface first
    initializeChatInterface();
    
    const theme = localStorage.getItem('theme') || 'dark';
    document.body.classList.toggle('dark', theme === 'dark');
    document.body.classList.toggle('light', theme === 'light');

    // Dropdown functionality
    const dropdown = document.querySelector('.dropdown');
    const dropdownToggle = document.querySelector('.dropdown-toggle');
    const currentTool = document.querySelector('.current-tool');

    dropdownToggle?.addEventListener('click', () => {
        dropdown.classList.toggle('active');
  });
  
  // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target)) {
            dropdown.classList.remove('active');
        }
    });

    // Handle tool selection
    document.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', () => {
            const toolId = item.dataset.tool;
            const toolName = item.textContent.trim();
            
            // Update dropdown
            document.querySelectorAll('.dropdown-item').forEach(btn => btn.classList.remove('active'));
            item.classList.add('active');
            currentTool.textContent = toolName;
            dropdown.classList.remove('active');
            
            // Switch tool view
        switchTool(toolId);
      });
    });

    // Initialize message input
    const messageInput = document.querySelector('#message-input');
    const chatForm = document.querySelector('.chat-form');
    
    // Auto-resize textarea as user types
    if (messageInput) {
        messageInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 120) + 'px';
        });

        // Handle Enter key in the textarea
        messageInput.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
                await sendChatMessage();
      }
    });
  }
  
    // Handle form submission
    if (chatForm) {
        chatForm.addEventListener('submit', async (e) => {
      e.preventDefault();
            await sendChatMessage();
        });
    }
    
    // Initialize chat interface
    initializeChatInterface();
    
    // Initialize chat history
    initializeChatHistory();
    
    // Add event listener for new chat button
    document.querySelector('.new-chat-btn')?.addEventListener('click', startNewChat);
    
    // Add event listener for clear history button
    document.querySelector('.clear-history-btn')?.addEventListener('click', clearAllHistory);
    
    // Initialize with chat view
    switchTool('chat');
});

function initializeChatInterface() {
    const messagesContainer = document.querySelector('.messages');
    const chatMainContent = document.querySelector('.chat-main-content');
    
    // Clear any existing messages
    if (messagesContainer) {
        messagesContainer.innerHTML = '';
        
        // Remove chat-active class to show welcome screen
        chatMainContent?.classList.remove('chat-active');
        
        // Create welcome screen
        const welcomeScreen = document.createElement('div');
        welcomeScreen.className = 'welcome-screen';
        welcomeScreen.innerHTML = `
            <h1>How can I help you?</h1>
            <p>Ask me anything about medicine, and I'll help you learn and understand.</p>
            <div class="suggestions">
                <div class="suggestion-chip">
                    <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                    Explain the cardiac cycle and its key phases
      </div>
                <div class="suggestion-chip">
                    <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                    </svg>
                    Create flashcards for the nervous system
        </div>
                <div class="suggestion-chip">
                    <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                    Help me understand diabetes pathophysiology
      </div>
                <div class="suggestion-chip">
                    <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 11l3 3L22 4"></path>
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                    </svg>
                    Quiz me on pharmacology concepts
      </div>
    </div>
  `;
  
        // Add click handlers for suggestion chips
        welcomeScreen.querySelectorAll('.suggestion-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const messageInput = document.querySelector('#message-input');
                if (messageInput) {
                    messageInput.value = chip.textContent.trim();
                    messageInput.focus();
                    sendChatMessage();
                }
            });
        });
        
        // Append welcome screen to messages container
        messagesContainer.appendChild(welcomeScreen);
    }
}

function toggleTheme() {
    const isDark = document.body.classList.contains('dark');
    document.body.classList.toggle('dark', !isDark);
    document.body.classList.toggle('light', isDark);
    localStorage.setItem('theme', isDark ? 'light' : 'dark');
}

// Tool Navigation
function switchTool(toolId) {
    const tools = ['chat', 'flashcards', 'exams', 'planner'];
    tools.forEach(tool => {
        const view = document.getElementById(`${tool}-view`);
        if (view) {
            if (tool === toolId) {
                view.style.display = tool === 'chat' ? 'grid' : 'block';
            } else {
                view.style.display = 'none';
            }
        }
    });

    // Update header
    const toolInfo = {
        chat: {
            title: 'AI Chatbot',
            description: 'Get instant answers to your medical questions'
        },
        flashcards: {
            title: 'AI Flashcards',
            description: 'Create and study custom flashcard sets'
        },
        exams: {
            title: 'AI Practice Exams',
            description: 'Test your knowledge with practice questions'
        },
        planner: {
            title: 'AI Study Planner',
            description: 'Generate personalized study schedules'
        }
    };

    // Update current tool in header
    document.querySelectorAll('.dropdown-item').forEach(item => {
        if (item.dataset.tool === toolId) {
            document.querySelector('.current-tool').textContent = item.textContent.trim();
        }
    });
    
    // Update tool header content
    const header = document.querySelector(`#${toolId}-view .tool-header`);
    if (header && toolInfo[toolId]) {
        header.querySelector('h1').textContent = toolInfo[toolId].title;
        header.querySelector('p').textContent = toolInfo[toolId].description;
    }

    // Show/hide chat panel
    const chatSidePanel = document.querySelector('.chat-side-panel');
    if (chatSidePanel) {
        chatSidePanel.style.display = toolId === 'chat' ? 'flex' : 'none';
    }
    
    // Adjust layout for mobile
    if (window.innerWidth <= 768 && toolId === 'chat') {
        const toggleBtn = document.querySelector('.toggle-panel-btn');
        if (!toggleBtn) {
            const newToggleBtn = document.createElement('button');
            newToggleBtn.className = 'toggle-panel-btn';
            newToggleBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="3" y1="12" x2="21" y2="12"></line>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          `;
            newToggleBtn.addEventListener('click', toggleSidePanel);
            document.body.appendChild(newToggleBtn);
        }
        } else {
        const toggleBtn = document.querySelector('.toggle-panel-btn');
        if (toggleBtn) {
            toggleBtn.style.display = toolId === 'chat' ? 'flex' : 'none';
        }
    }

    if (toolId === 'flashcards') {
        initializeFlashcardsView();
    }
}

// Chat Interface with Server-Sent Events
let messageHistory = [];
let chatHistory = [];
let currentChatId = null;
let eventSource = null;

// Generate a unique ID for each chat
function generateChatId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Initialize a new chat
function startNewChat() {
    // Save current chat if it exists and has messages
    saveCurrentChat();
    
    // Create new chat
    currentChatId = generateChatId();
    messageHistory = [];
    
    // Clear message container
    document.querySelector('.messages').innerHTML = '';
    
    // Update history panel
    updateChatHistoryPanel();
}

// Save current chat to history
function saveCurrentChat() {
    if (currentChatId && messageHistory.length > 0) {
        // Get first user message as title
        const firstUserMessage = messageHistory.find(msg => msg.role === 'user');
        const title = firstUserMessage ? 
            (firstUserMessage.content.length > 30 ? 
                firstUserMessage.content.substring(0, 30) + '...' : 
                firstUserMessage.content) : 
            'New Chat';
        
        // Create or update chat in history
        const existingChatIndex = chatHistory.findIndex(chat => chat.id === currentChatId);
        const chatData = {
            id: currentChatId,
            title: title,
            messages: [...messageHistory],
            date: new Date().toISOString()
        };
        
        if (existingChatIndex >= 0) {
            chatHistory[existingChatIndex] = chatData;
        } else {
            chatHistory.unshift(chatData);
        }
        
        // Save to localStorage
        localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
    }
}

// Load chat from history
function loadChat(chatId) {
    // Save current chat first
    saveCurrentChat();
    
    // Find chat in history
    const chat = chatHistory.find(c => c.id === chatId);
    if (chat) {
        currentChatId = chat.id;
        messageHistory = [...chat.messages];
        
        // Display messages
        const messagesContainer = document.querySelector('.messages');
    messagesContainer.innerHTML = '';
        messageHistory.forEach(msg => {
            displayMessage(msg.content, msg.role === 'user');
        });
        
        // Update active state in history panel
        updateChatHistoryPanel();
    }
}

// Update the displayMessage function to handle streaming
function displayMessage(content, isUser = false) {
    const messagesContainer = document.querySelector('.messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'bot-message'}`;
    
    // For bot messages, parse markdown
    if (!isUser) {
        messageDiv.innerHTML = marked.parse(content);
    } else {
        messageDiv.textContent = content;
    }
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    return messageDiv;
}

// Function to update streaming message content
function updateStreamingMessage(messageElement, content) {
    if (messageElement) {
        messageElement.innerHTML = marked.parse(content);
    }
}

// Function to finalize bot message with action buttons
function finalizeBotMessage(messageElement, content) {
    if (messageElement) {
        // Update final content
        messageElement.innerHTML = marked.parse(content);
        
        // Add action buttons
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'message-actions';
        
        // Copy button
        const copyBtn = document.createElement('button');
        copyBtn.className = 'message-action-btn';
        copyBtn.setAttribute('data-tooltip', 'Copy to clipboard');
        copyBtn.innerHTML = `<svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" height="1em" width="1em"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>`;
        copyBtn.onclick = () => {
            navigator.clipboard.writeText(content);
            copyBtn.classList.add('active');
            setTimeout(() => copyBtn.classList.remove('active'), 2000);
        };

        // Thumbs up button
        const thumbsUpBtn = document.createElement('button');
        thumbsUpBtn.className = 'message-action-btn';
        thumbsUpBtn.setAttribute('data-tooltip', 'Good response');
        thumbsUpBtn.innerHTML = `<svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" height="1em" width="1em"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>`;
        thumbsUpBtn.onclick = () => {
            thumbsUpBtn.classList.toggle('active');
            if (thumbsDownBtn.classList.contains('active')) {
                thumbsDownBtn.classList.remove('active');
            }
        };

        // Thumbs down button
        const thumbsDownBtn = document.createElement('button');
        thumbsDownBtn.className = 'message-action-btn';
        thumbsDownBtn.setAttribute('data-tooltip', 'Bad response');
        thumbsDownBtn.innerHTML = `<svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" height="1em" width="1em"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"></path></svg>`;
        thumbsDownBtn.onclick = () => {
            thumbsDownBtn.classList.toggle('active');
            if (thumbsUpBtn.classList.contains('active')) {
                thumbsUpBtn.classList.remove('active');
            }
        };

        // Speaker button
        const speakerBtn = document.createElement('button');
        speakerBtn.className = 'message-action-btn';
        speakerBtn.setAttribute('data-tooltip', 'Play audio');
        speakerBtn.innerHTML = `<svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" height="1em" width="1em"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`;
        speakerBtn.onclick = async () => {
            try {
                const response = await fetch('/chat/speak', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ text: content })
                });
                
                if (!response.ok) throw new Error('Failed to generate speech');
                
                const data = await response.json();
                const audio = new Audio(data.audio_url);
                audio.play();
                
                speakerBtn.classList.add('active');
                audio.onended = () => speakerBtn.classList.remove('active');
            } catch (error) {
                console.error('Error playing audio:', error);
            }
        };

        // Regenerate button
        const regenerateBtn = document.createElement('button');
        regenerateBtn.className = 'message-action-btn';
        regenerateBtn.setAttribute('data-tooltip', 'Regenerate response');
        regenerateBtn.innerHTML = `<svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" height="1em" width="1em"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"></path></svg>`;
        regenerateBtn.onclick = () => {
            // Remove the last bot message from history
            if (messageHistory.length > 0) {
                messageHistory.pop();
            }
            // Resend the last user message
            sendChatMessage();
        };

        actionsDiv.appendChild(copyBtn);
        actionsDiv.appendChild(thumbsUpBtn);
        actionsDiv.appendChild(thumbsDownBtn);
        actionsDiv.appendChild(speakerBtn);
        actionsDiv.appendChild(regenerateBtn);
        
        messageElement.appendChild(actionsDiv);
    }
}

// Update the sendChatMessage function to use the new message handling
async function sendChatMessage() {
    const messageInput = document.querySelector('#message-input');
    if (!messageInput) return;
    
    const message = messageInput.value.trim();
    if (!message) return;
    
    // Remove welcome screen by adding chat-active class
    document.querySelector('.chat-main-content')?.classList.add('chat-active');
    
    // Clear input and reset height
    messageInput.value = '';
    messageInput.style.height = 'auto';
    
    // Display user message
    displayMessage(message, true);
    
    // Add to message history
    messageHistory.push({
        type: 'user',
        content: message,
        timestamp: new Date().toISOString()
    });
    
    try {
        // Show typing indicator
        showTypingIndicator();
        
        const response = await fetch('/chat/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'text/event-stream'
            },
            body: JSON.stringify({
                message: message,
                history: messageHistory.map(msg => ({
                    type: msg.type,
                    content: msg.content
                }))
            })
        });

        if (!response.ok) {
            hideTypingIndicator();
            throw new Error(`Server error: ${response.status}`);
        }

        hideTypingIndicator();

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let currentResponse = '';
        let messageElement = null;

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (line.trim() === '' || !line.startsWith('data: ')) continue;

                const data = line.slice(6);
                if (data === '[DONE]') {
                    // Finalize message with action buttons
                    finalizeBotMessage(messageElement, currentResponse);
                    
                    // Save to history
                    messageHistory.push({
                        type: 'assistant',
                        content: currentResponse,
                        timestamp: new Date().toISOString()
                    });
                    
                    saveCurrentChat();
                    return;
                }

                try {
                    const parsed = JSON.parse(data);
                    if (parsed.content) {
                        if (!currentResponse) {
                            currentResponse = parsed.content;
                            messageElement = displayMessage(currentResponse, false);
                        } else {
                            currentResponse += parsed.content;
                            updateStreamingMessage(messageElement, currentResponse);
                        }
                    }
                } catch (err) {
                    console.error('Error parsing SSE data:', err);
                }
            }
        }
    } catch (error) {
        console.error('Error sending message:', error);
        hideTypingIndicator();
        displayMessage(`Error: ${error.message}`, false);
    }
}

// Initialize chat history from localStorage
function initializeChatHistory() {
    const savedHistory = localStorage.getItem('chatHistory');
    if (savedHistory) {
        chatHistory = JSON.parse(savedHistory);
    }
    
    // Create new chat if none exists
    if (!currentChatId) {
        startNewChat();
    }
    
    updateChatHistoryPanel();
}

// Update chat history panel
function updateChatHistoryPanel() {
    const historyContainer = document.querySelector('.chat-history');
    if (!historyContainer) return;
    
    // Clear existing history
    const historyList = historyContainer.querySelector('.history-list');
    historyList.innerHTML = '';
    
    // Add history items
    chatHistory.forEach(chat => {
        const historyItem = document.createElement('div');
        historyItem.className = `history-item${chat.id === currentChatId ? ' active' : ''}`;
        
        historyItem.innerHTML = `
            <div class="history-item-content">
                <div class="history-item-title">${chat.title}</div>
                <div class="history-item-date">${new Date(chat.date).toLocaleDateString()}</div>
          </div>
            <button class="delete-chat-btn" data-chat-id="${chat.id}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
        `;
        
        // Add click handler to load chat
        historyItem.addEventListener('click', (e) => {
            if (!e.target.closest('.delete-chat-btn')) {
                loadChat(chat.id);
            }
        });
        
        historyList.appendChild(historyItem);
    });
    
    // Add delete handlers
    document.querySelectorAll('.delete-chat-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const chatId = btn.dataset.chatId;
            deleteChat(chatId);
    });
  });
  
    // Show/hide empty state
    const emptyState = historyContainer.querySelector('.empty-history');
    if (emptyState) {
        emptyState.style.display = chatHistory.length === 0 ? 'flex' : 'none';
    }
}

// Delete chat from history
function deleteChat(chatId) {
    chatHistory = chatHistory.filter(chat => chat.id !== chatId);
    localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
    
    // If current chat was deleted, start a new one
    if (chatId === currentChatId) {
        startNewChat();
  } else {
        updateChatHistoryPanel();
    }
}

// Clear all chat history
function clearAllHistory() {
    chatHistory = [];
    localStorage.removeItem('chatHistory');
    startNewChat();
}

// Toggle the side panel on mobile
function toggleSidePanel() {
    const panel = document.querySelector('.chat-side-panel');
    panel.classList.toggle('active');
}

// Flashcards Interface
let currentFlashcards = [];
let currentCardIndex = 0;

async function generateFlashcards(event) {
    event.preventDefault();
    const topic = document.getElementById('flashcard-topic').value;
    const count = document.getElementById('flashcard-count').value;
    const generateButton = document.querySelector('.flashcard-form button');

    if (!topic) {
        showError('Please enter a topic');
        return;
    }

    // Update button state
    generateButton.disabled = true;
    const originalButtonText = generateButton.innerHTML;
    generateButton.innerHTML = `
        <svg class="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M12 6v6l4 2"></path>
        </svg>
        Generating...
    `;

    showLoading('flashcards-loading');

    try {
        const response = await fetch('/flashcard/generate-flashcards', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                topic: topic,
                num_cards: parseInt(count),
                university: 'McMaster University',
                course: 'Medicine',
                difficulty: 'intermediate'
            })
        });

        if (!response.ok) {
            throw new Error('Failed to generate flashcards');
        }

        const data = await response.json();
        
        // Reset state before setting new flashcards
        currentCardIndex = 0;
        currentFlashcards = [];
        
        // Process the flashcards data
        currentFlashcards = data.flashcards.map(card => ({
            question: card.question || card.front,
            answer: card.answer || card.back
        }));
        
        // Update both views
        updateFlashcard();
        updateFlashcardsList();
        
        // Show success message
        showSuccess('Flashcards generated successfully!');
        
        // Switch to cards mode
        toggleStudyMode('cards');
        
    } catch (error) {
        console.error('Error generating flashcards:', error);
        showError('Failed to generate flashcards. Please try again.');
    } finally {
        // Reset button state
        generateButton.disabled = false;
        generateButton.innerHTML = originalButtonText;
        hideLoading('flashcards-loading');
    }
}

function updateFlashcard() {
    if (currentFlashcards.length === 0) return;
    
    const card = currentFlashcards[currentCardIndex];
    const flashcard = document.querySelector('.flashcard');
    const frontDiv = flashcard.querySelector('.flashcard-front');
    const backDiv = flashcard.querySelector('.flashcard-back');
    
    // Update content with markdown parsing
    frontDiv.innerHTML = marked.parse(card.question);
    backDiv.innerHTML = marked.parse(card.answer);
    
    // Update counter
    const counter = document.querySelector('.flashcard-counter');
    counter.textContent = `${currentCardIndex + 1} / ${currentFlashcards.length}`;
    
    // Reset flip state
    flashcard.classList.remove('flipped');
    
    // Update navigation buttons
    const prevButton = document.querySelector('.prev-card');
    const nextButton = document.querySelector('.next-card');
    
    if (prevButton) prevButton.disabled = currentCardIndex === 0;
    if (nextButton) nextButton.disabled = currentCardIndex === currentFlashcards.length - 1;
}

function updateFlashcardsList() {
    const listContainer = document.querySelector('.flashcards-list');
    if (!listContainer) return;
    
    listContainer.innerHTML = '';

    currentFlashcards.forEach((card, index) => {
        const listItem = document.createElement('div');
        listItem.className = 'flashcard-list-item';
        listItem.innerHTML = `
            <div class="question">${marked.parse(card.question)}</div>
            <div class="answer">${marked.parse(card.answer)}</div>
        `;
        listContainer.appendChild(listItem);
    });
}

function flipCard() {
    const flashcard = document.querySelector('.flashcard');
    flashcard.classList.toggle('flipped');
}

function toggleStudyMode(mode) {
    const cardsMode = document.getElementById('cards-mode');
    const listMode = document.getElementById('list-mode');
    const buttons = document.querySelectorAll('.study-mode-btn');

    buttons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    if (mode === 'cards') {
        cardsMode.style.display = 'block';
        listMode.style.display = 'none';
    } else {
        cardsMode.style.display = 'none';
        listMode.style.display = 'block';
    }
}

function initializeFlashcardListeners() {
    // Remove any existing listeners first
    const flashcard = document.querySelector('.flashcard');
    const prevButton = document.querySelector('.prev-card');
    const nextButton = document.querySelector('.next-card');
    const studyModeButtons = document.querySelectorAll('.study-mode-btn');
    const flashcardForm = document.querySelector('.flashcard-form');

    // Remove old listeners by cloning and replacing elements
    if (prevButton) {
        const newPrevButton = prevButton.cloneNode(true);
        prevButton.parentNode.replaceChild(newPrevButton, prevButton);
        newPrevButton.addEventListener('click', (e) => {
            e.stopPropagation();
            if (currentCardIndex > 0) {
                currentCardIndex--;
                updateFlashcard();
            }
        });
    }

    if (nextButton) {
        const newNextButton = nextButton.cloneNode(true);
        nextButton.parentNode.replaceChild(newNextButton, nextButton);
        newNextButton.addEventListener('click', (e) => {
            e.stopPropagation();
            if (currentCardIndex < currentFlashcards.length - 1) {
                currentCardIndex++;
                updateFlashcard();
            }
        });
    }

    if (flashcard) {
        const newFlashcard = flashcard.cloneNode(true);
        flashcard.parentNode.replaceChild(newFlashcard, flashcard);
        newFlashcard.addEventListener('click', flipCard);
    }

    // Study mode toggle
    studyModeButtons.forEach(button => {
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        newButton.addEventListener('click', () => {
            const mode = newButton.dataset.mode;
            toggleStudyMode(mode);
        });
    });

    // Flashcard generation form
    if (flashcardForm) {
        const newForm = flashcardForm.cloneNode(true);
        flashcardForm.parentNode.replaceChild(newForm, flashcardForm);
        newForm.addEventListener('submit', generateFlashcards);
    }

    // Remove old keyboard listener and add new one
    document.removeEventListener('keydown', handleKeyboardNavigation);
    document.addEventListener('keydown', handleKeyboardNavigation);
}

// Separate keyboard handler function
function handleKeyboardNavigation(e) {
    if (document.getElementById('flashcards-view').style.display !== 'none') {
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            if (currentCardIndex > 0) {
                currentCardIndex--;
                updateFlashcard();
            }
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            if (currentCardIndex < currentFlashcards.length - 1) {
                currentCardIndex++;
                updateFlashcard();
            }
        } else if (e.key === ' ') {
            e.preventDefault();
            const flashcard = document.querySelector('.flashcard');
            flashcard?.click();
        }
    }
}

// Call this when switching to flashcards view
function initializeFlashcardsView() {
    // Reset state
    currentCardIndex = 0;
    
    // Only update if there are flashcards
    if (currentFlashcards.length > 0) {
        updateFlashcard();
    }
    
    // Initialize listeners
    initializeFlashcardListeners();
    
    // Update navigation button states
    const prevButton = document.querySelector('.prev-card');
    const nextButton = document.querySelector('.next-card');
    
    if (prevButton) prevButton.disabled = currentCardIndex === 0;
    if (nextButton) nextButton.disabled = !currentFlashcards.length || currentCardIndex === currentFlashcards.length - 1;
}

// Practice Exams Interface
let examQuestions = [];
let currentQuestionIndex = 0;
let userAnswers = [];

async function generateExam(event) {
    event.preventDefault();
    const topic = document.getElementById('exam-topic').value;
    const difficulty = document.getElementById('exam-difficulty').value;
    const count = document.getElementById('question-count').value;

    if (!topic) return;

    showLoading('exam-loading');

    try {
        const response = await fetch('/exam/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
            body: JSON.stringify({ topic, difficulty, count })
        });
    
    if (!response.ok) {
            throw new Error('Failed to generate exam');
        }

        const data = await response.json();
        examQuestions = data.questions;
        currentQuestionIndex = 0;
        userAnswers = new Array(examQuestions.length).fill(null);
        
        hideLoading('exam-loading');
        updateQuestion();
        document.querySelector('.submit-exam').style.display = 'block';
        
    } catch (error) {
        hideLoading('exam-loading');
        showError('Failed to generate exam. Please try again.');
    }
}

function updateQuestion() {
    if (examQuestions.length === 0) return;

    const question = examQuestions[currentQuestionIndex];
    const container = document.querySelector('.question-container');
    const counter = document.querySelector('.question-counter');
    const progress = document.querySelector('.progress-fill');

    container.innerHTML = `
        <h3>${question.question}</h3>
        <div class="options">
            ${question.options.map((option, index) => `
                <label class="option ${userAnswers[currentQuestionIndex] === index ? 'selected' : ''}">
                    <input type="radio" name="answer" value="${index}" ${userAnswers[currentQuestionIndex] === index ? 'checked' : ''}>
                    ${option}
                </label>
            `).join('')}
          </div>
        `;
        
    counter.textContent = `Question ${currentQuestionIndex + 1} of ${examQuestions.length}`;
    progress.style.width = `${((currentQuestionIndex + 1) / examQuestions.length) * 100}%`;

    // Add event listeners to options
    container.querySelectorAll('input[type="radio"]').forEach(input => {
        input.addEventListener('change', () => {
            userAnswers[currentQuestionIndex] = parseInt(input.value);
            updateQuestion();
        });
    });
}

async function submitExam() {
    const unanswered = userAnswers.includes(null);
    if (unanswered && !confirm('You have unanswered questions. Submit anyway?')) {
        return;
      }
      
    showLoading('exam-loading');

    try {
        const response = await fetch('/exam/grade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
                answers: userAnswers,
                questions: examQuestions
            })
        });

        if (!response.ok) {
            throw new Error('Failed to grade exam');
        }

        const data = await response.json();
        
        hideLoading('exam-loading');
        
        const resultsDiv = document.querySelector('.exam-results');
        resultsDiv.querySelector('.score-value').textContent = `${data.score}%`;
        resultsDiv.querySelector('.correct-count').textContent = `${data.correct} of ${examQuestions.length}`;
        
        const breakdown = resultsDiv.querySelector('.results-breakdown');
        breakdown.innerHTML = data.results.map((result, index) => `
            <div class="result-item ${result.isCorrect ? 'correct' : 'incorrect'}">
                <h4>Question ${index + 1}</h4>
                <p>${result.question}</p>
                <p>Your answer: ${result.userAnswer || 'Not answered'}</p>
                <p>Correct answer: ${result.correctAnswer}</p>
                <p class="explanation">${result.explanation}</p>
            </div>
        `).join('');

        resultsDiv.style.display = 'block';
        document.querySelector('.exam-content').style.display = 'none';
        
    } catch (error) {
        hideLoading('exam-loading');
        showError('Failed to grade exam. Please try again.');
    }
}

// Study Planner Interface
let calendar = null;

async function generateStudyPlan(event) {
    event.preventDefault();
    const fileInput = document.getElementById('syllabus-upload');
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    const studyHours = document.getElementById('study-hours').value;

    if (!fileInput.files[0] || !startDate || !endDate || !studyHours) return;

    const formData = new FormData();
    formData.append('syllabus', fileInput.files[0]);
    formData.append('start_date', startDate);
    formData.append('end_date', endDate);
    formData.append('study_hours', studyHours);

    showLoading('planner-loading');

    try {
        // First, process the syllabus
        const processResponse = await fetch('/calendar/process-syllabus', {
        method: 'POST',
        body: formData
        });

        if (!processResponse.ok) {
            throw new Error('Failed to process syllabus');
        }

        const processData = await processResponse.json();

        // Then, generate the study plan
        const planResponse = await fetch('/calendar/generate-plan', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                start_date: startDate,
                end_date: endDate,
                study_hours: parseInt(studyHours),
                extracted_data: processData
            })
        });

        if (!planResponse.ok) {
            throw new Error('Failed to generate study plan');
        }

        const planData = await planResponse.json();
        calendar = planData.calendar;
        
        hideLoading('planner-loading');
        updateCalendar();
        
    } catch (error) {
        hideLoading('planner-loading');
        showError('Failed to generate study plan. Please try again.');
    }
}

function updateCalendar() {
    if (!calendar) return;

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    document.querySelector('.current-month').textContent = 
        new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long', year: 'numeric' });

    const datesGrid = document.querySelector('.calendar-dates');
    datesGrid.innerHTML = '';

    // Add empty cells for days before the 1st
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    for (let i = 0; i < firstDay; i++) {
        datesGrid.appendChild(document.createElement('div'));
    }

    // Add days of the month
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
        const dateString = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        const dayDiv = document.createElement('div');
        dayDiv.className = 'calendar-date';
        dayDiv.textContent = day;

        if (calendar[dateString]) {
            dayDiv.classList.add('has-topics');
            dayDiv.setAttribute('data-topics', calendar[dateString].join('\n'));
            
            // Add click event to show topics
            dayDiv.addEventListener('click', () => {
                updateStudyTopics(new Date(dateString));
            });
        }

        datesGrid.appendChild(dayDiv);
    }

    // Update study topics for current date
    updateStudyTopics(currentDate);
}

function updateStudyTopics(date) {
    const dateString = date.toISOString().split('T')[0];
    const topics = calendar[dateString] || [];
    
    const topicsDiv = document.querySelector('.study-topics');
    topicsDiv.innerHTML = topics.length ? topics.map(topic => `
        <div class="study-topic">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 6v6l4 2"></path>
            </svg>
            ${topic}
        </div>
    `).join('') : '<p>No topics scheduled for this date</p>';
}

async function exportToCalendar() {
    try {
        // First check if user is authenticated
        const authResponse = await fetch('/calendar/check-auth');
        const authData = await authResponse.json();

        if (!authData.authenticated) {
            // Get authorization URL
            const urlResponse = await fetch('/calendar/get-calendar-url');
            const urlData = await urlResponse.json();
            
            // Redirect to Google OAuth
            window.location.href = urlData.url;
      return;
    }
    
        showLoading('planner-loading');

        // Export events to Google Calendar
        const response = await fetch('/calendar/add-to-calendar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ calendar: calendar })
        });

        if (!response.ok) {
            throw new Error('Failed to export to calendar');
        }

        hideLoading('planner-loading');
        showSuccess('Successfully exported to Google Calendar!');

    } catch (error) {
        hideLoading('planner-loading');
        showError('Failed to export to calendar. Please try again.');
    }
}

async function downloadPDF() {
    try {
        showLoading('planner-loading');

        const response = await fetch('/calendar/download-pdf', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ calendar: calendar })
        });

        if (!response.ok) {
            throw new Error('Failed to generate PDF');
        }

        // Create a blob from the PDF Stream
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'study_plan.pdf';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();

        hideLoading('planner-loading');

    } catch (error) {
        hideLoading('planner-loading');
        showError('Failed to download PDF. Please try again.');
    }
}

// Utility Functions
function showLoading(id) {
    const loading = document.getElementById(id);
    if (loading) {
        loading.style.display = 'block';
        loading.innerHTML = `
            <div class="loading-spinner"></div>
            <p>Loading...</p>
        `;
    }
}

function hideLoading(id) {
    const loading = document.getElementById(id);
    if (loading) {
        loading.style.display = 'none';
    }
}

function showError(message) {
    const error = document.createElement('div');
    error.className = 'error-message';
    error.textContent = message;
    document.body.appendChild(error);
    setTimeout(() => error.remove(), 5000);
}

function showSuccess(message) {
    const success = document.createElement('div');
    success.className = 'success-message';
    success.textContent = message;
    document.body.appendChild(success);
    setTimeout(() => success.remove(), 5000);
}

function showTypingIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'typing-indicator';
    indicator.innerHTML = '<span></span><span></span><span></span>';
    document.querySelector('.messages').appendChild(indicator);
}

function hideTypingIndicator() {
    const indicator = document.querySelector('.typing-indicator');
    if (indicator) {
        indicator.remove();
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Theme toggle
    document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);

    // Tool navigation
    document.querySelectorAll('.tool-btn').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            switchTool(button.dataset.tool);
        });
    });

    // Chat history initialization
    try {
        const savedHistory = localStorage.getItem('chatHistory');
        if (savedHistory) {
            chatHistory = JSON.parse(savedHistory);
        }
    } catch (e) {
        console.error('Error loading chat history:', e);
        chatHistory = [];
    }
    
    // Initialize with a new chat if none exists
    if (!currentChatId) {
        startNewChat();
    }
    
    // Add event listeners for chat sidebar
    document.querySelector('.side-panel-header .new-chat-btn')?.addEventListener('click', startNewChat);
    document.querySelector('.clear-history-btn')?.addEventListener('click', clearAllHistory);
    
    // Mobile toggle button - add to DOM if needed
    if (window.innerWidth <= 768) {
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'toggle-panel-btn';
        toggleBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
        `;
        toggleBtn.addEventListener('click', toggleSidePanel);
        document.body.appendChild(toggleBtn);
    }

    // New chat button
    document.getElementById('new-chat')?.addEventListener('click', () => {
        messageHistory = [];
        document.querySelector('.messages').innerHTML = '';
    });

    // Chat form
    document.querySelector('.chat-form')?.addEventListener('submit', sendChatMessage);

    // Flashcards
    document.querySelector('.flashcard-form')?.addEventListener('submit', generateFlashcards);
    document.querySelector('.flashcard')?.addEventListener('click', flipCard);
    document.querySelector('.prev-card')?.addEventListener('click', prevCard);
    document.querySelector('.next-card')?.addEventListener('click', nextCard);
    
    // Study mode toggles
    document.querySelectorAll('.study-mode-btn')?.forEach(btn => {
        btn.addEventListener('click', () => toggleStudyMode(btn.dataset.mode));
    });

    // Practice Exams
    document.querySelector('.exam-form')?.addEventListener('submit', generateExam);
    document.querySelector('.prev-question')?.addEventListener('click', () => {
        if (currentQuestionIndex > 0) {
            currentQuestionIndex--;
            updateQuestion();
        }
    });
    document.querySelector('.next-question')?.addEventListener('click', () => {
        if (currentQuestionIndex < examQuestions.length - 1) {
            currentQuestionIndex++;
            updateQuestion();
        }
    });
    document.querySelector('.submit-exam')?.addEventListener('click', submitExam);
    document.querySelector('.try-again')?.addEventListener('click', () => {
        document.querySelector('.exam-results').style.display = 'none';
        document.querySelector('.exam-content').style.display = 'block';
        document.querySelector('.exam-form').reset();
    });

    // Study Planner
    document.querySelector('.planner-form')?.addEventListener('submit', generateStudyPlan);
    document.querySelector('.prev-month')?.addEventListener('click', () => {
        const current = document.querySelector('.current-month').textContent;
        const [month, year] = current.split(' ');
        const date = new Date(year, new Date(Date.parse(month + ' 1, ' + year)).getMonth() - 1);
        updateCalendar(date);
    });
    document.querySelector('.next-month')?.addEventListener('click', () => {
        const current = document.querySelector('.current-month').textContent;
        const [month, year] = current.split(' ');
        const date = new Date(year, new Date(Date.parse(month + ' 1, ' + year)).getMonth() + 1);
        updateCalendar(date);
    });
    document.querySelector('.export-calendar')?.addEventListener('click', exportToCalendar);
    document.querySelector('.download-pdf')?.addEventListener('click', downloadPDF);
    
    // File upload
    document.getElementById('syllabus-upload')?.addEventListener('change', (event) => {
        const fileName = event.target.files[0]?.name;
        if (fileName) {
            document.querySelector('.selected-file').textContent = fileName;
        }
    });

    // Initialize chat history panel
    updateChatHistoryPanel();

    // Initialize with chat view
    switchTool('chat');

    // Initialize flashcard listeners
    initializeFlashcardListeners();
});
