import mysql from 'mysql2/promise'

type TouristInput = { phone?: string; name?: string }
const pool = process.env.DATABASE_URL ? mysql.createPool(process.env.DATABASE_URL) : undefined
const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' }

export default async function handler(request: Request) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers })
  if (!pool) return Response.json({ error: 'DATABASE_URL is not configured.' }, { status: 503, headers })

  if (request.method === 'GET') {
    const [rows] = await pool.query('SELECT id, name, phone, digital_id, id_status, risk, last_seen, created_at FROM tourists ORDER BY last_seen DESC, created_at DESC LIMIT 1000')
    return Response.json(rows, { headers })
  }

  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers })
  const body = await request.json() as TouristInput
  const phone = body.phone?.replace(/\D/g, '')
  if (!phone || phone.length < 10 || phone.length > 15) {
    return Response.json({ error: 'A valid phone number is required.' }, { status: 400, headers })
  }

  const id = crypto.randomUUID()
  await pool.execute(
    `INSERT INTO tourists (id, phone, name, last_seen)
     VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP(3))
     ON DUPLICATE KEY UPDATE name = VALUES(name), last_seen = CURRENT_TIMESTAMP(3)`,
    [id, phone, body.name?.trim() || 'Rajasthan traveller', `BJ-${id.slice(0, 8).toUpperCase()}`],
  )
  return Response.json({ ok: true }, { status: 200, headers })
}
