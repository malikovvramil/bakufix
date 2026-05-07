# BakıFix — Rəqəmsal Problem İdarəetmə Platforması

## Layihə strukturu

```
/backend    → Node.js + Express API
/dashboard  → Next.js Admin + İctimai panel
/mobile     → React Native + Expo tətbiqi
```

## Sürətli başlanğıc

### 1. Backend
```bash
cd backend
cp .env.example .env
# .env faylında öz key-lərinizi yazın
npm install
npm run db:init   # DB cədvəllərini yarat
npm run dev       # http://localhost:5000
```

### 2. Dashboard
```bash
cd dashboard
cp .env.local.example .env.local
npm install
npm run dev       # http://localhost:3000
```

### 3. Mobile
```bash
cd mobile
npm install
# src/lib/api.js faylında API_URL-i dəyişin
npx expo start    # QR kodu Expo Go ilə oxuyun
```

## API Endpointləri

| Method | URL | Açıqlama |
|--------|-----|---------|
| POST | /api/auth/register | Qeydiyyat |
| POST | /api/auth/login | Giriş |
| GET  | /api/reports/map | İctimai xəritə datası |
| GET  | /api/reports | Müraciətlər (auth) |
| POST | /api/reports | Yeni müraciət (foto + GPS) |
| PATCH| /api/reports/:id/status | Status dəyiş (staff/admin) |
| POST | /api/reports/:id/rate | Qiymətləndirmə (citizen) |
| GET  | /api/dashboard/stats | Admin statistika |
| GET  | /api/dashboard/heatmap | Istilik xəritəsi datası |
| GET  | /api/dashboard/weather-alerts | Aktiv hava xəbərdarlıqları |
| POST | /api/weather/check | Manual hava yoxlaması (admin) |

## AI rejimi
- Default: Mock (açar söz əsaslı, pulsuz)
- Real AI üçün: `.env`-də `USE_REAL_AI=true` + `ANTHROPIC_API_KEY` əlavə et
