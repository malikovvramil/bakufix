import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet, Alert, ScrollView, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import api from '../lib/api';
import { C } from '../lib/theme';

const CATEGORIES = [
  { id: 1, label: '🛣️ Yol',           key: 'yol' },
  { id: 2, label: '💧 Su/Kanalizasiya', key: 'su' },
  { id: 3, label: '💡 İşıq',           key: 'isiq' },
  { id: 4, label: '🌳 Abadlıq',        key: 'abadliq' },
  { id: 5, label: '📋 Digər',          key: 'diger' },
];

export default function NewReportScreen({ onSuccess }) {
  const [photo,        setPhoto]      = useState(null);
  const [desc,         setDesc]       = useState('');
  const [cat,          setCat]        = useState(null);
  const [location,     setLocation]   = useState(null);
  const [loading,      setLoading]    = useState(false);
  const [locLoading,   setLocLoading] = useState(false);
  const [aiResult,     setAiResult]   = useState(null);

  useEffect(() => { fetchLocation(); }, []);

  const fetchLocation = async () => {
    setLocLoading(true);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') { Alert.alert('GPS icazəsi lazımdır'); setLocLoading(false); return; }
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    setLocation(loc.coords);
    setLocLoading(false);
  };

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('İcazə lazımdır', 'Kamera icazəsi verin'); return; }
    const r = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!r.canceled) setPhoto(r.assets[0]);
  };

  const pickFromGallery = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (!r.canceled) setPhoto(r.assets[0]);
  };

  const submit = async () => {
    if (!desc.trim())   return Alert.alert('Xəta', 'Problemi qısa izah edin');
    if (!location)      return Alert.alert('Xəta', 'GPS yüklənir, gözləyin');
    setLoading(true);
    try {
      const form = new FormData();
      const fullDesc = cat ? '[' + cat.label + '] ' + desc : desc;
      form.append('description', fullDesc);
      form.append('latitude',    location.latitude.toString());
      form.append('longitude',   location.longitude.toString());
      if (photo) form.append('photo', { uri: photo.uri, type: 'image/jpeg', name: 'report.jpg' });

      const r = await api.post('/reports', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      setAiResult(r.data.ai_result);

      setTimeout(() => {
        setPhoto(null); setDesc(''); setCat(null); setAiResult(null);
        onSuccess?.(r.data);
      }, 2500);
    } catch (e) {
      Alert.alert('Göndərilmədi', e.response?.data?.error || 'Bağlantı xətası');
    } finally { setLoading(false); }
  };

  if (aiResult) return (
    <View style={s.successScreen}>
      <Text style={s.successIcon}>✅</Text>
      <Text style={s.successTitle}>Müraciət qəbul edildi!</Text>
      <Text style={s.successSub}>AI nəticəsi:</Text>
      <View style={s.aiCard}>
        <Row label="Kateqoriya"  value={aiResult.category}   />
        <Row label="Departament" value={aiResult.department} />
        <Row label="Prioritet"   value={aiResult.priority}   />
        {!!aiResult.summary && <Text style={s.aiSummary}>{aiResult.summary}</Text>}
      </View>
      <Text style={s.successHint}>Müraciətlərim ekranına yönləndirilirsən…</Text>
    </View>
  );

  return (
    <ScrollView style={s.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={s.heading}>Müraciət Göndər</Text>
      <Text style={s.headingSub}>Şəhər problemini bildirin, AI avtomatik yönləndirir</Text>

      <Text style={s.label}>Foto (istəyə bağlı)</Text>
      {photo ? (
        <View style={s.previewWrap}>
          <Image source={{ uri: photo.uri }} style={s.preview} />
          <TouchableOpacity style={s.previewClose} onPress={() => setPhoto(null)}>
            <Text style={s.previewCloseText}>✕</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={s.photoRow}>
          <TouchableOpacity style={s.photoSlot} onPress={pickPhoto} activeOpacity={0.8}>
            <Text style={s.photoIcon}>📷</Text>
            <Text style={s.photoText}>Kamera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.photoSlot} onPress={pickFromGallery} activeOpacity={0.8}>
            <Text style={s.photoIcon}>🖼️</Text>
            <Text style={s.photoText}>Qalereya</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={[s.label, { marginTop: 18 }]}>Kateqoriya</Text>
      <View style={s.chipRow}>
        {CATEGORIES.map(c => {
          const active = cat?.id === c.id;
          return (
            <TouchableOpacity
              key={c.id}
              style={[s.chip, active && s.chipActive]}
              onPress={() => setCat(active ? null : c)}
              activeOpacity={0.8}
            >
              <Text style={[s.chipText, active && s.chipTextActive]}>{c.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[s.label, { marginTop: 18 }]}>Problem təsviri *</Text>
      <TextInput
        style={s.textarea}
        placeholder="Problemi qısa izah edin… (məs. Neftçilər prospektindəki yolda böyük çuxur var)"
        placeholderTextColor={C.textMuted}
        value={desc}
        onChangeText={setDesc}
        multiline
      />

      <View style={s.gpsRow}>
        <Text style={s.gpsIcon}>📍</Text>
        <Text style={s.gpsText} numberOfLines={1}>
          {locLoading ? 'GPS müəyyən edilir…'
            : location ? location.latitude.toFixed(5) + ', ' + location.longitude.toFixed(5)
            : 'GPS tapılmadı — yenidən cəhd edin'}
        </Text>
        {!locLoading && (
          <TouchableOpacity onPress={fetchLocation}>
            <Text style={s.gpsRefresh}>↻</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        style={[s.submit, (loading || !desc.trim()) && s.submitDisabled]}
        onPress={submit}
        disabled={loading || !desc.trim()}
        activeOpacity={0.9}
      >
        {loading ? <ActivityIndicator color={C.accentInk} /> : <Text style={s.submitText}>Göndər →</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

function Row({ label, value }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
      <Text style={{ color: C.textMuted, fontSize: 13 }}>{label}:</Text>
      <Text style={{ color: C.text, fontSize: 13, fontWeight: '500' }}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: C.bg },
  heading:      { fontSize: 20, fontWeight: '700', color: '#fff' },
  headingSub:   { fontSize: 12, color: C.textMuted, marginTop: 4, marginBottom: 18 },
  label:        { color: C.textMuted, fontSize: 12, marginBottom: 8 },

  photoRow:     { flexDirection: 'row', gap: 10 },
  photoSlot:    {
    flex: 1, height: 120, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderStyle: 'dashed', borderColor: C.inputBorder, borderRadius: 14,
    backgroundColor: C.card, gap: 4,
  },
  photoIcon:    { fontSize: 22 },
  photoText:    { color: C.textMuted, fontSize: 12 },

  previewWrap:  { position: 'relative' },
  preview:      { width: '100%', height: 180, borderRadius: 14 },
  previewClose: {
    position: 'absolute', top: 8, right: 8,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center',
  },
  previewCloseText: { color: '#fff', fontSize: 12 },

  chipRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:         {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
  },
  chipActive:   { backgroundColor: C.accent, borderColor: C.accent },
  chipText:     { color: C.textDim, fontSize: 12, fontWeight: '500' },
  chipTextActive: { color: C.accentInk, fontWeight: '700' },

  textarea:     {
    backgroundColor: C.input, borderWidth: 1, borderColor: C.inputBorder,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12,
    color: C.text, fontSize: 14, minHeight: 110, textAlignVertical: 'top',
  },

  gpsRow:       {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.input, borderWidth: 1, borderColor: C.border,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    marginTop: 16, marginBottom: 18,
  },
  gpsIcon:      { fontSize: 13 },
  gpsText:      { flex: 1, color: C.textDim, fontSize: 12 },
  gpsRefresh:   { color: C.accent, fontSize: 18, paddingLeft: 6 },

  submit:        { backgroundColor: C.accent, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  submitDisabled:{ opacity: 0.35 },
  submitText:    { color: C.accentInk, fontWeight: '700', fontSize: 14 },

  successScreen: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  successIcon:   { fontSize: 56, marginBottom: 12 },
  successTitle:  { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 4 },
  successSub:    { fontSize: 12, color: C.textMuted, marginBottom: 16 },
  aiCard:        {
    width: '100%', maxWidth: 360,
    backgroundColor: C.input, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, padding: 16,
  },
  aiSummary:     { color: C.textMuted, fontSize: 12, marginTop: 8 },
  successHint:   { color: C.textFaint, fontSize: 11, marginTop: 16 },
});
