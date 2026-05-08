'use client';
import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { io } from 'socket.io-client';
import Link from 'next/link';
import api from '@/lib/api';

const Map = dynamic(() => import('@/components/Map'), { ssr: false });

const STATUS_AZ  = { pending:'Gözləyir', in_progress:'İcrada', resolved:'Həll edildi', rejected:'Rədd edildi' };
// Map by status name so colors stay correct even if a slice is filtered out (e.g. zero pending).
const PIE_COLOR_BY_NAME = {
  'Gözləyir':    '#F59E0B',
  'İcrada':      '#3B82F6',
  'Həll edildi': '#10B981',
  'Rədd edildi': '#EF4444',
};
const TABS = [
  { key:'map',    icon:'🗺️',  label:'Xəritə'      },
  { key:'report', icon:'✍️',  label:'Müraciət et' },
  { key:'stats',  icon:'📊',  label:'Statistika'  },
  { key:'feed',   icon:'⚡',  label:'Canlı Axın'  },
];

const CARD  = 'bg-[#161616] border border-[#222] rounded-xl';
const INPUT = 'bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2.5 text-sm text-[#e5e5e5] placeholder-[#444] focus:outline-none focus:border-[#F5A623] transition-colors w-full';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-xs">
      <p className="text-[#666] mb-1">{label}</p>
      {payload.map(p => <p key={p.name} style={{ color: p.fill || p.stroke || '#F5A623' }}>{p.name}: {p.value}</p>)}
    </div>
  );
};

export default function PublicPage() {
  const [tab,     setTab]     = useState('map');
  const [reports, setReports] = useState([]);
  const [weather, setWeather] = useState([]);
  const [feed,    setFeed]    = useState([]);
  const [form,    setForm]    = useState({ desc: '' });
  const [photo,   setPhoto]   = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [sending, setSending] = useState(false);
  const [sent,    setSent]    = useState(null);
  const fileRef = useRef();

  const stats = reports.reduce((a, r) => ({
    total:       a.total + 1,
    resolved:    a.resolved    + (r.status === 'resolved'    ? 1 : 0),
    in_progress: a.in_progress + (r.status === 'in_progress' ? 1 : 0),
    pending:     a.pending     + (r.status === 'pending'     ? 1 : 0),
  }), { total: 0, resolved: 0, in_progress: 0, pending: 0 });

  const byStatus = [
    { name:'Gözləyir',    value: stats.pending     },
    { name:'İcrada',      value: stats.in_progress },
    { name:'Həll edildi', value: stats.resolved     },
  ].filter(x => x.value > 0);

  const byCat = Object.values(
    reports.reduce((a, r) => {
      const k = r.category || 'Digər';
      a[k] = a[k] || { name: k, count: 0 };
      a[k].count++;
      return a;
    }, {})
  ).sort((a, b) => b.count - a.count).slice(0, 5);

  const trend = (() => {
    const days = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString('az', { weekday: 'short' });
      days[key] = { day: key, count: 0 };
    }
    reports.forEach(r => {
      const d   = new Date(r.created_at);
      const key = d.toLocaleDateString('az', { weekday: 'short' });
      if (days[key]) days[key].count++;
    });
    return Object.values(days);
  })();

  const load = () => {
    api.get('/reports/map').then(r => {
      const d = r.data || [];
      setReports(d);
      setFeed([...d].reverse().slice(0, 20));
    }).catch(() => {});
    api.get('/dashboard/weather-alerts').then(r => setWeather(r.data || [])).catch(() => {});
  };

  useEffect(() => {
    load();
    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL, { transports: ['websocket'] });
    socket.on('new_report',     () => load());
    socket.on('report_updated', () => load());
    return () => socket.disconnect();
  }, []);

  const onPhoto = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setPhoto(f);
    setPhotoPreview(URL.createObjectURL(f));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.desc.trim()) return;
    setSending(true);
    try {
      const fd = new FormData();
      fd.append('description', form.desc);
      fd.append('latitude',    '40.4093');
      fd.append('longitude',   '49.8671');
      if (photo) fd.append('photo', photo);
      const r = await api.post('/reports', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setSent(r.data.ai_result);
      setForm({ desc: '' });
      setPhoto(null); setPhotoPreview(null);
      setTimeout(() => { setSent(null); setTab('map'); load(); }, 4000);
    } catch (err) {
      alert(err.response?.data?.error || 'Xəta baş verdi');
    } finally { setSending(false); }
  };

  return (
    <div className="min-h-screen bg-[#111] text-[#e5e5e5]" style={{ fontFamily: 'system-ui, sans-serif' }}>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#161616] border-b border-[#222]">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#F5A623] inline-block" />
            <span className="font-semibold text-white text-sm">BakıFix</span>
            <span className="text-[#333] text-xs hidden sm:block">İctimai Portal</span>
          </Link>
          <Link href="/admin" className="text-xs text-[#444] hover:text-[#888] border border-[#222] px-3 py-1.5 rounded-md transition-colors">
            Admin →
          </Link>
        </div>

        {/* Weather alert */}
        {weather.length > 0 && (
          <div className="bg-[#F5A623]/10 border-t border-[#F5A623]/20 px-4 py-2 flex items-center gap-2">
            <span className="text-xs">⚠️</span>
            <span className="text-xs text-[#F5A623]">{weather[0].description}</span>
          </div>
        )}

        {/* Stat strip */}
        <div className="border-t border-[#1e1e1e] px-4 py-2">
          <div className="max-w-5xl mx-auto flex items-center gap-5 overflow-x-auto">
            {[
              { label: 'Ümumi',    val: stats.total,       cl: 'text-[#F5A623]'  },
              { label: 'Həll',     val: stats.resolved,    cl: 'text-[#10B981]'  },
              { label: 'İcrada',   val: stats.in_progress, cl: 'text-[#3B82F6]'  },
              { label: 'Gözləyir', val: stats.pending,     cl: 'text-[#F59E0B]'  },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-1.5 whitespace-nowrap">
                <span className={`text-base font-bold ${s.cl}`}>{s.val}</span>
                <span className="text-xs text-[#444]">{s.label}</span>
              </div>
            ))}
            <div className="ml-auto flex items-center gap-1.5 flex-shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse inline-block" />
              <span className="text-xs text-[#444]">Canlı</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-t border-[#1e1e1e] flex">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 py-2.5 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors border-b-2
                ${tab === t.key ? 'border-[#F5A623] text-white' : 'border-transparent text-[#444] hover:text-[#888]'}`}>
              <span>{t.icon}</span>
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>
      </header>

      {/* Tab content */}
      <main className="max-w-5xl mx-auto px-4 py-5">

        {/* MAP */}
        {tab === 'map' && (
          <div className={`${CARD} overflow-hidden`}>
            <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between">
              <span className="text-sm font-medium text-white">Canlı Xəritə — {reports.length} müraciət</span>
              <div className="flex gap-4 text-xs">
                {[['#F59E0B','Gözləyir'],['#3B82F6','İcrada'],['#10B981','Həll edildi']].map(([c, l]) => (
                  <span key={l} className="flex items-center gap-1.5 text-[#555]">
                    <span className="w-2 h-2 rounded-full inline-block" style={{ background: c }} />
                    {l}
                  </span>
                ))}
              </div>
            </div>
            <Map reports={reports} height="calc(100vh - 320px)" />
          </div>
        )}

        {/* REPORT FORM */}
        {tab === 'report' && (
          <div className="max-w-lg mx-auto">
            {sent ? (
              <div className={`${CARD} p-8 text-center`}>
                <div className="text-5xl mb-4">✅</div>
                <h2 className="text-xl font-bold text-white mb-1">Müraciət qəbul edildi!</h2>
                <p className="text-sm text-[#555] mb-5">AI nəticəsi:</p>
                <div className="text-left space-y-2 p-4 rounded-lg bg-[#1a1a1a] border border-[#222] text-sm">
                  <p><span className="text-[#555]">Kateqoriya:</span> <span className="text-[#ccc]">{sent.category}</span></p>
                  <p><span className="text-[#555]">Departament:</span> <span className="text-[#ccc]">{sent.department}</span></p>
                  <p><span className="text-[#555]">Prioritet:</span> <span className="text-[#ccc]">{sent.priority}</span></p>
                  <p className="text-[#555] text-xs mt-2">{sent.summary}</p>
                </div>
                <p className="text-xs text-[#444] mt-4">Xəritəyə yönləndirilirsiniz...</p>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-white mb-1">Müraciət Göndər</h2>
                  <p className="text-xs text-[#555]">Şəhər problemini bildirin, AI avtomatik yönləndirir</p>
                </div>

                {/* Photo */}
                <div>
                  <label className="block text-xs text-[#444] mb-2">Foto (istəyə bağlı)</label>
                  {photoPreview ? (
                    <div className="relative">
                      <img src={photoPreview} alt="" className="w-full h-44 object-cover rounded-xl" />
                      <button type="button" onClick={() => { setPhoto(null); setPhotoPreview(null); }}
                        className="absolute top-2 right-2 w-7 h-7 bg-black/70 rounded-full text-white text-xs flex items-center justify-center hover:bg-black transition-colors">✕</button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => fileRef.current?.click()}
                      className="w-full h-32 border border-dashed border-[#333] rounded-xl flex flex-col items-center justify-center gap-2 hover:border-[#F5A623]/50 transition-colors">
                      <span className="text-2xl">📷</span>
                      <span className="text-xs text-[#444]">Foto əlavə et</span>
                    </button>
                  )}
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPhoto} />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs text-[#444] mb-2">Problem təsviri *</label>
                  <textarea
                    className={`${INPUT} resize-none min-h-[110px]`}
                    placeholder="Problemi qısa izah edin... (məs. Neftçilər prospektindəki yolda böyük çuxur var)"
                    value={form.desc} onChange={e => setForm(p => ({ ...p, desc: e.target.value }))} required />
                </div>

                {/* Location note */}
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-[#1a1a1a] border border-[#222] text-xs text-[#444]">
                  <span className="flex-shrink-0">📍</span>
                  <span>GPS koordinat veb saytda dəstəklənmir. Dəqiq yer üçün mobil tətbiqimizi istifadə edin.</span>
                </div>

                <button type="submit" disabled={sending || !form.desc.trim()}
                  className="w-full py-3 bg-[#F5A623] text-black font-semibold rounded-lg text-sm hover:opacity-90 disabled:opacity-30 transition-opacity">
                  {sending ? 'Göndərilir...' : 'Göndər →'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* STATS */}
        {tab === 'stats' && (
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">

              {/* Pie */}
              <div className={`${CARD} p-5`}>
                <p className="text-xs text-[#444] uppercase tracking-wider mb-4">Status Paylanması</p>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={byStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={{ stroke: '#333' }}>
                      {byStatus.map((s, i) => <Cell key={i} fill={PIE_COLOR_BY_NAME[s.name] || '#888'} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Category bar */}
              <div className={`${CARD} p-5`}>
                <p className="text-xs text-[#444] uppercase tracking-wider mb-4">Kateqoriyalar</p>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={byCat} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#444' }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#555' }} width={90} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                    <Bar dataKey="count" fill="#F5A623" radius={[0, 2, 2, 0]} name="Müraciət" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Trend */}
            <div className={`${CARD} p-5`}>
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs text-[#444] uppercase tracking-wider">Həftəlik Trend</p>
                <span className="text-xs text-[#333]">Son 7 gün</span>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={trend}>
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#444' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#444' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#333' }} />
                  <Line type="monotone" dataKey="count" stroke="#F5A623" strokeWidth={2} dot={{ fill: '#F5A623', r: 3 }} name="Müraciət" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Həll nisbəti',   val: stats.total ? `${Math.round(stats.resolved / stats.total * 100)}%` : '—', accent: '#10B981' },
                { label: 'Aktiv',          val: stats.in_progress + stats.pending,                                          accent: '#3B82F6' },
                { label: 'Ümumi',          val: stats.total,                                                                accent: '#F5A623' },
                { label: 'Həll edildi',    val: stats.resolved,                                                             accent: '#10B981' },
              ].map(s => (
                <div key={s.label} className={`${CARD} p-4 text-center`}>
                  <div className="text-2xl font-bold mb-1" style={{ color: s.accent }}>{s.val}</div>
                  <div className="text-xs text-[#444]">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FEED */}
        {tab === 'feed' && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse inline-block" />
              <h2 className="text-base font-bold text-white">Canlı Axın</h2>
              <span className="text-xs text-[#444]">{feed.length} müraciət</span>
              <button onClick={load} className="ml-auto text-xs text-[#F5A623] hover:opacity-80 transition-opacity">↻ Yenilə</button>
            </div>
            <div className="space-y-2">
              {feed.length === 0 && (
                <div className="text-center py-16 text-[#333] text-sm">Hələlik müraciət yoxdur</div>
              )}
              {feed.map(r => (
                <div key={r.id} className={`${CARD} px-4 py-3 flex items-center gap-3 hover:bg-[#1a1a1a] transition-colors row-${r.status}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <p className="text-sm text-[#ccc] font-medium truncate">{r.category || 'Müraciət'}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-md font-medium flex-shrink-0 status-${r.status}`}>
                        {STATUS_AZ[r.status]}
                      </span>
                    </div>
                    <p className="text-xs text-[#444]">{r.department}{r.address ? ` · ${r.address}` : ''}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#1a1a1a] py-6 px-4 mt-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#333]">
          <Link href="/" className="flex items-center gap-2 hover:text-[#555] transition-colors">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F5A623] inline-block" />
            <span>BakıFix</span>
          </Link>
          <span>Openwave Hackathon 2026</span>
        </div>
      </footer>
    </div>
  );
}
