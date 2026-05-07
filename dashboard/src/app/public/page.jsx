'use client';
import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { io } from 'socket.io-client';
import Link from 'next/link';
import api from '@/lib/api';

const Map = dynamic(() => import('@/components/Map'), { ssr: false });

const STATUS_AZ  = { pending:'Gözləyir', in_progress:'İcrada', resolved:'Həll edildi', rejected:'Rədd edildi' };
const STATUS_CL  = { pending:'text-yellow-500', in_progress:'text-blue-400', resolved:'text-green-500', rejected:'text-red-400' };
const STATUS_BG  = { pending:'bg-yellow-500/10 text-yellow-400', in_progress:'bg-blue-500/10 text-blue-400', resolved:'bg-green-500/10 text-green-400', rejected:'bg-red-500/10 text-red-400' };
const CAT_ICON   = { road:'🛣️', water:'💧', light:'💡', park:'🌳' };
const PIE_COLORS = ['#F59E0B','#3B82F6','#10B981','#EF4444'];
const TABS       = [
  { key:'map',    icon:'🗺️',  label:'Xəritə'     },
  { key:'report', icon:'✍️',  label:'Müraciət et' },
  { key:'stats',  icon:'📊',  label:'Statistika'  },
  { key:'feed',   icon:'⚡',  label:'Canlı Axın'  },
];

export default function PublicPage() {
  const [dark,    setDark]    = useState(true);
  const [tab,     setTab]     = useState('map');
  const [reports, setReports] = useState([]);
  const [weather, setWeather] = useState([]);
  const [feed,    setFeed]    = useState([]);
  const [form,    setForm]    = useState({ desc:'', name:'', phone:'' });
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
  }), { total:0, resolved:0, in_progress:0, pending:0 });

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
  ).sort((a,b) => b.count - a.count).slice(0, 5);

  // Trend: last 7 days
  const trend = (() => {
    const days = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString('az', { weekday:'short' });
      days[key] = { day: key, count: 0 };
    }
    reports.forEach(r => {
      const d = new Date(r.created_at);
      const key = d.toLocaleDateString('az', { weekday:'short' });
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
    const saved = localStorage.getItem('bf-theme');
    if (saved) setDark(saved === 'dark');
    load();
    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL, { transports:['websocket'] });
    socket.on('new_report', () => load());
    socket.on('report_updated', () => load());
    return () => socket.disconnect();
  }, []);

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem('bf-theme', next ? 'dark' : 'light');
  };

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
      const r = await api.post('/reports', fd, { headers:{ 'Content-Type':'multipart/form-data' } });
      setSent(r.data.ai_result);
      setForm({ desc:'', name:'', phone:'' });
      setPhoto(null); setPhotoPreview(null);
      setTimeout(() => { setSent(null); setTab('map'); load(); }, 4000);
    } catch (err) {
      alert(err.response?.data?.error || 'Xəta baş verdi');
    } finally { setSending(false); }
  };

  const D = {
    bg:    dark ? 'bg-gray-950 text-white'         : 'bg-gray-50 text-gray-900',
    hdr:   dark ? 'bg-gray-900 border-gray-800'    : 'bg-white border-gray-200',
    card:  dark ? 'bg-gray-900 border-gray-800'    : 'bg-white border-gray-200',
    input: dark ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-gray-100 border-gray-300 text-gray-900 placeholder-gray-400',
    muted: dark ? 'text-gray-400'                  : 'text-gray-500',
    tab:   dark ? 'border-gray-800'                : 'border-gray-200',
    hr:    dark ? 'border-gray-800'                : 'border-gray-200',
    tooltip: dark ? '#1F2937' : '#fff',
  };

  return (
    <div className={`min-h-screen ${D.bg} transition-colors duration-300`}>

      {/* ── Header ── */}
      <header className={`sticky top-0 z-40 border-b ${D.hdr}`}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl">🏙️</span>
            <span className="font-black text-lg">BakıFix</span>
            <span className={`text-xs ${D.muted} hidden sm:block`}>İctimai Portal</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/admin" className={`text-xs px-3 py-1.5 rounded-lg border ${D.tab} ${D.muted} hover:text-brand hover:border-brand transition-colors`}>
              Admin →
            </Link>
            <button onClick={toggleDark}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${dark?'bg-gray-800':'bg-gray-100'}`}>
              {dark ? '☀️' : '🌙'}
            </button>
          </div>
        </div>

        {/* Weather alert */}
        {weather.length > 0 && (
          <div className="bg-orange-500/10 border-t border-orange-500/20 px-4 py-2 flex items-center gap-2">
            <span>⚠️</span>
            <span className="text-sm text-orange-400 font-medium">{weather[0].description}</span>
          </div>
        )}

        {/* Tabs */}
        <div className={`border-t ${D.tab} flex`}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors border-b-2
                ${tab === t.key
                  ? 'border-brand text-brand'
                  : `border-transparent ${D.muted} hover:text-brand`}`}>
              <span>{t.icon}</span>
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>
      </header>

      {/* ── Stat strip ── */}
      <div className={`border-b ${D.hr} px-4 py-3`}>
        <div className="max-w-6xl mx-auto flex items-center gap-6 overflow-x-auto">
          {[
            { label:'Ümumi',   val:stats.total,       cl:'text-brand'      },
            { label:'Həll',    val:stats.resolved,    cl:'text-green-500'  },
            { label:'İcrada',  val:stats.in_progress, cl:'text-blue-400'   },
            { label:'Gözləyir',val:stats.pending,     cl:'text-yellow-500' },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-2 whitespace-nowrap">
              <span className={`text-xl font-black ${s.cl}`}>{s.val}</span>
              <span className={`text-xs ${D.muted}`}>{s.label}</span>
            </div>
          ))}
          <div className="ml-auto flex items-center gap-1.5 flex-shrink-0">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block"/>
            <span className={`text-xs ${D.muted}`}>Canlı</span>
          </div>
        </div>
      </div>

      {/* ── Tab Content ── */}
      <main className="max-w-6xl mx-auto px-4 py-6">

        {/* MAP */}
        {tab === 'map' && (
          <div className={`${D.card} border rounded-2xl overflow-hidden`}>
            <div className={`p-4 border-b ${D.hr} flex items-center justify-between`}>
              <h2 className="font-bold text-lg">Canlı Xəritə — {reports.length} müraciət</h2>
              <div className="flex gap-4 text-xs">
                {[['#F59E0B','Gözləyir'],['#3B82F6','İcrada'],['#10B981','Həll edildi']].map(([c,l])=>(
                  <span key={l} className="flex items-center gap-1.5">
                    <span style={{background:c}} className="w-2.5 h-2.5 rounded-full inline-block"/>
                    {l}
                  </span>
                ))}
              </div>
            </div>
            <Map reports={reports} height="calc(100vh - 340px)" />
          </div>
        )}

        {/* REPORT FORM */}
        {tab === 'report' && (
          <div className="max-w-xl mx-auto">
            {sent ? (
              <div className={`${D.card} border rounded-2xl p-8 text-center`}>
                <div className="text-6xl mb-4">✅</div>
                <h2 className="text-2xl font-black mb-2">Müraciət qəbul edildi!</h2>
                <p className={`${D.muted} mb-6`}>AI nəticəsi:</p>
                <div className={`text-left space-y-2 p-4 rounded-xl ${dark?'bg-gray-800':'bg-gray-100'}`}>
                  <p>📂 <b>Kateqoriya:</b> {sent.category}</p>
                  <p>🏢 <b>Departament:</b> {sent.department}</p>
                  <p>⚡ <b>Prioritet:</b> {sent.priority}</p>
                  <p className={`text-sm ${D.muted} mt-2`}>{sent.summary}</p>
                </div>
                <p className={`text-sm ${D.muted} mt-4`}>Xəritəyə yönləndirilirsiniz...</p>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-5">
                <div>
                  <h2 className="text-2xl font-black mb-1">Müraciət Göndər</h2>
                  <p className={`text-sm ${D.muted}`}>Şəhər problemini bildirin, AI avtomatik yönləndirir</p>
                </div>

                {/* Photo */}
                <div>
                  <label className={`block text-sm font-semibold mb-2 ${D.muted}`}>Foto (istəyə bağlı)</label>
                  {photoPreview ? (
                    <div className="relative">
                      <img src={photoPreview} alt="" className="w-full h-48 object-cover rounded-xl"/>
                      <button type="button" onClick={() => { setPhoto(null); setPhotoPreview(null); }}
                        className="absolute top-2 right-2 w-8 h-8 bg-black/60 rounded-full text-white flex items-center justify-center text-sm">✕</button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => fileRef.current?.click()}
                      className={`w-full h-36 border-2 border-dashed ${dark?'border-gray-700 hover:border-brand':'border-gray-300 hover:border-brand'} rounded-xl flex flex-col items-center justify-center gap-2 transition-colors`}>
                      <span className="text-3xl">📷</span>
                      <span className={`text-sm ${D.muted}`}>Foto əlavə et</span>
                    </button>
                  )}
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPhoto}/>
                </div>

                {/* Description */}
                <div>
                  <label className={`block text-sm font-semibold mb-2 ${D.muted}`}>Problem təsviri *</label>
                  <textarea
                    className={`w-full border rounded-xl px-4 py-3 text-sm resize-none min-h-[120px] ${D.input} focus:outline-none focus:border-brand transition-colors`}
                    placeholder="Problemi qısa izah edin... (məs. Neftçilər prospektindəki yolda böyük çuxur var)"
                    value={form.desc} onChange={e => setForm(p=>({...p, desc:e.target.value}))} required />
                </div>

                {/* Location note */}
                <div className={`flex items-center gap-2 px-4 py-3 rounded-xl ${dark?'bg-gray-800':'bg-gray-100'} text-sm`}>
                  <span>📍</span>
                  <span className={D.muted}>GPS koordinat veb saytda dəstəklənmir. Dəqiq yer üçün mobil tətbiqimizi istifadə edin.</span>
                </div>

                <button type="submit" disabled={sending || !form.desc.trim()}
                  className="w-full py-4 bg-brand text-black font-bold rounded-xl text-lg hover:opacity-90 disabled:opacity-40 transition-all">
                  {sending ? 'Göndərilir...' : 'Göndər →'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* STATS */}
        {tab === 'stats' && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">

              {/* Status pie */}
              <div className={`${D.card} border rounded-2xl p-6`}>
                <h3 className={`font-bold mb-5 text-sm uppercase tracking-wide ${D.muted}`}>Status Paylanması</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={byStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`}>
                      {byStatus.map((_,i) => <Cell key={i} fill={PIE_COLORS[i]}/>)}
                    </Pie>
                    <Tooltip contentStyle={{ background: D.tooltip, border:'none', borderRadius:8 }}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Category bar */}
              <div className={`${D.card} border rounded-2xl p-6`}>
                <h3 className={`font-bold mb-5 text-sm uppercase tracking-wide ${D.muted}`}>Kateqoriyalar üzrə</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={byCat} layout="vertical">
                    <XAxis type="number" tick={{fontSize:11, fill: dark?'#6B7280':'#9CA3AF'}} axisLine={false}/>
                    <YAxis type="category" dataKey="name" tick={{fontSize:11, fill: dark?'#6B7280':'#9CA3AF'}} width={80} axisLine={false}/>
                    <Tooltip contentStyle={{ background: D.tooltip, border:'none', borderRadius:8 }}/>
                    <Bar dataKey="count" fill="#F5A623" radius={[0,4,4,0]} name="Müraciət"/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Weekly trend */}
            <div className={`${D.card} border rounded-2xl p-6`}>
              <div className="flex items-center justify-between mb-5">
                <h3 className={`font-bold text-sm uppercase tracking-wide ${D.muted}`}>Həftəlik Trend</h3>
                <span className={`text-xs ${D.muted}`}>Son 7 gün</span>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={trend}>
                  <XAxis dataKey="day" tick={{fontSize:11, fill: dark?'#6B7280':'#9CA3AF'}} axisLine={false}/>
                  <YAxis tick={{fontSize:11, fill: dark?'#6B7280':'#9CA3AF'}} axisLine={false} tickLine={false}/>
                  <Tooltip contentStyle={{ background: D.tooltip, border:'none', borderRadius:8 }}/>
                  <Line type="monotone" dataKey="count" stroke="#F5A623" strokeWidth={2.5} dot={{fill:'#F5A623', r:4}} name="Müraciət"/>
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label:'Həll nisbəti', val: stats.total ? `${Math.round(stats.resolved/stats.total*100)}%` : '—', icon:'✅', cl:'text-green-500' },
                { label:'Aktiv müraciət', val: stats.in_progress + stats.pending, icon:'⚡', cl:'text-blue-400' },
                { label:'Ümumi',  val: stats.total,    icon:'📊', cl:'text-brand'     },
                { label:'Həll edildi', val: stats.resolved, icon:'🏆', cl:'text-green-500' },
              ].map(s => (
                <div key={s.label} className={`${D.card} border rounded-xl p-4 text-center`}>
                  <div className="text-2xl mb-2">{s.icon}</div>
                  <div className={`text-3xl font-black ${s.cl} mb-1`}>{s.val}</div>
                  <div className={`text-xs ${D.muted}`}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* LIVE FEED */}
        {tab === 'feed' && (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse inline-block"/>
              <h2 className="text-xl font-black">Canlı Axın</h2>
              <span className={`text-sm ${D.muted}`}>{feed.length} müraciət</span>
              <button onClick={load} className={`ml-auto text-sm text-brand hover:underline`}>↻ Yenilə</button>
            </div>
            <div className="space-y-3">
              {feed.length === 0 && (
                <div className={`text-center py-16 ${D.muted}`}>Hələlik müraciət yoxdur</div>
              )}
              {feed.map(r => (
                <div key={r.id} className={`${D.card} border rounded-xl p-4 flex items-start gap-4 hover:border-brand/30 transition-colors`}>
                  <span className="text-2xl flex-shrink-0 mt-0.5">{CAT_ICON[r.icon] || '📋'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <p className="font-semibold text-sm">{r.category || 'Müraciət'}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${STATUS_BG[r.status]}`}>
                        {STATUS_AZ[r.status]}
                      </span>
                    </div>
                    <p className={`text-xs ${D.muted} mb-1`}>{r.department}</p>
                    {r.address && <p className={`text-xs ${D.muted}`}>📍 {r.address}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className={`border-t ${D.hr} py-6 px-4 mt-10`}>
        <div className={`max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-sm ${D.muted}`}>
          <Link href="/" className="flex items-center gap-2 font-medium hover:text-brand transition-colors">
            <span>🏙️</span><span>BakıFix</span>
          </Link>
          <span>Openwave Hackathon 2026</span>
        </div>
      </footer>
    </div>
  );
}
