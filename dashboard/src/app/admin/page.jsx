'use client';
import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { io } from 'socket.io-client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import api from '@/lib/api';

const Map = dynamic(() => import('@/components/Map'), { ssr: false });

const STATUS_AZ = { pending:'Gözləyir', in_progress:'İcrada', resolved:'Həll edildi', rejected:'Rədd edildi' };
const PRIORITY_AZ = { low:'Aşağı', medium:'Orta', high:'Yüksək', critical:'Kritik' };

export default function AdminPage() {
  const [token,    setToken]    = useState(null);
  const [loginForm,setLoginForm]= useState({ identifier:'', password:'' });
  const [stats,    setStats]    = useState(null);
  const [reports,  setReports]  = useState([]);
  const [mapData,  setMapData]  = useState([]);
  const [selected, setSelected] = useState(null);
  const [tab,      setTab]      = useState('dashboard');
  const [toast,    setToast]    = useState(null);
  const [statusNote, setStatusNote] = useState('');

  const showToast = (msg, type='success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = useCallback(async () => {
    const [s, r, m] = await Promise.all([
      api.get('/dashboard/stats'),
      api.get('/reports?limit=50'),
      api.get('/reports/map'),
    ]);
    setStats(s.data);
    setReports(r.data.data);
    setMapData(m.data);
  }, []);

  useEffect(() => {
    const t = localStorage.getItem('token');
    if (t) { setToken(t); loadData(); }
  }, [loadData]);

  useEffect(() => {
    if (!token) return;
    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL, { transports: ['websocket'] });
    socket.emit('join_admin');
    socket.on('new_report', () => { loadData(); showToast('Yeni müraciət daxil oldu!'); });
    socket.on('report_updated', () => loadData());
    socket.on('weather_alert', (d) => showToast(`⚠️ ${d.desc}`, 'warning'));
    return () => socket.disconnect();
  }, [token, loadData]);

  const login = async (e) => {
    e.preventDefault();
    try {
      const r = await api.post('/auth/login', { phone: loginForm.identifier, email: loginForm.identifier, password: loginForm.password });
      localStorage.setItem('token', r.data.token);
      setToken(r.data.token);
      loadData();
    } catch { showToast('Giriş uğursuz oldu', 'error'); }
  };

  const changeStatus = async (id, status) => {
    try {
      await api.patch(`/reports/${id}/status`, { status, note: statusNote });
      setSelected(null); setStatusNote('');
      loadData(); showToast('Status yeniləndi');
    } catch { showToast('Xəta baş verdi', 'error'); }
  };

  if (!token) return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <form onSubmit={login} className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-xl">
        <h1 className="text-2xl font-bold mb-6 text-center">🏙️ Admin Giriş</h1>
        <input className="w-full border rounded-lg px-3 py-2 mb-3 text-sm" placeholder="Telefon və ya email"
          value={loginForm.identifier} onChange={e => setLoginForm(p=>({...p,identifier:e.target.value}))} />
        <input type="password" className="w-full border rounded-lg px-3 py-2 mb-4 text-sm" placeholder="Şifrə"
          value={loginForm.password} onChange={e => setLoginForm(p=>({...p,password:e.target.value}))} />
        <button type="submit" className="w-full bg-gray-900 text-white py-2.5 rounded-lg font-semibold">Daxil ol</button>
      </form>
      {toast && <div className={`fixed bottom-4 right-4 px-4 py-2 rounded-lg text-white ${toast.type==='error'?'bg-red-500':'bg-green-600'}`}>{toast.msg}</div>}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {toast && <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg text-white shadow-lg ${toast.type==='warning'?'bg-orange-500':toast.type==='error'?'bg-red-500':'bg-green-600'}`}>{toast.msg}</div>}

      <header className="bg-gray-900 text-white px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl">🏙️</span>
          <span className="font-bold">BakıFix Admin</span>
        </div>
        <div className="flex gap-2">
          {['dashboard','reports','map'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-lg text-sm ${tab===t?'bg-white text-gray-900 font-medium':'text-gray-300 hover:bg-white/10'}`}>
              {t==='dashboard'?'Dashboard':t==='reports'?'Müraciətlər':'Xəritə'}
            </button>
          ))}
          <button onClick={() => { localStorage.removeItem('token'); setToken(null); }} className="ml-2 text-gray-400 hover:text-white text-sm">Çıxış</button>
        </div>
      </header>

      <main className="flex-1 p-6">

        {/* ── DASHBOARD ── */}
        {tab === 'dashboard' && stats && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label:'Ümumi',      val: stats.total,             color:'text-gray-800' },
                { label:'SLA pozuntusu', val: stats.sla_breached,   color:'text-red-600' },
                { label:'Orta həll (saat)', val: stats.avg_resolve_hours||'—', color:'text-blue-600' },
                { label:'Həll edildi', val: stats.by_status?.find(s=>s.status==='resolved')?.count||0, color:'text-green-600' },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-xl p-4 shadow-sm border">
                  <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                  <p className={`text-3xl font-bold ${s.color}`}>{s.val}</p>
                </div>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl p-5 shadow-sm border">
                <h3 className="font-semibold mb-4 text-sm text-gray-600 uppercase tracking-wide">Departament Performansı</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={stats.by_department}>
                    <XAxis dataKey="name" tick={{fontSize:11}} />
                    <YAxis tick={{fontSize:11}} />
                    <Tooltip />
                    <Bar dataKey="resolved"    fill="#10B981" name="Həll edildi" radius={[3,3,0,0]} />
                    <Bar dataKey="in_progress" fill="#3B82F6" name="İcrada"     radius={[3,3,0,0]} />
                    <Bar dataKey="pending"     fill="#F59E0B" name="Gözləyir"   radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-xl p-5 shadow-sm border">
                <h3 className="font-semibold mb-3 text-sm text-gray-600 uppercase tracking-wide">Son Müraciətlər</h3>
                <div className="space-y-2">
                  {stats.recent?.slice(0,6).map(r => (
                    <div key={r.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer" onClick={() => { setSelected(r); setTab('reports'); }}>
                      <span className={`text-xs px-2 py-0.5 rounded-full status-${r.status}`}>{STATUS_AZ[r.status]}</span>
                      <span className="text-sm truncate flex-1">{r.description?.slice(0,50)}</span>
                      <span className="text-xs text-gray-400 whitespace-nowrap">{r.department}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── REPORTS ── */}
        {tab === 'reports' && (
          <div className="flex gap-4 h-full">
            <div className="flex-1 bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="p-4 border-b">
                <h2 className="font-semibold">Bütün Müraciətlər <span className="text-gray-400 font-normal text-sm">({reports.length})</span></h2>
              </div>
              <div className="overflow-auto" style={{maxHeight:'calc(100vh - 200px)'}}>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>{['#','Kateqoriya','Status','Prioritet','Departament','Tarix'].map(h=>(
                      <th key={h} className="text-left px-4 py-2.5 text-xs text-gray-500 font-medium">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody className="divide-y">
                    {reports.map(r => (
                      <tr key={r.id} className={`hover:bg-gray-50 cursor-pointer ${selected?.id===r.id?'bg-blue-50':''}`} onClick={() => setSelected(r)}>
                        <td className="px-4 py-3 text-gray-400 font-mono">#{r.id}</td>
                        <td className="px-4 py-3 font-medium">{r.category_name}</td>
                        <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs status-${r.status}`}>{STATUS_AZ[r.status]}</span></td>
                        <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs priority-${r.priority}`}>{PRIORITY_AZ[r.priority]}</span></td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{r.department_name}</td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{new Date(r.created_at).toLocaleDateString('az')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {selected && (
              <div className="w-80 bg-white rounded-xl shadow-sm border p-5 flex-shrink-0">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-semibold">Müraciət #{selected.id}</h3>
                  <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>
                {selected.photo_url && <img src={selected.photo_url} alt="" className="w-full rounded-lg mb-4 object-cover" style={{height:160}} />}
                <p className="text-sm text-gray-700 mb-3">{selected.description}</p>
                <div className="space-y-1.5 text-xs text-gray-500 mb-4">
                  <p>📍 {selected.address || `${selected.latitude?.toFixed(4)}, ${selected.longitude?.toFixed(4)}`}</p>
                  <p>🏢 {selected.department_name}</p>
                  <p>⏰ SLA: {selected.sla_deadline ? new Date(selected.sla_deadline).toLocaleString('az') : '—'}</p>
                  {selected.ai_suggestion && <p>🤖 AI: {JSON.parse(selected.ai_suggestion||'{}').summary || '—'}</p>}
                </div>
                <div className="border-t pt-4">
                  <p className="text-xs font-medium text-gray-600 mb-2">Status dəyiş:</p>
                  <input className="w-full border rounded px-2 py-1.5 text-xs mb-2" placeholder="Qeyd (isteğe bağlı)" value={statusNote} onChange={e=>setStatusNote(e.target.value)} />
                  <div className="grid grid-cols-2 gap-1.5">
                    {['in_progress','resolved','rejected','pending'].map(s => (
                      <button key={s} onClick={() => changeStatus(selected.id, s)}
                        className={`py-1.5 rounded-lg text-xs font-medium border status-${s}`}>
                        {STATUS_AZ[s]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── MAP ── */}
        {tab === 'map' && (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-semibold">Canlı Xəritə — {mapData.length} müraciət</h2>
              <div className="flex gap-3 text-xs">
                {[['#F59E0B','Gözləyir'],['#3B82F6','İcrada'],['#10B981','Həll edildi'],['#EF4444','Rədd edildi']].map(([c,l])=>(
                  <span key={l} className="flex items-center gap-1"><span style={{background:c}} className="w-3 h-3 rounded-full"/> {l}</span>
                ))}
              </div>
            </div>
            <Map reports={mapData} height="calc(100vh - 200px)" />
          </div>
        )}
      </main>
    </div>
  );
}
