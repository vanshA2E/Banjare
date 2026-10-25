import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { Bell, CheckCircle2, ChevronRight, CircleAlert, House, LocateFixed, LogOut, MapPin, Phone, Shield, Siren, UserRound, X } from 'lucide-react'
import { createVerifiableRecord } from './services/verifiableRecord'
import './App.css'

type ZoneType = 'safe' | 'monitored' | 'restricted'
type Zone = { id: string; name: string; type: ZoneType; lat: number; lng: number; radius: number }
type Notice = { id: string; title: string; body: string; time: string; read: boolean }

const fallbackPosition = { lat: 26.9124, lng: 75.7873 }
const zones: Zone[] = [
  { id: 'amer', name: 'Amer Fort corridor', type: 'safe', lat: 26.9855, lng: 75.8513, radius: 900 },
  { id: 'hawa', name: 'Hawa Mahal district', type: 'monitored', lat: 26.9239, lng: 75.8267, radius: 700 },
  { id: 'nahargarh', name: 'Nahargarh trail', type: 'restricted', lat: 26.9372, lng: 75.8156, radius: 1100 },
  { id: 'pushkar', name: 'Pushkar lakefront', type: 'safe', lat: 26.4897, lng: 74.5511, radius: 850 },
]

const defaultNotices: Notice[] = [{ id: 'welcome', title: 'Welcome to Banjare', body: 'Your safety companion is active for this trip.', time: 'Just now', read: false }]

async function publishIncident(payload: Record<string, unknown>) {
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL ?? ''}/api/incidents`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
  if (!response.ok) throw new Error(`Incident sync failed (${response.status})`)
}

async function registerTourist(phone: string) {
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL ?? ''}/api/tourists`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone }) })
  if (!response.ok) throw new Error(`Tourist sync failed (${response.status})`)
}

function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const earth = 6371000
  const lat = (b.lat - a.lat) * Math.PI / 180
  const lng = (b.lng - a.lng) * Math.PI / 180
  const x = Math.sin(lat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(lng / 2) ** 2
  return earth * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}

function currentZone(position: { lat: number; lng: number }) {
  return zones.filter((zone) => distanceMeters(position, zone) <= zone.radius).sort((a, b) => ({ safe: 0, monitored: 1, restricted: 2 }[b.type] - { safe: 0, monitored: 1, restricted: 2 }[a.type]))[0]
}

function useTouristSession() {
  const [phone, setPhone] = useState(() => localStorage.getItem('banjare-phone') ?? '')
  const signIn = (value: string) => { localStorage.setItem('banjare-phone', value); setPhone(value) }
  const signOut = () => { localStorage.removeItem('banjare-phone'); setPhone('') }
  return { phone, signIn, signOut }
}

function App() {
  return <BrowserRouter><AppRoutes /></BrowserRouter>
}

function AppRoutes() {
  const session = useTouristSession()
  return <Routes>
    <Route path="/" element={session.phone ? <Navigate to="/home" replace /> : <Welcome onSignIn={session.signIn} />} />
    <Route path="/home" element={session.phone ? <Home phone={session.phone} /> : <Navigate to="/" replace />} />
    <Route path="/report" element={session.phone ? <Report phone={session.phone} /> : <Navigate to="/" replace />} />
    <Route path="/notifications" element={session.phone ? <Notifications /> : <Navigate to="/" replace />} />
    <Route path="/profile" element={session.phone ? <Profile phone={session.phone} onSignOut={session.signOut} /> : <Navigate to="/" replace />} />
  </Routes>
}

function Welcome({ onSignIn }: { onSignIn: (phone: string) => void }) {
  const [phone, setPhone] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const submit = (event: FormEvent) => { event.preventDefault(); if (phone.replace(/\D/g, '').length >= 10) setOtpSent(true) }
  return <main className="welcome-page"><div className="brand-mark"><Shield size={22} /> BANJARE</div><div className="welcome-copy"><span className="eyebrow">TRAVEL WITH CONFIDENCE</span><h1>Your safety,<br /><em>always nearby.</em></h1><p>Real-time safety support for every Rajasthan memory.</p></div><form className="login-panel" onSubmit={submit}>{!otpSent ? <><label htmlFor="phone">Mobile number</label><div className="phone-input"><span>+91</span><input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98765 43210" inputMode="numeric" /></div><button className="primary-button" type="submit">Send OTP <ChevronRight size={18} /></button></> : <><label htmlFor="otp">Enter verification code</label><input id="otp" autoFocus placeholder="123456" inputMode="numeric" /><p className="hint">DEMO: any 6-digit code is accepted.</p><button className="primary-button" type="button" onClick={() => { void registerTourist(phone).catch((error: unknown) => console.error('Unable to sync tourist', error)); onSignIn(phone) }}>Enter Banjare <ChevronRight size={18} /></button></>}</form><p className="legal">By continuing, you agree to receive safety alerts from Banjare.</p></main>
}

function Shell({ children, title, action }: { children: React.ReactNode; title: string; action?: React.ReactNode }) {
  const location = useLocation(); const unread = JSON.parse(localStorage.getItem('banjare-notices') ?? JSON.stringify(defaultNotices)).filter((notice: Notice) => !notice.read).length
  return <div className="app-shell"><header className="topbar"><Link to="/home" className="brand-mark"><Shield size={18} /> BANJARE</Link>{action ?? <Link to="/notifications" className="icon-button" aria-label="Notifications"><Bell size={19} />{unread > 0 && <i />}</Link>}</header><div className="page-title"><div><span className="eyebrow">RAJASTHAN SAFETY NETWORK</span><h2>{title}</h2></div></div>{children}<nav className="bottom-nav"><NavItem to="/home" icon={<House size={20} />} label="Home" active={location.pathname === '/home'} /><NavItem to="/report" icon={<CircleAlert size={20} />} label="Report" active={location.pathname === '/report'} /><NavItem to="/notifications" icon={<Bell size={20} />} label="Alerts" active={location.pathname === '/notifications'} /><NavItem to="/profile" icon={<UserRound size={20} />} label="Profile" active={location.pathname === '/profile'} /></nav></div>
}
function NavItem({ to, icon, label, active }: { to: string; icon: React.ReactNode; label: string; active: boolean }) { return <Link className={active ? 'nav-item active' : 'nav-item'} to={to}>{icon}<span>{label}</span></Link> }

function useLocationPosition() {
  const [position, setPosition] = useState(fallbackPosition); const [fallback, setFallback] = useState(false)
  useEffect(() => { if (!navigator.geolocation) { window.setTimeout(() => setFallback(true), 0); return } const watch = navigator.geolocation.watchPosition((value) => setPosition({ lat: value.coords.latitude, lng: value.coords.longitude }), () => window.setTimeout(() => setFallback(true), 0), { enableHighAccuracy: true, maximumAge: 15000 }); return () => navigator.geolocation.clearWatch(watch) }, [])
  return { position, fallback }
}

function Home({ phone }: { phone: string }) {
  const navigate = useNavigate(); const { position, fallback } = useLocationPosition(); const zone = currentZone(position); const [sosOpen, setSosOpen] = useState(false); const [sosState, setSosState] = useState<'idle' | 'countdown' | 'sent'>('idle'); const [seconds, setSeconds] = useState(10)
  useEffect(() => { if (sosState !== 'countdown') return; if (seconds <= 0) { window.setTimeout(() => setSosState('sent'), 0); const incident = { type: 'sos', lat: position.lat, lng: position.lng, status: 'Open', phone, createdAt: new Date().toISOString() }; localStorage.setItem('banjare-last-incident', JSON.stringify(incident)); void createVerifiableRecord(incident).then((record) => publishIncident({ ...incident, recordHash: record.hash })).catch((error: unknown) => console.error('Unable to sync SOS incident', error)); return } const timer = window.setTimeout(() => setSeconds((value) => value - 1), 1000); return () => window.clearTimeout(timer) }, [sosState, seconds, position, phone])
  useEffect(() => { if (zone?.type === 'restricted') { const key = `breach-${zone.id}`; if (!sessionStorage.getItem(key)) { sessionStorage.setItem(key, '1'); const notices = JSON.parse(localStorage.getItem('banjare-notices') ?? JSON.stringify(defaultNotices)); notices.unshift({ id: key, title: 'Restricted zone nearby', body: `Please leave ${zone.name} and follow local guidance.`, time: 'Now', read: false }); localStorage.setItem('banjare-notices', JSON.stringify(notices)) } } }, [zone])
  return <Shell title="Good morning, traveller"><section className="greeting"><div><p className="muted">Your trip guardian is active</p><h1>Stay curious.<br /><em>Stay safe.</em></h1></div><div className="avatar">{phone.slice(-2)}</div></section>{fallback && <div className="setup-banner"><LocateFixed size={16} /> Showing Jaipur fallback location. Enable GPS for live tracking.</div>}<section className="map-card"><iframe className="live-map" title="Live OpenStreetMap location" src={`https://www.openstreetmap.org/export/embed.html?bbox=${position.lng - 0.03}%2C${position.lat - 0.02}%2C${position.lng + 0.03}%2C${position.lat + 0.02}&layer=mapnik&marker=${position.lat}%2C${position.lng}`} /><div className="map-footer"><div><span className={`status-dot ${zone?.type ?? 'safe'}`} /> Current zone</div><strong>{zone?.name ?? 'Jaipur city'}</strong></div></section><Assistant position={position} zone={zone?.name} /><section className="quick-actions"><button className="sos-button" onClick={() => { setSosOpen(true); setSosState('countdown'); setSeconds(10) }}><Siren size={23} /><span><b>SOS</b><small>Hold for emergency</small></span></button><button className="report-button" onClick={() => navigate('/report')}><CircleAlert size={21} /><span><b>Report an issue</b><small>Help keep travellers safe</small></span><ChevronRight size={18} /></button></section><section className="trip-status"><div><span className="eyebrow">LIVE STATUS</span><h3>Connected to Banjare network</h3><p>Last synced just now · {position.lat.toFixed(4)}, {position.lng.toFixed(4)}</p></div><CheckCircle2 className="check-icon" size={25} /></section>{sosOpen && <SosModal state={sosState} seconds={seconds} onCancel={() => { setSosOpen(false); setSosState('idle') }} onClose={() => { setSosOpen(false); setSosState('idle') }} />}</Shell>
}

function Assistant({ position, zone }: { position: { lat: number; lng: number }; zone?: string }) {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const ask = async () => {
    if (!question.trim()) return
    setLoading(true); setAnswer('')
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL ?? ''}/api/assistant`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question, context: { position, zone } }) })
      const data = await response.json() as { answer?: string; error?: string }
      setAnswer(data.answer ?? data.error ?? 'The assistant is unavailable right now.')
    } catch { setAnswer('The assistant is unavailable. Use SOS or call 112 if you are in immediate danger.') }
    finally { setLoading(false) }
  }
  return <section className="assistant-card"><div><span className="eyebrow">BANJARE AI</span><h3>Ask about your trip</h3></div><div className="assistant-row"><input value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void ask() }} placeholder="Is this area safe to visit?" /><button className="primary-button" onClick={() => void ask()} disabled={loading}>{loading ? 'Thinking…' : 'Ask'}</button></div>{answer && <p className="assistant-answer">{answer}</p>}</section>
}

function SosModal({ state, seconds, onCancel, onClose }: { state: string; seconds: number; onCancel: () => void; onClose: () => void }) { return <div className="modal-backdrop"><div className="sos-modal"><button className="close-button" onClick={onCancel} aria-label="Cancel SOS"><X size={20} /></button><div className="sos-symbol"><Siren size={31} /></div>{state === 'countdown' ? <><span className="eyebrow">EMERGENCY CHECK</span><h2>Sending help in <strong>{seconds}s</strong></h2><p>Tap cancel if this was accidental. Your location will be shared with the response network.</p><button className="cancel-button" onClick={onCancel}>Cancel SOS</button></> : <><span className="eyebrow">HELP IS ON THE WAY</span><h2>Response team notified</h2><p>Incident <b>INC-DEMO-001</b> is open. A nearby team has been alerted.</p><a className="call-button" href="tel:112"><Phone size={18} /> Call Emergency Services</a><button className="text-button" onClick={onClose}>Back to trip</button></>}</div></div> }

function Report({ phone }: { phone: string }) { const navigate = useNavigate(); const { position } = useLocationPosition(); const [kind, setKind] = useState('hazard'); const [description, setDescription] = useState(''); const [sent, setSent] = useState(false); const submit = () => { const incident = { type: kind, description, lat: position.lat, lng: position.lng, phone, status: 'Open', createdAt: new Date().toISOString() }; localStorage.setItem('banjare-last-incident', JSON.stringify(incident)); void createVerifiableRecord(incident).then((record) => publishIncident({ ...incident, recordHash: record.hash })).catch((error: unknown) => console.error('Unable to sync report', error)); setSent(true); window.setTimeout(() => navigate('/home'), 1200) }; return <Shell title="Report an issue"><section className="form-page"><div className="notice-icon"><CircleAlert size={22} /></div><h1>Help us look out<br /><em>for each other.</em></h1><p className="muted">Your report goes directly to the local safety network.</p><label>What happened?</label><div className="choice-grid">{['hazard', 'medical', 'unauthorized', 'lost'].map((item) => <button key={item} className={kind === item ? 'choice selected' : 'choice'} onClick={() => setKind(item)}>{item}</button>)}</div><label htmlFor="description">Add details <span>(optional)</span></label><textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Tell us what you saw..." rows={4} /><div className="location-line"><MapPin size={17} /><span>Location attached<br /><b>{currentZone(position)?.name ?? 'Jaipur city'}</b></span><CheckCircle2 size={18} /></div><button className="primary-button" onClick={submit}>{sent ? 'Report sent' : 'Submit report'} <ChevronRight size={18} /></button></section></Shell> }

function Notifications() { const [notices, setNotices] = useState<Notice[]>(() => JSON.parse(localStorage.getItem('banjare-notices') ?? JSON.stringify(defaultNotices))); const markRead = () => { const updated = notices.map((notice) => ({ ...notice, read: true })); setNotices(updated); localStorage.setItem('banjare-notices', JSON.stringify(updated)) }; return <Shell title="Your alerts" action={<button className="text-button" onClick={markRead}>Mark all read</button>}><section className="notifications-list">{notices.length ? notices.map((notice) => <article className={notice.read ? 'notice read' : 'notice'} key={notice.id}><div className="notice-icon"><Bell size={18} /></div><div><h3>{notice.title}</h3><p>{notice.body}</p><small>{notice.time}</small></div>{!notice.read && <span className="unread-dot" />}</article>) : <div className="empty-state"><Bell size={28} /><h3>All clear</h3><p>No safety alerts right now.</p></div>}</section></Shell> }

function Profile({ phone, onSignOut }: { phone: string; onSignOut: () => void }) { const [name, setName] = useState(() => localStorage.getItem('banjare-name') ?? 'Rajasthan traveller'); const [contact, setContact] = useState(() => localStorage.getItem('banjare-contact') ?? ''); return <Shell title="Your profile"><section className="profile-page"><div className="profile-avatar"><UserRound size={32} /></div><h1>{name}</h1><p className="muted">+91 {phone}</p><div className="id-card"><div><span className="eyebrow">DIGITAL ID</span><h3>Not registered yet</h3><p>Register to speed up assistance.</p></div><span className="pending-pill">PENDING</span></div><label htmlFor="name">Name</label><input id="name" value={name} onChange={(e) => { setName(e.target.value); localStorage.setItem('banjare-name', e.target.value) }} /><label htmlFor="contact">Emergency contact</label><input id="contact" value={contact} onChange={(e) => { setContact(e.target.value); localStorage.setItem('banjare-contact', e.target.value) }} placeholder="Name or phone number" /><button className="secondary-button" onClick={() => alert('DEMO: Digital ID registration submitted.')}>Register with Digital ID <ChevronRight size={17} /></button><button className="logout-button" onClick={onSignOut}><LogOut size={17} /> Sign out</button></section></Shell> }

export default App
