/**
 * ShopKeeper Settings Panel
 * Allows users to configure and test the AI chatbot API
 */

function initShopKeeperSettings() {
  // Create settings button if it doesn't exist
  const headerNav = document.querySelector('.hero-nav') || document.querySelector('.header');
  if (!headerNav || document.getElementById('shopkeeper-settings-btn')) return;

  // Add settings button to header
  const settingsBtn = document.createElement('button');
  settingsBtn.id = 'shopkeeper-settings-btn';
  settingsBtn.className = 'shopkeeper-settings-btn';
  settingsBtn.innerHTML = '⚙️ AI Settings';
  settingsBtn.onclick = openShopKeeperSettings;
  headerNav.appendChild(settingsBtn);

  // Create modal HTML
  const modalHTML = `
    <div id="shopkeeper-settings-modal" class="shopkeeper-settings-modal" style="display: none;">
      <div class="shopkeeper-settings-content">
        <div class="settings-header">
          <h2>ShopKeeper AI Settings</h2>
          <button class="settings-close" onclick="closeShopKeeperSettings()">✕</button>
        </div>

        <div class="settings-body">
          
          <!-- API Key Section -->
          <div class="settings-section">
            <h3>🔑 Hugging Face API Key</h3>
            <p class="help-text">
              Get a free API key from <a href="https://huggingface.co/settings/tokens" target="_blank">Hugging Face</a>
            </p>
            <div class="input-group">
              <input 
                type="password" 
                id="apiKeyInput" 
                class="settings-input"
                placeholder="hf_..." 
                value=""
              />
              <button class="toggle-visibility-btn" onclick="toggleApiKeyVisibility()">👁️</button>
            </div>
            <button class="save-btn" onclick="saveShopKeeperApiKey()">💾 Save API Key</button>
            <div id="api-status" class="status-message"></div>
          </div>

          <!-- Model Selection -->
          <div class="settings-section">
            <h3>🧠 AI Model</h3>
            <select id="modelSelect" class="settings-input" onchange="changeShopKeeperModel()">
              <option value="mistralai/Mistral-7B-Instruct-v0.1">Mistral-7B (Fast & Friendly) ⭐</option>
              <option value="HuggingFaceH4/zephyr-7b-beta">Zephyr-7B (Smart)</option>
              <option value="meta-llama/Llama-2-7b-chat">Llama-2 (General)</option>
              <option value="NousResearch/Neural-Chat-7B-v3-1">Neural-Chat (Detailed)</option>
              <option value="microsoft/DialoGPT-medium">DialoGPT (Dialogue)</option>
            </select>
          </div>

          <!-- Status Check -->
          <div class="settings-section">
            <h3>🧪 Test Connection</h3>
            <button class="test-btn" onclick="testShopKeeperConnection()">Test API Connection</button>
            <div id="test-status" class="status-message"></div>
          </div>

          <!-- Clear Chat -->
          <div class="settings-section">
            <h3>🗑️ Clear Chat</h3>
            <button class="danger-btn" onclick="clearShopKeeperChat()">Clear All Messages</button>
          </div>

          <!-- Info -->
          <div class="settings-section info-section">
            <h3>ℹ️ Information</h3>
            <p>
              <strong>ShopKeeper</strong> is an AI assistant that helps customers navigate your store.
              <br/><br/>
              <strong>Free Tier:</strong> 100,000 API calls/month from Hugging Face
              <br/>
              <strong>Status:</strong> <span id="current-status">Inactive (No API Key)</span>
            </p>
          </div>

        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);
  updateShopKeeperSettingsUI();
}

function openShopKeeperSettings() {
  const modal = document.getElementById('shopkeeper-settings-modal');
  if (modal) modal.style.display = 'block';
  updateShopKeeperSettingsUI();
}

function closeShopKeeperSettings() {
  const modal = document.getElementById('shopkeeper-settings-modal');
  if (modal) modal.style.display = 'none';
}

function updateShopKeeperSettingsUI() {
  const apiKeyInput = document.getElementById('apiKeyInput');
  const statusEl = document.getElementById('current-status');
  const modelSelect = document.getElementById('modelSelect');

  if (apiKeyInput && typeof shopkeeper !== 'undefined') {
    apiKeyInput.value = shopkeeper.getApiKey();
    const isConfigured = shopkeeper.getApiKey() && shopkeeper.getApiKey() !== 'your-api-key-here';
    
    if (statusEl) {
      statusEl.textContent = isConfigured ? '✅ Active' : '⚠️ Inactive (No API Key)';
      statusEl.style.color = isConfigured ? '#22a699' : '#dc2626';
    }
  }

  if (modelSelect && typeof shopkeeper !== 'undefined') {
    modelSelect.value = shopkeeper.model || 'mistralai/Mistral-7B-Instruct-v0.1';
  }
}

function toggleApiKeyVisibility() {
  const input = document.getElementById('apiKeyInput');
  const btn = event.target;
  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = '🙈';
  } else {
    input.type = 'password';
    btn.textContent = '👁️';
  }
}

function saveShopKeeperApiKey() {
  const apiKey = document.getElementById('apiKeyInput').value.trim();
  const statusEl = document.getElementById('api-status');

  if (!apiKey) {
    statusEl.textContent = '❌ Please enter an API key';
    statusEl.style.color = '#dc2626';
    return;
  }

  if (!apiKey.startsWith('hf_')) {
    statusEl.textContent = '⚠️ Hugging Face API keys start with "hf_"';
    statusEl.style.color = '#dc2626';
    return;
  }

  try {
    if (typeof shopkeeper !== 'undefined') {
      shopkeeper.setApiKey(apiKey);
      statusEl.textContent = '✅ API Key saved successfully!';
      statusEl.style.color = '#22a699';
      setTimeout(() => updateShopKeeperSettingsUI(), 1000);
    }
  } catch (error) {
    statusEl.textContent = '❌ Error saving API key';
    statusEl.style.color = '#dc2626';
  }
}

function changeShopKeeperModel() {
  const model = document.getElementById('modelSelect').value;
  if (typeof shopkeeper !== 'undefined') {
    shopkeeper.model = model;
    shopkeeper.apiUrl = `https://api-inference.huggingface.co/models/${model}`;
    console.log('Model changed to:', model);
  }
}

async function testShopKeeperConnection() {
  const testStatusEl = document.getElementById('test-status');
  const apiKeyInput = document.getElementById('apiKeyInput');
  const apiKey = apiKeyInput.value.trim();

  if (!apiKey || apiKey === 'your-api-key-here') {
    testStatusEl.textContent = '⚠️ Please enter an API key first';
    testStatusEl.style.color = '#dc2626';
    return;
  }

  testStatusEl.textContent = '⏳ Testing connection...';
  testStatusEl.style.color = '#888';

  try {
    const model = document.getElementById('modelSelect').value;
    const testPayload = {
      inputs: 'Hello, this is a test message.',
      parameters: { max_length: 50 }
    };

    const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPayload)
    });

    if (response.ok) {
      testStatusEl.textContent = '✅ Connection successful! ShopKeeper is ready.';
      testStatusEl.style.color = '#22a699';
    } else if (response.status === 401) {
      testStatusEl.textContent = '❌ Invalid API key. Check your token.';
      testStatusEl.style.color = '#dc2626';
    } else {
      testStatusEl.textContent = `❌ Error: ${response.status}. Check your API key or model.`;
      testStatusEl.style.color = '#dc2626';
    }
  } catch (error) {
    testStatusEl.textContent = '❌ Connection failed. Check your internet connection.';
    testStatusEl.style.color = '#dc2626';
    console.error('Test error:', error);
  }
}

function clearShopKeeperChat() {
  if (confirm('Clear all chat messages? This cannot be undone.')) {
    if (typeof shopkeeper !== 'undefined') {
      shopkeeper.clearHistory();
      const messagesContainer = document.getElementById('shopkeeper-messages');
      if (messagesContainer) {
        messagesContainer.innerHTML = `
          <div class="shopkeeper-message bot-message">
            <p>👋 Chat cleared! How can I help you today?</p>
          </div>
        `;
      }
      alert('Chat history cleared!');
    }
  }
}

// Initialize settings when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initShopKeeperSettings);
} else {
  initShopKeeperSettings();
}
