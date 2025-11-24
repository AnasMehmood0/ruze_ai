const express = require('express');
const path = require('path');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000; // Use Vercel's port or 3000 locally

app.use(express.json());
app.use(express.static('public')); 

// Debug: Check if Key exists
const key = process.env.GEMINI_API_KEY;
if (!key) {
    console.error("❌ ERROR: GEMINI_API_KEY is missing in .env file!");
} else {
    console.log(`✅ API Key Loaded: ${key.substring(0, 4)}...`);
}

const genAI = new GoogleGenerativeAI(key);

app.post('/api/chat', async (req, res) => {
    try {
        let { message, history, system_instruction, temperature } = req.body;

        console.log("📩 Message received:", message);

        // --- 1. HISTORY CLEANUP ---
        if (history && history.length > 0) {
            const lastMsg = history[history.length - 1];
            if (lastMsg.role === 'user' && lastMsg.text === message) {
                history = history.slice(0, -1);
            }
        }

        let formattedHistory = history
            .filter(msg => msg.text && msg.text.trim() !== "") 
            .map(msg => ({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.text }]
            }));

        // --- 2. REMOVE MODEL WELCOME MESSAGE ---
        if (formattedHistory.length > 0 && formattedHistory[0].role === 'model') {
            formattedHistory.shift(); 
        }

        // --- 3. SYSTEM PROMPT INJECTION ---
        if (system_instruction) {
            const sysMsg = `INSTRUCTION: ${system_instruction}`;
            if (formattedHistory.length === 0) {
                formattedHistory = [
                    { role: 'user', parts: [{ text: sysMsg }] },
                    { role: 'model', parts: [{ text: "Understood." }] }
                ];
            } else {
                const firstUserMsg = formattedHistory[0].parts[0].text;
                formattedHistory[0].parts[0].text = `${sysMsg}\n\n[USER QUERY]:\n${firstUserMsg}`;
            }
        }

        // --- 4. SAFETY SETTINGS ---
        const safetySettings = [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ];

        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.5-flash", 
            generationConfig: { temperature: temperature || 0.7 },
            safetySettings: safetySettings
        });

        const chat = model.startChat({ history: formattedHistory });
        
        // --- 5. STANDARD RESPONSE ---
        const result = await chat.sendMessage(message);
        const response = await result.response;
        const text = response.text();

        console.log("✅ Sent response");
        res.json({ reply: text });

    } catch (error) {
        console.error("❌ SERVER ERROR:", error);
        res.status(500).json({ error: error.message });
    }
});

// --- VERCEL CONFIGURATION (Crucial Change) ---
// This allows the app to work both locally and on Vercel
if (require.main === module) {
    app.listen(port, () => {
        console.log(`\n🟢 RUZE JS Core Online at http://localhost:${port}`);
    });
}

module.exports = app;