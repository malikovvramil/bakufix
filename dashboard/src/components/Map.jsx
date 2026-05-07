'use client';
import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';

const STATUS_COLORS = {
  pending:     '#F59E0B',
  in_progress: '#3B82F6',
  resolved:    '#10B981',
  rejected:    '#EF4444',
};

const PRIORITY_RADIUS = { low: 8, medium: 10, high: 13, critical: 16 };

export default function Map({ reports = [], height = '500px' }) {
  const mapRef    = useRef(null);
  const leafletRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const L = require('leaflet');

    if (!leafletRef.current) {
      leafletRef.current = L.map(mapRef.current, {
        center: [40.3953, 49.8822],
        zoom: 14,
      });

      // Satellite layer (Esri)
      const satellite = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { attribution: '© Esri', maxZoom: 19 }
      );

      // Street layer (OSM)
      const street = L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        { attribution: '© OpenStreetMap', maxZoom: 19 }
      );

      satellite.addTo(leafletRef.current);
      L.control.layers({ 'Satellite': satellite, 'Küçə Xəritəsi': street }).addTo(leafletRef.current);
    }

    const map = leafletRef.current;

    // Əvvəlki markerları sil
    map.eachLayer(layer => { if (layer.options?.pane !== 'tilePane' && layer._latlng) map.removeLayer(layer); });

    reports.forEach(r => {
      const color  = STATUS_COLORS[r.status] || '#888';
      const radius = PRIORITY_RADIUS[r.priority] || 10;

      const marker = L.circleMarker([r.latitude, r.longitude], {
        radius, fillColor: color, color: '#fff',
        weight: 2, opacity: 1, fillOpacity: 0.85,
      }).addTo(map);

      marker.bindPopup(`
        <div style="min-width:180px">
          <b>#${r.id} — ${r.category || 'Naməlum'}</b><br/>
          <span style="color:${color}">● ${r.status}</span><br/>
          <small>${r.department || ''}</small>
        </div>
      `);
    });
  }, [reports]);

  return <div ref={mapRef} style={{ height, width: '100%', borderRadius: 12 }} />;
}
