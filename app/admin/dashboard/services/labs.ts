import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import {
  Wifi,
  Server,
  Router,
  Network,
  Laptop,
  Globe,
  HardDrive,
  Terminal,
  Database,
  Computer,
  Monitor
} from "lucide-react"

// أنواع الأجهزة المتاحة
export const DEVICE_TYPES = {
  server: { name: "خادم", icon: Server, color: "#10B981" },
  router: { name: "راوتر", icon: Router, color: "#8B5CF6" },
  switch: { name: "سويتش", icon: Network, color: "#F59E0B" },
  network: { name: "شبكة", icon: Network, color: "#F59E0B" },
  computer: { name: "كمبيوتر", icon: Computer, color: "#3B82F6" },
  laptop: { name: "لابتوب", icon: Laptop, color: "#3B82F6" },
  wifi: { name: "واي فاي", icon: Wifi, color: "#06B6D4" },
  internet: { name: "إنترنت", icon: Globe, color: "#EF4444" },
  database: { name: "قاعدة بيانات", icon: Database, color: "#84CC16" },
  harddrive: { name: "قرص صلب", icon: HardDrive, color: "#84CC16" },
  terminal: { name: "طرفية", icon: Terminal, color: "#6366F1" },
  monitor: { name: "شاشة", icon: Monitor, color: "#8B5CF6" }
} as const

export type DeviceType = keyof typeof DEVICE_TYPES

export interface LabDevice {
  id: string;
  name: string;
  type: DeviceType;
  color: string;
  x: number;
  y: number;
  ip: string;
  url?: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  lab_id?: number;
}

export interface LabConnection {
  id: string;
  source_device_id: string;
  target_device_id: string;
  connection_type: "ethernet" | "wifi" | "fiber" | "copper";
  status: "connected" | "disconnected" | "connecting";
  bandwidth?: string;
  latency?: number;
  lab_id: number;
  created_at?: string;
  updated_at?: string;
}

export interface LabQuestionHint {
  id: number
  question_id?: string
  hint: string
}

export interface LabQuestion {
  id: string
  lab_id?: number
  question: string
  correct_answer: string
  explanation: string
  points: number
  hints?: LabQuestionHint[]
}

export interface Lab {
  id: number
  title: string
  description?: string
  instructions?: string
  course_id?: number
  difficulty: 'مبتدئ' | 'متوسط' | 'متقدم'
  status: 'نشط' | 'قيد التطوير'
  created_at: string
  devices?: LabDevice[]
  questions?: LabQuestion[]
}

// وظيفة مساعدة لإنشاء جهاز جديد
export const createNewDevice = (type: DeviceType, name: string, ip: string): Omit<LabDevice, 'id'> => {
  const deviceType = DEVICE_TYPES[type]
  return {
    name,
    type,
    color: deviceType.color,
    x: 0,
    y: 0,
    ip,
    url: '',
    icon: deviceType.icon
  }
}

// وظيفة مساعدة لإنشاء سؤال جديد
export const createNewQuestion = (question: string, correctAnswer: string, explanation: string, points: number, hints: string[] = []): Omit<LabQuestion, 'id'> => {
  return {
    question,
    correct_answer: correctAnswer,
    explanation,
    points,
    hints: hints.map(hint => ({ hint } as LabQuestionHint))
  }
}

export const getLabs = async (): Promise<Lab[]> => {
  console.log('getLabs called')
  
  try {
    const { data, error } = await createClientComponentClient().from('labs').select('*')
    console.log('Labs query result:', { data, error })
    
    if (error) {
      console.error('Labs error:', error)
      throw error
    }
    
    return data || []
  } catch (error: any) {
    console.error('getLabs error:', error)
    throw error
  }
}

export const getLabWithDetails = async (id: number): Promise<Lab> => {
  console.log('=== getLabWithDetails ===');
  console.log('lab_id المطلوب:', id);
  
  const { data: lab, error: labError } = await createClientComponentClient().from('labs').select('*').eq('id', id).single()
  if (labError) throw labError

  const { data: devices, error: devicesError } = await createClientComponentClient().from('lab_devices')
    .select('*')
    .eq('lab_id', id)
  if (devicesError) throw devicesError

  console.log('الأجهزة من قاعدة البيانات:', devices);
  console.log('عدد الأجهزة:', devices?.length || 0);

  const { data: questions, error: questionsError } = await createClientComponentClient().from('lab_questions')
    .select('*, lab_question_hints(*)')
    .eq('lab_id', id)
  if (questionsError) throw questionsError

  const result = {
    ...lab,
    devices: devices?.map(device => ({
      ...device,
      icon: DEVICE_TYPES[device.type as DeviceType]?.icon || Server
    })),
    questions: questions?.map(q => ({
      ...q,
      hints: q.lab_question_hints
    }))
  };

  console.log('النتيجة النهائية مع الأجهزة:', result.devices);
  return result;
}

export const createLab = async (lab: Omit<Lab, 'id' | 'created_at'>): Promise<Lab> => {
  const { data, error } = await createClientComponentClient().from('labs').insert(lab).select().single()
  if (error) throw error
  return data
}

export const updateLab = async (id: number, lab: Partial<Lab>): Promise<Lab> => {
  const { data, error } = await createClientComponentClient().from('labs').update(lab).eq('id', id).select().single()
  if (error) throw error
  return data
}

export const deleteLab = async (id: number): Promise<void> => {
  const { error } = await createClientComponentClient().from('labs').delete().eq('id', id)
  if (error) throw error
}

export const toggleLabStatus = async (id: number, currentStatus: 'نشط' | 'قيد التطوير'): Promise<Lab> => {
  return updateLab(id, { status: currentStatus === 'نشط' ? 'قيد التطوير' : 'نشط' })
}

// Lab Devices
export const addLabDevice = async (device: Omit<LabDevice, 'id'>): Promise<LabDevice> => {
  console.log('Adding device with data:', device);
  
  // إنشاء ID فريد للجهاز
  const deviceId = `d_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // إزالة icon من البيانات لأنه لا يمكن إرساله إلى قاعدة البيانات
  const { icon, ...deviceData } = device;
  
  const deviceToInsert = {
    ...deviceData,
    id: deviceId
  };
  
  console.log('Inserting device:', deviceToInsert);
  
  const { data, error } = await createClientComponentClient().from('lab_devices').insert(deviceToInsert).select().single()
  if (error) {
    console.error('Error inserting device:', error);
    throw error;
  }
  
  console.log('Device inserted successfully:', data);
  
  // إضافة icon مرة أخرى للبيانات المُرجعة
  return {
    ...data,
    icon: DEVICE_TYPES[data.type as DeviceType]?.icon || Server
  };
}

export const updateLabDevice = async (id: string, device: Partial<LabDevice>): Promise<LabDevice> => {
  // إزالة icon من البيانات لأنه لا يمكن إرساله إلى قاعدة البيانات
  const { icon, ...deviceData } = device;
  
  const { data, error } = await createClientComponentClient().from('lab_devices').update(deviceData).eq('id', id).select().single()
  if (error) throw error
  
  // إضافة icon مرة أخرى للبيانات المُرجعة
  return {
    ...data,
    icon: DEVICE_TYPES[data.type as DeviceType]?.icon || Server
  };
}

export const deleteLabDevice = async (id: string): Promise<void> => {
  const { error } = await createClientComponentClient().from('lab_devices').delete().eq('id', id)
  if (error) throw error
}

// Lab Questions
export const addLabQuestion = async (question: Omit<LabQuestion, 'id'>): Promise<LabQuestion> => {
  console.log('Adding question with data:', question);
  const { hints, ...questionData } = question;
  const questionId = `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const questionToInsert = {
    ...questionData,
    id: questionId
  };
  console.log('Inserting question:', questionToInsert);
  const { data, error } = await createClientComponentClient().from('lab_questions').insert(questionToInsert).select().single()
  if (error) {
    console.error('Error inserting question:', error);
    throw error;
  }
  console.log('Question inserted successfully:', data);
  if (hints && hints.length > 0 && data) {
    const hintsToInsert = hints.map(hint => ({
      question_id: data.id,
      hint: hint.hint
    }));
    console.log('Inserting hints:', hintsToInsert);
    const { error: hintsError } = await createClientComponentClient().from('lab_question_hints').insert(hintsToInsert)
    if (hintsError) {
      console.error('Error inserting hints:', hintsError);
      throw hintsError;
    }
  }
  return data
}

export const updateLabQuestion = async (id: string, question: Partial<LabQuestion>): Promise<LabQuestion> => {
  const { hints, ...questionData } = question;
  const { data, error } = await createClientComponentClient().from('lab_questions').update(questionData).eq('id', id).select().single()
  if (error) throw error
  if (hints && data) {
    await createClientComponentClient().from('lab_question_hints').delete().eq('question_id', id)
    if (hints.length > 0) {
      const hintsToInsert = hints.map(hint => ({
        question_id: id,
        hint: hint.hint
      }));
      const { error: hintsError } = await createClientComponentClient().from('lab_question_hints').insert(hintsToInsert)
      if (hintsError) throw hintsError
    }
  }
  return data
}

export const deleteLabQuestion = async (id: string): Promise<void> => {
  // حذف التلميحات المرتبطة أولاً
  await createClientComponentClient().from('lab_question_hints').delete().eq('question_id', id)
  
  // ثم حذف السؤال
  const { error } = await createClientComponentClient().from('lab_questions').delete().eq('id', id)
  if (error) throw error
}

// Lab Question Hints
export const addLabQuestionHint = async (hint: Omit<LabQuestionHint, 'id'>): Promise<LabQuestionHint> => {
  const { data, error } = await createClientComponentClient().from('lab_question_hints').insert(hint).select().single()
  if (error) throw error
  return data
}

export const updateLabQuestionHint = async (id: number, hint: Partial<LabQuestionHint>): Promise<LabQuestionHint> => {
  const { data, error } = await createClientComponentClient().from('lab_question_hints').update(hint).eq('id', id).select().single()
  if (error) throw error
  return data
}

export const deleteLabQuestionHint = async (id: number): Promise<void> => {
  const { error } = await createClientComponentClient().from('lab_question_hints').delete().eq('id', id)
  if (error) throw error
}

// دوال إدارة الاتصالات
export const getLabConnections = async (labId: number): Promise<LabConnection[]> => {
  try {
    const { data, error } = await createClientComponentClient().from('lab_connections')
      .select('*')
      .eq('lab_id', labId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error: any) {
    console.error('Error fetching lab connections:', error);
    throw new Error(error.message || 'فشل في جلب الاتصالات');
  }
};

export const addLabConnection = async (connectionData: Omit<LabConnection, 'id' | 'created_at' | 'updated_at'>): Promise<LabConnection> => {
  try {
    // التحقق من عدم وجود اتصال مكرر
    const { data: existingConnection } = await createClientComponentClient().from('lab_connections')
      .select('id')
      .eq('lab_id', connectionData.lab_id)
      .eq('source_device_id', connectionData.source_device_id)
      .eq('target_device_id', connectionData.target_device_id)
      .single();

    if (existingConnection) {
      throw new Error('يوجد اتصال بالفعل بين هذين الجهازين');
    }

    // التحقق من عدم وجود اتصال عكسي
    const { data: reverseConnection } = await createClientComponentClient().from('lab_connections')
      .select('id')
      .eq('lab_id', connectionData.lab_id)
      .eq('source_device_id', connectionData.target_device_id)
      .eq('target_device_id', connectionData.source_device_id)
      .single();

    if (reverseConnection) {
      throw new Error('يوجد اتصال بالفعل بين هذين الجهازين');
    }

    const { data, error } = await createClientComponentClient().from('lab_connections')
      .insert([connectionData])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error: any) {
    console.error('Error adding lab connection:', error);
    throw new Error(error.message || 'فشل في إضافة الاتصال');
  }
};

export const updateLabConnection = async (connectionId: string, updates: Partial<LabConnection>): Promise<LabConnection> => {
  try {
    const { data, error } = await createClientComponentClient().from('lab_connections')
      .update(updates)
      .eq('id', connectionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error: any) {
    console.error('Error updating lab connection:', error);
    throw new Error(error.message || 'فشل في تحديث الاتصال');
  }
};

export const deleteLabConnection = async (connectionId: string): Promise<void> => {
  try {
    const { error } = await createClientComponentClient().from('lab_connections')
      .delete()
      .eq('id', connectionId);

    if (error) throw error;
  } catch (error: any) {
    console.error('Error deleting lab connection:', error);
    throw new Error(error.message || 'فشل في حذف الاتصال');
  }
};

export const toggleConnectionStatus = async (connectionId: string): Promise<LabConnection> => {
  try {
    // جلب الاتصال الحالي
    const { data: currentConnection, error: fetchError } = await createClientComponentClient().from('lab_connections')
      .select('status')
      .eq('id', connectionId)
      .single();

    if (fetchError) throw fetchError;

    const newStatus = currentConnection.status === 'connected' ? 'disconnected' : 'connected';

    const { data, error } = await createClientComponentClient().from('lab_connections')
      .update({ status: newStatus })
      .eq('id', connectionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error: any) {
    console.error('Error toggling connection status:', error);
    throw new Error(error.message || 'فشل في تغيير حالة الاتصال');
  }
};