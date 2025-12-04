import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * POST /api/translate-scope
 * 
 * Translate scope of work between English and Spanish
 * 
 * Request body:
 * {
 *   text: string,
 *   targetLanguage: 'en' | 'es'
 * }
 * 
 * Response:
 * {
 *   translatedText: string
 * }
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text, targetLanguage } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'text is required' });
    }

    if (!['en', 'es'].includes(targetLanguage)) {
      return res.status(400).json({ error: 'targetLanguage must be "en" or "es"' });
    }

    const prompt = targetLanguage === 'es'
      ? `Translate this construction scope of work to Spanish. Use proper construction terminology. Keep it professional and clear. Only output the translation, nothing else.

${text}`
      : `Translate this construction scope of work to English. Use proper construction terminology. Keep it professional and clear. Only output the translation, nothing else.

${text}`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    });

    return res.status(200).json({
      translatedText: response.content[0].text
    });

  } catch (error) {
    console.error('Error translating scope:', error);
    return res.status(500).json({ 
      error: 'Failed to translate',
      message: error.message 
    });
  }
}

