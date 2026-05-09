import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import api, { getToken, removeToken } from './src/lib/api';
import { C } from './src/lib/theme';
import LoginScreen     from './src/screens/LoginScreen';
import NewReportScreen from './src/screens/NewReportScreen';
import MyReportsScreen from './src/screens/MyReportsScreen';
import MapScreen       from './src/screens/MapScreen';

export default function App() {
  const [user,    setUser]    = useState(null);
  const [tab,     setTab]     = useState('new');
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    (async () => {
      const t = await getToken();
      if (t) {
        try {
          const r = await api.get('/auth/me');
          setUser(r.data);
        } catch {
          await removeToken();
          setUser(null);
        }
      }
      setChecked(true);
    })();
  }, []);

  const isAdmin = user?.role === 'admin' || user?.role === 'staff';

  useEffect(() => {
    if (isAdmin && tab === 'new') setTab('reports');
  }, [isAdmin, tab]);

  if (!checked) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  if (!user)    return <LoginScreen onLogin={(u) => setUser(u)} />;

  const TABS = isAdmin
    ? [
        { key: 'reports', icon: '📋', label: 'Müraciətlər' },
        { key: 'map',     icon: '🗺️', label: 'Xəritə' },
      ]
    : [
        { key: 'new', icon: '✍️', label: 'Müraciət et' },
        { key: 'my',  icon: '📋', label: 'Mənimkilər' },
        { key: 'map', icon: '🗺️', label: 'Xəritə' },
      ];

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <View style={s.header}>
        <View style={s.brand}>
          <View style={s.dot} />
          <Text style={s.brandName}>BakıFix</Text>
          <Text style={s.brandSlash}>/</Text>
          <Text style={s.brandSub}>{isAdmin ? 'Admin' : 'Vətəndaş'}</Text>
        </View>
        <TouchableOpacity onPress={() => { removeToken(); setUser(null); }}>
          <Text style={s.logout}>Çıxış</Text>
        </TouchableOpacity>
      </View>

      <View style={s.content}>
        {isAdmin ? (
          <>
            {tab === 'reports' && <MyReportsScreen admin={true} />}
            {tab === 'map'     && <MapScreen />}
          </>
        ) : (
          <>
            {tab === 'new' && <NewReportScreen onSuccess={() => setTab('my')} />}
            {tab === 'my'  && <MyReportsScreen />}
            {tab === 'map' && <MapScreen />}
          </>
        )}
      </View>

      <View style={s.tabBar}>
        {TABS.map(t => {
          const active = tab === t.key;
          return (
            <TouchableOpacity key={t.key} style={s.tabItem} onPress={() => setTab(t.key)} activeOpacity={0.7}>
              <Text style={[s.tabIcon, !active && s.tabIconDim]}>{t.icon}</Text>
              <Text style={[s.tabLabel, active && s.tabLabelActive]}>{t.label}</Text>
              <View style={[s.tabUnderline, active && s.tabUnderlineActive]} />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root:           { flex: 1, backgroundColor: C.bg },
  header:         {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12,
    backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  brand:          { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot:            { width: 8, height: 8, borderRadius: 4, backgroundColor: C.accent },
  brandName:      { color: '#fff', fontWeight: '600', fontSize: 14 },
  brandSlash:     { color: C.textGhost, fontSize: 14, marginHorizontal: 2 },
  brandSub:       { color: C.textDim, fontSize: 13 },
  logout:         { color: C.textMuted, fontSize: 13 },
  content:        { flex: 1 },
  tabBar:         {
    flexDirection: 'row', backgroundColor: C.card,
    borderTopWidth: 1, borderTopColor: C.border, paddingBottom: 18,
  },
  tabItem:        { flex: 1, alignItems: 'center', paddingTop: 10 },
  tabIcon:        { fontSize: 18, marginBottom: 3 },
  tabIconDim:     { opacity: 0.55 },
  tabLabel:       { color: C.textMuted, fontSize: 11, fontWeight: '500' },
  tabLabelActive: { color: '#fff' },
  tabUnderline:   { width: 22, height: 2, marginTop: 6, borderRadius: 1, backgroundColor: 'transparent' },
  tabUnderlineActive: { backgroundColor: C.accent },
});
