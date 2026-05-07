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

const STATUS_AZ = { pending:'Gözləyir', in_progress:'İcrada', resolved:'Həll edildi', rejected:'Rədd edildi' };
const STATUS_CL = { pending:'text-[#F59E0B]', in_progress:'text-[#3B82F6]', resolved:'text-[#10B981]', rejected:'text-[#EF4444]' };

export default function LandingPage() {
  const [stats, setStats] = useState({ total: 0, resolved: 0, in_progress: 0 });
  const [feed,  setFeed]  = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
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

  return (
    <div className="min-h-screen bg-[#111] text-[#e5e5e5]" style={{ fontFamily: 'system-ui, sans-serif' }}>

      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-[#111]/90 border-b border-[#222] backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#F5A623] inline-block" />
            <span className="font-semibold text-white text-sm">BakıFix</span>
          </div>
          <nav className="flex items-center gap-6">
            <Link href="/public" className="text-sm text-[#555] hover:text-[#999] transition-colors">İctimai Xəritə</Link>
            <Link href="/admin"  className="text-sm text-[#555] hover:text-[#999] transition-colors">Admin Panel</Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-40 pb-24 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F5A623]/10 border border-[#F5A623]/20 text-[#F5A623] text-xs font-medium mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F5A623] animate-pulse inline-block" />
            Bakıda canlı fəaliyyətdədir
          </div>
          <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6 text-white tracking-tight">
            Bakının Problemlərini<br />
            <span className="text-[#F5A623]">Birlikdə</span> Həll Edirik
          </h1>
          <p className="text-[#555] text-lg max-w-xl mx-auto leading-relaxed mb-10">
            Yol çuxuru, sönmüş işıq, su sızması — foto çəkin, GPS ilə göndərin.
            AI kateqoriyalaşdırır, departament anında xəbərdar olur.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/public"
              className="px-6 py-3 bg-[#F5A623] text-black font-semibold rounded-lg text-sm hover:opacity-90 transition-opacity">
              İctimai Xəritə →
            </Link>
            <Link href="/admin"
              className="px-6 py-3 bg-[#161616] border border-[#333] text-[#999] font-medium rounded-lg text-sm hover:border-[#555] hover:text-white transition-colors">
              Admin Panel
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="pb-20 px-6">
        <div className="max-w-3xl mx-auto grid grid-cols-3 gap-3">
          {[
            { label: 'Ümumi Müraciət', val: stats.total,       accent: '#F5A623' },
            { label: 'Həll Edildi',    val: stats.resolved,    accent: '#10B981' },
            { label: 'İcrada',         val: stats.in_progress, accent: '#3B82F6' },
          ].map(s => (
            <div key={s.label} className="bg-[#161616] border border-[#222] rounded-xl p-6 text-center">
              <div className="text-4xl font-bold mb-1" style={{ color: s.accent }}>
                {ready ? <Counter value={s.val} /> : '—'}
              </div>
              <div className="text-xs text-[#444]">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-6 border-t border-[#1a1a1a]">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs text-[#444] uppercase tracking-widest text-center mb-2">Proses</p>
          <h2 className="text-3xl font-bold text-center text-white mb-12">Necə İşləyir?</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { icon: '📸', step: '01', title: 'Foto çəkin',
                desc: 'Problemi görən kimi bir foto çəkin. GPS avtomatik olaraq koordinatı əlavə edir.' },
              { icon: '🤖', step: '02', title: 'AI təhlil edir',
                desc: 'Süni intellekt problemi kateqoriyalaşdırır, prioritet təyin edir, departamente yönləndirir.' },
              { icon: '🔔', step: '03', title: 'Həll edilir',
                desc: 'Departament bildiriş alır, status real-time yenilənir, siz daim məlumatlısınız.' },
            ].map(f => (
              <div key={f.step} className="bg-[#161616] border border-[#222] rounded-xl p-6 relative">
                <span className="absolute top-4 right-5 text-5xl font-bold opacity-[0.04] text-white select-none">{f.step}</span>
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-[#555] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs text-[#444] uppercase tracking-widest text-center mb-2">Xüsusiyyətlər</p>
          <h2 className="text-3xl font-bold text-center text-white mb-12">Niyə BakıFix?</h2>
          <div className="grid md:grid-cols-2 gap-3">
            {[
              { icon: '🗺️', title: 'Real-time Xəritə',    desc: 'Bakıdakı bütün müraciətlər canlı xəritədə — uydu görüntüsü ilə' },
              { icon: '🌦️', title: 'Hava Xəbərdarlığı',   desc: 'Güclü yağış/külək zamanı risk altındakı rayonlar avtomatik vurğulanır' },
              { icon: '📈', title: 'Trend Analizi',        desc: 'Bu həftə hansı problem növü ən çox bildirildi? Canlı statistika' },
              { icon: '🤖', title: 'AI Kateqorizasiya',    desc: 'Claude AI fotodan problemi tanıyır, departamente avtomatik yönləndirir' },
              { icon: '⏱️', title: 'SLA İzləmə',           desc: 'Hər müraciətin həll müddəti izlənir, gecikən işlər işarələnir' },
              { icon: '⭐', title: 'Reytinq sistemi',      desc: 'Həll edilmiş problemlər üçün vətəndaşlar xidməti qiymətləndirir' },
            ].map(f => (
              <div key={f.title} className="bg-[#161616] border border-[#222] rounded-xl p-5 flex gap-4 items-start hover:border-[#333] transition-colors">
                <span className="text-2xl flex-shrink-0">{f.icon}</span>
                <div>
                  <h3 className="font-medium text-white text-sm mb-1">{f.title}</h3>
                  <p className="text-xs text-[#555] leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live feed */}
      {feed.length > 0 && (
        <section className="py-20 px-6 border-t border-[#1a1a1a]">
          <div className="max-w-xl mx-auto">
            <div className="flex items-center gap-2 mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse inline-block" />
              <h2 className="text-xl font-bold text-white">Canlı Axın</h2>
              <span className="text-xs text-[#444] ml-auto">Son müraciətlər</span>
            </div>
            <div className="space-y-2">
              {feed.map(r => (
                <div key={r.id} className={`bg-[#161616] border border-[#222] rounded-lg px-4 py-3 flex items-center gap-3 row-${r.status} hover:bg-[#1a1a1a] transition-colors`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#ccc] font-medium truncate">{r.category || 'Müraciət'}</p>
                    <p className="text-xs text-[#444]">{r.department}</p>
                  </div>
                  <span className={`text-xs font-medium whitespace-nowrap ${STATUS_CL[r.status]}`}>{STATUS_AZ[r.status]}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 text-center">
              <Link href="/public" className="text-sm text-[#F5A623] hover:opacity-80 transition-opacity">
                Hamısını xəritədə gör →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-[#1a1a1a] py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-[#333]">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F5A623] inline-block" />
            <span className="text-[#444]">BakıFix</span>
            <span>·</span>
            <span>Openwave Hackathon 2026</span>
          </div>
          <div className="flex gap-6">
            <Link href="/public" className="hover:text-[#666] transition-colors">İctimai Xəritə</Link>
            <Link href="/admin"  className="hover:text-[#666] transition-colors">Admin Panel</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
