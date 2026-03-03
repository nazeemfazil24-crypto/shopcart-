# 🤖 ShopKeeper AI Chatbot Setup Guide

Welcome! ShopKeeper is a friendly AI assistant for your ShopHub store. It's powered by **Hugging Face's free Inference API**.

## ⚡ Quick Setup (2 minutes)

### Step 1: Get a Free Hugging Face API Key
1. Go to [Hugging Face](https://huggingface.co/settings/tokens)
2. Sign up (free account) if you don't have one
3. Click "New token" → Name it "ShopKeeper" → Select "Read" access
4. Copy the token (starts with `hf_...`)

### Step 2: Add API Key to Your App

**Option A: Browser Console (Testing)**
```javascript
// Open browser Developer Tools (F12) → Console tab
// Paste this:
shopkeeper.setApiKey('hf_YOUR_API_KEY_HERE')
```

**Option B: Settings Page (Recommended)**
Add this to your profile or settings page:
```html
<div class="api-key-setup">
  <label>Hugging Face API Key:</label>
  <input type="password" id="apiKeyInput" placeholder="hf_..." />
  <button onclick="shopkeeper.setApiKey(document.getElementById('apiKeyInput').value)">
    Save API Key
  </button>
</div>
```

**Option C: Hardcode (Development Only)**
Edit [shopkeeper.js](shopkeeper.js) line 11:
```javascript
this.apiKey = localStorage.getItem('HUGGINGFACE_API_KEY') || 'hf_YOUR_API_KEY_HERE';
```

---

## 🎯 Features

✅ **Real-time AI Responses** - Powered by free Hugging Face models  
✅ **Conversation Memory** - Remembers previous messages in the chat  
✅ **Product-Aware** - Knows about your store categories  
✅ **Floating Widget** - Always accessible in bottom-right corner  
✅ **Mobile Friendly** - Works on all devices  
✅ **No Backend Required** - Client-side only (for now)  

---

## 🧠 Available AI Models (Free Tier)

ShopKeeper comes with **Mistral-7B** (fast & friendly). You can swap models:

Edit line 10 in [shopkeeper.js](shopkeeper.js):
```javascript
// Pick one of these free models:
this.model = 'mistralai/Mistral-7B-Instruct-v0.1';      // ⭐ Fast & friendly
this.model = 'HuggingFaceH4/zephyr-7b-beta';            // Smart & conversational
this.model = 'meta-llama/Llama-2-7b-chat';              // General purpose
this.model = 'NousResearch/Neural-Chat-7B-v3-1';        // Helpful & detailed
this.model = 'microsoft/DialoGPT-medium';               // Dialogue-optimized
```

---

## 🔧 Customization

### Change the System Prompt
Edit lines 14-21 in [shopkeeper.js](shopkeeper.js) to match your brand voice:
```javascript
this.systemPrompt = `You are MyStore's helpful assistant. Focus on...`;
```

### Style Changes
Edit [styles.css](styles.css) - Search for `ShopKeeper AI Chatbot Styles` section:
```css
/* Change colors */
background: linear-gradient(135deg, YOUR_COLOR_1 0%, YOUR_COLOR_2 100%);

/* Change position */
bottom: 20px;  /* Distance from bottom */
right: 20px;   /* Distance from right */
```

### Disable ShopKeeper
Comment out this line in [index.html](index.html):
```html
<!-- <script src="shopkeeper.js"></script> -->
```

---

## 🚨 Troubleshooting

### "I'm experiencing connection issues"
- ✅ Check your Hugging Face API key is correct
- ✅ Ensure key has "Read" access permission
- ✅ Subscribe to Hugging Face (free tier available)

### Slow Responses
- Hugging Face free tier has rate limits
- Try a smaller model (see Models section above)
- **Pro Tip**: Use [Replicate.com](https://replicate.com) for faster inference ($0 trial credits)

### API Key Not Saving
- Open browser DevTools → Application → LocalStorage
- Check `HUGGINGFACE_API_KEY` exists
- Clear cache and reload page

### Token Limit Exceeded
- ShopKeeper automatically keeps only last 6 messages
- Clear chat history: `shopkeeper.clearHistory()`

---

## 🌐 Alternative APIs (Also Free!)

Over time, you can swap to other free APIs:

| Service | Free Tier | Model Count | Speed | Notes |
|---------|-----------|-------------|-------|-------|
| **Hugging Face** | 100K calls/month | 1000s | Medium | ✅ Current |
| **Replicate** | $0 trial credits | 100s | Fast | Very good for demos |
| **Together AI** | 3M tokens/month | 50+ | Very fast | Generous free tier |
| **Groq** | Unlimited* | 3 models | Ultra fast | Best for speed |
| **Cohere** | 100K calls/month | Multi | Good | Production-ready |
| **Ollama** | Unlimited | Local | Varies | Fully local, no API needed |

---

## 📊 Production Tips

1. **Add rate limiting** - Prevent API abuse
2. **Move API key to backend** - Don't expose in frontend
3. **Monitor costs** - Track API usage
4. **Add to other pages** - Copy `<script src="shopkeeper.js"></script>` to other HTML files
5. **A/B Test responses** - Try different prompts and models
6. **Log conversations** - For analytics and improvement

---

## 🎓 Example: Add to Profile Page

To add ShopKeeper to `profile.html`:
```html
<!-- Add before </body> -->
<script src="shopkeeper.js"></script>
```

That's it! The chatbot will work on any page.

---

## 📧 Support

- **Hugging Face Docs**: https://huggingface.co/docs/hub/api
- **API Status**: https://status.huggingface.co/
- **Community**: https://huggingface.co/community

---

**Enjoy your ShopKeeper! 🚀**
