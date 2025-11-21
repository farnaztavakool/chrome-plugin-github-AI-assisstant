import { extractGithubContext } from '../utils/extractGithubContext.js';
import { executeAction } from '../actions/execute.js';
// Get a storage key that persists across page navigations
// Use a session-based key so chat history is preserved when navigating between pages
function getStorageKey() {
    // Use a session storage key that persists across navigations
    // We'll use the tab's origin + a session identifier
    const origin = window.location.origin;
    return `chat_history_${origin}_session`;
}
// Save chat history to storage
async function saveChatHistory(messages) {
    try {
        const key = getStorageKey();
        await chrome.storage.local.set({ [key]: messages });
    }
    catch (err) {
        console.error('Failed to save chat history:', err);
    }
}
// Load chat history from storage
async function loadChatHistory() {
    try {
        const key = getStorageKey();
        const result = await chrome.storage.local.get([key]);
        return result[key] || [];
    }
    catch (err) {
        console.error('Failed to load chat history:', err);
        return [];
    }
}
// Clear chat history for current page
async function clearChatHistory() {
    try {
        const key = getStorageKey();
        await chrome.storage.local.remove([key]);
    }
    catch (err) {
        console.error('Failed to clear chat history:', err);
    }
}
export async function initSidebar(shadowRoot) {
    const container = shadowRoot.querySelector('#github-ai-sidebar');
    const toggleBtn = shadowRoot.querySelector('#toggle-btn');
    const sendBtn = shadowRoot.querySelector('#send-btn');
    const userInput = shadowRoot.querySelector('#user-input');
    const chatHistory = shadowRoot.querySelector('#chat-history');
    // Get all current messages from the DOM
    function getCurrentMessages() {
        const messages = [];
        const messageElements = chatHistory.querySelectorAll('.message');
        messageElements.forEach(el => {
            messages.push({
                type: el.className.replace('message ', '').trim(),
                text: el.textContent || ''
            });
        });
        return messages;
    }
    function appendMessage(type, text, saveToStorage = true) {
        const div = document.createElement('div');
        div.className = `message ${type}`;
        div.textContent = text;
        chatHistory.appendChild(div);
        chatHistory.scrollTop = chatHistory.scrollHeight;
        // Save to storage after adding message
        if (saveToStorage) {
            const messages = getCurrentMessages();
            saveChatHistory(messages);
        }
    }
    // Load saved chat history
    const savedMessages = await loadChatHistory();
    if (savedMessages.length > 0) {
        // Clear the default welcome message
        chatHistory.innerHTML = '';
        // Restore all saved messages
        savedMessages.forEach(msg => {
            appendMessage(msg.type, msg.text, false); // false = don't save (already saved)
        });
    }
    // Toggle Collapse
    toggleBtn.addEventListener('click', () => {
        container.classList.toggle('collapsed');
    });
    // Header click also toggles
    const header = shadowRoot.querySelector('.sidebar-header');
    header.addEventListener('click', (e) => {
        if (e.target !== toggleBtn) {
            container.classList.toggle('collapsed');
        }
    });
    // Send Message
    const sendMessage = async () => {
        const text = userInput.value.trim();
        if (!text)
            return;
        appendMessage('user', text);
        userInput.value = '';
        // Collect Context
        const context = extractGithubContext();
        appendMessage('system', 'Thinking...');
        try {
            const response = await fetch('http://localhost:3000/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_chat: text,
                    page_context: context
                })
            });
            if (!response.ok) {
                throw new Error('Backend error');
            }
            const data = await response.json();
            if (data.assistant_message) {
                appendMessage('ai', data.assistant_message);
            }
            if (data.actions && Array.isArray(data.actions)) {
                for (const action of data.actions) {
                    // appendMessage('system', `Executing: ${action.type}`);
                    try {
                        await executeAction(action);
                    }
                    catch (err) {
                        console.error(err);
                        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
                        appendMessage('system', `Action failed: ${errorMessage}`);
                    }
                }
            }
            else if (data.reply) {
                // Fallback for legacy mock if still used
                appendMessage('ai', data.reply);
                if (data.action)
                    executeAction(data.action);
            }
        }
        catch (err) {
            console.error(err);
            appendMessage('system', 'Error connecting to AI backend. Make sure server is running.');
        }
    };
    sendBtn.addEventListener('click', sendMessage);
    userInput.addEventListener('keydown', (e) => {
        // Prevent GitHub shortcuts (like 't', '/', etc.) from firing while typing
        e.stopPropagation();
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
}
//# sourceMappingURL=sidebar.js.map