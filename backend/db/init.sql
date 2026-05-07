-- BakıFix verilənlər bazası sxemi

-- Departamentlər (sorumlu qurumlar)
CREATE TABLE IF NOT EXISTS departments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  contact_email VARCHAR(100),
  sla_hours INTEGER DEFAULT 72,
  created_at TIMESTAMP DEFAULT NOW()
);

-- İstifadəçilər
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) UNIQUE,
  email VARCHAR(100) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'citizen' CHECK (role IN ('citizen', 'staff', 'admin')),
  department_id INTEGER REFERENCES departments(id),
  expo_push_token VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Problem kateqoriyaları
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(50),
  keywords TEXT[],
  department_id INTEGER REFERENCES departments(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Müraciətlər (əsas cədvəl)
CREATE TABLE IF NOT EXISTS reports (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200),
  description TEXT NOT NULL,
  photo_url VARCHAR(500),
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  address VARCHAR(300),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending','in_progress','resolved','rejected')),
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  category_id INTEGER REFERENCES categories(id),
  department_id INTEGER REFERENCES departments(id),
  user_id INTEGER REFERENCES users(id),
  assigned_to INTEGER REFERENCES users(id),
  sla_deadline TIMESTAMP,
  resolved_at TIMESTAMP,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  ai_suggestion JSONB,
  duplicate_of INTEGER REFERENCES reports(id),
  supporter_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Status dəyişikliyi tarixi
CREATE TABLE IF NOT EXISTS status_history (
  id SERIAL PRIMARY KEY,
  report_id INTEGER REFERENCES reports(id) ON DELETE CASCADE,
  old_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  changed_by INTEGER REFERENCES users(id),
  note TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Eyni problemi dəstəkləyən müraciətlər
CREATE TABLE IF NOT EXISTS report_supporters (
  id SERIAL PRIMARY KEY,
  report_id INTEGER REFERENCES reports(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(report_id, user_id)
);

-- Bildirişlər
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  report_id INTEGER REFERENCES reports(id),
  title VARCHAR(200) NOT NULL,
  body TEXT NOT NULL,
  type VARCHAR(50) CHECK (type IN ('status_update','sla_warning','new_report','weather_alert','duplicate')),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Hava xəbərdarlıqları
CREATE TABLE IF NOT EXISTS weather_alerts (
  id SERIAL PRIMARY KEY,
  alert_type VARCHAR(100) NOT NULL,
  description TEXT,
  severity VARCHAR(20) CHECK (severity IN ('low','medium','high','critical')),
  weather_data JSONB,
  valid_from TIMESTAMP DEFAULT NOW(),
  valid_until TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- İndekslər (sorğuları sürətləndirmək üçün)
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_department ON reports(department_id);
CREATE INDEX IF NOT EXISTS idx_reports_user ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_created ON reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_location ON reports(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);

-- updated_at avtomatik yenilənməsi üçün funksiya
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reports_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================
-- İlkin data
-- =====================

INSERT INTO departments (name, description, contact_email, sla_hours) VALUES
  ('Yollar İdarəsi',      'Yol, asfalt, yol nişanları',         'yollar@bakufix.az',   72),
  ('Kommunal Xidmət',     'Su, kanalizasiya, istilik',           'kommunal@bakufix.az',  24),
  ('Energetika',          'İşıqlandırma, elektrik xətləri',      'energetika@bakufix.az',24),
  ('Abadlıq və Yaşıllıq','Parklar, skamyalar, ağaclar, zibil',  'abadliq@bakufix.az',  48),
  ('Bələdiyyə',           'Ümumi məsələlər, digər problemlər',   'belediyye@bakufix.az', 72)
ON CONFLICT DO NOTHING;

INSERT INTO categories (name, icon, keywords, department_id) VALUES
  ('Yol problemi',       'road',    ARRAY['yol','çala','asfalt','çatlaq','yolun'],  1),
  ('Su/Kanalizasiya',    'water',   ARRAY['su','kanalizasiya','sızma','drenaj'],    2),
  ('İşıqlandırma',       'light',   ARRAY['işıq','fənər','qaranlıq','lampa'],       3),
  ('Abadlıq',            'park',    ARRAY['skamya','park','ağac','zibil','çöp'],    4),
  ('Digər',              'other',   ARRAY['digər','başqa'],                         5)
ON CONFLICT DO NOTHING;
