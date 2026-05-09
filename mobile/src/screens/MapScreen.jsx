import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import api from '../lib/api';
import { C, STATUS_AZ } from '../lib/theme';

const LEGEND = [
  { status: 'pending',     label: 'Gözləyir',    color: C.pending     },
  { status: 'in_progress', label: 'İcrada',      color: C.in_progress },
  { status: 'resolved',    label: 'Həll edildi', color: C.resolved    },
];

function buildHtml(reports) {
  const data = JSON.stringify(reports);
  return [
    '<!DOCTYPE html>',
    '<html>',
    '<head>',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">',
    '<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>',
    '<style>',
    '* { margin: 0; padding: 0; box-sizing: border-box; }',
    'html, body, #map { width: 100%; height: 100%; background: #111; }',
    'body { font-family: system-ui, -apple-system, sans-serif; }',
    '.leaflet-control-attribution { background: rgba(17,17,17,0.7) !important; color: #555 !important; border-top-left-radius: 6px; font-size: 10px; }',
    '.leaflet-control-attribution a { color: #888 !important; }',
    '.leaflet-control-layers { background: #161616 !important; border: 1px solid #222 !important; color: #e5e5e5 !important; border-radius: 8px; }',
    '.leaflet-control-layers-expanded { padding: 8px 10px; }',
    '.leaflet-control-layers label { font-size: 11px; }',
    '.leaflet-popup-content-wrapper { background: #161616; color: #e5e5e5; border: 1px solid #222; border-radius: 10px; box-shadow: 0 4px 16px rgba(0,0,0,0.5); }',
    '.leaflet-popup-tip { background: #161616; }',
    '.leaflet-popup-content { margin: 10px 12px; min-width: 180px; }',
    '.pop-id { font-size: 10px; color: #555; font-family: monospace; }',
    '.pop-title { font-weight: 700; font-size: 13px; color: #fff; margin-top: 2px; }',
    '.pop-status { font-size: 11px; margin-top: 6px; font-weight: 600; }',
    '.pop-dept { font-size: 11px; color: #888; margin-top: 2px; }',
    '</style>',
    '</head>',
    '<body>',
    '<div id="map"></div>',
    '<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>',
    '<script>',
    'var reports  = ' + data + ';',
    "var colors   = { pending:'#F59E0B', in_progress:'#3B82F6', resolved:'#10B981', rejected:'#EF4444' };",
    'var radii    = { low:7, medium:9, high:12, critical:15 };',
    "var statusAz = { pending:'Gözləyir', in_progress:'İcrada', resolved:'Həll edildi', rejected:'Rədd edildi' };",
    "var map = L.map('map', { center:[40.3953, 49.8822], zoom:13, zoomControl:true });",
    "var satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution:'© Esri', maxZoom:19 });",
    "var street = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution:'© OSM', maxZoom:19 });",
    'satellite.addTo(map);',
    "L.control.layers({ '🛰️ Satellite': satellite, '🗺️ Kuca': street }).addTo(map);",
    'reports.forEach(function(r) {',
    '  if (!r.latitude || !r.longitude) return;',
    "  var color  = colors[r.status]  || '#888';",
    '  var radius = radii[r.priority] || 9;',
    '  L.circleMarker([parseFloat(r.latitude), parseFloat(r.longitude)], {',
    "    radius: radius, fillColor: color, color: '#fff', weight: 2, opacity: 1, fillOpacity: 0.85",
    '  }).addTo(map).bindPopup(',
    "    '<div class=\"pop-id\">#' + r.id + '</div>' +",
    "    '<div class=\"pop-title\">' + (r.category || 'Muraciet') + '</div>' +",
    "    '<div class=\"pop-status\" style=\"color:' + color + '\">● ' + (statusAz[r.status] || r.status) + '</div>' +",
    "    '<div class=\"pop-dept\">' + (r.department || '') + '</div>'",
    '  );',
    '});',
    'if (reports.length > 0) {',
    '  var latlngs = reports',
    '    .filter(function(r){ return r.latitude && r.longitude; })',
    '    .map(function(r){ return [parseFloat(r.latitude), parseFloat(r.longitude)]; });',
    '  if (latlngs.length > 0) {',
    '    try { map.fitBounds(L.latLngBounds(latlngs), { padding:[30,30] }); } catch(e){}',
    '  }',
    '}',
    '</script>',
    '</body>',
    '</html>',
  ].join('\n');
}

export default function MapScreen() {
  const [loading, setLoading] = useState(true);
  const [html,    setHtml]    = useState('');
  const [counts,  setCounts]  = useState({});
  const [total,   setTotal]   = useState(0);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get('/reports/map');
      const data = r.data || [];
      setHtml(buildHtml(data));
      setTotal(data.length);
      setCounts(data.reduce((acc, x) => ({ ...acc, [x.status]: (acc[x.status] || 0) + 1 }), {}));
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
      <View style={s.headerCard}>
        <View style={s.headerTop}>
          <Text style={s.title}>Canlı Xəritə</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={s.count}>{total} müraciət</Text>
            <TouchableOpacity onPress={load} hitSlop={10}>
              <Text style={s.refresh}>↻</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={s.legend}>
          {LEGEND.map(l => (
            <View key={l.status} style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: l.color }]} />
              <Text style={s.legendNum}>{counts[l.status] || 0}</Text>
              <Text style={s.legendLabel}>{l.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {loading ? (
        <View style={s.loader}>
          <ActivityIndicator size="large" color={C.accent} />
          <Text style={s.loaderTxt}>Xəritə yüklənir…</Text>
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
              <ActivityIndicator size="large" color={C.accent} />
            </View>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: C.bg },

  headerCard:   {
    backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border,
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10,
  },
  headerTop:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title:        { color: '#fff', fontSize: 14, fontWeight: '600' },
  count:        { color: C.textFaint, fontSize: 11 },
  refresh:      { color: C.accent, fontSize: 16, paddingHorizontal: 4 },

  legend:       { flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 4, marginTop: 8 },
  legendItem:   { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:    { width: 8, height: 8, borderRadius: 4 },
  legendNum:    { color: '#fff', fontWeight: '700', fontSize: 12 },
  legendLabel:  { color: C.textMuted, fontSize: 11 },

  map:          { flex: 1, backgroundColor: C.bg },
  loader:       { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: C.bg },
  loaderTxt:    { color: C.textDim, fontSize: 12 },
});
