type RequestBody = { question?: string; context?: Record<string, unknown> }

export default async function handler(request: Request) {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  const { question, context } = await request.json() as RequestBody
  if (!question?.trim()) return Response.json({ error: 'A question is required.' }, { status: 400 })
  const key = process.env.GROQ_API_KEY
  if (!key) return Response.json({ error: 'AI assistant is not configured. Add GROQ_API_KEY on the server.' }, { status: 503 })
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL ?? 'llama-3.1-8b-instant',
      temperature: 0.2,
      max_tokens: 500,
      messages: [
        { role: 'system', content: 'You are Banjare, a Rajasthan travel safety assistant. Give concise, practical advice. Never claim to dispatch emergency services. For imminent danger, tell the user to use SOS or call 112.' },
        { role: 'user', content: `Current trip context: ${JSON.stringify(context ?? {})}\nQuestion: ${question.trim()}` },
      ],
    }),
  })
  if (!response.ok) return Response.json({ error: 'The AI provider returned an error.' }, { status: 502 })
  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> }
  return Response.json({ answer: data.choices?.[0]?.message?.content ?? 'I could not generate an answer.' })
}
