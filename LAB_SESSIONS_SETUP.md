# دليل إعداد جلسات المختبرات

## نظرة عامة
تم إضافة نظام جلسات المختبرات الذي يتيح للمستخدمين:
- إنشاء جلسة مختبر تلقائياً عند الدخول
- الاتصال عبر OpenVPN
- الاتصال عبر Guacamole (VNC/SSH)
- إدارة الجلسة (تمديد، إيقاف)
- تنظيف تلقائي للجلسات المنتهية

## المتطلبات

### 1. قاعدة البيانات (Supabase)
- تشغيل سكريبت `database-setup.sql` في Supabase SQL Editor
- إنشاء bucket `lab-files` في Storage

### 2. Portainer
- تثبيت Portainer على السيرفر
- إعداد Docker Swarm أو Docker Standalone
- إنشاء مستخدم وإعداد API Key

### 3. Guacamole
- تثبيت Apache Guacamole
- إعداد قاعدة البيانات (PostgreSQL/MySQL)
- إنشاء مستخدم وإعداد API

### 4. متغيرات البيئة
أضف الملف `.env.local` مع المتغيرات التالية:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Portainer Configuration
NEXT_PUBLIC_PORTAINER_URL=http://your-portainer-server:9000
PORTAINER_USERNAME=admin
PORTAINER_PASSWORD=your_portainer_password
PORTAINER_ENDPOINT_ID=1

# Guacamole Configuration
NEXT_PUBLIC_GUACAMOLE_URL=http://your-guacamole-server:8080/guacamole
GUACAMOLE_USERNAME=guacadmin
GUACAMOLE_PASSWORD=your_guacamole_password
GUACAMOLE_DATA_SOURCE=postgresql

# Lab Session Configuration
LAB_SESSION_DURATION_HOURS=1
MAX_CONCURRENT_SESSIONS=5
CLEANUP_INTERVAL_MINUTES=30
```

## خطوات التثبيت

### 1. إعداد قاعدة البيانات
```sql
-- تشغيل سكريبت database-setup.sql في Supabase
```

### 2. إعداد Portainer
1. تثبيت Portainer:
```bash
docker run -d -p 9000:9000 --name=portainer --restart=always -v /var/run/docker.sock:/var/run/docker.sock -v portainer_data:/data portainer/portainer-ce:latest
```

2. الوصول إلى Portainer عبر `http://your-server:9000`
3. إنشاء حساب admin
4. إضافة Docker endpoint
5. إنشاء API Key من Settings > Access Tokens

### 3. إعداد Guacamole
1. تثبيت Guacamole باستخدام Docker Compose:
```yaml
version: '3.8'
services:
  guacamole:
    image: guacamole/guacamole:latest
    ports:
      - "8080:8080"
    environment:
      GUACD_HOSTNAME: guacd
    depends_on:
      - guacd
      - postgres

  guacd:
    image: guacamole/guacd:latest
    ports:
      - "4822:4822"

  postgres:
    image: postgres:13
    environment:
      POSTGRES_DB: guacamole_db
      POSTGRES_USER: guacamole_user
      POSTGRES_PASSWORD: guacamole_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./initdb.sql:/docker-entrypoint-initdb.d/initdb.sql

volumes:
  postgres_data:
```

2. الوصول إلى Guacamole عبر `http://your-server:8080/guacamole`
3. تسجيل الدخول بـ `guacadmin/guacadmin`
4. تغيير كلمة المرور

### 4. إعداد صور Docker للأجهزة
تأكد من وجود الصور التالية في Docker registry:
- `ubuntu:20.04` للخوادم والكمبيوترات
- `pfsense/pfsense:latest` للراوترات
- `openvswitch/ovs:latest` للسويتشات
- `mysql:8.0` لقواعد البيانات
- `hostapd/hostapd:latest` لنقاط الواي فاي

## كيفية الاستخدام

### 1. للمستخدمين
1. الدخول إلى صفحة المختبر
2. سيتم إنشاء جلسة تلقائياً
3. انتظار بدء الحاويات (2-3 دقائق)
4. تحميل ملف OpenVPN أو الدخول عبر Guacamole

### 2. للمطورين
- تعديل إعدادات الجلسة في `lib/lab-sessions.ts`
- إضافة أنواع أجهزة جديدة في `getDeviceImage()`
- تخصيص واجهة المستخدم في `app/lab/[labId]/page.tsx`

## استكشاف الأخطاء

### مشاكل شائعة:
1. **فشل في إنشاء الجلسة**: تحقق من إعدادات Portainer و API Key
2. **عدم ظهور روابط الاتصال**: تحقق من إعدادات Guacamole
3. **فشل في تحميل ملف VPN**: تحقق من bucket `lab-files` في Supabase

### سجلات التصحيح:
- تحقق من console المتصفح للأخطاء
- تحقق من سجلات Portainer
- تحقق من سجلات Guacamole

## الأمان
- جميع الجلسات محمية بـ Row Level Security
- كلمات المرور يتم توليدها عشوائياً
- الجلسات تنتهي تلقائياً بعد ساعة
- يمكن للمستخدم إيقاف جلسته في أي وقت

## التطوير المستقبلي
- إضافة دعم لـ RDP
- إضافة مراقبة موارد الحاويات
- إضافة نظام نقاط للمختبرات
- إضافة دعم للشبكات المعقدة 