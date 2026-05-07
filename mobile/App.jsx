import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { getToken, removeToken } from './src/lib/api';
import LoginScreen    from './src/screens/LoginScreen';
import NewReportScreen from './src/screens/NewReportScreen';
import MyReportsScreen from './src/screens/MyReportsScreen';

export default function App() {
  const [user,   setUser]   = useState(null);
  const [tab,    setTab]    = useState('new');
  const [checked,setChecked]= useState(false);

  useEffect(() => {
    getToken().then(t => { if (t) setUser({ loaded: true }); setChecked(true); });
  }, []);

  const isAdmin = user?.role === 'admin';

  if (!checked) return <View style={{ flex:1, backgroundColor:'#111827' }} />;
  if (!user)    return <LoginScreen onLogin={(u) => setUser(u)} />;

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#111827" />
      <View style={s.header}>
        <Text style={s.logo}>🏙️ BakıFix</Text>
        <TouchableOpacity onPress={() => { removeToken(); setUser(null); }}>
          <Text style={s.logout}>Çıxış</Text>
        </TouchableOpacity>
      </View>

      <View style={s.content}>
        {isAdmin ? (
          <MyReportsScreen admin={true} />
        ) : (
          <>
            {tab === 'new' && <NewReportScreen onSuccess={() => setTab('my')} />}
            {tab === 'my'  && <MyReportsScreen />}
          </>
        )}
      </View>

      {!isAdmin && (
        <View style={s.tabBar}>
          {[
            { key:'new', icon:'✍️', label:'Yeni Müraciət' },
            { key:'my',  icon:'📋', label:'Müraciətlərim' },
          ].map(t => (
            <TouchableOpacity key={t.key} style={s.tabItem} onPress={() => setTab(t.key)}>
              <Text style={s.tabIcon}>{t.icon}</Text>
              <Text style={[s.tabLabel, tab===t.key && s.tabActive]}>{t.label}</Text>
              {tab===t.key && <View style={s.tabDot}/>}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root:      { flex:1, backgroundColor:'#111827' },
  header:    { flexDirection:'row', alignItems:'center', justifyContent:'space-between', padding:16, paddingTop:52, backgroundColor:'#1F2937', borderBottomWidth:1, borderBottomColor:'#374151' },
  logo:      { fontSize:18, fontWeight:'700', color:'#fff' },
  logout:    { color:'#9CA3AF', fontSize:14 },
  content:   { flex:1 },
  tabBar:    { flexDirection:'row', backgroundColor:'#1F2937', borderTopWidth:1, borderTopColor:'#374151', paddingBottom:24 },
  tabItem:   { flex:1, alignItems:'center', paddingTop:10, paddingBottom:4 },
  tabIcon:   { fontSize:22, marginBottom:3 },
  tabLabel:  { color:'#6B7280', fontSize:11 },
  tabActive: { color:'#F5A623', fontWeight:'600' },
  tabDot:    { width:4, height:4, borderRadius:2, backgroundColor:'#F5A623', marginTop:4 },
});
