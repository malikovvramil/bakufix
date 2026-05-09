// Veb panellərlə eyni vizual dil — bütün rənglər və ölçülər burada cəmləşir.
// (Same visual language as the web dashboards — single source of truth.)

export const C = {
  // Səthlər
  bg:          '#111111',
  card:        '#161616',
  cardHover:   '#1a1a1a',
  border:      '#222222',
  borderSoft:  '#1a1a1a',
  borderHover: '#333333',
  input:       '#1a1a1a',
  inputBorder: '#333333',

  // Tipoqrafiya
  text:        '#e5e5e5',
  textDim:     '#888888',
  textMuted:   '#555555',
  textFaint:   '#444444',
  textGhost:   '#333333',

  // Brend
  accent:      '#F5A623',
  accentInk:   '#000000',

  // Status
  pending:     '#F59E0B',
  in_progress: '#3B82F6',
  resolved:    '#10B981',
  rejected:    '#EF4444',

  // Prioritet
  prio_low:      '#9CA3AF',
  prio_medium:   '#F59E0B',
  prio_high:     '#F97316',
  prio_critical: '#EF4444',
};

export const STATUS_AZ   = { pending:'Gözləyir', in_progress:'İcrada', resolved:'Həll edildi', rejected:'Rədd edildi' };
export const PRIORITY_AZ = { low:'Aşağı',        medium:'Orta',       high:'Yüksək',          critical:'Kritik' };

// Veb-dəki .status-* badge-ləri ilə eyni: yarımşəffaf fon + matching ramka.
export const statusBadge = (status) => {
  const map = {
    pending:     { bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.30)', fg: C.pending     },
    in_progress: { bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.30)', fg: C.in_progress },
    resolved:    { bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.30)', fg: C.resolved    },
    rejected:    { bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.30)',  fg: C.rejected    },
  };
  const t = map[status] || map.pending;
  return {
    backgroundColor: t.bg,
    borderColor:     t.border,
    color:           t.fg,
    borderWidth:     1,
    borderRadius:    6,
    paddingHorizontal: 8,
    paddingVertical:   2,
    fontSize:    11,
    fontWeight: '600',
    overflow: 'hidden',
  };
};

export const priorityBadge = (priority) => {
  const map = {
    low:      { bg: 'rgba(107,114,128,0.15)', border: 'rgba(107,114,128,0.20)', fg: C.prio_low      },
    medium:   { bg: 'rgba(245,158,11,0.15)',  border: 'rgba(245,158,11,0.30)',  fg: C.prio_medium   },
    high:     { bg: 'rgba(249,115,22,0.15)',  border: 'rgba(249,115,22,0.30)',  fg: C.prio_high     },
    critical: { bg: 'rgba(239,68,68,0.15)',   border: 'rgba(239,68,68,0.30)',   fg: C.prio_critical },
  };
  const t = map[priority] || map.low;
  return {
    backgroundColor: t.bg,
    borderColor:     t.border,
    color:           t.fg,
    borderWidth:     1,
    borderRadius:    6,
    paddingHorizontal: 8,
    paddingVertical:   2,
    fontSize:    11,
    fontWeight: '600',
    overflow: 'hidden',
  };
};

// Sıra solunda nazik status xətti (web-dəki .row-* utilitləri).
export const rowAccentColor = (status) => {
  const m = { pending: C.pending, in_progress: C.in_progress, resolved: C.resolved, rejected: C.rejected };
  return m[status] || C.borderSoft;
};
