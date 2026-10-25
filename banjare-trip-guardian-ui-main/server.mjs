import { createServer } from 'node:http'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { randomUUID } from 'node:crypto'

const dataFile = join(process.cwd(), '.data', 'banjare.json')
const port = Number(process.env.PORT ?? 8787)

async function loadData() {
  try {
    return JSON.parse(await readFile(dataFile, 'utf8'))
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
    return { tourists: [], incidents: [] }
  }
}

async function saveData(data) {
  await mkdir(dirname(dataFile), { recursive: true })
  await writeFile(dataFile, JSON.stringify(data, null, 2))
}

function send(response, status, body) {
  response.writeHead(status, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
    'Content-Type': 'application/json',
  })
  response.end(JSON.stringify(body))
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = ''
    request.on('data', (chunk) => { body += chunk })
    request.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}) } catch { reject(new Error('Invalid JSON body')) }
    })
    request.on('error', reject)
  })
}

const server = createServer(async (request, response) => {
  try {
    if (request.method === 'OPTIONS') return send(response, 204, {})
    const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`)
    const data = await loadData()

    if (url.pathname === '/api/health') return send(response, 200, { ok: true })
    if (url.pathname === '/api/tourists' && request.method === 'GET') return send(response, 200, data.tourists)
    if (url.pathname === '/api/incidents' && request.method === 'GET') {
      return send(response, 200, data.incidents.sort((a, b) => b.created_at.localeCompare(a.created_at)))
    }

    if (url.pathname === '/api/tourists' && request.method === 'POST') {
      const body = await readBody(request)
      const phone = String(body.phone ?? '').replace(/\D/g, '')
      if (phone.length < 10 || phone.length > 15) return send(response, 400, { error: 'A valid phone number is required.' })
      const existing = data.tourists.find((tourist) => tourist.phone === phone)
      if (existing) {
        existing.last_seen = new Date().toISOString()
      } else {
        data.tourists.push({ id: randomUUID(), phone, name: body.name?.trim() || 'Rajasthan traveller', digital_id: `BJ-${randomUUID().slice(0, 8).toUpperCase()}`, id_status: 'pending', risk: 0, last_seen: new Date().toISOString(), created_at: new Date().toISOString() })
      }
      await saveData(data)
      return send(response, 200, { ok: true })
    }

    if (url.pathname === '/api/incidents' && request.method === 'POST') {
      const body = await readBody(request)
      const allowed = ['sos', 'zone_breach', 'unauthorized', 'medical', 'hazard', 'lost']
      const type = String(body.type ?? '').toLowerCase()
      if (!allowed.includes(type)) return send(response, 400, { error: 'Invalid incident type.' })
      const incident = {
        id: randomUUID(),
        code: `INC-${new Date().getUTCFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`,
        type,
        severity: type === 'sos' ? 'critical' : 'medium',
        status: 'open',
        tourist: body.phone ?? 'Live tourist',
        zone: body.zone ?? 'Location attached',
        lat: body.lat ?? null,
        lng: body.lng ?? null,
        description: body.description ?? null,
        record_hash: body.recordHash ?? null,
        created_at: new Date().toISOString(),
      }
      data.incidents.push(incident)
      await saveData(data)
      return send(response, 201, incident)
    }

    if (url.pathname.startsWith('/api/incidents/') && request.method === 'PATCH') {
      const incident = data.incidents.find((item) => item.id === url.pathname.split('/').pop())
      if (!incident) return send(response, 404, { error: 'Incident not found.' })
      const body = await readBody(request)
      if (!['open', 'in-progress', 'resolved'].includes(body.status)) return send(response, 400, { error: 'Invalid incident status.' })
      incident.status = body.status
      incident.team = body.team ?? incident.team
      incident.updated_at = new Date().toISOString()
      await saveData(data)
      return send(response, 200, incident)
    }

    return send(response, 404, { error: 'Not found.' })
  } catch (error) {
    console.error(error)
    return send(response, 500, { error: 'The local data service failed.' })
  }
})

server.listen(port, '0.0.0.0', () => console.log(`Banjare local API listening on http://localhost:${port}`))
