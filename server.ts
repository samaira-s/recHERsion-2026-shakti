import express from 'express';
import { createServer as createViteServer } from 'vite';
import crypto from 'crypto';
import { GoogleGenAI, Type } from '@google/genai';

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // Initialize Gemini API client on server-side
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || '',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // Server signing key store (in-memory mock storage for signed reports)
  const signedReports = new Map<string, { caseId: string; chainHead: string; timestamp: string; signature: string }>();

  // POST /api/sign
  app.post('/api/sign', (req, res) => {
    try {
      const { caseId, chainHead } = req.body;
      if (!caseId || !chainHead) {
        return res.status(400).json({ error: 'Missing caseId or chainHead' });
      }

      const timestamp = new Date().toISOString();
      const payload = `${caseId}:${chainHead}:${timestamp}`;

      // Use a server secret or generate a signing key
      const secret = process.env.SERVER_SIGNING_SECRET || 'shakti-secure-signing-key-2026';
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(payload);
      const signature = hmac.digest('hex');

      const record = { caseId, chainHead, timestamp, signature };
      signedReports.set(`${caseId}.${chainHead}`, record);

      return res.json(record);
    } catch (err: any) {
      console.error('Signing error:', err);
      return res.status(500).json({ error: err.message || 'Signing failed' });
    }
  });

  // GET /api/verify/:key
  app.get('/api/verify-record/:key', (req, res) => {
    const record = signedReports.get(req.params.key);
    if (!record) {
      return res.status(404).json({ found: false });
    }
    return res.json({ found: true, record });
  });

  // POST /api/ai/analyze
  app.post('/api/ai/analyze', async (req, res) => {
    try {
      const { textContent, language = 'en' } = req.body;
      if (!textContent) {
        return res.status(400).json({ error: 'Missing textContent' });
      }

      const systemInstruction = `You are Shakti, a supportive, calm, and trauma-informed first-response AI guide for women in India facing online harassment, stalking, sextortion, or impersonation.
Tone: Reassuring, non-blaming, calm, trusted friend. Never give legal advice or promise outcomes.
Always advise: keeping evidence safe, not paying money, not deleting chats, blocking the abuser.
Mention helplines: National Cyber Crime Helpline (1930), cybercrime.gov.in, and Emergency (112) if in immediate danger.
Respond strictly in JSON matching the requested schema. Language requested: ${language}.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Analyze this chat log / incident description for risks and stages:\n\n${textContent}`,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              messages: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    index: { type: Type.INTEGER },
                    stage: { type: Type.STRING, description: "rapport, platform_shift, image_request, pressure, payment_demand, or benign" },
                    risk: { type: Type.INTEGER, description: "risk score from 0 to 100" },
                    explanation: { type: Type.STRING }
                  },
                  required: ["index", "stage", "risk", "explanation"]
                }
              },
              overall_severity: { type: Type.STRING, description: "keep_an_eye, take_care, or act_soon" },
              summary: { type: Type.STRING },
              do_now: { type: Type.ARRAY, items: { type: Type.STRING } },
              dont_do: { type: Type.ARRAY, items: { type: Type.STRING } },
              confidence_note: { type: Type.STRING }
            },
            required: ["messages", "overall_severity", "summary", "do_now", "dont_do", "confidence_note"]
          }
        }
      });

      const jsonText = response.text?.trim() || '{}';
      const parsed = JSON.parse(jsonText);
      return res.json(parsed);
    } catch (err: any) {
      console.error('Gemini AI analyze error:', err);
      return res.status(500).json({ error: err.message || 'AI analysis failed' });
    }
  });

  // Vite middleware setup for dev
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });

  app.use(vite.middlewares);

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`Shakti server running on http://0.0.0.0:${port}`);
  });
}

startServer();
