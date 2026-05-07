import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import api, { setToken } from '../lib/api';

export default function LoginScreen({ onLogin }) {
  const [form, setForm]     = useState({ identifier: '', password: '' });
  const [loading, setLoading] = useState(false);

  const login = async () => {
    if (!form.identifier || !form.password) return Alert.alert('Xəta', 'Bütün sahələri doldurun');
    setLoading(true);
    try {
      const r = await api.post('/auth/login', { phone: form.identifier, email: form.identifier, password: form.password });
      await setToken(r.data.token);
      onLogin(r.data.user);
    } catch (e) {
      Alert.alert('Giriş uğursuz', e.response?.data?.error || 'Bağlantı xətası');
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS==='ios'?'padding':'height'}>
      <Text style={s.logo}>🏙️</Text>
      <Text style={s.title}>BakıFix</Text>
      <Text style={s.subtitle}>Vətəndaş Portalı</Text>
      <View style={s.card}>
        <TextInput style={s.input} placeholder="Telefon və ya email" value={form.identifier}
          onChangeText={t => setForm(p=>({...p,identifier:t}))} keyboardType="email-address" autoCapitalize="none" />
        <TextInput style={s.input} placeholder="Şifrə" value={form.password} secureTextEntry
          onChangeText={t => setForm(p=>({...p,password:t}))} />
        <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} onPress={login} disabled={loading}>
          <Text style={s.btnText}>{loading ? 'Gözləyin...' : 'Daxil ol'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex:1, backgroundColor:'#111827', alignItems:'center', justifyContent:'center', padding:24 },
  logo:      { fontSize:56, marginBottom:8 },
  title:     { fontSize:28, fontWeight:'700', color:'#fff', marginBottom:4 },
  subtitle:  { fontSize:14, color:'#9CA3AF', marginBottom:32 },
  card:      { width:'100%', backgroundColor:'#1F2937', borderRadius:16, padding:20, gap:12 },
  input:     { backgroundColor:'#374151', borderRadius:10, paddingHorizontal:14, paddingVertical:12, color:'#fff', fontSize:15 },
  btn:       { backgroundColor:'#F5A623', borderRadius:10, paddingVertical:14, alignItems:'center', marginTop:4 },
  btnDisabled: { opacity:0.6 },
  btnText:   { color:'#000', fontWeight:'700', fontSize:16 },
});
