'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/lib/api';

function Counter({ value }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const end = parseInt(value) || 0;
    if (!end) return;
    let current = 0;
    const step = Math.max(1, Math.floor(end / 60));
    const t = setInterval(() => {
      current = Math.min(current + step, end);
      setCount(current);
      if (current >= end) clearInterval(t);
    }, 20);
    return () => clearInterval(t);
  }, [value]);
  return <>{count.toLocaleString()}</>;
}

const CAT_ICON  = { road:'🛣️', water:'💧', light:'💡', park:'🌳' };
const STATUS_AZ = { pending:'Gözləyir', in_progress:'İcrada', resolved:'Həll edildi', rejected:'Rədd edildi' };
const STATUS_CL = { pending:'text-yellow-500', in_progress:'text-blue-400', resolved:'text-green-500', rejected:'text-red-400' };

export default function LandingPage() {
  const [dark, setDark]   = useState(true);
  const [stats, setStats] = useState({ total:0, resolved:0, in_progress:0 });
  const [feed,  setFeed]  = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('bf-theme');
    if (saved) setDark(saved === 'dark');
    api.get('/reports/map').then(r => {
      const d = r.data || [];
      setStats({
        total:       d.length,
        resolved:    d.filter(x => x.status === 'resolved').length,
        in_progress: d.filter(x => x.status === 'in_progress').length,
      });
      setFeed([...d].reverse().slice(0, 6));
    }).catch(() => {}).finally(() => setReady(true));
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem('bf-theme', next ? 'dark' : 'light');
  };

  const D = {
    bg:     dark ? 'bg-gray-950 text-white'      : 'bg-gray-50 text-gray-900',
    hdr:    dark ? 'bg-gray-950/90 border-gray-800' : 'bg-white/90 border-gray-200',
    card:   dark ? 'bg-gray-900 border-gray-800'  : 'bg-white border-gray-200',
    muted:  dark ? 'text-gray-400'                : 'text-gray-500',
    sub:    dark ? 'bg-gray-900 border-gray-800'  : 'bg-gray-100 border-gray-200',
    hr:     dark ? 'border-gray-800'              : 'border-gray-200',
  };

  return (
    <div className={`min-h-screen ${D.bg} transition-colors duration-300`}>

      {/* ── Header ── */}
      <header className={`fixed top-0 w-full z-50 backdrop-blur-md border-b ${D.hdr}`}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏙️</span>
            <span className="font-black text-xl tracking-tight">BakıFix</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/public" className={`text-sm font-medium ${D.muted} hover:text-brand transition-colors`}>İctimai Xəritə</Link>
            <Link href="/admin"  className={`text-sm font-medium ${D.muted} hover:text-brand transition-colors`}>Admin Panel</Link>
            <button onClick={toggle}
              className={`w-9 h-9 rounded-full flex items-center justify-center text-base transition-colors ${dark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}`}>
              {dark ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="pt-40 pb-24 px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand/10 text-brand text-sm font-semibold mb-8">
            <span className="w-2 h-2 rounded-full bg-brand animate-pulse inline-block"/>
            Bakıda canlı fəaliyyətdədir
          </div>
          <h1 className="text-6xl md:text-7xl font-black leading-[1.05] mb-6">
            Bakının<br/>
            Problemlərini<br/>
            <span className="text-brand">Birlikdə</span> Həll Edirik
          </h1>
          <p className={`text-xl ${D.muted} max-w-2xl mx-auto leading-relaxed mb-12`}>
            Yol çuxuru, sönmüş işıq, su sızması — foto çəkin, GPS ilə göndərin.
            AI kateqoriyalaşdırır, departament anında xəbərdar olur.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/public"
              className="px-8 py-4 bg-brand text-black font-bold rounded-2xl text-lg hover:opacity-90 transition-all hover:scale-105 shadow-lg shadow-brand/30">
              İctimai Xəritə →
            </Link>
            <Link href="/admin"
              className={`px-8 py-4 rounded-2xl text-lg font-semibold border ${D.card} hover:border-brand transition-all`}>
              Admin Panel
            </Link>
          </div>
        </div>
      </section>

      {/* ── Live Stats ── */}
      <section className="pb-20 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-4">
          {[
            { label:'Ümumi Müraciət', val:stats.total,       icon:'📊', color:'text-brand'      },
            { label:'Həll Edildi',    val:stats.resolved,    icon:'✅', color:'text-green-500'  },
            { label:'İcrada',         val:stats.in_progress, icon:'⚡', color:'text-blue-400'   },
          ].map(s => (
            <div key={s.label} className={`${D.card} border rounded-2xl p-6 text-center`}>
              <div className="text-3xl mb-3">{s.icon}</div>
              <div className={`text-5xl font-black mb-1 ${s.color}`}>
                {ready ? <Counter value={s.val}/> : '—'}
              </div>
              <div className={`text-sm ${D.muted}`}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className={`py-20 px-6 border-y ${D.hr}`}>
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-black text-center mb-4">Necə İşləyir?</h2>
          <p className={`text-center ${D.muted} mb-14 text-lg`}>3 addımda şikayətiñizi çatdırın</p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon:'📸', step:'01', title:'Foto çəkin',
                desc:'Problemi görən kimi bir foto çəkin. GPS avtomatik olaraq koordinatı əlavə edir.' },
              { icon:'🤖', step:'02', title:'AI təhlil edir',
                desc:'Süni intellekt problemi kateqoriyalaşdırır, prioritet təyin edir, müvafiq departamenta yönləndirir.' },
              { icon:'🔔', step:'03', title:'Həll edilir',
                desc:'Departament bildiriş alır, status real-time yenilənir, siz daim məlumatlısınız.' },
            ].map(f => (
              <div key={f.step} className={`${D.card} border rounded-2xl p-7 relative overflow-hidden`}>
                <span className={`absolute top-4 right-5 text-6xl font-black opacity-5 ${dark?'text-white':'text-black'}`}>{f.step}</span>
                <div className="text-4xl mb-5">{f.icon}</div>
                <h3 className="font-bold text-xl mb-3">{f.title}</h3>
                <p className={`${D.muted} leading-relaxed text-sm`}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features Grid ── */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-black text-center mb-14">Niyə BakıFix?</h2>
          <div className="grid md:grid-cols-2 gap-5">
            {[
              { icon:'🗺️', title:'Real-time Xəritə',      desc:'Bakıdakı bütün müraciətlər canlı xəritədə — uydu görüntüsü ilə' },
              { icon:'🌦️', title:'Hava Xəbərdarlığı',     desc:'Güclü yağış/külək zamanı risk altındakı rayonlar avtomatik vurğulanır' },
              { icon:'📈', title:'Trend Analizi',          desc:'Bu həftə hansı problem növü ən çox bildirildi? Canlı statistika' },
              { icon:'🤖', title:'AI Kateqorizasiya',      desc:'Claude AI fotodan problemi tanıyır, departamente avtomatik yönləndirir' },
              { icon:'⏱️', title:'SLA İzləmə',             desc:'Hər müraciətin həll müddəti izlənir, gecikən işlər işarələnir' },
              { icon:'⭐', title:'Reytinq sistemi',        desc:'Həll edilmiş problemlər üçün vətəndaşlar xidməti qiymətləndirir' },
            ].map(f => (
              <div key={f.title} className={`${D.card} border rounded-2xl p-6 flex gap-4 items-start`}>
                <span className="text-3xl flex-shrink-0">{f.icon}</span>
                <div>
                  <h3 className="font-bold text-lg mb-1">{f.title}</h3>
                  <p className={`text-sm ${D.muted} leading-relaxed`}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Live Feed ── */}
      {feed.length > 0 && (
        <section className={`py-20 px-6 border-t ${D.hr}`}>
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-3 mb-10">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse inline-block"/>
              <h2 className="text-3xl font-black">Canlı Axın</h2>
              <span className={`text-sm ${D.muted} ml-auto`}>Son müraciətlər</span>
            </div>
            <div className="space-y-3">
              {feed.map(r => (
                <div key={r.id} className={`${D.card} border rounded-xl p-4 flex items-center gap-4 hover:border-brand/50 transition-colors`}>
                  <span className="text-2xl w-8 text-center flex-shrink-0">{CAT_ICON[r.icon] || '📋'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{r.category || 'Müraciət'}</p>
                    <p className={`text-xs ${D.muted}`}>{r.department}</p>
                  </div>
                  <span className={`text-xs font-bold whitespace-nowrap ${STATUS_CL[r.status]}`}>{STATUS_AZ[r.status]}</span>
                </div>
              ))}
            </div>
            <div className="mt-8 text-center">
              <Link href="/public" className="inline-flex items-center gap-2 text-brand font-semibold hover:underline">
                Hamısını xəritədə gör →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── Footer ── */}
      <footer className={`border-t ${D.hr} py-10 px-6`}>
        <div className={`max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm ${D.muted}`}>
          <div className="flex items-center gap-2 font-medium">
            <span>🏙️</span>
            <span>BakıFix</span>
            <span className="opacity-50">·</span>
            <span>Openwave Hackathon 2026</span>
          </div>
          <div className="flex gap-8">
            <Link href="/public" className="hover:text-brand transition-colors">İctimai Xəritə</Link>
            <Link href="/admin"  className="hover:text-brand transition-colors">Admin Panel</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
