import { useEffect, useMemo, useState } from 'react'
import { Activity, AlertTriangle, Bell, CheckCircle2, LayoutDashboard, LogOut, Map, Search, Shield, Users, UserRound } from 'lucide-react'
import './App.css'

type Status = 'open' | 'in-progress' | 'resolved'
type Incident = { id: string; code: string; type: string; severity: 'critical' | 'high' | 'medium'; status: Status; tourist: string; zone: string; time: string; team?: string; lat?: number | null; lng?: number | null; description?: string | null }
type Tourist = { id: string; name: string; phone: string; digital_id?: string; id_status: string; risk: number; last_seen?: string; created_at: string }
type Operator = { name: string; email: string; role: string; phone: string }

const seed: Incident[] = [
  { id: '1', code: 'INC-2026-0042', type: 'SOS', severity: 'critical', status: 'open', tourist: 'Aarav Mehta', zone: 'Nahargarh trail', time: '2 min ago', lat: 26.9372, lng: 75.8156 },
  { id: '2', code: 'INC-2026-0041', type: 'Medical', severity: 'high', status: 'in-progress', tourist: 'Maya Singh', zone: 'Hawa Mahal district', time: '18 min ago', team: 'Team Suraksha', lat: 26.9239, lng: 75.8267 },
  { id: '3', code: 'INC-2026-0039', type: 'Hazard', severity: 'medium', status: 'resolved', tourist: 'Kabir Rao', zone: 'Amer Fort corridor', time: '1 hr ago', team: 'Jaipur North', lat: 26.9855, lng: 75.8513 },
]

const apiBase = import.meta.env.VITE_API_BASE_URL ?? ''
const formatTime = (value: string) => new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })

function App() {
  const [auth, setAuth] = useState(() => localStorage.getItem('banjare-authority') === '1')
  return auth
    ? <Dashboard onSignOut={() => { localStorage.removeItem('banjare-authority'); setAuth(false) }} />
    : <Login onLogin={() => { localStorage.setItem('banjare-authority', '1'); setAuth(true) }} />
}

function Login({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('operator@banjare.demo')
  return <main className="login"><form className="login-card" onSubmit={(event) => { event.preventDefault(); onLogin() }}>
    <div className="logo"><Shield size={20} /> BANJARE NEXUS</div><h1>Command centre</h1><p>Coordinate safer journeys across Rajasthan.</p>
    <label htmlFor="email">Operator email</label><input id="email" value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
    <label htmlFor="password">Password</label><input id="password" type="password" defaultValue="demo123" required />
    <button type="submit">Enter console</button><div className="demo-note">DEMO: any credentials are accepted.</div>
  </form></main>
}

function Dashboard({ onSignOut }: { onSignOut: () => void }) {
  const [incidents, setIncidents] = useState<Incident[]>(seed)
  const [tourists, setTourists] = useState<Tourist[]>([])
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState('dashboard')
  const [connected, setConnected] = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [operator, setOperator] = useState<Operator>(() => JSON.parse(localStorage.getItem('banjare-operator') ?? '{"name":"Riya Sharma","email":"operator@banjare.demo","role":"Control room operator","phone":"+91 98765 00000"}') as Operator)

  const sync = async () => {
    if (!apiBase && !import.meta.env.DEV) return
    try {
      const [incidentResponse, touristResponse] = await Promise.all([fetch(`${apiBase}/api/incidents`), fetch(`${apiBase}/api/tourists`)])
      if (!incidentResponse.ok || !touristResponse.ok) throw new Error('The live data service is unavailable.')
      const rows = await incidentResponse.json() as Array<Omit<Incident, 'time'> & { created_at: string }>
      const people = await touristResponse.json() as Tourist[]
      setIncidents(rows.map((row) => ({ ...row, tourist: row.tourist ?? 'Live tourist', zone: row.zone ?? 'Location attached', time: formatTime(row.created_at) })))
      setTourists(people)
      setConnected(true); setLastSync(new Date())
    } catch (error) {
      console.error('Authority sync failed', error)
      setConnected(false)
    }
  }

  useEffect(() => { void sync(); const timer = window.setInterval(() => void sync(), 5000); return () => window.clearInterval(timer) }, [])

  const update = async (id: string, status: Status, team?: string) => {
    setIncidents((items) => items.map((item) => item.id === id ? { ...item, status, team: team ?? item.team } : item))
    if (!apiBase && !import.meta.env.DEV) return
    try {
      const response = await fetch(`${apiBase}/api/incidents/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status, team }) })
      if (!response.ok) throw new Error(`Incident update failed (${response.status})`)
    } catch (error) {
      console.error('Unable to save incident update', error)
      void sync()
    }
  }

  const visible = useMemo(() => incidents.filter((item) => (filter === 'all' || item.status === filter) && `${item.code} ${item.tourist} ${item.zone}`.toLowerCase().includes(query.toLowerCase())), [incidents, filter, query])
  const title = page === 'dashboard' ? 'Good morning, operator' : page === 'profile' ? 'Authority profile' : page === 'digital-ids' ? 'Digital identity registry' : page[0].toUpperCase() + page.slice(1)
  return <div className="console"><aside className="sidebar"><div className="logo"><Shield size={20} /> BANJARE</div>
    <div className="nav-label">COMMAND</div><SideLink icon={<LayoutDashboard size={17} />} text="Overview" active={page === 'dashboard'} onClick={() => setPage('dashboard')} /><SideLink icon={<AlertTriangle size={17} />} text="Incidents" active={page === 'incidents'} onClick={() => setPage('incidents')} /><SideLink icon={<Map size={17} />} text="Live map" active={page === 'map'} onClick={() => setPage('map')} /><SideLink icon={<Users size={17} />} text="Response teams" active={page === 'teams'} onClick={() => setPage('teams')} />
    <div className="nav-label">REGISTRY & INSIGHT</div><SideLink icon={<UserRound size={17} />} text="Digital IDs" active={page === 'digital-ids'} onClick={() => setPage('digital-ids')} /><SideLink icon={<Activity size={17} />} text="Analytics" active={page === 'analytics'} onClick={() => setPage('analytics')} /><div className="side-spacer" /><SideLink icon={<UserRound size={17} />} text="My profile" active={page === 'profile'} onClick={() => setPage('profile')} /><SideLink icon={<LogOut size={17} />} text="Sign out" active={false} onClick={onSignOut} />
  </aside><main className="main"><header className="topbar"><h1>{title}</h1><div className="topbar-actions"><span className={connected ? 'connection live' : 'connection'}><i />{connected ? `Live${lastSync ? ` · ${lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}` : 'Offline'}</span><Bell size={18} /><button className="operator operator-button" onClick={() => setPage('profile')}><div className="avatar">{operator.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</div><span><b>{operator.name}</b><small>{operator.role}</small></span></button></div></header>
    <div className="content">{page === 'dashboard' && <Overview incidents={visible} all={incidents} tourists={tourists} update={update} openMap={() => setPage('map')} />} {page === 'incidents' && <IncidentView incidents={visible} filter={filter} setFilter={setFilter} query={query} setQuery={setQuery} update={update} />} {page === 'map' && <LiveMap incidents={incidents} />} {page === 'digital-ids' && <DigitalIds tourists={tourists} />} {page === 'profile' && <Profile operator={operator} onSave={(value) => { setOperator(value); localStorage.setItem('banjare-operator', JSON.stringify(value)) }} />} {page === 'teams' && <Teams />} {page === 'analytics' && <Analytics incidents={incidents} />}</div>
  </main></div>
}

function SideLink({ icon, text, active, onClick }: { icon: React.ReactNode; text: string; active: boolean; onClick: () => void }) { return <button className={active ? 'side-link active' : 'side-link'} onClick={onClick}>{icon}{text}</button> }

function Overview({ incidents, all, tourists, update, openMap }: { incidents: Incident[]; all: Incident[]; tourists: Tourist[]; update: (id: string, status: Status, team?: string) => void; openMap: () => void }) {
  const open = all.filter((item) => item.status !== 'resolved').length
  return <><div className="intro"><div><span className="eyebrow">RAJASTHAN NETWORK / LIVE</span><h2>Situation overview</h2></div><span className="date">{new Date().toLocaleDateString([], { dateStyle: 'long' })}</span></div><div className="metrics"><Metric icon={<UserRound size={16} />} label="Registered tourists" value={String(tourists.length)} trend="Synced from app" /><Metric icon={<AlertTriangle size={16} />} label="Open incidents" value={String(open)} trend="Needs attention" /><Metric icon={<Map size={16} />} label="Monitored zones" value="8" trend="All systems live" /><Metric icon={<CheckCircle2 size={16} />} label="Teams available" value="3 / 4" trend="One responding" /></div><div className="dashboard-grid"><section className="panel"><div className="panel-title"><h3>Live safety map</h3><button className="filter-button" onClick={openMap}>Open full map</button></div><LiveMap incidents={incidents} compact /></section><section className="panel"><div className="panel-title"><h3>Recent incidents</h3><button className="filter-button" onClick={openMap}>View live map</button></div><div className="incident-list">{incidents.slice(0, 5).map((item) => <IncidentRow key={item.id} incident={item} update={update} />)}</div></section></div></>
}

function LiveMap({ incidents, compact = false }: { incidents: Incident[]; compact?: boolean }) {
  const latest = incidents.find((item) => item.lat && item.lng)
  const lat = latest?.lat ?? 26.9124; const lng = latest?.lng ?? 75.7873
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.08}%2C${lat - 0.05}%2C${lng + 0.08}%2C${lat + 0.05}&layer=mapnik&marker=${lat}%2C${lng}`
  return <div className={compact ? 'map map-compact' : 'map map-live'}><iframe title="Live Rajasthan incident map" src={src} loading="lazy" /><div className="map-overlay"><span className="live-pill"><i /> LIVE INCIDENT VIEW</span><small>{latest ? `${latest.code} · ${latest.zone}` : 'Waiting for location data'}</small></div></div>
}

function Metric({ icon, label, value, trend }: { icon: React.ReactNode; label: string; value: string; trend: string }) { return <div className="metric"><div className="metric-head"><span>{label}</span>{icon}</div><strong>{value}</strong><span className="trend">{trend}</span></div> }
function IncidentRow({ incident, update }: { incident: Incident; update: (id: string, status: Status, team?: string) => void }) { return <div className="incident"><span className={`sev ${incident.severity}`} /><div className="incident-main"><b>{incident.code} · {incident.type}</b><p>{incident.tourist} · {incident.zone}</p></div><span className={`badge ${incident.status === 'in-progress' ? 'progress' : incident.status}`}>{incident.status}</span>{incident.status === 'open' && <button className="action" onClick={() => update(incident.id, 'in-progress', 'Team Suraksha')}>Assign</button>}{incident.status === 'in-progress' && <button className="action resolve" onClick={() => update(incident.id, 'resolved')}>Resolve</button>}</div> }

function IncidentView({ incidents, filter, setFilter, query, setQuery, update }: { incidents: Incident[]; filter: string; setFilter: (value: string) => void; query: string; setQuery: (value: string) => void; update: (id: string, status: Status, team?: string) => void }) { return <section className="panel table-panel"><div className="panel-title"><div><span className="eyebrow">INCIDENT COMMAND</span><h3>Response queue</h3></div><div className="table-tools"><div className="search-wrap"><Search size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search incidents" /></div>{['all', 'open', 'in-progress', 'resolved'].map((item) => <button key={item} className={filter === item ? 'filter-button selected' : 'filter-button'} onClick={() => setFilter(item)}>{item}</button>)}</div></div><table className="table"><thead><tr><th>Incident</th><th>Tourist / zone</th><th>Severity</th><th>Status</th><th>Action</th></tr></thead><tbody>{incidents.map((item) => <tr key={item.id}><td><b>{item.code}</b><small>{item.type} · {item.time}</small></td><td>{item.tourist}<small>{item.zone}</small></td><td><span className={`sev ${item.severity}`} /> {item.severity}</td><td><span className={`badge ${item.status === 'in-progress' ? 'progress' : item.status}`}>{item.status}</span></td><td>{item.status === 'open' && <button className="action" onClick={() => update(item.id, 'in-progress', 'Team Suraksha')}>Assign team</button>}{item.status === 'in-progress' && <button className="action resolve" onClick={() => update(item.id, 'resolved')}>Resolve</button>}{item.status === 'resolved' && <span className="date">Closed</span>}</td></tr>)}</tbody></table>{incidents.length === 0 && <div className="empty">No incidents match your filters.</div>}</section> }

function DigitalIds({ tourists }: { tourists: Tourist[] }) { const [query, setQuery] = useState(''); const filtered = tourists.filter((item) => `${item.name} ${item.phone} ${item.digital_id ?? item.id}`.toLowerCase().includes(query.toLowerCase())); return <section className="panel table-panel"><div className="panel-title"><div><span className="eyebrow">TRUSTED TRAVELLER REGISTRY</span><h3>Digital IDs</h3></div><div className="search-wrap"><Search size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, phone or ID" /></div></div><p className="section-help">Use the verified identifier to confirm a traveller during an incident. Only authorised operators should access personal details.</p><table className="table"><thead><tr><th>Traveller</th><th>Digital ID</th><th>Verification</th><th>Risk</th><th>Last seen</th></tr></thead><tbody>{filtered.map((item) => <tr key={item.id}><td><b>{item.name}</b><small>{item.phone}</small></td><td><code>{item.digital_id ?? `BJ-${item.id.slice(0, 8).toUpperCase()}`}</code></td><td><span className={`badge ${item.id_status === 'verified' ? 'progress' : 'open'}`}>{item.id_status}</span></td><td>{item.risk > 0 ? <span className="risk">{item.risk}</span> : 'Low'}</td><td>{item.last_seen ? formatTime(item.last_seen) : 'Not available'}</td></tr>)}</tbody></table>{filtered.length === 0 && <div className="empty">No registered tourists yet. A traveller appears here after signing in.</div>}</section> }

function Profile({ operator, onSave }: { operator: Operator; onSave: (value: Operator) => void }) { const [form, setForm] = useState(operator); const [saved, setSaved] = useState(false); return <section className="panel profile-panel"><div className="profile-heading"><div className="avatar large">{form.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</div><div><span className="eyebrow">AUTHORITY ACCOUNT</span><h2>{form.name}</h2><p>{form.role}</p></div></div><div className="profile-grid">{(['name', 'email', 'phone', 'role'] as const).map((field) => <label key={field}>{field === 'name' ? 'Full name' : field[0].toUpperCase() + field.slice(1)}<input value={form[field]} onChange={(event) => setForm({ ...form, [field]: event.target.value })} /></label>)}</div><div className="profile-actions"><span className="section-help">Profile changes are saved on this device for the demo.</span><button className="action primary-action" onClick={() => { onSave(form); setSaved(true) }}>{saved ? 'Saved' : 'Save profile'}</button></div></section> }
function Teams() { return <section className="panel table-panel"><div className="panel-title"><h3>Response teams</h3></div><table className="table"><thead><tr><th>Team</th><th>Base</th><th>Status</th></tr></thead><tbody>{[['Team Suraksha', 'Jaipur North', 'busy'], ['Jaipur North', 'Hawa Mahal', 'available'], ['Desert Watch', 'Jaisalmer', 'available'], ['Tiger Response', 'Ranthambore', 'available']].map((row) => <tr key={row[0]}><td><b>{row[0]}</b></td><td>{row[1]}</td><td><span className={`badge ${row[2] === 'available' ? 'progress' : 'open'}`}>{row[2]}</span></td></tr>)}</tbody></table></section> }
function Analytics({ incidents }: { incidents: Incident[] }) { const resolved = incidents.filter((item) => item.status === 'resolved').length; return <><div className="metrics"><Metric icon={<AlertTriangle size={16} />} label="Total incidents" value={String(incidents.length)} trend="Current window" /><Metric icon={<CheckCircle2 size={16} />} label="Resolved" value={String(resolved)} trend={incidents.length ? `${Math.round(resolved / incidents.length * 100)}% resolution rate` : 'No data'} /></div><section className="panel table-panel"><div className="panel-title"><h3>Operational insight</h3></div><p className="section-help">The console follows an incident-command workflow: identify, assign, monitor, and close. Use the live map and digital registry to support decisions without replacing emergency services.</p></section></> }

export default App
