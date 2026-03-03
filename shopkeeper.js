/**
 * ShopKeeper AI Chatbot
 * A friendly AI assistant for shopcart — Premium Men's Fashion
 * 
 * SETUP:
 * 1. Get a FREE OpenRouter API token: https://openrouter.ai/
 * 2. Set the OPENROUTER_API_KEY below or via localStorage
 * 3. Popular free models: google/palm-2-chat-bison, mistral-7b-instruct, zephyr-7b-beta
 */

class ShopKeeper {
  constructor() {
    // load api key from storage (new name for OpenRouter)
    // If you prefer embedding the key directly, replace the empty string below
    // with your actual OpenRouter key, e.g.:
    // this.apiKey = 'sk-or-XXXXXXXXXXXXXXXXXXXXXXXXXXXX';
    this.apiKey = localStorage.getItem('OPENROUTER_API_KEY') || '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';
    this.model = 'google/gemma-2-9b-it'; // OpenRouter model
    this.apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
    this.isDragging = false;
    this.posX = localStorage.getItem('chatPosX') || 20;
    this.posY = localStorage.getItem('chatPosY') || 20;
    this.conversationHistory = [];
    this.isOpen = false;
    this.isLoading = false;

    // Voice features
    this.isMuted = localStorage.getItem('shopkeeper_muted') === 'true';
    this.isListening = false;
    this.isSpeaking = false;
    this.synth = window.speechSynthesis || null;
    this.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition || null;
    this.autoVoice = true; // auto-start voice when chat opens
    this.productCatalog = '';
    this.productNames = [];
    this.systemPrompt = ''; // will be built after catalog loads
    this.wakeWordListener = null;
    this.wakeWordActive = false;
    // Chat messages for display (text + sender)
    this.chatMessages = [];

    this.init();
  }

  // Get the logged-in user's email for keying conversations
  getLoggedInUser() {
    try {
      const data = JSON.parse(localStorage.getItem('shopHubLoggedIn') || 'null');
      return data?.email || data?.username || null;
    } catch (e) {
      return null;
    }
  }

  getUserChatKey() {
    const user = this.getLoggedInUser();
    return user ? `shopkeeper_chat_${user}` : 'shopkeeper_chat_guest';
  }

  saveConversation() {
    try {
      const key = this.getUserChatKey();
      const data = {
        history: this.conversationHistory,
        messages: this.chatMessages,
        timestamp: Date.now()
      };
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.warn('Could not save conversation:', e);
    }
  }

  loadConversation() {
    try {
      const key = this.getUserChatKey();
      const saved = JSON.parse(localStorage.getItem(key) || 'null');
      if (!saved) return;

      // Restore API conversation history
      this.conversationHistory = saved.history || [];
      this.chatMessages = saved.messages || [];

      // Render previous messages in the chat UI
      const container = document.getElementById('shopkeeper-messages');
      if (!container || this.chatMessages.length === 0) return;

      // Clear the default greeting
      container.innerHTML = '';

      // Add a "previous conversation" separator
      const separator = document.createElement('div');
      separator.className = 'shopkeeper-message bot-message';
      separator.innerHTML = '<p style="opacity:0.6;font-size:0.85em;text-align:center;">Previous conversation restored</p>';
      container.appendChild(separator);

      // Re-render all saved messages
      for (const msg of this.chatMessages) {
        const div = document.createElement('div');
        div.className = `shopkeeper-message ${msg.sender}-message`;
        const p = document.createElement('p');
        p.textContent = msg.text;
        div.appendChild(p);
        container.appendChild(div);
      }

      container.scrollTop = container.scrollHeight;
    } catch (e) {
      console.warn('Could not load conversation:', e);
    }
  }

  async init() {
    await this.loadProductCatalog();
    this.buildSystemPrompt();
    this.createWidget();
    this.loadConversation(); // Restore previous chat for this user
    this.attachEventListeners();
    this.applyDraggable();
    // Start background wake word listener
    this.startWakeWordListener();
  }

  async loadProductCatalog() {
    try {
      const res = await fetch('menu.json');
      const data = await res.json();
      // Build a compact product list for the AI
      const lines = [];
      for (const store of data.stores) {
        const products = store.products.map(p =>
          `  • ${p.name} — ₹${p.price} (★${p.rating}) — ${p.description}`
        ).join('\n');
        lines.push(`【${store.name}】\n${products}`);
      }
      this.productCatalog = lines.join('\n\n');
      // Store product names for matching in responses
      this.productNames = [];
      for (const store of data.stores) {
        for (const p of store.products) {
          this.productNames.push(p.name);
        }
      }
    } catch (e) {
      console.warn('Could not load product catalog:', e);
      this.productCatalog = '(Product catalog unavailable)';
    }
  }

  buildSystemPrompt() {
    this.systemPrompt = `You are ShopKeeper, the personal butler and style advisor at shopcart, a premium men's fashion and accessories store. Think of yourself as a refined gentleman's gentleman: warm, witty, knowledgeable, and always at your customer's service.

BUTLER PERSONALITY:
- Address customers with warmth, as if welcoming them into a fine establishment: "Good to see you, sir" or "Welcome back"
- Be genuinely interested in their day, their plans, their stories
- Share your knowledge freely: fashion history, fabric facts, style tips, grooming advice
- Have a dry, sophisticated sense of humor. Drop a well-timed joke or witty observation when it feels natural
- Give sincere compliments on their taste when they pick something good
- Be the kind of assistant people enjoy talking to, not just shopping with
- Write in clean, natural sentences. NEVER use emojis, asterisks, or markdown formatting
- Keep responses concise (under 150 words) but warm and engaging

CONVERSATIONAL SKILLS (use naturally, not forced):
- Fashion Facts: share interesting tidbits like "Did you know the modern suit traces back to Beau Brummell in 1800s England?" or trivia about fabrics, designers, and trends
- Style Tips: offer practical advice like "A well-fitted blazer can transform even a casual outfit into something distinguished"
- Light Humor: "They say clothes make the man. I say shopcart makes the clothes that make the man" — keep it tasteful and relevant
- Compliments: "Excellent taste, sir. The Navy Blue Suit Set is one of our finest pieces"
- General Chat: if someone asks about the weather, sports, or tells you about their day, engage naturally. Then gently guide back: "Sounds like a wonderful evening ahead. Perhaps I can help you look the part?"

PRIMARY PURPOSE (never lose sight of this):
- Your main job is helping customers find and choose the perfect products from shopcart
- Every conversation should naturally flow toward product recommendations
- When chatting casually, look for opportunities to suggest relevant products
- If someone talks about an event, suggest what to wear from the catalog
- Always recommend REAL products by name and price in Indian Rupees from the catalog below

PRICING RULES (CRITICAL):
- ALL prices are in Indian Rupees (₹). ALWAYS use the ₹ symbol when quoting prices
- NEVER use dollars ($) or any other currency. This is an Indian store with prices in INR
- Example: say "₹20,349" not "$245" — always prefix with ₹
- When mentioning prices, use the exact values from the catalog with the ₹ symbol

HONESTY RULES:
- ONLY recommend products from the catalog. Never invent names or prices
- If we do not carry something, say so honestly and suggest our closest alternative
- Never promise delivery times, discounts, or promotions unless explicitly listed
- Be transparent about what we can and cannot offer

CONVERSATION MEMORY:
- Remember what the customer told you earlier and build on it
- Track their preferences: if they like slim fit, keep suggesting slim-fit items
- If they rejected something, understand why and adjust
- Stay within their stated budget

PERSONALIZATION:
- Ask about occasion (wedding, office, date night, casual, travel)
- Ask about style (classic, modern, minimalist, bold)
- Ask about budget if not mentioned
- Suggest complete outfits when possible
- Cross-sell accessories that complement their choices
- Recommend 2-3 specific products with prices in ₹ (Indian Rupees)

PAYMENT AND STORE POLICIES (share when asked):
- We accept Credit/Debit Cards (Visa, Mastercard, Amex), QR/UPI payments, and Cash on Delivery
- Free shipping on orders over ₹500
- Standard delivery takes 2-5 business days
- 7-day return policy on all unworn items with tags attached
- All items come with a certificate of authenticity
- Gift wrapping is available at checkout

PRODUCT CATALOG (all prices in Indian Rupees ₹):
${this.productCatalog}

Always mention exact product names and prices in ₹ (Indian Rupees) from this catalog. If a customer asks about something not listed here, honestly say we do not carry it and suggest what we do have that is closest.`;
  }

  applyDraggable() {
    const toggle = document.getElementById('shopkeeper-toggle');
    let offsetX, offsetY, startX, startY;
    let hasMoved = false;

    toggle.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      hasMoved = false;
      startX = e.clientX;
      startY = e.clientY;
      offsetX = e.clientX - toggle.getBoundingClientRect().left;
      offsetY = e.clientY - toggle.getBoundingClientRect().top;
      toggle.style.transition = 'box-shadow 0.2s, filter 0.2s';
      toggle.classList.add('dragging');
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) hasMoved = true;
      if (!hasMoved) return;

      this.posX = e.clientX - offsetX;
      this.posY = e.clientY - offsetY;
      toggle.style.left = `${this.posX}px`;
      toggle.style.top = `${this.posY}px`;
      localStorage.setItem('chatPosX', this.posX);
      localStorage.setItem('chatPosY', this.posY);
    });

    document.addEventListener('mouseup', () => {
      if (this.isDragging && !hasMoved) {
        // It was a click, not a drag – let the click handler fire
      }
      this.isDragging = false;
      toggle.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
      toggle.classList.remove('dragging');
    });

    // Also support touch dragging for mobile
    toggle.addEventListener('touchstart', (e) => {
      const touch = e.touches[0];
      this.isDragging = true;
      hasMoved = false;
      startX = touch.clientX;
      startY = touch.clientY;
      offsetX = touch.clientX - toggle.getBoundingClientRect().left;
      offsetY = touch.clientY - toggle.getBoundingClientRect().top;
      toggle.style.transition = 'box-shadow 0.2s, filter 0.2s';
      toggle.classList.add('dragging');
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
      if (!this.isDragging) return;
      const touch = e.touches[0];
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) hasMoved = true;
      if (!hasMoved) return;

      this.posX = touch.clientX - offsetX;
      this.posY = touch.clientY - offsetY;
      toggle.style.left = `${this.posX}px`;
      toggle.style.top = `${this.posY}px`;
    }, { passive: true });

    document.addEventListener('touchend', () => {
      this.isDragging = false;
      toggle.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
      toggle.classList.remove('dragging');
    });
  }

  createWidget() {
    // Check if widget already exists
    if (document.getElementById('shopkeeper-widget')) return;

    const widgetHTML = `
      <div id="shopkeeper-widget" class="shopkeeper-widget">
        <!-- Chatbot Container -->
        <div id="shopkeeper-chat" class="shopkeeper-chat" style="display: none;">
          <div class="shopkeeper-header">
            <div class="shopkeeper-title">
              <span class="shopkeeper-avatar">🤖</span>
              <span>ShopKeeper</span>
            </div>
            <div class="shopkeeper-header-actions">
              <button id="shopkeeper-mute" class="shopkeeper-mute-btn" title="${this.isMuted ? 'Unmute voice' : 'Mute voice'}">
                ${this.isMuted ? '🔇' : '🔊'}
              </button>
              <button id="shopkeeper-close" class="shopkeeper-close" title="Close">✕</button>
            </div>
          </div>
          <div id="shopkeeper-messages" class="shopkeeper-messages">
            <div class="shopkeeper-message bot-message">
              <p>Good day, welcome to shopcart. I'm your personal style butler. How may I be of service? Just say <strong>"Hey Shopkeeper"</strong> or type below.</p>
            </div>
          ${!this.apiKey ? `
            <div class="shopkeeper-message bot-message">
              <p><em>(To activate the bot please set an OpenRouter API key via <code>shopkeeper.setApiKey('YOUR_KEY')</code>.)</em></p>
            </div>
          ` : ''}
          </div>
          <div class="shopkeeper-input-area">
            <input 
              type="text" 
              id="shopkeeper-input" 
              class="shopkeeper-input" 
              placeholder="Ask me anything..."
              onkeypress="shopkeeper.handleKeyPress(event)"
            />
            <button id="shopkeeper-mic" class="shopkeeper-mic-btn" title="Voice command">
              🎤
            </button>
            <button id="shopkeeper-send" class="shopkeeper-send">Send</button>
          </div>
          <div class="shopkeeper-footer">
            <small>shopcart AI · 🎤 Voice Enabled</small>
          </div>
        </div>

        <!-- Toggle Button -->
        <button id="shopkeeper-toggle" class="shopkeeper-toggle" title="Chat with ShopKeeper">
          <span class="shopkeeper-toggle-icon">💬</span>
        </button>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', widgetHTML);
  }

  attachEventListeners() {
    const toggle = document.getElementById('shopkeeper-toggle');
    const closeBtn = document.getElementById('shopkeeper-close');
    const sendBtn = document.getElementById('shopkeeper-send');
    const inputField = document.getElementById('shopkeeper-input');
    const muteBtn = document.getElementById('shopkeeper-mute');
    const micBtn = document.getElementById('shopkeeper-mic');

    if (toggle) toggle.addEventListener('click', () => this.toggleChat());
    if (closeBtn) closeBtn.addEventListener('click', () => this.toggleChat());
    if (sendBtn) sendBtn.addEventListener('click', () => this.sendMessage());
    if (inputField) inputField.addEventListener('keypress', (e) => this.handleKeyPress(e));
    if (muteBtn) muteBtn.addEventListener('click', () => this.toggleMute());
    if (micBtn) micBtn.addEventListener('click', () => this.toggleVoiceInput());
  }

  toggleChat() {
    const chatBox = document.getElementById('shopkeeper-chat');
    const toggle = document.getElementById('shopkeeper-toggle');

    if (!chatBox) return;

    this.isOpen = !this.isOpen;
    chatBox.style.display = this.isOpen ? 'flex' : 'none';

    if (this.isOpen) {
      document.getElementById('shopkeeper-input')?.focus();
      // Auto-start voice listening when chat opens for a smooth talk-first experience
      if (this.autoVoice && this.SpeechRecognition && !this.isListening) {
        setTimeout(() => this.startVoiceInput(), 400);
      }
    } else {
      // Stop listening when chat closes
      if (this.isListening) {
        this.stopVoiceInput();
      }
      // Stop any ongoing speech
      if (this.synth) this.synth.cancel();
      // Resume wake word listener when chat is closed
      setTimeout(() => this.startWakeWordListener(), 500);
    }
  }

  // ── Wake Word: "Shopkeeper" Detection ──
  startWakeWordListener() {
    // Don't start if: no API, chat is open, or already running
    if (!this.SpeechRecognition || this.isOpen) return;
    // Stop any existing listener first
    this.stopWakeWordListener();

    try {
      const wake = new this.SpeechRecognition();
      wake.lang = 'en-US';
      wake.continuous = true;
      wake.interimResults = true;
      wake.maxAlternatives = 3;

      this.wakeWordListener = wake;
      this.wakeWordActive = true;

      wake.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          for (let j = 0; j < event.results[i].length; j++) {
            const text = event.results[i][j].transcript.toLowerCase();
            if (text.includes('shopkeeper') || text.includes('shop keeper') ||
              text.includes('hey shopkeeper') || text.includes('hi shopkeeper') ||
              text.includes('okay shopkeeper') || text.includes('hey shop')) {
              console.log('Wake word detected:', text);
              this.stopWakeWordListener();
              // Visual feedback: pulse the toggle button
              const toggle = document.getElementById('shopkeeper-toggle');
              if (toggle) {
                toggle.style.transform = 'scale(1.3)';
                setTimeout(() => toggle.style.transform = '', 300);
              }
              // Open chat and start listening
              if (!this.isOpen) {
                this.toggleChat();
              }
              return;
            }
          }
        }
      };

      wake.onerror = (event) => {
        // no-speech and aborted are normal — just restart quickly
        if (event.error === 'no-speech' || event.error === 'aborted') {
          this.wakeWordActive = false;
          if (!this.isOpen) {
            setTimeout(() => this.startWakeWordListener(), 300);
          }
        } else if (event.error === 'not-allowed') {
          // User denied mic — can't do anything
          console.warn('Mic permission denied for wake word');
          this.wakeWordActive = false;
        } else {
          this.wakeWordActive = false;
          if (!this.isOpen) {
            setTimeout(() => this.startWakeWordListener(), 1000);
          }
        }
      };

      wake.onend = () => {
        // Always restart if chat is closed — browser stops recognition after silence
        this.wakeWordActive = false;
        if (!this.isOpen) {
          setTimeout(() => this.startWakeWordListener(), 300);
        }
      };

      wake.start();
    } catch (err) {
      console.warn('Wake word listener could not start:', err);
      this.wakeWordActive = false;
      // Retry after delay
      if (!this.isOpen) {
        setTimeout(() => this.startWakeWordListener(), 2000);
      }
    }
  }

  stopWakeWordListener() {
    this.wakeWordActive = false;
    if (this.wakeWordListener) {
      try { this.wakeWordListener.stop(); } catch (e) { /* ignore */ }
      this.wakeWordListener = null;
    }
  }

  handleKeyPress(e) {
    if (e.key === 'Enter') {
      this.sendMessage();
    }
  }

  async sendMessage() {
    // ensure API key is set
    if (!this.apiKey) {
      this.addMessage(
        "ShopKeeper isn't configured yet. Please call `shopkeeper.setApiKey('YOUR_KEY')` in the console or update the script with a valid OpenRouter API key.",
        'bot'
      );
      return;
    }

    const inputField = document.getElementById('shopkeeper-input');
    const userMessage = inputField?.value?.trim();

    if (!userMessage) return;

    // Add user message to chat
    this.addMessage(userMessage, 'user');
    inputField.value = '';

    // Show loading state
    this.isLoading = true;
    this.addMessage('Thinking...', 'bot', true);

    try {
      const response = await this.queryOpenRouter(userMessage);

      // Remove the loading message
      const messagesContainer = document.getElementById('shopkeeper-messages');
      const loadingMsg = messagesContainer?.lastElementChild;
      if (loadingMsg?.classList.contains('loading')) {
        loadingMsg.remove();
      }

      // Add bot response
      this.addMessage(response, 'bot');
      // Speak the response if not muted
      this.speak(response);
      // Auto-search and show products mentioned in the response
      this.showSuggestedProducts(response);
    } catch (error) {
      console.error('ShopKeeper error:', error);

      // Remove the loading message
      const messagesContainer = document.getElementById('shopkeeper-messages');
      const loadingMsg = messagesContainer?.lastElementChild;
      if (loadingMsg?.classList.contains('loading')) {
        loadingMsg.remove();
      }

      // Show error or fallback response
      if (error.message.includes('401') || error.message.includes('API')) {
        this.addMessage(
          "I'm experiencing connection issues. Please ensure you have set your OpenRouter API key.",
          'bot'
        );
      } else {
        // show the raw error message for debugging
        this.addMessage(
          `Sorry, I encountered an error: ${error.message}. Please try again or contact our support team.`,
          'bot'
        );
      }
    } finally {
      this.isLoading = false;
    }
  }

  async queryOpenRouter(userMessage) {
    // include conversation history for better context
    const messages = [
      { role: 'system', content: this.systemPrompt },
      ...this.conversationHistory,
      { role: 'user', content: userMessage }
    ];

    const payload = {
      model: this.model,
      messages,
      temperature: 0.7,
      max_tokens: 250
    };

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    // handle error status codes
    if (!response.ok) {
      let text;
      try {
        text = await response.text();
      } catch {
        text = '';
      }
      throw new Error(`OpenRouter API Error ${response.status}${text ? ` - ${text}` : ''}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Unexpected API response format');
    }

    // save into history (keep last 15 exchanges = 30 messages for better context)
    this.conversationHistory.push({ role: 'user', content: userMessage });
    this.conversationHistory.push({ role: 'assistant', content });
    while (this.conversationHistory.length > 30) {
      this.conversationHistory.shift();
    }

    // Save to localStorage for this user
    this.saveConversation();

    return content;
  }

  addMessage(text, sender, isLoading = false) {
    const messagesContainer = document.getElementById('shopkeeper-messages');
    if (!messagesContainer) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `shopkeeper-message ${sender}-message ${isLoading ? 'loading' : ''}`;

    const messageContent = document.createElement('p');
    messageContent.textContent = text;
    messageDiv.appendChild(messageContent);

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Track display messages for persistence (skip loading messages)
    if (!isLoading) {
      this.chatMessages.push({ text, sender });
    }
  }

  // Auto-search and display products mentioned in bot's response
  showSuggestedProducts(response) {
    if (!this.productNames || this.productNames.length === 0) return;

    const responseLower = response.toLowerCase();
    // Find product names mentioned in the response
    const mentioned = this.productNames.filter(name =>
      responseLower.includes(name.toLowerCase())
    );

    if (mentioned.length === 0) {
      // Try partial matching — search for key words from the response
      // Extract price mentions or category references to build a search
      const categories = ['suit', 'blazer', 'shirt', 'trouser', 'watch', 'shoe', 'boot', 'loafer',
        'jacket', 'coat', 'accessori', 'belt', 'tie', 'cufflink', 'scarf', 'sunglasses',
        'sweater', 'cardigan', 'knit', 'cologne', 'grooming', 'shaving', 'bag', 'luggage',
        'denim', 'jean', 'chino', 'sneaker', 'oxford', 'monk', 'briefcase', 'backpack'];
      const matchedCategory = categories.find(cat => responseLower.includes(cat));
      if (matchedCategory) {
        this.triggerPageSearch(matchedCategory);
      }
      return;
    }

    // Use the first mentioned product name to search
    this.triggerPageSearch(mentioned[0]);
  }

  triggerPageSearch(query) {
    const searchInput = document.getElementById('search');
    if (!searchInput) return;

    // Set search value and trigger input event to filter products
    searchInput.value = query;
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));

    // Scroll to product grid so user sees the results
    const grid = document.getElementById('productGrid');
    if (grid) {
      setTimeout(() => {
        grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    }
  }

  // ── Voice: Text-to-Speech ──
  speak(text) {
    if (this.isMuted || !this.synth) {
      // If muted, skip TTS but still auto-resume mic after a short delay
      if (this.isOpen && this.autoVoice && this.SpeechRecognition && !this.isListening) {
        setTimeout(() => this.startVoiceInput(), 600);
      }
      return;
    }

    // STOP mic recording before AI speaks — prevents AI voice feeding back into mic
    if (this.isListening) {
      this.stopVoiceInput();
    }

    this.synth.cancel();
    this.isSpeaking = true;

    // Clean text and split into sentence chunks to avoid Chrome's stuttering bug
    const cleanText = this.cleanTextForSpeech(text);
    const chunks = this.splitIntoChunks(cleanText);

    // Get the preferred voice once
    const voice = this.getPreferredVoice();

    // Speak chunks sequentially
    this.speakChunks(chunks, voice, 0);
  }

  // Split text into sentence-sized chunks (shorter chunks = no Chrome stuttering)
  splitIntoChunks(text) {
    const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
    const chunks = [];
    let current = '';

    for (const sentence of sentences) {
      // Keep chunks under ~80 chars for flicker-free playback
      if ((current + sentence).length > 80 && current) {
        chunks.push(current.trim());
        current = sentence;
      } else {
        current += sentence;
      }
    }
    if (current.trim()) chunks.push(current.trim());

    return chunks.length > 0 ? chunks : [text];
  }

  // Get the best male English voice available
  getPreferredVoice() {
    const voices = this.synth.getVoices();
    const maleKeywords = ['male', 'david', 'james', 'mark', 'daniel', 'guy', 'thomas', 'richard'];
    return (
      voices.find(v => v.name.includes('Google UK English Male')) ||
      voices.find(v => v.lang.startsWith('en') && maleKeywords.some(k => v.name.toLowerCase().includes(k))) ||
      voices.find(v => v.lang.startsWith('en') && !v.localService && !v.name.toLowerCase().includes('female')) ||
      voices.find(v => v.lang.startsWith('en')) ||
      null
    );
  }

  // Speak chunks one after another for smooth, uninterrupted speech
  speakChunks(chunks, voice, index) {
    if (index >= chunks.length) {
      // All chunks done — resume mic
      this.isSpeaking = false;
      if (this.isOpen && this.autoVoice && this.SpeechRecognition && !this.isListening) {
        setTimeout(() => this.startVoiceInput(), 400);
      }
      return;
    }

    const utterance = new SpeechSynthesisUtterance(chunks[index]);
    utterance.rate = 1.2;
    utterance.pitch = 0.9;
    utterance.volume = 1.0;

    if (voice) utterance.voice = voice;

    utterance.onend = () => {
      // Small pause between chunks for natural pacing
      setTimeout(() => this.speakChunks(chunks, voice, index + 1), 60);
    };

    utterance.onerror = () => {
      this.isSpeaking = false;
    };

    this.synth.speak(utterance);
  }

  // Strip emojis, markdown, and special chars for clean professional TTS
  cleanTextForSpeech(text) {
    return text
      // Remove emojis (covers most Unicode emoji ranges)
      .replace(/[\u{1F600}-\u{1F9FF}\u{1FA00}-\u{1FA9F}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}\u{E0020}-\u{E007F}\u{1F1E0}-\u{1F1FF}]/gu, '')
      // Remove markdown bold/italic (***text***, **text**, *text*)
      .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
      // Remove markdown headers (#, ##, ###)
      .replace(/^#{1,6}\s+/gm, '')
      // Remove bullet point symbols
      .replace(/^[\-\•\*]\s+/gm, '')
      // Remove code backticks
      .replace(/`([^`]+)`/g, '$1')
      // Remove multiple spaces
      .replace(/\s{2,}/g, ' ')
      // Remove leading/trailing whitespace
      .trim();
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    localStorage.setItem('shopkeeper_muted', this.isMuted);
    const muteBtn = document.getElementById('shopkeeper-mute');
    if (muteBtn) {
      muteBtn.innerHTML = this.isMuted ? '🔇' : '🔊';
      muteBtn.title = this.isMuted ? 'Unmute voice' : 'Mute voice';
      muteBtn.classList.toggle('muted', this.isMuted);
    }
    // Stop any current speech when muting
    if (this.isMuted && this.synth) {
      this.synth.cancel();
    }
  }

  // ── Voice: Speech-to-Text ──
  toggleVoiceInput() {
    if (this.isListening) {
      this.stopVoiceInput();
      return;
    }

    // If AI is speaking, shut it up first
    if (this.isSpeaking && this.synth) {
      this.synth.cancel();
      this.isSpeaking = false;
    }

    if (!this.SpeechRecognition) {
      this.addMessage('Sorry, your browser does not support voice input. Try Chrome or Edge.', 'bot');
      return;
    }

    this.startVoiceInput();
  }

  startVoiceInput() {
    // If AI is currently speaking, STOP it — user wants to talk
    if (this.isSpeaking && this.synth) {
      this.synth.cancel();
      this.isSpeaking = false;
    }

    const recognition = new this.SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = true;   // Show real-time text as user speaks
    recognition.continuous = true;
    recognition.maxAlternatives = 3;

    this.recognition = recognition;
    this.isListening = true;

    const micBtn = document.getElementById('shopkeeper-mic');
    const inputField = document.getElementById('shopkeeper-input');
    if (micBtn) {
      micBtn.classList.add('listening');
      micBtn.innerHTML = '⏹️';
      micBtn.title = 'Stop listening';
    }
    if (inputField) {
      inputField.placeholder = '🎤 Listening... speak now';
    }

    recognition.onresult = (event) => {
      let interim = '';
      let finalText = '';
      let finalConfidence = 0;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          // Pick highest confidence alternative
          let best = '', bestConf = 0;
          for (let j = 0; j < event.results[i].length; j++) {
            if (event.results[i][j].confidence > bestConf) {
              bestConf = event.results[i][j].confidence;
              best = event.results[i][j].transcript;
            }
          }
          finalText += best;
          finalConfidence = bestConf;
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      // Show what's being heard in real-time
      if (inputField) {
        inputField.value = finalText || interim;
      }

      // Auto-send on final result with decent confidence
      if (finalText && finalConfidence > 0.4) {
        this.stopVoiceInput();
        setTimeout(() => this.sendMessage(), 300);
      }
    };

    recognition.onerror = (event) => {
      console.warn('Voice input error:', event.error);
      if (event.error === 'no-speech') {
        this.addMessage('No speech detected. Please try again.', 'bot');
      } else if (event.error === 'not-allowed') {
        this.addMessage('Microphone access denied. Please allow microphone access and try again.', 'bot');
      }
      this.stopVoiceInput();
    };

    recognition.onend = () => {
      this.stopVoiceInput();
    };

    try {
      recognition.start();
    } catch (err) {
      console.error('Could not start voice recognition:', err);
      this.stopVoiceInput();
    }
  }

  stopVoiceInput() {
    this.isListening = false;
    if (this.recognition) {
      try { this.recognition.stop(); } catch (e) { /* ignore */ }
      this.recognition = null;
    }

    const micBtn = document.getElementById('shopkeeper-mic');
    const inputField = document.getElementById('shopkeeper-input');
    if (micBtn) {
      micBtn.classList.remove('listening');
      micBtn.innerHTML = '🎤';
      micBtn.title = 'Voice command';
    }
    if (inputField) {
      inputField.placeholder = 'Type or tap 🎤 to talk...';
    }
  }

  setApiKey(key) {
    this.apiKey = key;
    localStorage.setItem('OPENROUTER_API_KEY', key);
  }

  getApiKey() {
    return this.apiKey;
  }

  clearHistory() {
    this.conversationHistory = [];
  }
}

// Initialize ShopKeeper when DOM is ready
let shopkeeper;
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    shopkeeper = new ShopKeeper();
  });
} else {
  shopkeeper = new ShopKeeper();
}
