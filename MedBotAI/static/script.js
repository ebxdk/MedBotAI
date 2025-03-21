document.addEventListener('DOMContentLoaded', () => {
    console.log('=== Document Ready - Initializing Application ===');
    
    // Initialize chat interface first
    initializeChatInterface();
    
    // Initialize scroll functionality
    initializeScrollFunctionality();
    
    const theme = localStorage.getItem('theme') || 'dark';
    document.body.classList.toggle('dark', theme === 'dark');
    document.body.classList.toggle('light', theme === 'light');

    // Global variables for exam functionality
    window.examQuestions = [];
    window.currentQuestionIndex = 0;
    window.userAnswers = [];

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

    // Process URL parameters
    handleURLParameters();

    // Initialize study planner if the view exists
    const plannerView = document.getElementById('planner-view');
    if (plannerView) {
        console.log('Planner view found, initializing study planner...');
        initializeStudyPlanner();
    }
    
    console.log('=== Application Initialization Complete ===');
});

function initializeChatInterface() {
    const messagesContainer = document.querySelector('.messages');
    const chatMainContent = document.querySelector('.chat-main-content');
    
    // Clear any existing messages
    if (messagesContainer) {
        messagesContainer.innerHTML = '';
        
        // Remove chat-active class to show welcome screen
        if (chatMainContent) {
            chatMainContent.classList.remove('chat-active');
        }
        
        // Create welcome screen
        const welcomeScreen = document.createElement('div');
        welcomeScreen.className = 'welcome-screen';
        welcomeScreen.innerHTML = `
            <div class="typewriter-container">
                <div class="line">
                    <h1><span>How can I help you?</span></h1>
                </div>
                <div class="line">
                    <div class="typing-text"><span>Ask me anything about medicine, and I'll help you learn and understand.</span></div>
                </div>
            </div>
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
                
                // If switching to exams view, make sure the layout is properly displayed
                if (tool === 'exams') {
                    const examLayout = view.querySelector('.exam-layout');
                    const examResults = view.querySelector('.exam-results');
                    
                    if (examResults.style.display === 'block') {
                        examLayout.style.display = 'none';
                    } else {
                        examLayout.style.display = 'grid';
                    }
                }
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
            description: 'Test your knowledge with customized practice exams'
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
    const toolHeader = document.querySelector(`#${toolId}-view .tool-header`);
    if (toolHeader && toolInfo[toolId]) {
        const headerTitle = toolHeader.querySelector('h1');
        const headerDesc = toolHeader.querySelector('p');
        
        if (headerTitle) headerTitle.textContent = toolInfo[toolId].title;
        if (headerDesc) headerDesc.textContent = toolInfo[toolId].description;
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
    } else if (toolId === 'exams') {
        initializeExamListeners();
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
    
    // Clear message container and show welcome screen
    const chatMainContent = document.querySelector('.chat-main-content');
    if (chatMainContent) {
        chatMainContent.classList.remove('chat-active');
    }
    initializeChatInterface();
    
    // Update history panel with temporary "New Chat" title
    const tempChatData = {
        id: currentChatId,
        title: 'New Chat',
        messages: [],
        date: new Date().toISOString(),
        isTemp: true // Flag to indicate this is a temporary title
    };
    
    // Add to beginning of chat history
    chatHistory.unshift(tempChatData);
    
    // Update history panel
    updateChatHistoryPanel();
}

// Save current chat to history with dynamic title
function saveCurrentChat() {
    if (currentChatId && messageHistory.length > 0) {
        // Find existing chat
        const existingChatIndex = chatHistory.findIndex(chat => chat.id === currentChatId);
        
        // Generate title from first user message or first bot response
        let title = 'New Chat';
        const firstUserMessage = messageHistory.find(msg => msg.type === 'user');
        const firstBotMessage = messageHistory.find(msg => msg.type === 'assistant');
        
        if (firstUserMessage) {
            // Use the first user message to generate a concise title
            title = generateChatTitle(firstUserMessage.content);
        } else if (firstBotMessage) {
            // Fallback to bot message if no user message
            title = generateChatTitle(firstBotMessage.content);
        }
        
        // Create or update chat data
        const chatData = {
            id: currentChatId,
            title: title,
            messages: [...messageHistory],
            date: new Date().toISOString()
        };
        
        if (existingChatIndex >= 0) {
            // Only update title if it was temporary
            if (chatHistory[existingChatIndex].isTemp) {
                chatHistory[existingChatIndex] = chatData;
            } else {
                // Keep existing title if not temporary
                chatData.title = chatHistory[existingChatIndex].title;
                chatHistory[existingChatIndex] = chatData;
            }
        } else {
            chatHistory.unshift(chatData);
        }
        
        // Save to localStorage
        localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
    }
}

// Helper function to generate a concise chat title
function generateChatTitle(content) {
    // Remove markdown formatting
    content = content.replace(/[#*`_~]/g, '');
    
    // Split into sentences and take the first one
    let sentences = content.split(/[.!?]+/);
    let firstSentence = sentences[0].trim();
    
    // If the first sentence is too long, take the first few words
    if (firstSentence.length > 40) {
        let words = firstSentence.split(' ');
        firstSentence = words.slice(0, 5).join(' ') + '...';
    } else if (firstSentence.length < 10 && sentences.length > 1) {
        // If first sentence is too short, include part of the second sentence
        firstSentence = (sentences[0] + ' ' + sentences[1]).slice(0, 40).trim() + '...';
    }
    
    // Capitalize first letter
    return firstSentence.charAt(0).toUpperCase() + firstSentence.slice(1);
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

// Update the displayMessage function to use auto-scroll
function displayMessage(content, isUser = false) {
    const messagesContainer = document.querySelector('.messages');
    const chatMainContent = document.querySelector('.chat-main-content');
    
    if (!messagesContainer || !chatMainContent) return null;
    
    // Remove welcome screen if present
    const welcomeScreen = messagesContainer.querySelector('.welcome-screen');
    if (welcomeScreen) {
        welcomeScreen.remove();
        chatMainContent.classList.add('chat-active');
    }
    
    const messageElement = document.createElement('div');
    messageElement.className = isUser ? 'message user user-message' : 'message bot bot-message';
    messageElement.innerHTML = `
        <div class="message-content">
            ${isUser ? marked.parse(content) : ''}
        </div>
    `;
    
    messagesContainer.appendChild(messageElement);
    scrollToBottom();
    
    return messageElement;
}

// Update the updateStreamingMessage function to use auto-scroll
function updateStreamingMessage(messageElement, content) {
    if (messageElement) {
        messageElement.querySelector('.message-content').innerHTML = marked.parse(content);
        scrollToBottom();
    }
}

// Function to update streaming message content
function finalizeBotMessage(messageElement, content) {
    if (messageElement) {
        // Ensure the message has the proper classes
        if (!messageElement.classList.contains('bot-message')) {
            messageElement.classList.add('bot-message');
        }
        
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
        speakerBtn.innerHTML = `<svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" height="1em" width="1em"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`;
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
    
    // If this is the first message, update the chat title
    if (messageHistory.length === 1) {
        saveCurrentChat(); // This will generate and save the title
        updateChatHistoryPanel(); // Update the display
    }
    
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
            <button class="delete-chat-btn" data-chat-id="${chat.id}" aria-label="Delete chat">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
    
    // Add delete handlers - now without confirmation
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
    const university = document.getElementById('exam-university').value;
    const course = document.getElementById('exam-course').value;
    const examType = document.getElementById('exam-type').value;
    const difficulty = document.getElementById('exam-difficulty').value;
    const generateButton = document.querySelector('.exam-form button');

    if (!university || !course) {
        showError('University and course are required');
        return;
    }

    // Update button to show generating state
    const originalButtonText = generateButton.innerHTML;
    generateButton.disabled = true;
    generateButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="spinner">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M12 6v6l4 2"></path>
        </svg>
        Generating...
    `;

    showLoading('exam-loading');

    try {
        // Make sure the exam layout is visible and results are hidden
        const examLayout = document.querySelector('.exam-layout');
        const examResults = document.querySelector('.exam-results');
        const container = document.querySelector('.question-container');
        
        if (examLayout) examLayout.style.display = 'grid';
        if (examResults) examResults.style.display = 'none';
        if (container) container.innerHTML = ''; // Clear previous content

        const response = await fetch('/exam/generate-exam', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                university, 
                course, 
                exam_type: examType, 
                difficulty
            })
        });

        if (!response.ok) {
            throw new Error('Failed to generate exam');
        }

        // Set up event source for streaming
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let examContent = '';

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (!line.trim() || !line.startsWith('data: ')) continue;

                const data = line.slice(6); // Remove 'data: ' prefix
                if (data === '[DONE]') {
                    hideLoading('exam-loading');
                    return;
                }

                try {
                    const parsed = JSON.parse(data);
                    if (parsed.content) {
                        examContent += parsed.content;
                        // Update the display in real-time with markdown parsing
                        container.innerHTML = `<div class="exam-text">${marked.parse(examContent)}</div>`;
                        container.scrollTop = container.scrollHeight;
                    }
                } catch (err) {
                    console.error('Error parsing SSE data:', err);
                }
            }
        }

        hideLoading('exam-loading');
        
    } catch (error) {
        hideLoading('exam-loading');
        showError('Failed to generate exam. Please try again.');
        console.error('Error generating exam:', error);
    } finally {
        // Reset button state
        generateButton.disabled = false;
        generateButton.innerHTML = originalButtonText;
    }
}

// Helper function to parse the exam content into questions
function parseExamContent(content) {
    if (!content || typeof content !== 'string') {
        console.error('Invalid exam content received:', content);
        return [];
    }

    const questions = [];
    
    try {
        // Split content into individual questions
        const questionBlocks = content.split(/Question \d+:/).slice(1); // slice(1) to remove the first empty element
        
        questionBlocks.forEach((block, index) => {
            const lines = block.split('\n').map(line => line.trim()).filter(line => line);
            
            // First line is the question text
            const questionText = lines[0];
            
            // Find all option lines (starting with A), B), C), D))
            const options = lines.filter(line => /^[A-D]\)/.test(line));
            
            if (questionText && options.length === 4) {
                questions.push({
                    question: questionText,
                    options: options,
                    correctAnswer: null
                });
            } else {
                console.warn(`Question ${index + 1} skipped:`, {
                    text: questionText,
                    options: options,
                    allLines: lines
                });
            }
        });
        
        console.log('Successfully parsed questions:', questions);
        return questions;
        
    } catch (error) {
        console.error('Error parsing exam content:', error);
        return [];
    }
}

function updateQuestion() {
    const container = document.querySelector('.question-container');
    const counter = document.querySelector('.question-counter');
    const progress = document.querySelector('.progress-fill');
    
    if (!container || !counter || !progress) {
        console.error('Required DOM elements not found');
        return;
    }

    if (!examQuestions || examQuestions.length === 0) {
        console.warn('No exam questions available');
        container.innerHTML = '<p class="no-questions">No questions available. Please generate an exam first.</p>';
        counter.textContent = '0 Questions';
        progress.style.width = '0%';
        return;
    }

    // Clear the container
    container.innerHTML = '';
    
    // Display all questions
    examQuestions.forEach((question, index) => {
        if (!question.question || !question.options || question.options.length !== 4) {
            console.warn(`Invalid question format at index ${index}:`, question);
            return;
        }

        const questionElement = document.createElement('div');
        questionElement.className = 'question-item';
        
        questionElement.innerHTML = `
            <h3>Question ${index + 1}</h3>
            <p>${question.question}</p>
            <div class="options">
                ${question.options.map((option, optIndex) => `
                    <label class="option ${userAnswers[index] === optIndex ? 'selected' : ''}">
                        <input type="radio" name="answer-${index}" value="${optIndex}" ${userAnswers[index] === optIndex ? 'checked' : ''}>
                        ${option}
                    </label>
                `).join('')}
            </div>
        `;
        
        container.appendChild(questionElement);
        
        // Add a separator between questions
        if (index < examQuestions.length - 1) {
            const separator = document.createElement('hr');
            separator.className = 'question-separator';
            container.appendChild(separator);
        }
    });
    
    // Update counter and progress
    const validQuestions = examQuestions.filter(q => q.question && q.options && q.options.length === 4).length;
    counter.textContent = `${validQuestions} Questions`;
    
    const answeredCount = userAnswers.filter(a => a !== null).length;
    const progressPercentage = validQuestions > 0 ? (answeredCount / validQuestions) * 100 : 0;
    progress.style.width = `${progressPercentage}%`;

    // Add event listeners to options
    container.querySelectorAll('input[type="radio"]').forEach(input => {
        input.addEventListener('change', () => {
            const questionIndex = parseInt(input.name.split('-')[1]);
            userAnswers[questionIndex] = parseInt(input.value);
            
            // Update selected class
            const options = container.querySelectorAll(`input[name="answer-${questionIndex}"]`);
            options.forEach(opt => {
                opt.parentElement.classList.remove('selected');
            });
            input.parentElement.classList.add('selected');
            
            // Update progress bar
            const newAnsweredCount = userAnswers.filter(a => a !== null).length;
            const newProgressPercentage = validQuestions > 0 ? (newAnsweredCount / validQuestions) * 100 : 0;
            progress.style.width = `${newProgressPercentage}%`;
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

        // Hide the exam layout and show the results
        document.querySelector('.exam-layout').style.display = 'none';
        resultsDiv.style.display = 'block';
        
    } catch (error) {
        hideLoading('exam-loading');
        showError('Failed to grade exam. Please try again.');
        console.error(error);
    }
}

// Initialize exam interface
function initializeExamListeners() {
    const examForm = document.querySelector('.exam-form');
    const submitButton = document.querySelector('.submit-exam');
    const tryAgainButton = document.querySelector('.try-again');
    
    if (examForm) {
        examForm.addEventListener('submit', generateExam);
    }
    
    if (submitButton) {
        submitButton.addEventListener('click', submitExam);
    }
    
    if (tryAgainButton) {
        tryAgainButton.addEventListener('click', () => {
            // Reset the exam form
            document.querySelector('.exam-results').style.display = 'none';
            document.querySelector('.exam-layout').style.display = 'grid';
            
            // Clear the form fields
            document.getElementById('exam-university').value = '';
            document.getElementById('exam-course').value = '';
            
            // Reset the question container
            document.querySelector('.question-container').innerHTML = '';
            document.querySelector('.question-counter').textContent = 'Question 0 of 0';
            document.querySelector('.progress-fill').style.width = '0%';
            
            // Hide the submit button
            document.querySelector('.submit-exam').style.display = 'none';
        });
    }
}

// Study Planner Interface
let calendar = null;

async function processSyllabus(event) {
    console.log('=== Starting syllabus upload process ===');
    
    if (event) {
        event.preventDefault();
        event.stopPropagation();
        console.log('Event prevented default behavior');
    }
    
    const fileUpload = document.getElementById('syllabus-upload');
    const uploadButton = document.getElementById('upload-file-btn');
    const generateButton = document.getElementById('generate-plan-btn');
    const exportButton = document.querySelector('.export-calendar-btn');
    
    console.log('DOM Elements:', {
        fileUpload: fileUpload ? 'Found' : 'Not found',
        uploadButton: uploadButton ? 'Found' : 'Not found',
        generateButton: generateButton ? 'Found' : 'Not found'
    });
    
    // Check if file is selected
    if (!fileUpload || !fileUpload.files || !fileUpload.files[0]) {
        console.error('No file selected:', {
            fileUpload: !!fileUpload,
            hasFiles: !!(fileUpload && fileUpload.files),
            filesLength: fileUpload && fileUpload.files ? fileUpload.files.length : 0
        });
        showError('Please select a PDF file first');
        generateButton.disabled = true;
        exportButton.disabled = true;
        return;
    }
    
    const file = fileUpload.files[0];
    console.log('Selected file details:', {
        name: file.name,
        type: file.type,
        size: file.size + ' bytes'
    });
    
    // Validate file type
    if (file.type !== 'application/pdf') {
        console.error('Invalid file type:', file.type);
        showError('Please select a PDF file');
        generateButton.disabled = true;
        exportButton.disabled = true;
        return;
    }
    
    // Show loading state on the button
    const originalButtonText = uploadButton.innerHTML;
    uploadButton.disabled = true;
    generateButton.disabled = true;
    exportButton.disabled = true;
    
    uploadButton.innerHTML = `
        <svg class="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M12 6v6l4 2"></path>
        </svg>
        Processing...
    `;
    
    showLoading('calendar-loading');
    
    try {
        // Create form data with the correct field name
        const formData = new FormData();
        formData.append('file', file);
        
        console.log('Preparing to send file to server:', {
            endpoint: '/calendar/process-syllabus',
            fileName: file.name,
            fileType: file.type,
            formDataEntries: Array.from(formData.entries()).map(([key, value]) => ({
                key,
                type: value instanceof File ? 'File' : typeof value,
                fileName: value instanceof File ? value.name : null
            }))
        });
        
        // Process the syllabus
        console.log('Sending request to server...');
        const response = await fetch('/calendar/process-syllabus', {
            method: 'POST',
            body: formData
        });

        console.log('Server response received:', {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok,
            headers: Object.fromEntries(response.headers.entries())
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Server error response:', errorText);
            throw new Error(`Failed to process syllabus: ${response.status} ${response.statusText}\n${errorText}`);
        }
        
        // Parse response data
        const data = await response.json();
        console.log('Server response data:', data);
        
        // Enable the generate button and show success message
        generateButton.disabled = false;
        showSuccess('Syllabus uploaded and processed successfully! You can now generate a study plan.');
        console.log('Upload process completed successfully');
        
    } catch (error) {
        console.error('Error during syllabus processing:', {
            message: error.message,
            stack: error.stack
        });
        showError(error.message || 'Failed to process syllabus. Please try again.');
        generateButton.disabled = true; // Keep generate button disabled on error
        exportButton.disabled = true;
    } finally {
        // Reset button state
        uploadButton.disabled = false;
        uploadButton.innerHTML = originalButtonText;
        hideLoading('calendar-loading');
        console.log('=== Syllabus upload process finished ===');
    }
}

async function generateStudyPlan(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    const generateButton = document.getElementById('generate-plan-btn');
    const exportButton = document.querySelector('.export-calendar-btn');
    
    // Show loading state on the button
    const originalButtonText = generateButton.innerHTML;
    generateButton.disabled = true;
    exportButton.disabled = true;
    
    generateButton.innerHTML = `
        <svg class="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M12 6v6l4 2"></path>
        </svg>
        Generating...
    `;
    
    showLoading('calendar-loading');
    
    try {
        console.log('Generating plan...');
        
        // Send request to generate plan
        const response = await fetch('/calendar/generate-plan', {
            method: 'POST'
        });
        
        if (!response.ok) {
            throw new Error(`Failed to generate plan: ${response.status} ${response.statusText}`);
        }
        
        // Parse response data
        const data = await response.json();
        console.log('Plan data received:', JSON.stringify(data, null, 2));
        
        if (data.success) {
            // Enable export button
            exportButton.disabled = false;
            
            // Update calendar if events are provided
            if (data.events) {
                calendar = data.events;
                updateCalendar();
                updateGoogleCalendar(data.events);
            } else if (data.plan) {
                // Try to convert plan to calendar format if events not provided
                try {
                    const calendarEvents = {};
                    
                    if (Array.isArray(data.plan)) {
                        data.plan.forEach(event => {
                            const date = event.date || event.start_date || event.day;
                            if (date) {
                                // Try to standardize the date format
                                let standardDate;
                                try {
                                    standardDate = new Date(date).toISOString().split('T')[0];
                                } catch (e) {
                                    standardDate = date;
                                }
                                
                                if (!calendarEvents[standardDate]) {
                                    calendarEvents[standardDate] = [];
                                }
                                
                                // Store the complete event information, not just the topic
                                calendarEvents[standardDate].push({
                                    task: event.task || event.title || event.summary || event.subject || event.name || 'Study topic',
                                    category: event.category || 'Study'
                                });
                            }
                        });
                    }
                    
                    if (Object.keys(calendarEvents).length > 0) {
                        calendar = calendarEvents;
                        updateCalendar();
                        updateGoogleCalendar(calendarEvents);
                    }
                } catch (err) {
                    console.error('Error converting plan to calendar format:', err);
                }
            }
            
            showSuccess('Study plan generated successfully!');
        } else {
            throw new Error(data.error || 'Failed to generate study plan');
        }
    } catch (error) {
        console.error('Error generating study plan:', error);
        showError(error.message || 'Failed to generate study plan. Please try again.');
        exportButton.disabled = true; // Keep export button disabled on error
    } finally {
        // Reset button state
        generateButton.disabled = false;
        generateButton.innerHTML = originalButtonText;
        hideLoading('calendar-loading');
    }
}

function updateCalendar() {
    if (!calendar) return;

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    // Check if element exists before trying to set its content
    const currentMonthElement = document.querySelector('.current-month');
    if (currentMonthElement) {
        currentMonthElement.textContent = new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long', year: 'numeric' });
    }

    const datesGrid = document.querySelector('.calendar-dates');
    if (!datesGrid) return; // Exit if calendar grid doesn't exist
    
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
            
            // Format topics for the tooltip
            let topicsText;
            if (calendar[dateString][0] && typeof calendar[dateString][0] === 'object') {
                // New format: array of objects with task and category
                topicsText = calendar[dateString].map(item => 
                    `${item.task} (${item.category})`
                ).join('\n');
            } else {
                // Old format: array of strings
                topicsText = calendar[dateString].join('\n');
            }
            
            dayDiv.setAttribute('data-topics', topicsText);
            
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
    if (!topicsDiv) return; // Exit if topics container doesn't exist
    
    if (topics.length) {
        let topicsHTML = '';
        
        // Check the format of the topics array
        if (typeof topics[0] === 'object') {
            // New format: array of objects with task and category
            topicsHTML = topics.map(item => `
                <div class="study-topic">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M12 6v6l4 2"></path>
                    </svg>
                    <span class="task">${item.task}</span>
                    <span class="category">(${item.category})</span>
                </div>
            `).join('');
        } else {
            // Old format: array of strings
            topicsHTML = topics.map(topic => `
                <div class="study-topic">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M12 6v6l4 2"></path>
                    </svg>
                    ${topic}
                </div>
            `).join('');
        }
        
        topicsDiv.innerHTML = topicsHTML;
    } else {
        topicsDiv.innerHTML = '<p>No topics scheduled for this date</p>';
    }
}

async function exportToCalendar() {
    try {
        const exportButton = document.querySelector('.export-calendar-btn');
        const originalButtonText = exportButton.innerHTML;
        
        // Validate if we have calendar data to export
        if (!calendar || Object.keys(calendar).length === 0) {
            showError('No calendar data available to export. Please generate a study plan first.');
            return;
        }
        
        console.log('Attempting to export calendar data:', calendar);
        
        exportButton.disabled = true;
        exportButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="spinner">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 6v6l4 2"></path>
            </svg>
            <span class="deleting-text">Exporting</span>
        `;

        // Check authentication status
        console.log('Checking Google Calendar authentication...');
        const authResponse = await fetch('/calendar/check-auth');
        const authData = await authResponse.json();
        console.log('Authentication response:', authData);

        if (!authData.authenticated) {
            console.log('Not authenticated, redirecting to auth...');
            const urlResponse = await fetch('/calendar/get-calendar-url');
            const urlData = await urlResponse.json();
            window.location.href = urlData.url;
            return;
        }

        console.log('Sending calendar data to server...');
        const response = await fetch('/calendar/add-to-calendar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ calendar: calendar })
        });

        // Log the raw response for debugging
        console.log('Server response status:', response.status);
        
        // Parse the response data
        const responseData = await response.json();
        console.log('Server response data:', responseData);
        
        if (!response.ok) {
            throw new Error(responseData.error || 'Failed to export to calendar');
        }

        // Show success details
        showSuccess('Successfully exported to Google Calendar!');
        console.log('Events added:', responseData.results.length);
        
        // Only refresh the calendar after successful export
        await initializeGoogleCalendar();

    } catch (error) {
        showError('Failed to export to calendar. Please try again.');
        console.error('Error exporting to calendar:', error);
    } finally {
        const exportButton = document.querySelector('.export-calendar-btn');
        exportButton.disabled = false;
        exportButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect>
                <line x1="16" x2="16" y1="2" y2="6"></line>
                <line x1="8" x2="8" y1="2" y2="6"></line>
                <line x1="3" x2="21" y1="10" y2="10"></line>
                <path d="m9 16 3 3 3-3"></path>
                <path d="M12 12v7"></path>
            </svg>
            Export to Google Calendar
        `;
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
    
    // Create pulse animation container
    const pulseContainer = document.createElement('div');
    pulseContainer.className = 'pulse-container';
    
    // Create 3 pulse dots
    for (let i = 0; i < 3; i++) {
        const dot = document.createElement('div');
        dot.className = 'pulse-dot';
        pulseContainer.appendChild(dot);
    }
    
    indicator.appendChild(pulseContainer);
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

    // Process URL parameters
    handleURLParameters();

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
        document.querySelector('.exam-layout').style.display = 'grid';
        document.querySelector('.exam-form').reset();
    });

    // Study Planner
    document.getElementById('planner-form')?.addEventListener('submit', generateStudyPlan);
    
    // Initialize file upload and other UI components based on current tool
    initializeChatInterface();
    if (document.getElementById('flashcards-view')) {
        initializeFlashcardsView();
    }
    if (document.getElementById('exams-view')) {
        initializeExamListeners();
    }
    if (document.getElementById('planner-view')) {
        initializeStudyPlanner();
    }

    // Initialize chat history panel
    updateChatHistoryPanel();

    // Initialize with chat view
    switchTool('chat');

    // Initialize flashcard listeners
    initializeFlashcardListeners();

    // Clear calendar button
    const clearButton = document.getElementById('clearCalendarBtn');
    if (clearButton) {
        clearButton.addEventListener('click', async () => {
            await clearCalendar();
        });
    }
});

// Function to show the selected file name
function showSelectedFile(input) {
    const fileNameDisplay = document.getElementById('file-name-display');
    const fileName = document.getElementById('file-name');
    const fileStatus = document.getElementById('file-status');
    const fileUploadLabel = document.querySelector('.file-upload-label');
    
    if (input.files && input.files[0]) {
        const file = input.files[0];
        
        // Show the file name
        fileName.textContent = file.name;
        fileNameDisplay.style.display = 'block';
        
        // Update status text
        fileStatus.textContent = 'File selected';
        fileStatus.style.color = '#10b981';
        
        // Add class to change the upload label appearance
        fileUploadLabel.classList.add('has-file');
    } else {
        // Reset if no file is selected
        fileNameDisplay.style.display = 'none';
        fileStatus.textContent = 'No file selected';
        fileStatus.style.color = '#666';
        fileUploadLabel.classList.remove('has-file');
    }
}

function initializeFileUpload() {
    console.log('=== Initializing File Upload System ===');
    const fileUploadLabel = document.querySelector('.file-upload-label');
    const fileInput = document.getElementById('syllabus-upload');
    const uploadButton = document.getElementById('upload-file-btn');
    
    console.log('DOM Elements:', {
        fileUploadLabel: fileUploadLabel ? 'Found' : 'Not found',
        fileInput: fileInput ? 'Found' : 'Not found',
        uploadButton: uploadButton ? 'Found' : 'Not found'
    });
    
    if (!fileUploadLabel || !fileInput || !uploadButton) {
        console.warn('Required elements for file upload not found');
        return;
    }
    
    // Handle drag and drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        console.log(`Adding ${eventName} event listener to file upload label`);
        fileUploadLabel.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log(`Prevented default behavior for ${e.type} event`);
    }
    
    ['dragenter', 'dragover'].forEach(eventName => {
        fileUploadLabel.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        fileUploadLabel.addEventListener(eventName, unhighlight, false);
    });
    
    function highlight() {
        console.log('File drag entered/over - highlighting drop zone');
        fileUploadLabel.classList.add('drag-over');
    }
    
    function unhighlight() {
        console.log('File drag left/dropped - removing highlight');
        fileUploadLabel.classList.remove('drag-over');
    }
    
    // Handle file drop
    fileUploadLabel.addEventListener('drop', handleDrop, false);
    console.log('Added drop event handler');
    
    function handleDrop(e) {
        console.log('File dropped:', e);
        const dt = e.dataTransfer;
        const files = dt.files;
        
        console.log('Dropped files:', {
            count: files.length,
            fileTypes: Array.from(files).map(f => f.type)
        });
        
        if (files && files.length > 0) {
            if (files[0].type === 'application/pdf') {
                console.log('Valid PDF file dropped:', files[0].name);
                fileInput.files = files;
                showSelectedFile(fileInput);
            } else {
                console.error('Invalid file type dropped:', files[0].type);
                showError('Please upload a PDF file');
            }
        }
    }
    
    // Handle click on the label
    fileUploadLabel.addEventListener('click', () => {
        console.log('File upload label clicked - triggering file input click');
        fileInput.click();
    });
    
    // Handle file selection via input
    fileInput.addEventListener('change', (e) => {
        console.log('File input changed:', {
            hasFiles: e.target.files.length > 0,
            fileName: e.target.files[0]?.name,
            fileType: e.target.files[0]?.type
        });
        showSelectedFile(fileInput);
    });
    
    // Set up the upload button with a single event listener
    uploadButton.addEventListener('click', (e) => {
        console.log('Upload button clicked - initiating processSyllabus');
        processSyllabus(e);
    });
    
    console.log('=== File Upload System Initialized ===');
}

// Update showSelectedFile with logging
function showSelectedFile(input) {
    console.log('=== Updating File Selection Display ===');
    const fileNameDisplay = document.getElementById('file-name-display');
    const fileName = document.getElementById('file-name');
    const fileStatus = document.getElementById('file-status');
    const fileUploadLabel = document.querySelector('.file-upload-label');
    
    console.log('DOM Elements for file display:', {
        fileNameDisplay: fileNameDisplay ? 'Found' : 'Not found',
        fileName: fileName ? 'Found' : 'Not found',
        fileStatus: fileStatus ? 'Found' : 'Not found',
        fileUploadLabel: fileUploadLabel ? 'Found' : 'Not found'
    });
    
    if (input.files && input.files[0]) {
        const file = input.files[0];
        console.log('Selected file details:', {
            name: file.name,
            type: file.type,
            size: file.size + ' bytes'
        });
        
        // Show the file name
        fileName.textContent = file.name;
        fileNameDisplay.style.display = 'block';
        
        // Update status text
        fileStatus.textContent = 'File selected';
        fileStatus.style.color = '#10b981';
        
        // Add class to change the upload label appearance
        fileUploadLabel.classList.add('has-file');
        console.log('File display updated for selected file');
    } else {
        console.log('No file selected, resetting display');
        // Reset if no file is selected
        fileNameDisplay.style.display = 'none';
        fileStatus.textContent = 'No file selected';
        fileStatus.style.color = '#666';
        fileUploadLabel.classList.remove('has-file');
    }
    console.log('=== File Selection Display Updated ===');
}

function initializeStudyPlanner() {
    console.log('=== Initializing Study Planner ===');
    
    // Initialize file upload functionality
    initializeFileUpload();
    
    // Initialize calendar
    initializeGoogleCalendar();
    
    // Get button references
    const plannerForm = document.getElementById('planner-form');
    const generateButton = document.getElementById('generate-plan-btn');
    const exportButton = document.querySelector('.export-calendar-btn');
    
    // Initially disable generate and export buttons
    if (generateButton) {
        generateButton.disabled = true;
    }
    if (exportButton) {
        exportButton.disabled = true;
    }
    
    // Handle file upload success
    const fileUpload = document.getElementById('syllabus-upload');
    if (fileUpload) {
        fileUpload.addEventListener('change', () => {
            if (fileUpload.files && fileUpload.files[0]) {
                generateButton.disabled = false;
            } else {
                generateButton.disabled = true;
                exportButton.disabled = true;
            }
        });
    }
    
    if (plannerForm) {
        console.log('Found planner form, setting up submit handler');
        // Remove any existing event listeners
        plannerForm.removeEventListener('submit', generateStudyPlan);
        // Add the event listener
        plannerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            generateStudyPlan(e);
        });
    } else {
        console.error('Planner form not found');
    }
    
    if (generateButton) {
        console.log('Found generate button, setting up click handler');
        // Remove any existing event listeners
        generateButton.removeEventListener('click', generateStudyPlan);
        // Add the click event listener as a backup
        generateButton.addEventListener('click', (e) => {
            e.preventDefault();
            generateStudyPlan(e);
        });
    } else {
        console.error('Generate plan button not found');
    }
    
    if (exportButton) {
        console.log('Found export button, setting up click handler');
        // Remove any existing event listeners
        exportButton.removeEventListener('click', exportToCalendar);
        // Add the click event listener
        exportButton.addEventListener('click', exportToCalendar);
    } else {
        console.error('Export calendar button not found');
    }
    
    const clearButton = document.getElementById('clearCalendarBtn');
    if (clearButton) {
        clearButton.addEventListener('click', clearCalendar);
    }
}

// Remove the planner form event listener from DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    // ... (keep existing code) ...
    
    // Remove this line as we're handling it in initializeStudyPlanner
    // document.getElementById('planner-form')?.addEventListener('submit', generateStudyPlan);
    
    // ... (keep rest of the code) ...
});

// Remove any existing calendar refresh intervals
if (window.calendarRefreshInterval) {
    clearInterval(window.calendarRefreshInterval);
    window.calendarRefreshInterval = null;
}

async function initializeGoogleCalendar() {
    try {
        // Get the calendar URL from the server
        const response = await fetch('/calendar/get-calendar-url');
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'Failed to get calendar URL');
        }
        
        // Create an iframe for the Google Calendar embed
        const calendarContainer = document.getElementById('google-calendar');
        if (!calendarContainer) {
            console.error('Calendar container not found');
            return;
        }

        // Clear existing content
        calendarContainer.innerHTML = '';
        
        // Create and configure iframe with sandbox attributes
        const iframe = document.createElement('iframe');
        
        // Add timestamp to URL to prevent caching
        const timestamp = new Date().getTime();
        const embedUrl = data.embed_url + (data.embed_url.includes('?') ? '&' : '?') + 'ts=' + timestamp;
        
        iframe.src = embedUrl;
        iframe.style.border = '0';
        iframe.width = '100%';
        iframe.height = '100%';
        iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox');
        iframe.setAttribute('loading', 'lazy');
        
        // Log the iframe URL for debugging
        console.log('Loading Google Calendar iframe with URL:', embedUrl);
        
        // Add iframe to container
        calendarContainer.appendChild(iframe);
        
    } catch (error) {
        console.error('Error initializing calendar:', error);
        showError('Failed to initialize calendar view');
    }
}

// Update calendar only when changes are made
async function updateGoogleCalendar(events) {
    // Only update if there are new events
    if (events && Object.keys(events).length > 0) {
        try {
            await initializeGoogleCalendar();
        } catch (error) {
            console.error('Error updating calendar:', error);
        }
    }
}

// Remove automatic refresh on visibility/focus changes
document.removeEventListener('visibilitychange', updateGoogleCalendar);
window.removeEventListener('focus', updateGoogleCalendar);

function handleURLParameters() {
    // Check if there's a file parameter in the URL
    const urlParams = new URLSearchParams(window.location.search);
    const fileParam = urlParams.get('file');
    
    if (fileParam) {
        // Switch to planner view
        switchTool('planner');
        
        // Clear the URL parameter without refreshing the page
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // Show a message about the file parameter
        showError('Direct file uploads through URL are not supported. Please upload a file using the file picker.');
    }
}

async function clearCalendar() {
    try {
        const clearButton = document.getElementById('clearCalendarBtn');
        if (!clearButton) return;
        
        const originalButtonText = clearButton.innerHTML;
        
        // Update button to show deleting state
        clearButton.disabled = true;
        clearButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="spinner">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 6v6l4 2"></path>
            </svg>
            <span class="deleting-text">Clearing events...</span>
        `;

        // Check authentication
        const authResponse = await fetch('/calendar/check-auth');
        const authData = await authResponse.json();

        if (!authData.authenticated) {
            const urlResponse = await fetch('/calendar/get-calendar-url');
            const urlData = await urlResponse.json();
            if (urlData.url) {
                window.location.href = urlData.url;
                return;
            }
            throw new Error('Failed to get authentication URL');
        }

        // Calculate date range (4 months before to 1 month after)
        const fromDate = new Date();
        fromDate.setMonth(fromDate.getMonth() - 4); // 4 months ago
        const toDate = new Date();
        toDate.setMonth(toDate.getMonth() + 1); // 1 month from now

        // Clear events within the date range
        const response = await fetch('/calendar/clear-calendar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                fromDate: fromDate.toISOString().split('T')[0],
                toDate: toDate.toISOString().split('T')[0],
                calendarId: 'primary'
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Failed to clear calendar: ${errorData}`);
        }

        const data = await response.json();
        
        // Show success message
        showSuccess(data.message || 'Successfully cleared calendar events');

        // Wait a moment before refreshing the calendar view
        setTimeout(async () => {
            await initializeGoogleCalendar();
        }, 1000);

    } catch (error) {
        console.error('Error clearing calendar:', error);
        showError(error.message || 'Failed to clear calendar. Please try again.');
    } finally {
        // Reset button state
        const clearButton = document.getElementById('clearCalendarBtn');
        if (clearButton) {
            clearButton.disabled = false;
            clearButton.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 6h18"></path>
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
                Clear Calendar
            `;
        }
    }
}

// Add event listener for visibility changes to refresh calendar when tab becomes visible
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        updateGoogleCalendar();
    }
});

// Refresh calendar when window gains focus
window.addEventListener('focus', () => {
    updateGoogleCalendar();
});

function initializeScrollFunctionality() {
    const messagesContainer = document.querySelector('.messages');
    const scrollButton = document.getElementById('scroll-to-bottom');
    let isAutoScrollEnabled = true;
    
    if (!messagesContainer || !scrollButton) return;
    
    // Show/hide scroll button based on scroll position
    messagesContainer.addEventListener('scroll', () => {
        const isNearBottom = messagesContainer.scrollHeight - messagesContainer.scrollTop - messagesContainer.clientHeight < 100;
        
        if (isNearBottom) {
            scrollButton.classList.remove('visible');
            isAutoScrollEnabled = true;
        } else {
            scrollButton.classList.add('visible');
            isAutoScrollEnabled = false;
        }
    });
    
    // Scroll to bottom when button is clicked
    scrollButton.addEventListener('click', () => {
        scrollToBottom();
        isAutoScrollEnabled = true;
    });
    
    // Create a MutationObserver to watch for changes in the messages container
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (isAutoScrollEnabled) {
                scrollToBottom();
            }
        });
    });
    
    // Start observing the messages container for changes
    observer.observe(messagesContainer, {
        childList: true,
        subtree: true,
        characterData: true
    });
}

function scrollToBottom() {
    const messagesContainer = document.querySelector('.messages');
    if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}
