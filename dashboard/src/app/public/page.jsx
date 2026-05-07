'use client';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import api from '@/lib/api';

const Map = dynamic(() => import('@/components/Map'), { ssr: false });

const STATUS_AZ = { pending:'Gözləyir', in_progress:'İcrada', resolved:'Həll edildi', rejected:'Rədd edildi' };

export default function PublicPage() {
  const [reports, setReports] = useState([]);
  const [stats,   setStats]   = useState({ total: 0, resolved: 0, pending: 0, in_progress: 0 });
  const [weather, setWeather] = useState([]);

  useEffect(() => {
    api.get('/reports/map').then(r => {
      setReports(r.data);
      const s = r.data.reduce((acc, x) => ({ ...acc, total: acc.total+1, [x.status]: (acc[x.status]||0)+1 }), { total:0 });
      setStats(s);
    });
    api.get('/dashboard/weather-alerts').then(r => setWeather(r.data));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🏙️</span>
          <div>
            <h1 className="font-bold text-lg leading-none">BakıFix</h1>
            <p className="text-xs text-gray-400">İctimai Vəziyyət Xəritəsi</p>
          </div>
        </div>
        <a href="/admin" className="text-sm bg-white/10 hover:bg-white/20 px-4 py-1.5 rounded-lg">Admin Panel →</a>
      </header>

      {weather.length > 0 && (
        <div className="bg-orange-50 border-b border-orange-200 px-6 py-2 flex items-center gap-2">
          <span>⚠️</span>
          <span className="text-sm text-orange-800 font-medium">{weather[0].description}</span>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6">
        {[
          { label:'Ümumi müraciət', val: stats.total,       color:'text-gray-800' },
          { label:'Həll edildi',    val: stats.resolved||0,  color:'text-green-600' },
          { label:'İcrada',         val: stats.in_progress||0, color:'text-blue-600' },
          { label:'Gözləyir',      val: stats.pending||0,    color:'text-yellow-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className={`text-3xl font-bold ${s.color}`}>{s.val}</p>
          </div>
        ))}
      </div>

      <div className="px-6 pb-6">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold">Canlı Xəritə</h2>
            <div className="flex gap-3 text-xs">
              {[['#F59E0B','Gözləyir'],['#3B82F6','İcrada'],['#10B981','Həll edildi']].map(([c,l]) => (
                <span key={l} className="flex items-center gap-1">
                  <span style={{background:c}} className="w-3 h-3 rounded-full inline-block"/>
                  {l}
                </span>
              ))}
            </div>
          </div>
          <Map reports={reports} height="520px" />
        </div>
      </div>

      <div className="px-6 pb-10">
        <h2 className="font-semibold mb-3 text-gray-700">Son Müraciətlər</h2>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y">
          {reports.slice(0,8).map(r => (
            <div key={r.id} className="px-4 py-3 flex items-center gap-3">
              <span className="text-lg">{r.icon === 'road' ? '🛣️' : r.icon === 'water' ? '💧' : r.icon === 'light' ? '💡' : r.icon === 'park' ? '🌳' : '📋'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{r.category}</p>
                <p className="text-xs text-gray-400">{r.department}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full status-${r.status}`}>{STATUS_AZ[r.status]}</span>
            </div>
          ))}
          {!reports.length && <p className="text-center text-gray-400 py-8 text-sm">Hələlik müraciət yoxdur</p>}
        </div>
      </div>
    </div>
  );
}
