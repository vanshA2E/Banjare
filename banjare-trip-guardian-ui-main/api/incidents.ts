import mysql from 'mysql2/promise'

type IncidentInput = { type?: string; description?: string; lat?: number; lng?: number; phone?: string; recordHash?: string }
const pool = process.env.DATABASE_URL ? mysql.createPool(process.env.DATABASE_URL) : undefined

export default async function handler(request: Request) {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS' }
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers })
  if (!pool) return Response.json({ error: 'DATABASE_URL is not configured.' }, { status: 503, headers })
  if (request.method === 'GET') {
    const [rows] = await pool.query('SELECT i.id, i.code, i.type, i.severity, i.status, i.lat, i.lng, i.description, i.created_at, t.name AS team FROM incidents i LEFT JOIN response_teams t ON t.id = i.team_id ORDER BY i.created_at DESC LIMIT 100')
    return Response.json(rows, { headers })
  }
  if (request.method === 'PATCH') {
    const id = new URL(request.url).pathname.split('/').pop()
    const body = await request.json() as { status?: string; team?: string }
    if (!id || !['open', 'in-progress', 'resolved'].includes(body.status ?? '')) return Response.json({ error: 'Invalid incident update.' }, { status: 400, headers })
    const [teams] = await pool.query('SELECT id FROM response_teams WHERE name = ? LIMIT 1', [body.team ?? ''])
    const teamId = (teams as Array<{ id: string }>)[0]?.id ?? null
    await pool.execute('UPDATE incidents SET status = ?, team_id = COALESCE(?, team_id), resolved_at = CASE WHEN ? = "resolved" THEN CURRENT_TIMESTAMP(3) ELSE NULL END WHERE id = ?', [body.status, teamId, body.status, id])
    return Response.json({ ok: true }, { headers })
  }
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers })
  const body = await request.json() as IncidentInput
  const allowed = ['sos', 'zone_breach', 'unauthorized', 'medical', 'hazard', 'lost']
  const type = body.type?.toLowerCase()
  if (!type || !allowed.includes(type)) return Response.json({ error: 'Invalid incident type.' }, { status: 400, headers })
  const id = crypto.randomUUID()
  const code = `INC-${new Date().getUTCFullYear()}-${id.slice(0, 8).toUpperCase()}`
  await pool.execute('INSERT INTO incidents (id, code, type, severity, lat, lng, description, record_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [id, code, type, type === 'sos' ? 'critical' : 'medium', body.lat ?? null, body.lng ?? null, body.description ?? null, body.recordHash ?? null])
  return Response.json({ id, code }, { status: 201, headers })
}
