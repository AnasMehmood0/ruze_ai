const express = require('express');
const path = require('path');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// 1. Force Express to know exactly where 'public' is
app.use(express.static(path.join(__dirname, 'public')));

const key = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(key);

app.post('/api/chat', async (req, res) => {
    try {
        // ... (Keep your existing chat logic here, or paste the full code below) ...
        // For simplicity, just ensure the file ends with the route below:
        let { message, history, system_instruction, temperature } = req.body;
        // ... (Your chat logic) ...
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const chat = model.startChat({ history: [] });
        const result = await chat.sendMessage(message);
        const response = await result.response;
        res.json({ reply: response.text() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 2. THE FIX: Explicitly serve index.html for the root route "/"
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 3. Export properly
if (require.main === module) {
    app.listen(port, () => console.log(`Server running on port ${port}`));
}
module.exports = app;
