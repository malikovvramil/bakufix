import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet, Alert, ScrollView, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import api from '../lib/api';

const CATEGORIES = [
  { id:1, label:'🛣️ Yol',          key:'yol' },
  { id:2, label:'💧 Su/Kanalizasiya', key:'su' },
  { id:3, label:'💡 İşıq',          key:'isiq' },
  { id:4, label:'🌳 Abadlıq',       key:'abadliq' },
  { id:5, label:'📋 Digər',         key:'diger' },
];

export default function NewReportScreen({ onSuccess }) {
  const [photo,    setPhoto]   = useState(null);
  const [desc,     setDesc]    = useState('');
  const [cat,      setCat]     = useState(null);
  const [location, setLocation]= useState(null);
  const [loading,  setLoading] = useState(false);
  const [locLoading, setLocLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);

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
    const r = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (!r.canceled) setPhoto(r.assets[0]);
  };

  const pickFromGallery = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (!r.canceled) setPhoto(r.assets[0]);
  };

  const submit = async () => {
    if (!desc.trim()) return Alert.alert('Xəta', 'Problemi qısa izah edin');
    if (!location)    return Alert.alert('Xəta', 'GPS yüklənmir, gözləyin');
    setLoading(true);
    try {
      const form = new FormData();
      form.append('description', desc);
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
    <View style={s.successContainer}>
      <Text style={s.successIcon}>✅</Text>
      <Text style={s.successTitle}>Müraciət qəbul edildi!</Text>
      <View style={s.aiCard}>
        <Text style={s.aiLabel}>AI nəticəsi:</Text>
        <Text style={s.aiText}>📂 {aiResult.category}</Text>
        <Text style={s.aiText}>🏢 {aiResult.department}</Text>
        <Text style={s.aiText}>⚡ Prioritet: {aiResult.priority}</Text>
        <Text style={[s.aiText, {color:'#9CA3AF', marginTop:4}]}>{aiResult.summary}</Text>
      </View>
    </View>
  );

  return (
    <ScrollView style={s.container} contentContainerStyle={{padding:16, paddingBottom:40}}>
      <Text style={s.heading}>Yeni Müraciət</Text>

      {/* Foto */}
      <View style={s.photoRow}>
        <TouchableOpacity style={s.photoBtn} onPress={pickPhoto}>
          <Text style={s.photoBtnIcon}>📷</Text>
          <Text style={s.photoBtnText}>Kamera</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.photoBtn} onPress={pickFromGallery}>
          <Text style={s.photoBtnIcon}>🖼️</Text>
          <Text style={s.photoBtnText}>Qalereyadan</Text>
        </TouchableOpacity>
      </View>
      {photo && <Image source={{ uri: photo.uri }} style={s.preview} />}

      {/* Kateqoriya */}
      <Text style={s.label}>Kateqoriya</Text>
      <View style={s.catRow}>
        {CATEGORIES.map(c => (
          <TouchableOpacity key={c.id} style={[s.catChip, cat?.id===c.id && s.catActive]} onPress={() => setCat(c)}>
            <Text style={[s.catText, cat?.id===c.id && s.catTextActive]}>{c.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Açıqlama */}
      <Text style={s.label}>Problem təsviri</Text>
      <TextInput style={s.textarea} placeholder="Problemi qısa izah edin..." placeholderTextColor="#6B7280"
        value={desc} onChangeText={setDesc} multiline numberOfLines={4} />

      {/* GPS */}
      <View style={s.gpsRow}>
        <Text style={s.gpsText}>
          {locLoading ? '📍 GPS müəyyən edilir...' : location ? `📍 ${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}` : '❌ GPS tapılmadı'}
        </Text>
        {!locLoading && <TouchableOpacity onPress={fetchLocation}><Text style={s.gpsRefresh}>↻</Text></TouchableOpacity>}
      </View>

      <TouchableOpacity style={[s.submitBtn, loading && s.submitDisabled]} onPress={submit} disabled={loading}>
        {loading ? <ActivityIndicator color="#000" /> : <Text style={s.submitText}>Göndər →</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:         { flex:1, backgroundColor:'#111827' },
  heading:           { fontSize:22, fontWeight:'700', color:'#fff', marginBottom:16 },
  photoRow:          { flexDirection:'row', gap:10, marginBottom:12 },
  photoBtn:          { flex:1, backgroundColor:'#1F2937', borderRadius:12, padding:16, alignItems:'center', borderWidth:1, borderColor:'#374151' },
  photoBtnIcon:      { fontSize:24, marginBottom:4 },
  photoBtnText:      { color:'#9CA3AF', fontSize:13 },
  preview:           { width:'100%', height:180, borderRadius:12, marginBottom:16, resizeMode:'cover' },
  label:             { color:'#D1D5DB', fontSize:14, fontWeight:'600', marginBottom:8, marginTop:4 },
  catRow:            { flexDirection:'row', flexWrap:'wrap', gap:8, marginBottom:16 },
  catChip:           { backgroundColor:'#1F2937', borderRadius:20, paddingHorizontal:12, paddingVertical:7, borderWidth:1, borderColor:'#374151' },
  catActive:         { backgroundColor:'#F5A623', borderColor:'#F5A623' },
  catText:           { color:'#D1D5DB', fontSize:13 },
  catTextActive:     { color:'#000', fontWeight:'600' },
  textarea:          { backgroundColor:'#1F2937', borderRadius:12, padding:14, color:'#fff', fontSize:15, textAlignVertical:'top', minHeight:100, marginBottom:12, borderWidth:1, borderColor:'#374151' },
  gpsRow:            { flexDirection:'row', alignItems:'center', justifyContent:'space-between', backgroundColor:'#1F2937', borderRadius:10, paddingHorizontal:14, paddingVertical:10, marginBottom:20 },
  gpsText:           { color:'#9CA3AF', fontSize:12, flex:1 },
  gpsRefresh:        { color:'#F5A623', fontSize:20, paddingLeft:8 },
  submitBtn:         { backgroundColor:'#F5A623', borderRadius:14, paddingVertical:16, alignItems:'center' },
  submitDisabled:    { opacity:0.5 },
  submitText:        { color:'#000', fontWeight:'700', fontSize:17 },
  successContainer:  { flex:1, backgroundColor:'#111827', alignItems:'center', justifyContent:'center', padding:24 },
  successIcon:       { fontSize:64, marginBottom:16 },
  successTitle:      { fontSize:24, fontWeight:'700', color:'#fff', marginBottom:20 },
  aiCard:            { backgroundColor:'#1F2937', borderRadius:16, padding:20, width:'100%', gap:6 },
  aiLabel:           { color:'#F5A623', fontWeight:'700', marginBottom:4 },
  aiText:            { color:'#E5E7EB', fontSize:15 },
});
