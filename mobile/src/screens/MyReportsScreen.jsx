import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Alert } from 'react-native';
import api from '../lib/api';

const STATUS_AZ    = { pending:'Gözləyir', in_progress:'İcrada', resolved:'Həll edildi', rejected:'Rədd edildi' };
const STATUS_COLOR = { pending:'#F59E0B', in_progress:'#3B82F6', resolved:'#10B981', rejected:'#EF4444' };
const PRIORITY_AZ  = { low:'Aşağı', medium:'Orta', high:'Yüksək', critical:'Kritik' };

export default function MyReportsScreen({ admin = false }) {
  const [reports,   setReports]   = useState([]);
  const [refreshing,setRefreshing]= useState(false);
  const [selected,  setSelected]  = useState(null);

  const load = async () => {
    try { const r = await api.get('/reports?limit=100'); setReports(r.data.data); }
    catch { Alert.alert('Xəta', 'Müraciətlər yüklənmədi'); }
  };

  useEffect(() => { load(); }, []);

  const rate = async (id, rating) => {
    try { await api.post(`/reports/${id}/rate`, { rating }); load(); Alert.alert('Təşəkkür!', 'Qiymətləndirməniz qeyd edildi'); }
    catch { Alert.alert('Xəta', 'Qiymətləndirmə mümkün deyil'); }
  };

  const changeStatus = async (id, status) => {
    try {
      await api.patch(`/reports/${id}/status`, { status });
      load();
      setSelected(null);
      Alert.alert('✅', 'Status yeniləndi');
    } catch { Alert.alert('Xəta', 'Status dəyişdirilmədi'); }
  };

  const renderItem = ({ item: r }) => (
    <TouchableOpacity style={s.card} onPress={() => setSelected(selected?.id === r.id ? null : r)}>
      <View style={s.cardHeader}>
        <View style={[s.dot, { backgroundColor: STATUS_COLOR[r.status] }]} />
        <Text style={s.category}>{r.category_name || 'Müraciət'}</Text>
        <Text style={[s.status, { color: STATUS_COLOR[r.status] }]}>{STATUS_AZ[r.status]}</Text>
      </View>
      <Text style={s.desc} numberOfLines={2}>{r.description}</Text>
      <View style={s.cardFooter}>
        <Text style={s.dept}>{r.department_name}</Text>
        <Text style={s.date}>{new Date(r.created_at).toLocaleDateString('az')}</Text>
      </View>

      {selected?.id === r.id && (
        <View style={s.detail}>
          <Text style={s.detailText}>📍 {r.address || `${parseFloat(r.latitude)?.toFixed(4)}, ${parseFloat(r.longitude)?.toFixed(4)}`}</Text>
          <Text style={s.detailText}>⚡ Prioritet: {PRIORITY_AZ[r.priority]}</Text>
          {r.sla_deadline && <Text style={s.detailText}>⏰ SLA: {new Date(r.sla_deadline).toLocaleString('az')}</Text>}
          {r.citizen_name && <Text style={s.detailText}>👤 {r.citizen_name}</Text>}

          {admin ? (
            <View style={s.adminBtns}>
              <Text style={s.ratingLabel}>Status dəyiş:</Text>
              <View style={s.statusRow}>
                {[
                  { s:'in_progress', label:'İcrada',      color:'#3B82F6' },
                  { s:'resolved',    label:'Həll edildi',  color:'#10B981' },
                  { s:'rejected',    label:'Rədd et',      color:'#EF4444' },
                  { s:'pending',     label:'Gözləyir',     color:'#F59E0B' },
                ].map(btn => (
                  <TouchableOpacity key={btn.s} style={[s.statusBtn, { borderColor: btn.color }]} onPress={() => changeStatus(r.id, btn.s)}>
                    <Text style={[s.statusBtnText, { color: btn.color }]}>{btn.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : (
            <>
              {r.status === 'resolved' && !r.rating && (
                <View style={s.ratingBox}>
                  <Text style={s.ratingLabel}>Xidməti qiymətləndir:</Text>
                  <View style={s.stars}>
                    {[1,2,3,4,5].map(n => (
                      <TouchableOpacity key={n} onPress={() => rate(r.id, n)}>
                        <Text style={s.star}>⭐</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
              {r.rating && <Text style={s.detailText}>⭐ Qiymətiniz: {'⭐'.repeat(r.rating)}</Text>}
            </>
          )}
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={s.container}>
      <Text style={s.heading}>{admin ? 'Müraciətlər' : 'Müraciətlərim'}</Text>
      <FlatList data={reports} keyExtractor={r => r.id.toString()} renderItem={renderItem}
        contentContainerStyle={{ padding:16, paddingBottom:40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor="#F5A623" />}
        ListEmptyComponent={<Text style={s.empty}>Hələ müraciət yoxdur{'\n'}Yeni müraciət yaradın ✍️</Text>}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container:   { flex:1, backgroundColor:'#111827' },
  heading:     { fontSize:22, fontWeight:'700', color:'#fff', padding:16, paddingBottom:0 },
  card:        { backgroundColor:'#1F2937', borderRadius:14, padding:14, marginBottom:10, borderWidth:1, borderColor:'#374151' },
  cardHeader:  { flexDirection:'row', alignItems:'center', gap:8, marginBottom:6 },
  dot:         { width:8, height:8, borderRadius:4 },
  category:    { flex:1, color:'#fff', fontWeight:'600', fontSize:15 },
  status:      { fontSize:12, fontWeight:'600' },
  desc:        { color:'#9CA3AF', fontSize:13, marginBottom:8, lineHeight:18 },
  cardFooter:  { flexDirection:'row', justifyContent:'space-between' },
  dept:        { color:'#6B7280', fontSize:12 },
  date:        { color:'#6B7280', fontSize:12 },
  detail:      { marginTop:12, paddingTop:12, borderTopWidth:1, borderTopColor:'#374151', gap:4 },
  detailText:  { color:'#D1D5DB', fontSize:13 },
  ratingBox:   { marginTop:8 },
  ratingLabel: { color:'#F5A623', fontSize:13, marginBottom:6 },
  stars:       { flexDirection:'row', gap:4 },
  star:        { fontSize:26 },
  empty:       { textAlign:'center', color:'#6B7280', fontSize:15, marginTop:60, lineHeight:26 },
});
