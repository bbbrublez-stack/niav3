// api/chat.js — использует Groq API (бесплатно, без карты, работает из России)
// Groq работает на специальных чипах LPU — ответы очень быстрые.
// Модели: llama-3.3-70b-versatile (текст), llama-3.2-11b-vision-preview (изображения)

export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body;
  if (!body || !body.messages || !Array.isArray(body.messages)) {
    return res.status(400).json({ error: 'Неверный запрос' });
  }

  const { messages, system } = body;

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'GROQ_API_KEY не найден. Добавь его в Environment Variables в Vercel.'
    });
  }

  // Проверяем есть ли изображение в последнем сообщении пользователя
  const lastMsg = messages[messages.length - 1];
  const hasImage = Array.isArray(lastMsg?.content) &&
    lastMsg.content.some(p => p.type === 'image_url');

  // Выбираем модель:
  // - Для изображений: llama-3.2-11b-vision-preview (поддерживает vision)
  // - Для текста: llama-3.3-70b-versatile (мощная, 70B параметров)
  const model = hasImage
    ? 'llama-3.2-11b-vision-instant'
    : 'llama-3.3-70b-versatile';

  const apiMessages = [
    {
      role: 'system',
      content: system || 'Ты умный помощник. Отвечай на языке пользователя.'
    },
    ...messages
  ];

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: apiMessages,
        max_tokens: 1500,
        temperature: 0.8
      })
    });

    const data = await response.json();

    // Детальное логирование ошибок — чтобы было видно в Vercel → Functions → Logs
    if (!response.ok) {
      console.error('Groq API error:', response.status, JSON.stringify(data));

      if (response.status === 401) {
        return res.status(401).json({ error: 'Неверный API-ключ Groq. Проверь GROQ_API_KEY в Vercel.' });
      }
      if (response.status === 429) {
        return res.status(429).json({ error: 'Превышен лимит запросов. Подожди минуту и попробуй снова.' });
      }

      const errMsg = data?.error?.message || `Ошибка Groq API: ${response.status}`;
      return res.status(500).json({ error: errMsg });
    }

    const text = data?.choices?.[0]?.message?.content;
    if (!text) {
      console.error('Empty response from Groq:', JSON.stringify(data));
      return res.status(500).json({ error: 'Получен пустой ответ от AI. Попробуй снова.' });
    }

    return res.status(200).json({ text });

  } catch (err) {
    console.error('Fetch error:', err.message);
    return res.status(500).json({ error: 'Ошибка подключения к AI-серверу: ' + err.message });
  }
}
