// api/generate-image.js
// Pollinations.ai — бесплатно навсегда, без ключа, работает из России.

export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt } = req.body || {};
  if (!prompt) {
    return res.status(400).json({ error: 'Нет prompt' });
  }

  try {
    const seed    = Math.floor(Math.random() * 2147483647);
    const full    = prompt + ', high quality, detailed, sharp focus';
    const encoded = encodeURIComponent(full);
    const url     = `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1024&seed=${seed}&nologo=true&model=flux`;

    return res.status(200).json({ url });
  } catch (err) {
    return res.status(500).json({ error: 'Ошибка генерации: ' + err.message });
  }
}
