'use client';
import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { io } from 'socket.io-client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import api from '@/lib/api';

const Map = dynamic(() => import('@/components/Map'), { ssr: false });

const STATUS_AZ   = { pending:'Gözləyir', in_progress:'İcrada', resolved:'Həll edildi', rejected:'Rədd edildi' };
const PRIORITY_AZ = { low:'Aşağı', medium:'Orta', high:'Yüksək', critical:'Kritik' };

const CARD  = 'bg-[#161616] border border-[#222] rounded-xl';
const INPUT = 'bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-sm text-[#e5e5e5] placeholder-[#555] focus:outline-none focus:border-[#F5A623] transition-colors w-full';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-xs">
      <p className="text-[#888] mb-1">{label}</p>
      {payload.map(p => <p key={p.name} style={{ color: p.fill }}>{p.name}: {p.value}</p>)}
    </div>
  );
};

export default function AdminPage() {
  const [token,      setToken]      = useState(null);
  const [loginForm,  setLoginForm]  = useState({ identifier: '', password: '' });
  const [stats,      setStats]      = useState(null);
  const [reports,    setReports]    = useState([]);
  const [mapData,    setMapData]    = useState([]);
  const [selected,   setSelected]   = useState(null);
  const [tab,        setTab]        = useState('dashboard');
  const [toast,      setToast]      = useState(null);
  const [statusNote, setStatusNote] = useState('');

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = useCallback(async () => {
    try {
      const [s, r, m] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/reports?limit=50'),
        api.get('/reports/map'),
      ]);
      setStats(s.data);
      setReports(r.data.data);
      setMapData(m.data);
    } catch (e) {
      if (e.response?.status === 401 || e.response?.status === 403) {
        localStorage.removeItem('token');
        setToken(null);
      } else {
        showToast('Məlumatlar yüklənmədi', 'error');
      }
    }
  }, []);

  useEffect(() => {
    const t = localStorage.getItem('token');
    if (t) { setToken(t); loadData(); }
  }, [loadData]);

  useEffect(() => {
    if (!token) return;
    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL, { transports: ['websocket'] });
    socket.emit('join_admin');
    socket.on('new_report',     () => { loadData(); showToast('Yeni müraciət daxil oldu!'); });
    socket.on('report_updated', () => loadData());
    socket.on('weather_alert',  (d) => showToast(`⚠️ ${d.desc}`, 'warning'));
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

  /* ── Login screen ── */
  if (!token) return (
    <div className="min-h-screen bg-[#111] flex items-center justify-center">
      <form onSubmit={login} className="bg-[#161616] border border-[#222] rounded-2xl p-8 w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8">
          <span className="w-2 h-2 rounded-full bg-[#F5A623] inline-block" />
          <span className="font-semibold text-white text-lg">BakıFix Admin</span>
        </div>
        <label className="block text-xs text-[#666] mb-1">Telefon və ya email</label>
        <input className={`${INPUT} mb-3`} placeholder="admin@bakufix.az"
          value={loginForm.identifier} onChange={e => setLoginForm(p => ({ ...p, identifier: e.target.value }))} />
        <label className="block text-xs text-[#666] mb-1">Şifrə</label>
        <input type="password" className={`${INPUT} mb-6`} placeholder="••••••••"
          value={loginForm.password} onChange={e => setLoginForm(p => ({ ...p, password: e.target.value }))} />
        <button type="submit" className="w-full bg-[#F5A623] text-black font-semibold py-2.5 rounded-lg hover:opacity-90 transition-opacity text-sm">
          Daxil ol
        </button>
      </form>
      {toast && (
        <div className={`fixed bottom-4 right-4 px-4 py-2 rounded-lg text-sm font-medium border
          ${toast.type === 'error' ? 'bg-red-500/15 text-red-400 border-red-500/30' : 'bg-green-500/15 text-green-400 border-green-500/30'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );

  const NAV_TABS = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'reports',   label: 'Müraciətlər' },
    { key: 'map',       label: 'Xəritə' },
  ];

  return (
    <div className="min-h-screen bg-[#111] flex flex-col text-[#e5e5e5]" style={{ fontFamily: 'system-ui, sans-serif' }}>

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg text-sm font-medium border
          ${toast.type === 'warning' ? 'bg-[#F5A623]/15 text-[#F5A623] border-[#F5A623]/30'
          : toast.type === 'error'   ? 'bg-red-500/15 text-red-400 border-red-500/30'
          :                            'bg-green-500/15 text-green-400 border-green-500/30'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <header className="bg-[#161616] border-b border-[#222] px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-[#F5A623] inline-block" />
          <span className="font-semibold text-white text-sm">BakıFix</span>
          <span className="text-[#333] text-sm">/</span>
          <span className="text-[#666] text-sm">Admin</span>
        </div>
        <nav className="flex items-center gap-1">
          {NAV_TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors
                ${tab === t.key ? 'text-white bg-[#222]' : 'text-[#555] hover:text-[#999]'}`}>
              {t.label}
            </button>
          ))}
          <div className="w-px h-4 bg-[#333] mx-2" />
          <button onClick={() => { localStorage.removeItem('token'); setToken(null); }}
            className="text-[#555] hover:text-[#999] text-sm transition-colors">
            Çıxış
          </button>
        </nav>
      </header>

      <main className="flex-1 p-6 overflow-hidden">

        {/* ── DASHBOARD ── */}
        {tab === 'dashboard' && stats && (
          <div className="space-y-5">
            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Ümumi Müraciət',     val: stats.total,                                                    accent: '#e5e5e5' },
                { label: 'Həll Edildi',         val: stats.by_status?.find(s => s.status === 'resolved')?.count || 0, accent: '#10B981' },
                { label: 'SLA Pozuntusu',       val: stats.sla_breached,                                             accent: '#EF4444' },
                { label: 'Ort. Həll (saat)',    val: stats.avg_resolve_hours || '—',                                 accent: '#3B82F6' },
              ].map(s => (
                <div key={s.label} className={`${CARD} p-4`}>
                  <p className="text-xs text-[#555] mb-2">{s.label}</p>
                  <p className="text-3xl font-bold" style={{ color: s.accent }}>{s.val}</p>
                </div>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              {/* Bar chart */}
              <div className={`${CARD} p-5`}>
                <p className="text-xs text-[#555] uppercase tracking-wider mb-4">Departament Performansı</p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={stats.by_department} barGap={2}>
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#555' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#555' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                    <Bar dataKey="resolved"    fill="#10B981" name="Həll edildi" radius={[2,2,0,0]} />
                    <Bar dataKey="in_progress" fill="#3B82F6" name="İcrada"     radius={[2,2,0,0]} />
                    <Bar dataKey="pending"     fill="#F5A623" name="Gözləyir"   radius={[2,2,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Recent reports */}
              <div className={`${CARD} p-5`}>
                <p className="text-xs text-[#555] uppercase tracking-wider mb-3">Son Müraciətlər</p>
                <div className="space-y-1">
                  {stats.recent?.slice(0, 7).map(r => (
                    <div key={r.id}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-[#1a1a1a] transition-colors row-${r.status}`}
                      onClick={() => { setSelected(r); setTab('reports'); }}>
                      <span className={`text-xs px-2 py-0.5 rounded-md font-medium status-${r.status} flex-shrink-0`}>
                        {STATUS_AZ[r.status]}
                      </span>
                      <span className="text-sm text-[#ccc] truncate flex-1">{r.description?.slice(0, 45)}</span>
                      <span className="text-xs text-[#444] whitespace-nowrap">{r.department}</span>
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
            {/* Table */}
            <div className={`flex-1 ${CARD} overflow-hidden flex flex-col`}>
              <div className="px-5 py-3 border-b border-[#222] flex items-center justify-between flex-shrink-0">
                <span className="text-sm font-medium text-white">Müraciətlər</span>
                <span className="text-xs text-[#444]">{reports.length} nəticə</span>
              </div>
              <div className="overflow-auto flex-1">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-[#161616] border-b border-[#222]">
                    <tr>
                      {['#', 'Kateqoriya', 'Status', 'Prioritet', 'Departament', 'Tarix'].map(h => (
                        <th key={h} className="text-left px-4 py-2.5 text-xs text-[#444] font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map(r => (
                      <tr key={r.id}
                        className={`border-b border-[#1a1a1a] cursor-pointer transition-colors row-${r.status}
                          ${selected?.id === r.id ? 'bg-[#1e1e1e]' : 'hover:bg-[#1a1a1a]'}`}
                        onClick={() => setSelected(r)}>
                        <td className="px-4 py-3 text-[#444] font-mono text-xs">#{r.id}</td>
                        <td className="px-4 py-3 text-[#ccc] font-medium">{r.category_name}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-md text-xs font-medium status-${r.status}`}>
                            {STATUS_AZ[r.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-md text-xs font-medium priority-${r.priority}`}>
                            {PRIORITY_AZ[r.priority]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[#555] text-xs">{r.department_name}</td>
                        <td className="px-4 py-3 text-[#444] text-xs">{new Date(r.created_at).toLocaleDateString('az')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Detail sidebar */}
            {selected && (
              <div className={`w-72 ${CARD} p-5 flex-shrink-0 flex flex-col gap-4 overflow-y-auto`} style={{ maxHeight: 'calc(100vh - 120px)' }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#444] font-mono">#{selected.id}</span>
                  <button onClick={() => setSelected(null)} className="text-[#444] hover:text-[#888] text-lg leading-none transition-colors">✕</button>
                </div>

                {selected.photo_url && (
                  <img src={selected.photo_url} alt="" className="w-full rounded-lg object-cover" style={{ height: 140 }} />
                )}

                <div>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-md text-xs font-medium status-${selected.status}`}>{STATUS_AZ[selected.status]}</span>
                    <span className={`px-2 py-0.5 rounded-md text-xs font-medium priority-${selected.priority}`}>{PRIORITY_AZ[selected.priority]}</span>
                  </div>
                  <p className="text-sm text-[#bbb] leading-relaxed">{selected.description}</p>
                </div>

                <div className="space-y-2 text-xs text-[#555]">
                  <div className="flex gap-2">
                    <span>📍</span>
                    <span>{selected.address || (selected.latitude != null ? `${Number(selected.latitude).toFixed(4)}, ${Number(selected.longitude).toFixed(4)}` : '—')}</span>
                  </div>
                  <div className="flex gap-2"><span>🏢</span><span>{selected.department_name}</span></div>
                  <div className="flex gap-2">
                    <span>⏰</span>
                    <span>SLA: {selected.sla_deadline ? new Date(selected.sla_deadline).toLocaleString('az') : '—'}</span>
                  </div>
                  {selected.ai_suggestion && (() => {
                    try {
                      const p = typeof selected.ai_suggestion === 'string' ? JSON.parse(selected.ai_suggestion) : selected.ai_suggestion;
                      return <div className="flex gap-2"><span>🤖</span><span className="text-[#666]">{p?.summary || '—'}</span></div>;
                    } catch { return null; }
                  })()}
                </div>

                <div className="border-t border-[#222] pt-4 space-y-2">
                  <p className="text-xs text-[#444]">Status dəyiş</p>
                  <input className={INPUT} placeholder="Qeyd (isteğe bağlı)" value={statusNote} onChange={e => setStatusNote(e.target.value)} />
                  <div className="grid grid-cols-2 gap-1.5">
                    {['in_progress', 'resolved', 'rejected', 'pending'].map(s => (
                      <button key={s} onClick={() => changeStatus(selected.id, s)}
                        className={`py-1.5 rounded-md text-xs font-medium status-${s} hover:opacity-80 transition-opacity`}>
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
          <div className={`${CARD} overflow-hidden`}>
            <div className="px-5 py-3 border-b border-[#222] flex items-center justify-between">
              <span className="text-sm font-medium text-white">Canlı Xəritə</span>
              <div className="flex items-center gap-4 text-xs">
                <span className="text-[#444]">{mapData.length} müraciət</span>
                {[['#F59E0B','Gözləyir'],['#3B82F6','İcrada'],['#10B981','Həll edildi'],['#EF4444','Rədd edildi']].map(([c, l]) => (
                  <span key={l} className="flex items-center gap-1.5 text-[#555]">
                    <span className="w-2 h-2 rounded-full inline-block flex-shrink-0" style={{ background: c }} />
                    {l}
                  </span>
                ))}
              </div>
            </div>
            <Map reports={mapData} height="calc(100vh - 160px)" />
          </div>
        )}
      </main>
    </div>
  );
}
