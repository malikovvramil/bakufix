/**
 * AI Kateqoriyalaşdırma Servisi
 * Development: Mock (açar söz əsaslı)
 * Production: Claude Haiku API
 * USE_REAL_AI=true olarsa Claude API işlədilir
 */

const axios = require('axios');

const DEPARTMENTS = {
  yol:      { id: 1, name: 'Yollar İdarəsi' },
  su:       { id: 2, name: 'Kommunal Xidmət' },
  isiq:     { id: 3, name: 'Energetika' },
  abadliq:  { id: 4, name: 'Abadlıq və Yaşıllıq' },
  diger:    { id: 5, name: 'Bələdiyyə' },
};

const KEYWORD_MAP = [
  { keys: ['yol','çala','asfalt','çatlaq','nişan','dayanacaq'],            category: 'Yol problemi',    priority: 'high',   dept: 'yol',     catId: 1 },
  { keys: ['su','kanalizasiya','sızma','axın','drenaj','boru'],            category: 'Su/Kanalizasiya', priority: 'high',   dept: 'su',      catId: 2 },
  { keys: ['işıq','fənər','qaranlıq','lampa','elektrik','aydınlat'],       category: 'İşıqlandırma',    priority: 'medium', dept: 'isiq',    catId: 3 },
  { keys: ['skamya','park','ağac','zibil','çöp','yarpaq','gül','həyət'],   category: 'Abadlıq',         priority: 'low',    dept: 'abadliq', catId: 4 },
];

function mockAnalyze(text) {
  const lower = (text || '').toLowerCase();
  for (const rule of KEYWORD_MAP) {
    if (rule.keys.some(k => lower.includes(k))) {
      return {
        category:    rule.category,
        priority:    rule.priority,
        department:  DEPARTMENTS[rule.dept].name,
        departmentId: DEPARTMENTS[rule.dept].id,
        categoryId:  rule.catId,
        confidence:  'keyword_match',
        summary:     `${rule.category} problemi aşkarlandı.`,
      };
    }
  }
  return {
    category: 'Digər', priority: 'low',
    department: DEPARTMENTS.diger.name, departmentId: 5, categoryId: 5,
    confidence: 'default', summary: 'Kateqoriya müəyyən edilmədi, ümumi bölməyə göndərildi.',
  };
}

async function realAnalyze(description, photoUrl) {
  const content = [
    { type: 'text', text: `Şəhər infrastruktur problemi haqqında müraciət: "${description}". Aşağıdakı JSON formatında cavab ver:
{
  "category": "Yol problemi | Su/Kanalizasiya | İşıqlandırma | Abadlıq | Digər",
  "priority": "low | medium | high | critical",
  "departmentId": 1-5,
  "department": "departament adı",
  "categoryId": 1-5,
  "summary": "1 cümlə izah"
}` }
  ];
  if (photoUrl) content.push({ type: 'image', source: { type: 'url', url: photoUrl } });

  const resp = await axios.post('https://api.anthropic.com/v1/messages', {
    model: 'claude-haiku-4-5',
    max_tokens: 256,
    messages: [{ role: 'user', content }],
  }, {
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
  });

  try {
    const raw = resp.data.content[0].text;
    const json = JSON.parse(raw.match(/\{[\s\S]*\}/)[0]);
    return { ...json, confidence: 'claude_api' };
  } catch {
    return mockAnalyze(description);
  }
}

async function analyzeReport(description, photoUrl) {
  if (process.env.USE_REAL_AI === 'true' && process.env.ANTHROPIC_API_KEY) {
    try { return await realAnalyze(description, photoUrl); } catch { return mockAnalyze(description); }
  }
  return mockAnalyze(description);
}

async function checkDuplicate(newReport, existingReports) {
  if (!existingReports.length) return null;
  const similar = existingReports.find(r => {
    const dist = Math.hypot(r.latitude - newReport.latitude, r.longitude - newReport.longitude);
    return dist < 0.001 && r.category_id === newReport.category_id;
  });
  return similar ? similar.id : null;
}

module.exports = { analyzeReport, checkDuplicate };
