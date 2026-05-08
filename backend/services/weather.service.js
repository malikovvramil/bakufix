const axios = require('axios');
const pool  = require('../config/db');
const { sendPushToStaff } = require('./notification.service');

const THRESHOLDS = {
  rain:  { param: 'rain',  key: '3h', mm: 10,  dept: [1,2,4], msg: 'Güclü yağış gözlənilir' },
  snow:  { param: 'snow',  key: '3h', mm: 2,   dept: [1,4],   msg: 'Qar yağışı gözlənilir'  },
  wind:  { param: 'wind',  speed: 15, dept: [3,4],            msg: 'Güclü külək gözlənilir'  },
};

function buildAlertDescription(forecast) {
  const items = [];
  if (forecast.rain) items.push(`Yağış: ${forecast.rain.toFixed(1)}mm`);
  if (forecast.snow) items.push(`Qar: ${forecast.snow.toFixed(1)}mm`);
  if (forecast.wind) items.push(`Külək: ${forecast.wind.toFixed(0)}km/s`);
  return items.join(', ') || 'Hava şəraiti dəyişkəndir';
}

async function checkWeatherAlerts(io) {
  const key  = process.env.OPENWEATHER_API_KEY;
  const lat  = process.env.WEATHER_LAT  || 40.3953;
  const lon  = process.env.WEATHER_LON  || 49.8822;

  if (!key) { console.log('⚠️  OpenWeather API key yoxdur, keçilir'); return; }

  const url  = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${key}&units=metric`;
  const resp = await axios.get(url);
  const next12h = resp.data.list.slice(0, 4); // 3h * 4 = 12 saat

  let triggered = false;
  const forecast = { rain: 0, snow: 0, wind: 0, depts: new Set() };

  for (const slot of next12h) {
    if (slot.rain?.['3h'] >= THRESHOLDS.rain.mm)  { forecast.rain += slot.rain['3h']; THRESHOLDS.rain.dept.forEach(d => forecast.depts.add(d)); triggered = true; }
    if (slot.snow?.['3h'] >= THRESHOLDS.snow.mm)  { forecast.snow += slot.snow['3h']; THRESHOLDS.snow.dept.forEach(d => forecast.depts.add(d)); triggered = true; }
    if (slot.wind?.speed * 3.6 >= THRESHOLDS.wind.speed) { forecast.wind = slot.wind.speed * 3.6; THRESHOLDS.wind.dept.forEach(d => forecast.depts.add(d)); triggered = true; }
  }

  if (!triggered) return;

  const desc     = buildAlertDescription(forecast);
  const severity = forecast.rain > 30 || forecast.snow > 10 ? 'high' : 'medium';
  const validUntil = new Date(Date.now() + 12 * 3600 * 1000);

  // Set is not JSON-serializable — convert to array for both DB storage and push targeting.
  const deptsArr   = [...forecast.depts];
  const dataForDb  = { rain: forecast.rain, snow: forecast.snow, wind: forecast.wind, depts: deptsArr };

  const { rows } = await pool.query(
    `INSERT INTO weather_alerts (alert_type, description, severity, weather_data, valid_until)
     VALUES ($1,$2,$3,$4,$5) RETURNING id`,
    ['forecast_alert', desc, severity, JSON.stringify(dataForDb), validUntil]
  );

  if (io && rows.length) io.to('admin').emit('weather_alert', { id: rows[0].id, desc, severity });
  await sendPushToStaff(deptsArr, `Preventiv Xəbərdarlıq`, desc);
  console.log(`🌧  Hava xəbərdarlığı: ${desc}`);
}

module.exports = { checkWeatherAlerts };
