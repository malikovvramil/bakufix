import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import api, { setToken } from '../lib/api';
import { C } from '../lib/theme';

export default function LoginScreen({ onLogin }) {
  const [form, setForm]       = useState({ identifier: '', password: '' });
  const [loading, setLoading] = useState(false);

  const login = async () => {
    if (!form.identifier || !form.password) return Alert.alert('Xəta', 'Bütün sahələri doldurun');
    setLoading(true);
    try {
      const r = await api.post('/auth/login', { phone: form.identifier, password: form.password });
      await setToken(r.data.token);
      onLogin(r.data.user);
    } catch (e) {
      Alert.alert('Giriş uğursuz', e.response?.data?.error || 'Bağlantı xətası');
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={s.brand}>
        <View style={s.dot} />
        <Text style={s.brandName}>BakıFix</Text>
      </View>
      <Text style={s.subtitle}>Vətəndaş Portalı</Text>

      <View style={s.card}>
        <Text style={s.label}>Telefon və ya email</Text>
        <TextInput
          style={s.input}
          placeholder="050 123 45 67"
          placeholderTextColor={C.textMuted}
          value={form.identifier}
          onChangeText={t => setForm(p => ({ ...p, identifier: t }))}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={[s.label, { marginTop: 14 }]}>Şifrə</Text>
        <TextInput
          style={s.input}
          placeholder="••••••••"
          placeholderTextColor={C.textMuted}
          value={form.password}
          onChangeText={t => setForm(p => ({ ...p, password: t }))}
          secureTextEntry
        />

        <TouchableOpacity
          style={[s.btn, loading && s.btnDisabled]}
          onPress={login}
          disabled={loading}
          activeOpacity={0.85}
        >
          <Text style={s.btnText}>{loading ? 'Gözləyin…' : 'Daxil ol'}</Text>
        </TouchableOpacity>
      </View>

      <Text style={s.hint}>Hələ hesabın yoxdur? Yeni hesab yaratmaq üçün admindən soruş.</Text>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  brand:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  dot:       { width: 10, height: 10, borderRadius: 5, backgroundColor: C.accent },
  brandName: { color: '#fff', fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  subtitle:  { fontSize: 13, color: C.textMuted, marginBottom: 32 },
  card:      { width: '100%', maxWidth: 360, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 22 },
  label:     { color: C.textDim, fontSize: 12, marginBottom: 6 },
  input:     {
    backgroundColor: C.input, borderWidth: 1, borderColor: C.inputBorder,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11,
    color: C.text, fontSize: 14,
  },
  btn:        { backgroundColor: C.accent, borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 22 },
  btnDisabled:{ opacity: 0.5 },
  btnText:    { color: C.accentInk, fontWeight: '700', fontSize: 14 },
  hint:       { color: C.textFaint, fontSize: 11, marginTop: 22, textAlign: 'center' },
});
