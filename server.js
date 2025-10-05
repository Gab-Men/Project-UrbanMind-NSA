const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.post('/api/chat', async (req, res) => {
    try {
		// CORS headers
		res.setHeader("Access-Control-Allow-Origin", "*");
		res.setHeader("Access-Control-Allow-Headers", "Content-Type");

        if (!OPENAI_API_KEY) {
            return res.status(500).json({ error: 'Server missing OPENAI_API_KEY' });
        }

        const body = req.body || {};
		const model = typeof body.model === 'string' && body.model.trim() ? body.model : 'gpt-4o-mini';
		const messages = Array.isArray(body.messages) ? body.messages : null;
        if (!messages) {
            return res.status(400).json({ error: 'Invalid request: messages must be an array' });
        }

		// Inject system primer for environmental urbanism analysis
		const systemPrimer = {
			role: 'system',
			content: 'Você é um assistente de análise ambiental e urbanismo sustentável especializado em prever crescimento urbano seguro em Campo Mourão.'
		};
		const finalMessages = [systemPrimer, ...messages];

        const resp = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
			body: JSON.stringify({
				model,
				messages: finalMessages,
				temperature: 0.7
			}),
            timeout: 20000
        });

        const text = await resp.text();
        if (!resp.ok) {
            // Try parse error JSON; otherwise return raw text
            try {
                const errJson = JSON.parse(text);
                const msg = errJson?.error?.message || 'OpenAI API error';
                return res.status(resp.status).json({ error: msg });
            } catch (_) {
                return res.status(resp.status).json({ error: text || 'OpenAI API error' });
            }
        }

        let data;
        try { data = JSON.parse(text); } catch (_) { data = null; }
        if (!data) return res.status(502).json({ error: 'Invalid response from OpenAI' });

        const reply = data?.choices?.[0]?.message?.content?.trim() || '';
        return res.json({ reply });
    } catch (err) {
        return res.status(500).json({ error: 'Proxy failure', detail: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});


