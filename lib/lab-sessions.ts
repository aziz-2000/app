import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export interface LabSession {
  id: string
  user_id: string
  lab_id: number
  status: 'starting' | 'running' | 'stopped' | 'expired' | 'error'
  started_at: string
  expires_at: string
  container_id?: string
  portainer_stack_id?: string
  vpn_config?: {
    config_file_url: string
    username: string
    password: string
    server_ip: string
    server_port: number
  }
  guacamole_config?: {
    connection_id: string
    username: string
    password: string
    protocol: 'ssh' | 'vnc' | 'rdp'
    host: string
    port: number
  }
  network_config?: {
    subnet: string
    gateway: string
    dns_servers: string[]
  }
  created_at: string
  updated_at: string
}

export interface LabSessionDevice {
  id: string
  session_id: string
  device_id: string
  container_name: string
  container_id: string
  ip_address: string
  port_mappings: {
    [key: string]: number
  }
  status: 'starting' | 'running' | 'stopped' | 'error'
  created_at: string
}

export interface PortainerConfig {
  url: string
  username: string
  password: string
  endpoint_id: string
  stack_name_template: string
}

export interface GuacamoleConfig {
  url: string
  username: string
  password: string
  data_source: string
}

// إعدادات النظام
const SYSTEM_CONFIG = {
  session_duration_hours: 1,
  max_concurrent_sessions: 5,
  cleanup_interval_minutes: 30,
  portainer: {
    url: process.env.NEXT_PUBLIC_PORTAINER_URL || 'http://localhost:9000',
    username: process.env.PORTAINER_USERNAME || 'admin',
    password: process.env.PORTAINER_PASSWORD || 'admin123',
    endpoint_id: process.env.PORTAINER_ENDPOINT_ID || '1'
  },
  guacamole: {
    url: process.env.NEXT_PUBLIC_GUACAMOLE_URL || 'http://localhost:8080/guacamole',
    username: process.env.GUACAMOLE_USERNAME || 'guacadmin',
    password: process.env.GUACAMOLE_PASSWORD || 'guacadmin',
    data_source: process.env.GUACAMOLE_DATA_SOURCE || 'postgresql'
  }
}

// إنشاء جلسة مختبر جديدة
export const createLabSession = async (userId: string, labId: number): Promise<LabSession> => {
  const supabase = createClientComponentClient()
  
  try {
    // التحقق من عدم وجود جلسة نشطة للمستخدم في هذا المختبر
    const { data: existingSession } = await supabase
      .from('lab_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('lab_id', labId)
      .in('status', ['starting', 'running'])
      .single()

    if (existingSession) {
      throw new Error('لديك جلسة نشطة بالفعل في هذا المختبر')
    }

    // التحقق من عدد الجلسات النشطة للمستخدم
    const { data: userSessions } = await supabase
      .from('lab_sessions')
      .select('id')
      .eq('user_id', userId)
      .in('status', ['starting', 'running'])

    if (userSessions && userSessions.length >= SYSTEM_CONFIG.max_concurrent_sessions) {
      throw new Error(`يمكنك تشغيل ${SYSTEM_CONFIG.max_concurrent_sessions} مختبرات فقط في نفس الوقت`)
    }

    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const startedAt = new Date().toISOString()
    const expiresAt = new Date(Date.now() + SYSTEM_CONFIG.session_duration_hours * 60 * 60 * 1000).toISOString()

    // إنشاء الجلسة في قاعدة البيانات
    const { data: session, error } = await supabase
      .from('lab_sessions')
      .insert({
        id: sessionId,
        user_id: userId,
        lab_id: labId,
        status: 'starting',
        started_at: startedAt,
        expires_at: expiresAt
      })
      .select()
      .single()

    if (error) throw error

    // بدء تشغيل الحاويات في الخلفية
    startLabContainers(sessionId, labId)

    return session
  } catch (error: any) {
    console.error('Error creating lab session:', error)
    throw new Error(error.message || 'فشل في إنشاء جلسة المختبر')
  }
}

// بدء تشغيل حاويات المختبر
const startLabContainers = async (sessionId: string, labId: number) => {
  try {
    const supabase = createClientComponentClient()
    
    // جلب تفاصيل المختبر والأجهزة
    const { data: lab } = await supabase
      .from('labs')
      .select('*')
      .eq('id', labId)
      .single()

    const { data: devices } = await supabase
      .from('lab_devices')
      .select('*')
      .eq('lab_id', labId)

    if (!lab || !devices) {
      throw new Error('لم يتم العثور على بيانات المختبر')
    }

    // إنشاء stack في Portainer
    const stackName = `${lab.title.replace(/\s+/g, '-').toLowerCase()}_${sessionId}`
    const stackConfig = generatePortainerStackConfig(devices, sessionId)
    
    const portainerResponse = await fetch(`${SYSTEM_CONFIG.portainer.url}/api/stacks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': await getPortainerApiKey()
      },
      body: JSON.stringify({
        Name: stackName,
        SwarmID: SYSTEM_CONFIG.portainer.endpoint_id,
        StackFileContent: stackConfig
      })
    })

    if (!portainerResponse.ok) {
      throw new Error('فشل في إنشاء stack في Portainer')
    }

    const portainerData = await portainerResponse.json()

    // تحديث الجلسة بـ stack ID
    await supabase
      .from('lab_sessions')
      .update({
        portainer_stack_id: portainerData.Id,
        status: 'running'
      })
      .eq('id', sessionId)

    // إنشاء سجلات الأجهزة
    for (const device of devices) {
      const containerName = `${stackName}_${device.name.replace(/\s+/g, '-').toLowerCase()}`
      
      await supabase
        .from('lab_session_devices')
        .insert({
          session_id: sessionId,
          device_id: device.id,
          container_name: containerName,
          container_id: `${containerName}_${Date.now()}`,
          ip_address: device.ip,
          status: 'running'
        })
    }

    // إنشاء إعدادات VPN
    await createVpnConfig(sessionId, devices)

    // إنشاء إعدادات Guacamole
    await createGuacamoleConnections(sessionId, devices)

  } catch (error) {
    console.error('Error starting lab containers:', error)
    
    // تحديث حالة الجلسة إلى خطأ
    const supabase = createClientComponentClient()
    await supabase
      .from('lab_sessions')
      .update({ status: 'error' })
      .eq('id', sessionId)
  }
}

// إنشاء تكوين Portainer Stack
const generatePortainerStackConfig = (devices: any[], sessionId: string): string => {
  const services: any = {}
  const networks: any = {
    lab_network: {
      driver: 'bridge',
      ipam: {
        config: [{
          subnet: '172.20.0.0/16',
          gateway: '172.20.0.1'
        }]
      }
    }
  }

  devices.forEach((device, index) => {
    const serviceName = device.name.replace(/\s+/g, '_').toLowerCase()
    
    services[serviceName] = {
      image: getDeviceImage(device.type),
      container_name: `${serviceName}_${sessionId}`,
      networks: ['lab_network'],
      environment: [
        `DEVICE_NAME=${device.name}`,
        `DEVICE_IP=${device.ip}`,
        `DEVICE_TYPE=${device.type}`
      ],
      ports: getDevicePorts(device.type, index),
      restart: 'unless-stopped',
      labels: {
        'session.id': sessionId,
        'device.id': device.id
      }
    }

    // إضافة خدمات خاصة حسب نوع الجهاز
    if (device.type === 'server') {
      services[serviceName].environment.push('SSH_ENABLED=true')
      services[serviceName].environment.push('VNC_ENABLED=true')
    }
  })

  return JSON.stringify({
    version: '3.8',
    services,
    networks
  }, null, 2)
}

// الحصول على صورة Docker المناسبة للجهاز
const getDeviceImage = (deviceType: string): string => {
  const images = {
    server: 'ubuntu:20.04',
    router: 'pfsense/pfsense:latest',
    switch: 'openvswitch/ovs:latest',
    computer: 'ubuntu:20.04',
    laptop: 'ubuntu:20.04',
    database: 'mysql:8.0',
    wifi: 'hostapd/hostapd:latest',
    internet: 'nginx:alpine',
    terminal: 'ubuntu:20.04'
  }
  
  return images[deviceType as keyof typeof images] || 'ubuntu:20.04'
}

// الحصول على المنافذ المطلوبة للجهاز
const getDevicePorts = (deviceType: string, index: number): string[] => {
  const basePort = 30000 + (index * 10)
  
  const portMappings = {
    server: [`${basePort}:22`, `${basePort + 1}:5900`, `${basePort + 2}:80`],
    router: [`${basePort}:80`, `${basePort + 1}:443`],
    computer: [`${basePort}:22`, `${basePort + 1}:5900`],
    laptop: [`${basePort}:22`, `${basePort + 1}:5900`],
    database: [`${basePort}:3306`],
    terminal: [`${basePort}:22`]
  }
  
  return portMappings[deviceType as keyof typeof portMappings] || [`${basePort}:22`]
}

// الحصول على مفتاح API لـ Portainer
const getPortainerApiKey = async (): Promise<string> => {
  const response = await fetch(`${SYSTEM_CONFIG.portainer.url}/api/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      Username: SYSTEM_CONFIG.portainer.username,
      Password: SYSTEM_CONFIG.portainer.password
    })
  })

  if (!response.ok) {
    throw new Error('فشل في الحصول على مفتاح API لـ Portainer')
  }

  const data = await response.json()
  return data.jwt
}

// إنشاء إعدادات VPN
const createVpnConfig = async (sessionId: string, devices: any[]) => {
  try {
    const supabase = createClientComponentClient()
    
    // إنشاء ملف تكوين OpenVPN
    const vpnConfig = generateOpenVpnConfig(devices)
    
    // رفع ملف التكوين إلى Supabase Storage
    const fileName = `vpn-configs/${sessionId}/lab-vpn.ovpn`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('lab-files')
      .upload(fileName, new Blob([vpnConfig], { type: 'text/plain' }))

    if (uploadError) throw uploadError

    const configUrl = supabase.storage
      .from('lab-files')
      .getPublicUrl(fileName).data.publicUrl

    // تحديث الجلسة بإعدادات VPN
    await supabase
      .from('lab_sessions')
      .update({
        vpn_config: {
          config_file_url: configUrl,
          username: `user_${sessionId}`,
          password: generatePassword(),
          server_ip: '172.20.0.1',
          server_port: 1194
        }
      })
      .eq('id', sessionId)

  } catch (error) {
    console.error('Error creating VPN config:', error)
  }
}

// إنشاء تكوين OpenVPN
const generateOpenVpnConfig = (devices: any[]): string => {
  return `client
dev tun
proto udp
remote 172.20.0.1 1194
resolv-retry infinite
nobind
persist-key
persist-tun
remote-cert-tls server
cipher AES-256-CBC
verb 3
auth-nocache
<ca>
-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIJAKoK/OvJ8mQkMA0GCSqGSIb3DQEBCwUAMEUxCzAJBgNV
BAYTAkFVMRMwEQYDVQQIDApTb21lLVN0YXRlMSEwHwYDVQQKDBhJbnRlcm5ldCBX
aWRnaXRzIFB0eSBMdGQwHhcNMTkwMzI1MTY0NzQ5WhcNMjAwMzI0MTY0NzQ5WjBF
MQswCQYDVQQGEwJBVTETMBEGA1UECAwKU29tZS1TdGF0ZTEhMB8GA1UECgwYSW50
ZXJuZXQgV2lkZ2l0cyBQdHkgTHRkMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIB
CgKCAQEA...
-----END CERTIFICATE-----
</ca>
<cert>
-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIJAKoK/OvJ8mQkMA0GCSqGSIb3DQEBCwUAMEUxCzAJBgNV
BAYTAkFVMRMwEQYDVQQIDApTb21lLVN0YXRlMSEwHwYDVQQKDBhJbnRlcm5ldCBX
aWRnaXRzIFB0eSBMdGQwHhcNMTkwMzI1MTY0NzQ5WhcNMjAwMzI0MTY0NzQ5WjBF
MQswCQYDVQQGEwJBVTETMBEGA1UECAwKU29tZS1TdGF0ZTEhMB8GA1UECgwYSW50
ZXJuZXQgV2lkZ2l0cyBQdHkgTHRkMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIB
CgKCAQEA...
-----END CERTIFICATE-----
</cert>
<key>
-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC6...
-----END PRIVATE KEY-----
</key>
`
}

// إنشاء اتصالات Guacamole
const createGuacamoleConnections = async (sessionId: string, devices: any[]) => {
  try {
    const supabase = createClientComponentClient()
    
    // الحصول على رمز الوصول لـ Guacamole
    const token = await getGuacamoleToken()
    
    const connections = []
    
    for (const device of devices) {
      if (['server', 'computer', 'laptop', 'terminal'].includes(device.type)) {
        const connectionName = `${device.name}_${sessionId}`
        
        // إنشاء اتصال SSH
        const sshConnection = await createGuacamoleConnection(token, {
          name: `${connectionName}_SSH`,
          protocol: 'ssh',
          host: device.ip,
          port: 22,
          username: 'root',
          password: 'password123'
        })
        
        // إنشاء اتصال VNC
        const vncConnection = await createGuacamoleConnection(token, {
          name: `${connectionName}_VNC`,
          protocol: 'vnc',
          host: device.ip,
          port: 5900,
          password: 'vncpass123'
        })
        
        connections.push(sshConnection, vncConnection)
      }
    }
    
    // تحديث الجلسة بإعدادات Guacamole
    await supabase
      .from('lab_sessions')
      .update({
        guacamole_config: {
          connection_ids: connections.map(c => c.identifier),
          base_url: SYSTEM_CONFIG.guacamole.url
        }
      })
      .eq('id', sessionId)

  } catch (error) {
    console.error('Error creating Guacamole connections:', error)
  }
}

// الحصول على رمز الوصول لـ Guacamole
const getGuacamoleToken = async (): Promise<string> => {
  const response = await fetch(`${SYSTEM_CONFIG.guacamole.url}/api/tokens`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `username=${SYSTEM_CONFIG.guacamole.username}&password=${SYSTEM_CONFIG.guacamole.password}`
  })

  if (!response.ok) {
    throw new Error('فشل في الحصول على رمز الوصول لـ Guacamole')
  }

  const data = await response.json()
  return data.authToken
}

// إنشاء اتصال في Guacamole
const createGuacamoleConnection = async (token: string, config: any) => {
  const response = await fetch(`${SYSTEM_CONFIG.guacamole.url}/api/session/data/${SYSTEM_CONFIG.guacamole.data_source}/connections`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      name: config.name,
      protocol: config.protocol,
      parameters: {
        hostname: config.host,
        port: config.port,
        username: config.username,
        password: config.password
      }
    })
  })

  if (!response.ok) {
    throw new Error('فشل في إنشاء اتصال Guacamole')
  }

  return await response.json()
}

// جلب جلسة مختبر
export const getLabSession = async (sessionId: string): Promise<LabSession | null> => {
  const supabase = createClientComponentClient()
  
  const { data, error } = await supabase
    .from('lab_sessions')
    .select('*')
    .eq('id', sessionId)
    .single()

  if (error) throw error
  return data
}

// جلب جلسات المستخدم النشطة
export const getUserActiveSessions = async (userId: string): Promise<LabSession[]> => {
  const supabase = createClientComponentClient()
  
  const { data, error } = await supabase
    .from('lab_sessions')
    .select('*, labs(title, description)')
    .eq('user_id', userId)
    .in('status', ['starting', 'running'])
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

// إيقاف جلسة مختبر
export const stopLabSession = async (sessionId: string): Promise<void> => {
  const supabase = createClientComponentClient()
  
  try {
    // إيقاف الحاويات في Portainer
    const { data: session } = await supabase
      .from('lab_sessions')
      .select('portainer_stack_id')
      .eq('id', sessionId)
      .single()

    if (session?.portainer_stack_id) {
      await fetch(`${SYSTEM_CONFIG.portainer.url}/api/stacks/${session.portainer_stack_id}`, {
        method: 'DELETE',
        headers: {
          'X-API-Key': await getPortainerApiKey()
        }
      })
    }

    // تحديث حالة الجلسة
    await supabase
      .from('lab_sessions')
      .update({ status: 'stopped' })
      .eq('id', sessionId)

  } catch (error) {
    console.error('Error stopping lab session:', error)
    throw error
  }
}

// تمديد جلسة مختبر
export const extendLabSession = async (sessionId: string, hours: number = 1): Promise<void> => {
  const supabase = createClientComponentClient()
  
  const { data: session } = await supabase
    .from('lab_sessions')
    .select('expires_at')
    .eq('id', sessionId)
    .single()

  if (!session) {
    throw new Error('لم يتم العثور على الجلسة')
  }

  const newExpiresAt = new Date(new Date(session.expires_at).getTime() + hours * 60 * 60 * 1000).toISOString()

  await supabase
    .from('lab_sessions')
    .update({ expires_at: newExpiresAt })
    .eq('id', sessionId)
}

// حذف الجلسات المنتهية
export const cleanupExpiredSessions = async (): Promise<void> => {
  const supabase = createClientComponentClient()
  
  const { data: expiredSessions } = await supabase
    .from('lab_sessions')
    .select('id, portainer_stack_id')
    .lt('expires_at', new Date().toISOString())
    .in('status', ['running', 'starting'])

  if (!expiredSessions) return

  for (const session of expiredSessions) {
    try {
      await stopLabSession(session.id)
    } catch (error) {
      console.error(`Error cleaning up session ${session.id}:`, error)
    }
  }
}

// إنشاء كلمة مرور عشوائية
const generatePassword = (length: number = 12): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
  let password = ''
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

// جدولة تنظيف الجلسات المنتهية
export const scheduleSessionCleanup = (): void => {
  setInterval(cleanupExpiredSessions, SYSTEM_CONFIG.cleanup_interval_minutes * 60 * 1000)
} 