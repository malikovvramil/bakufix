import { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import api from '../lib/api';

const STATUS_AZ = { pending:'Gözləyir', in_progress:'İcrada', resolved:'Həll edildi', rejected:'Rədd edildi' };

function buildHtml(reports) {
  const data = JSON.stringify(reports);
  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html, body, #map { width:100%; height:100%; }
    .popup-box { font-family: sans-serif; min-width:160px; }
    .popup-title { font-weight:700; font-size:13px; margin-bottom:4px; }
    .popup-status { font-size:11px; margin-bottom:2px; }
    .popup-dept { font-size:11px; color:#666; }
    .legend { position:absolute; bottom:24px; left:8px; z-index:999; background:rgba(0,0,0,0.75); border-radius:10px; padding:8px 12px; }
    .legend-item { display:flex; align-items:center; gap:6px; color:#fff; font-size:11px; margin-bottom:4px; }
    .legend-dot { width:10px; height:10px; border-radius:50%; flex-shrink:0; }
  </style>
</head>
<body>
<div id="map"></div>
<div class="legend">
  <div class="legend-item"><span class="legend-dot" style="background:#F59E0B"></span>Gözləyir</div>
  <div class="legend-item"><span class="legend-dot" style="background:#3B82F6"></span>İcrada</div>
  <div class="legend-item"><span class="legend-dot" style="background:#10B981"></span>Həll edildi</div>
  <div class="legend-item"><span class="legend-dot" style="background:#EF4444"></span>Rədd edildi</div>
</div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  var reports = ${data};
  var colors  = { pending:'#F59E0B', in_progress:'#3B82F6', resolved:'#10B981', rejected:'#EF4444' };
  var radii   = { low:7, medium:9, high:12, critical:15 };
  var statusAz = { pending:'Gözləyir', in_progress:'İcrada', resolved:'Həll edildi', rejected:'Rədd edildi' };

  var map = L.map('map', { center:[40.3953, 49.8822], zoom:13, zoomControl:true });

  var satellite = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    { attribution:'© Esri', maxZoom:19 }
  );
  var street = L.tileLayer(
    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    { attribution:'© OSM', maxZoom:19 }
  );

  satellite.addTo(map);
  L.control.layers({'🛰️ Satellite': satellite, '🗺️ Küçə': street}).addTo(map);

  reports.forEach(function(r) {
    if (!r.latitude || !r.longitude) return;
    var color  = colors[r.status]  || '#888';
    var radius = radii[r.priority] || 9;
    L.circleMarker([parseFloat(r.latitude), parseFloat(r.longitude)], {
      radius: radius, fillColor: color, color:'#fff',
      weight:2, opacity:1, fillOpacity:0.85
    }).addTo(map).bindPopup(
      '<div class="popup-box">' +
      '<div class="popup-title">#' + r.id + ' — ' + (r.category || 'Müraciət') + '</div>' +
      '<div class="popup-status" style="color:' + color + '">● ' + (statusAz[r.status] || r.status) + '</div>' +
      '<div class="popup-dept">' + (r.department || '') + '</div>' +
      '</div>'
    );
  });

  if (reports.length > 0) {
    var latlngs = reports
      .filter(function(r){ return r.latitude && r.longitude; })
      .map(function(r){ return [parseFloat(r.latitude), parseFloat(r.longitude)]; });
    if (latlngs.length > 0) {
      try { map.fitBounds(L.latLngBounds(latlngs), { padding:[30,30] }); } catch(e){}
    }
  }
</script>
</body>
</html>
`;
}

export default function MapScreen() {
  const [reports,  setReports]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [html,     setHtml]     = useState('');
  const [counts,   setCounts]   = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get('/reports/map');
      const data = r.data || [];
      setReports(data);
      setHtml(buildHtml(data));
      const c = data.reduce((acc, x) => ({ ...acc, [x.status]: (acc[x.status]||0)+1 }), {});
      setCounts(c);
    } catch {
      Alert.alert('Xəta', 'Xəritə məlumatları yüklənmədi');
      setHtml(buildHtml([]));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <View style={s.container}>
      {/* Stat bar */}
      <View style={s.statBar}>
        {[
          { status:'pending',     color:'#F59E0B' },
          { status:'in_progress', color:'#3B82F6' },
          { status:'resolved',    color:'#10B981' },
        ].map(({ status, color }) => (
          <View key={status} style={s.statItem}>
            <View style={[s.dot, { backgroundColor: color }]} />
            <Text style={s.statNum}>{counts[status] || 0}</Text>
            <Text style={s.statLabel}>{STATUS_AZ[status]}</Text>
          </View>
        ))}
        <TouchableOpacity style={s.refreshBtn} onPress={load}>
          <Text style={s.refreshTxt}>↻</Text>
        </TouchableOpacity>
      </View>

      {/* Map */}
      {loading ? (
        <View style={s.loader}>
          <ActivityIndicator size="large" color="#F5A623" />
          <Text style={s.loaderTxt}>Xəritə yüklənir...</Text>
        </View>
      ) : (
        <WebView
          style={s.map}
          source={{ html, baseUrl: 'https://unpkg.com' }}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
          renderLoading={() => (
            <View style={s.loader}>
              <ActivityIndicator size="large" color="#F5A623" />
            </View>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container:   { flex:1, backgroundColor:'#111827' },
  statBar:     { flexDirection:'row', alignItems:'center', backgroundColor:'#1F2937', paddingHorizontal:16, paddingVertical:10, borderBottomWidth:1, borderBottomColor:'#374151', gap:16 },
  statItem:    { flexDirection:'row', alignItems:'center', gap:5 },
  dot:         { width:8, height:8, borderRadius:4 },
  statNum:     { color:'#fff', fontWeight:'700', fontSize:14 },
  statLabel:   { color:'#6B7280', fontSize:11 },
  refreshBtn:  { marginLeft:'auto' },
  refreshTxt:  { color:'#F5A623', fontSize:22 },
  map:         { flex:1 },
  loader:      { flex:1, alignItems:'center', justifyContent:'center', gap:12 },
  loaderTxt:   { color:'#9CA3AF', fontSize:14 },
});
