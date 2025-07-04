-- إنشاء جداول جلسات المختبرات في Supabase

-- جدول جلسات المختبر
CREATE TABLE IF NOT EXISTS lab_sessions (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  lab_id INTEGER REFERENCES labs(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'starting' CHECK (status IN ('starting', 'running', 'stopped', 'expired', 'error')),
  started_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  container_id TEXT,
  portainer_stack_id TEXT,
  vpn_config JSONB,
  guacamole_config JSONB,
  network_config JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول أجهزة الجلسة
CREATE TABLE IF NOT EXISTS lab_session_devices (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  session_id TEXT REFERENCES lab_sessions(id) ON DELETE CASCADE,
  device_id TEXT REFERENCES lab_devices(id) ON DELETE CASCADE,
  container_name TEXT,
  container_id TEXT,
  ip_address TEXT,
  port_mappings JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'starting' CHECK (status IN ('starting', 'running', 'stopped', 'error')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_lab_sessions_user_id ON lab_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_lab_sessions_lab_id ON lab_sessions(lab_id);
CREATE INDEX IF NOT EXISTS idx_lab_sessions_status ON lab_sessions(status);
CREATE INDEX IF NOT EXISTS idx_lab_sessions_expires_at ON lab_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_lab_session_devices_session_id ON lab_session_devices(session_id);
CREATE INDEX IF NOT EXISTS idx_lab_session_devices_device_id ON lab_session_devices(device_id);

-- تفعيل Row Level Security
ALTER TABLE lab_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_session_devices ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان لجلسات المختبر
DROP POLICY IF EXISTS "Users can view their own lab sessions" ON lab_sessions;
CREATE POLICY "Users can view their own lab sessions" ON lab_sessions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own lab sessions" ON lab_sessions;
CREATE POLICY "Users can create their own lab sessions" ON lab_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own lab sessions" ON lab_sessions;
CREATE POLICY "Users can update their own lab sessions" ON lab_sessions
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own lab sessions" ON lab_sessions;
CREATE POLICY "Users can delete their own lab sessions" ON lab_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- سياسات الأمان لأجهزة الجلسة
DROP POLICY IF EXISTS "Users can view their session devices" ON lab_session_devices;
CREATE POLICY "Users can view their session devices" ON lab_session_devices
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lab_sessions 
      WHERE lab_sessions.id = lab_session_devices.session_id 
      AND lab_sessions.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create session devices" ON lab_session_devices;
CREATE POLICY "Users can create session devices" ON lab_session_devices
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM lab_sessions 
      WHERE lab_sessions.id = lab_session_devices.session_id 
      AND lab_sessions.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update session devices" ON lab_session_devices;
CREATE POLICY "Users can update session devices" ON lab_session_devices
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM lab_sessions 
      WHERE lab_sessions.id = lab_session_devices.session_id 
      AND lab_sessions.user_id = auth.uid()
    )
  );

-- إنشاء bucket للتخزين
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lab-files',
  'lab-files',
  true,
  52428800, -- 50MB
  ARRAY[
    'text/plain',
    'application/x-openvpn-profile',
    'application/octet-stream',
    'text/ovpn'
  ]
) ON CONFLICT (id) DO NOTHING;

-- سياسات التخزين
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects
  FOR SELECT USING (bucket_id = 'lab-files');

DROP POLICY IF EXISTS "Authenticated users can upload lab files" ON storage.objects;
CREATE POLICY "Authenticated users can upload lab files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'lab-files' 
    AND auth.role() = 'authenticated'
  );

-- دالة لتحديث updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- trigger لتحديث updated_at
DROP TRIGGER IF EXISTS update_lab_sessions_updated_at ON lab_sessions;
CREATE TRIGGER update_lab_sessions_updated_at
    BEFORE UPDATE ON lab_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- دالة لتنظيف الجلسات المنتهية
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  UPDATE lab_sessions 
  SET status = 'expired' 
  WHERE expires_at < NOW() 
  AND status IN ('starting', 'running');
END;
$$ LANGUAGE plpgsql;

-- جدولة تنظيف الجلسات (يجب تشغيلها يدوياً أو عبر cron job)
-- SELECT cleanup_expired_sessions(); 