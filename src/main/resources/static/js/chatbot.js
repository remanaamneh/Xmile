/*********************************
 * CHATBOT FOR CLIENT DASHBOARD
 * 
 * This chatbot calls the Spring Boot proxy endpoint /api/chatbot/message
 * which forwards requests to the n8n webhook to bypass CORS.
 *********************************/

// Chatbot API endpoint (proxied through Spring Boot to bypass CORS)
const CHATBOT_API_URL = "/api/chatbot/message";

// Generate or retrieve session ID
function getSessionId() {
    let sessionId = localStorage.getItem("chat_session");
    if (!sessionId) {
        sessionId = crypto.randomUUID();
        localStorage.setItem("chat_session", sessionId);
    }
    return sessionId;
}

// Initialize chatbot
function initChatbot() {
    // Load CSS file
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/css/chatbot-widget.css';
    document.head.appendChild(link);

    const chatbotHTML = `
        <!-- Toggle Button (shown when closed) -->
        <button id="chatbot-toggle" class="chatbot-widget-toggle" onclick="toggleChatbot()">
            <i class="fas fa-comments"></i>
        </button>
        
        <!-- Chatbot Container (shown when open) -->
        <div id="chatbot-container" class="chatbot-widget-container hidden">
            <!-- Header -->
            <div id="chatbot-header" class="chatbot-widget-header">
                <div id="chatbot-header-title">
                    <i class="fas fa-robot"></i>
                    <span>צ'אטבוט</span>
                </div>
                <button id="chatbot-close" onclick="toggleChatbot()" aria-label="סגור">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <!-- Messages Area -->
            <div id="chatbot-messages" class="chatbot-widget-messages">
                <div id="chatbot-welcome" class="chatbot-widget-welcome">
                    <i class="fas fa-comments"></i>
                    <span id="welcome-text">שלום! איך אני יכול לעזור לך היום?</span>
                </div>
            </div>
            
            <!-- Input Area -->
            <div id="chatbot-input-area" class="chatbot-widget-input-area">
                <input 
                    id="chatbot-input" 
                    type="text" 
                    placeholder="כתוב הודעה..." 
                    onkeypress="if(event.key === 'Enter') sendChatbotMessage()"
                />
                <button id="chatbot-send" onclick="sendChatbotMessage()" aria-label="שלח">
                    <i class="fas fa-paper-plane"></i>
                </button>
            </div>
        </div>
    `;

    // Add chatbot to body
    const chatbotWrapper = document.createElement('div');
    chatbotWrapper.id = 'chatbot-wrapper';
    chatbotWrapper.className = 'chatbot-widget-wrapper';
    chatbotWrapper.innerHTML = chatbotHTML;
    document.body.appendChild(chatbotWrapper);
}

// Toggle chatbot visibility
let chatbotOpen = false;
function toggleChatbot() {
    const container = document.getElementById('chatbot-container');
    const toggle = document.getElementById('chatbot-toggle');
    
    chatbotOpen = !chatbotOpen;
    
    if (chatbotOpen) {
        container.classList.remove('hidden');
        toggle.classList.add('hidden');
        // Focus on input
        setTimeout(() => {
            document.getElementById('chatbot-input')?.focus();
        }, 100);
    } else {
        container.classList.add('hidden');
        toggle.classList.remove('hidden');
    }
}

// Add message to chat
function addChatbotMessage(sender, text) {
    const messagesDiv = document.getElementById('chatbot-messages');
    if (!messagesDiv) return;
    
    // Remove welcome message if exists
    const welcomeMsg = document.getElementById('chatbot-welcome');
    if (welcomeMsg) {
        welcomeMsg.remove();
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `chatbot-message ${sender === 'אתה' ? 'user' : 'bot'}`;
    messageDiv.innerHTML = `
        <div class="sender">${sender}</div>
        <div class="content">${escapeHtml(text)}</div>
    `;
    
    messagesDiv.appendChild(messageDiv);
    // Smooth scroll to bottom
    messagesDiv.scrollTo({
        top: messagesDiv.scrollHeight,
        behavior: 'smooth'
    });
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Send message to chatbot
async function sendChatbotMessage() {
    const input = document.getElementById('chatbot-input');
    if (!input) return;
    
    const text = input.value.trim();
    if (!text) return;
    
    // Disable input and send button
    input.disabled = true;
    const sendBtn = document.getElementById('chatbot-send');
    if (sendBtn) sendBtn.disabled = true;
    
    // Clear input
    input.value = '';
    
    // Add user message
    addChatbotMessage('אתה', text);
    
    // Show loading
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'chatbot-message bot';
    loadingDiv.id = 'chatbot-loading';
    loadingDiv.innerHTML = `
        <div class="sender">בוט</div>
        <div class="content">
            <i class="fas fa-spinner fa-spin"></i>
            <span>כותב...</span>
        </div>
    `;
    const messagesDiv = document.getElementById('chatbot-messages');
    messagesDiv.appendChild(loadingDiv);
    messagesDiv.scrollTo({
        top: messagesDiv.scrollHeight,
        behavior: 'smooth'
    });
    
    try {
        const sessionId = getSessionId();
        
        // Call Spring Boot proxy endpoint (forwards to n8n)
        const response = await fetch(CHATBOT_API_URL, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                message: text, 
                sessionId: sessionId 
            })
        });
        
        if (!response.ok) {
            // Try to get error message from response
            let errorMsg = 'שגיאה בתקשורת עם השרת';
            try {
                const errorData = await response.json();
                errorMsg = errorData.error || errorData.message || errorMsg;
            } catch (e) {
                errorMsg = `שגיאת שרת: ${response.status} ${response.statusText}`;
            }
            throw new Error(errorMsg);
        }
        
        const data = await response.json();
        
        // Remove loading
        const loading = document.getElementById('chatbot-loading');
        if (loading) loading.remove();
        
        // Add bot response
        addChatbotMessage('בוט', data.reply || 'מצטער, לא הצלחתי להבין. נסה שוב.');
        
    } catch (error) {
        console.error('Chatbot error:', error);
        
        // Remove loading
        const loading = document.getElementById('chatbot-loading');
        if (loading) loading.remove();
        
        // Show detailed error message
        let errorMessage = 'מצטער, אירעה שגיאה. אנא נסה שוב מאוחר יותר.';
        
        if (error.message) {
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                errorMessage = '❌ לא ניתן להתחבר לשרת הצ\'אטבוט. אנא בדוק:\n' +
                              '1. שהכתובת CHATBOT_WEBHOOK_URL נכונה\n' +
                              '2. שה-n8n workflow פעיל\n' +
                              '3. שאין בעיות CORS או רשת';
            } else if (error.message.includes('CORS')) {
                errorMessage = '❌ בעיית CORS: השרת לא מאפשר גישה מהדומיין הזה. אנא הגדר CORS ב-n8n.';
            } else {
                errorMessage = `❌ ${error.message}`;
            }
        }
        
        addChatbotMessage('בוט', errorMessage);
    } finally {
        // Re-enable input and send button
        input.disabled = false;
        if (sendBtn) sendBtn.disabled = false;
        input.focus();
    }
}

// Initialize chatbot when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChatbot);
} else {
    initChatbot();
}
