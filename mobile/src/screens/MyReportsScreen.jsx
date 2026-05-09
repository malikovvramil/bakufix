import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Alert, Image } from 'react-native';
import api from '../lib/api';
import { C, STATUS_AZ, PRIORITY_AZ, statusBadge, priorityBadge, rowAccentColor } from '../lib/theme';

export default function MyReportsScreen({ admin = false }) {
  const [reports,    setReports]    = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selected,   setSelected]   = useState(null);

  const load = async () => {
    try {
      const r = await api.get('/reports?limit=100');
      setReports(r.data.data);
    } catch {
      Alert.alert('Xəta', 'Müraciətlər yüklənmədi');
    }
  };

  useEffect(() => { load(); }, []);

  const rate = async (id, rating) => {
    try {
      await api.post('/reports/' + id + '/rate', { rating });
      load();
      Alert.alert('Təşəkkür!', 'Qiymətləndirməniz qeyd edildi');
    } catch { Alert.alert('Xəta', 'Qiymətləndirmə mümkün deyil'); }
  };

  const changeStatus = async (id, status) => {
    try {
      await api.patch('/reports/' + id + '/status', { status });
      load();
      setSelected(null);
      Alert.alert('Status yeniləndi');
    } catch { Alert.alert('Xəta', 'Status dəyişdirilmədi'); }
  };

  const renderItem = ({ item: r }) => {
    const open   = selected?.id === r.id;
    const accent = rowAccentColor(r.status);
    const sBadge = statusBadge(r.status);
    const pBadge = priorityBadge(r.priority);

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => setSelected(open ? null : r)}
        style={[s.card, { borderLeftColor: accent, borderLeftWidth: 2 }]}
      >
        <View style={s.cardHead}>
          <Text style={s.cardId}>#{r.id}</Text>
          <Text style={s.cardTitle} numberOfLines={1}>{r.category_name || 'Müraciət'}</Text>
          <Text style={[s.badge, { backgroundColor: sBadge.backgroundColor, borderColor: sBadge.borderColor, color: sBadge.color }]}>
            {STATUS_AZ[r.status]}
          </Text>
        </View>

        <Text style={s.cardDesc} numberOfLines={2}>{r.description}</Text>

        <View style={s.cardFoot}>
          <Text style={s.cardMeta} numberOfLines={1}>{r.department_name || '—'}</Text>
          <Text style={s.cardMetaDot}>·</Text>
          <Text style={s.cardMeta}>{new Date(r.created_at).toLocaleDateString('az')}</Text>
          <Text style={[s.badge, { backgroundColor: pBadge.backgroundColor, borderColor: pBadge.borderColor, color: pBadge.color, marginLeft: 'auto' }]}>
            {PRIORITY_AZ[r.priority]}
          </Text>
        </View>

        {open && (
          <View style={s.detail}>
            {!!r.photo_url && <Image source={{ uri: r.photo_url }} style={s.photo} />}

            <DetailRow icon="📍" text={r.address || (r.latitude != null ? Number(r.latitude).toFixed(4) + ', ' + Number(r.longitude).toFixed(4) : '—')} />
            {!!r.sla_deadline && <DetailRow icon="⏰" text={'SLA: ' + new Date(r.sla_deadline).toLocaleString('az')} />}
            {admin && !!r.citizen_name && <DetailRow icon="👤" text={r.citizen_name} />}

            {admin ? (
              <View style={s.actionsBlock}>
                <Text style={s.actionsLabel}>Status dəyiş</Text>
                <View style={s.actionGrid}>
                  {['in_progress', 'resolved', 'rejected', 'pending'].map(st => {
                    const b = statusBadge(st);
                    return (
                      <TouchableOpacity
                        key={st}
                        onPress={() => changeStatus(r.id, st)}
                        style={[s.actionBtn, { backgroundColor: b.backgroundColor, borderColor: b.borderColor }]}
                        activeOpacity={0.8}
                      >
                        <Text style={[s.actionBtnText, { color: b.color }]}>{STATUS_AZ[st]}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ) : (
              <>
                {r.status === 'resolved' && !r.rating && (
                  <View style={s.actionsBlock}>
                    <Text style={s.actionsLabel}>Xidməti qiymətləndir</Text>
                    <View style={s.starsRow}>
                      {[1, 2, 3, 4, 5].map(n => (
                        <TouchableOpacity key={n} onPress={() => rate(r.id, n)}>
                          <Text style={s.star}>⭐</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
                {!!r.rating && (
                  <View style={s.actionsBlock}>
                    <Text style={s.actionsLabel}>Sənin qiymətin</Text>
                    <Text style={s.starsStatic}>{'⭐'.repeat(r.rating)}</Text>
                  </View>
                )}
              </>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={s.container}>
      <View style={s.headerStrip}>
        <Text style={s.heading}>{admin ? 'Müraciətlər' : 'Müraciətlərim'}</Text>
        <Text style={s.headingCount}>{reports.length} nəticə</Text>
      </View>

      <FlatList
        data={reports}
        keyExtractor={r => r.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16, paddingTop: 8, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }}
            tintColor={C.accent}
          />
        }
        ListEmptyComponent={
          <View style={s.emptyWrap}>
            <Text style={s.emptyTitle}>Hələ müraciət yoxdur</Text>
            <Text style={s.emptySub}>{admin ? 'Yeni müraciət gəldikdə burada görünəcək.' : 'Yeni müraciət yarat ✍️'}</Text>
          </View>
        }
      />
    </View>
  );
}

function DetailRow({ icon, text }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
      <Text style={{ fontSize: 12 }}>{icon}</Text>
      <Text style={{ color: C.textDim, fontSize: 12, flex: 1 }}>{text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container:     { flex: 1, backgroundColor: C.bg },

  headerStrip:   {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8,
  },
  heading:       { fontSize: 18, fontWeight: '700', color: '#fff' },
  headingCount:  { fontSize: 11, color: C.textFaint },

  card:          {
    backgroundColor: C.card, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: C.border, marginBottom: 8,
  },
  cardHead:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  cardId:        { color: C.textFaint, fontFamily: 'monospace', fontSize: 11 },
  cardTitle:     { flex: 1, color: '#fff', fontWeight: '600', fontSize: 14 },
  cardDesc:      { color: C.textDim, fontSize: 13, lineHeight: 18, marginBottom: 8 },
  cardFoot:      { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardMeta:      { color: C.textMuted, fontSize: 11 },
  cardMetaDot:   { color: C.textGhost, fontSize: 11 },

  badge:         {
    fontSize: 11, fontWeight: '600',
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 6, borderWidth: 1, overflow: 'hidden',
  },

  detail:        { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.borderSoft },
  photo:         { width: '100%', height: 160, borderRadius: 10, marginBottom: 10 },

  actionsBlock:  { marginTop: 10 },
  actionsLabel:  { color: C.textFaint, fontSize: 11, marginBottom: 8 },
  actionGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  actionBtn:     { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  actionBtnText: { fontSize: 12, fontWeight: '600' },

  starsRow:      { flexDirection: 'row', gap: 6 },
  star:          { fontSize: 26 },
  starsStatic:   { fontSize: 18 },

  emptyWrap:     { alignItems: 'center', paddingVertical: 60 },
  emptyTitle:    { color: C.textDim, fontSize: 14, fontWeight: '500' },
  emptySub:      { color: C.textFaint, fontSize: 12, marginTop: 6 },
});
