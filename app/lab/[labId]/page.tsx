"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
  Server, Router, Network, Laptop, Wifi, Globe, HardDrive, Terminal,
  Play, Square, RotateCcw, RefreshCw, ChevronRight, Info, CheckCircle, XCircle, FileText, Eye, Plus, X, HelpCircle, Edit, ExternalLink, TestTube
} from "lucide-react"
import { getLabWithDetails, addLabConnection, deleteLabConnection, toggleConnectionStatus, updateLabDevice } from "@/app/admin/dashboard/services/labs"
import { toast } from "@/hooks/use-toast"
import NetworkDiagram from "@/components/NetworkDiagram"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import React from 'react'
import ReactFlow, { MiniMap, Controls, Background } from 'react-flow-renderer'
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator
} from "@/components/ui/breadcrumb"
import { DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

// تعريف نوع LabConnection إذا لم يكن مستورداً
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

// تعريف نوع NetworkConnection
export interface NetworkConnection {
  source: string;
  target: string;
  color?: string;
  dashArray?: string;
  opacity?: number;
  width?: number;
}

// عدّل NetworkDevice ليكون type: string
export interface NetworkDevice {
  id: string;
  name: string;
  ip: string;
  type: string;
  status: "online" | "offline" | "connecting";
  x?: number;
  y?: number;
  icon: React.ElementType;
  color: string;
  url?: string;
}

interface LabQuestion {
  id: string
  question: string
  correct_answer: string
  explanation?: string
  points?: number
  hints?: { id: number; hint: string }[]
}

// تعريف نوع LabSession
interface LabSession {
  id: string;
  user_id: string;
  lab_id: number;
  status: 'starting' | 'running' | 'stopped' | 'expired' | 'error';
  started_at: string;
  expires_at: string;
  container_id?: string;
  portainer_stack_id?: string;
  vpn_config?: {
    config_file_url: string;
    username: string;
    password: string;
    server_ip: string;
    server_port: number;
  };
  guacamole_config?: {
    connection_ids: string[];
    base_url: string;
  };
  network_config?: {
    subnet: string;
    gateway: string;
    dns_servers: string[];
  };
  created_at: string;
  updated_at: string;
}

const centerX = 350;
const centerY = 200;
const gapX = 180;
const gapY = 120;

const devices = [
  {
    id: "internet",
    name: "مزود الإنترنت",
    ip: "8.8.8.8",
    type: "internet",
    status: "online",
    x: centerX - gapX * 2,
    y: centerY - gapY,
    icon: Globe,
    color: "#EF4444",
  },
  {
    id: "router",
    name: "الراوتر الرئيسي",
    ip: "192.168.1.1",
    type: "router",
    status: "online",
    x: centerX,
    y: centerY - gapY,
    icon: Router,
    color: "#8B5CF6",
  },
  {
    id: "switch",
    name: "السويتش",
    ip: "192.168.1.2",
    type: "switch",
    status: "online",
    x: centerX + gapX,
    y: centerY,
    icon: Network,
    color: "#F59E0B",
  },
  {
    id: "server",
    name: "خادم الويب",
    ip: "192.168.1.10",
    type: "server",
    status: "online",
    x: centerX + gapX * 2,
    y: centerY + gapY,
    icon: Server,
    color: "#10B981",
  },
  {
    id: "database",
    name: "قاعدة البيانات",
    ip: "192.168.1.20",
    type: "database",
    status: "online",
    x: centerX,
    y: centerY + gapY * 2,
    icon: HardDrive,
    color: "#84CC16",
  },
  {
    id: "computer1",
    name: "كمبيوتر المستخدم",
    ip: "192.168.1.100",
    type: "computer",
    status: "online",
    x: centerX - gapX,
    y: centerY + gapY,
    icon: Laptop,
    color: "#3B82F6",
  },
  {
    id: "wifi",
    name: "نقطة الواي فاي",
    ip: "192.168.1.50",
    type: "wifi",
    status: "online",
    x: centerX - gapX * 2,
    y: centerY + gapY,
    icon: Wifi,
    color: "#06B6D4",
  },
];

const connections = [
  { source: "internet", target: "router" },
  { source: "router", target: "switch" },
  { source: "router", target: "wifi" },
  { source: "wifi", target: "computer1", color: "#06B6D4", dashArray: "3,3", opacity: 0.8 },
  { source: "switch", target: "server" },
  { source: "switch", target: "database" },
];

// تحويل LabConnection إلى NetworkConnection
function mapLabConnectionsToNetworkConnections(labConnections: LabConnection[]): NetworkConnection[] {
  return labConnections.map((conn) => ({
    source: conn.source_device_id,
    target: conn.target_device_id,
    color: conn.connection_type === "wifi" ? "#06B6D4" : "#8648f9",
    dashArray: conn.connection_type === "wifi" ? "3,3" : "5,5",
    opacity: conn.status === "connected" ? 1 : 0.5,
    width: 2,
  }));
}

// ترتيب الأجهزة بشكل شبكي في منتصف المخطط
function assignDefaultPositions(devices: NetworkDevice[]): NetworkDevice[] {
  const gridCols = Math.ceil(Math.sqrt(devices.length));
  const gridRows = Math.ceil(devices.length / gridCols);
  const cellWidth = 160;
  const cellHeight = 120;
  const centerX = 350;
  const centerY = 200;
  const totalWidth = cellWidth * gridCols;
  const totalHeight = cellHeight * gridRows;
  return devices.map((device, i) => {
    const row = Math.floor(i / gridCols);
    const col = i % gridCols;
    const x = (device.x !== undefined && device.x !== null && device.x !== 0)
      ? device.x
      : Math.round(centerX - totalWidth / 2 + col * cellWidth + cellWidth / 2);
    const y = (device.y !== undefined && device.y !== null && device.y !== 0)
      ? device.y
      : Math.round(centerY - totalHeight / 2 + row * cellHeight + cellHeight / 2);
    return { ...device, x, y };
  });
}

export default function LabPage({ params }: { params: Promise<{ labId: string }> }) {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [labId, setLabId] = useState<string>("")
  const [lab, setLab] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Lab state
  const [labStatus, setLabStatus] = useState<"stopped" | "starting" | "running">("running")
  const [selectedDevice, setSelectedDevice] = useState<NetworkDevice | null>(null)

  // Questions state
  const [labQuestions, setLabQuestions] = useState<LabQuestion[]>([])
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [userAnswers, setUserAnswers] = useState<{ [key: string]: string }>({})
  const [submittedAnswers, setSubmittedAnswers] = useState<{ [key: string]: boolean }>({})
  const [showResults, setShowResults] = useState(false)
  const [questionsCompleted, setQuestionsCompleted] = useState(false)

  const [devices, setDevices] = useState<NetworkDevice[]>([])
  const [connections, setConnections] = useState<LabConnection[]>([])

  // User state
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [userRole, setUserRole] = useState<string>("")
  const [editDevice, setEditDevice] = useState<NetworkDevice | null>(null)
  const [editQuestion, setEditQuestion] = useState<LabQuestion | null>(null)

  // New state for current session with proper typing
  const [currentSession, setCurrentSession] = useState<LabSession | null>(null)



  // Fetch lab data
  useEffect(() => {
    const fetchLabData = async () => {
      try {
        setLoading(true)
        const resolvedParams = await params
        const id = Number(resolvedParams.labId)
        setLabId(id.toString())

        const labData = await getLabWithDetails(id)
        setLab(labData)

        console.log("=== تشخيص الأجهزة ===");
        console.log("labId:", id);
        console.log("labData:", labData);
        console.log("labData.devices:", labData.devices);

        // تحويل الأجهزة إلى التنسيق المطلوب
        const formattedDevices: NetworkDevice[] = (labData.devices || []).map((device: any) => {
          // تجاهل icon من قاعدة البيانات واستبداله بأيقونة صحيحة
          const { icon, ...deviceWithoutIcon } = device;
          
          // تعيين الأيقونة الصحيحة بناءً على نوع الجهاز
          let deviceIcon = Network; // افتراضي
          let deviceColor = "#10B981"; // افتراضي
          
          if (device.type === 'server') {
            deviceIcon = Server;
            deviceColor = "#EF4444"; // أحمر
          } else if (device.type === 'router') {
            deviceIcon = Router;
            deviceColor = "#8B5CF6"; // بنفسجي
          } else if (device.type === 'switch') {
            deviceIcon = Network;
            deviceColor = "#F59E0B"; // برتقالي
          } else if (device.type === 'computer' || device.type === 'laptop') {
            deviceIcon = Laptop;
            deviceColor = "#3B82F6"; // أزرق
          } else if (device.type === 'wifi') {
            deviceIcon = Wifi;
            deviceColor = "#06B6D4"; // سماوي
          } else if (device.type === 'internet') {
            deviceIcon = Globe;
            deviceColor = "#EF4444"; // أحمر
          } else if (device.type === 'database' || device.type === 'harddrive') {
            deviceIcon = HardDrive;
            deviceColor = "#84CC16"; // أخضر
          } else if (device.type === 'terminal') {
            deviceIcon = Terminal;
            deviceColor = "#6366F1"; // نيلي
          }
          
          return {
            ...deviceWithoutIcon,
            status: "offline",
            x: device.x,
            y: device.y,
            icon: deviceIcon,
            color: device.color || deviceColor,
          };
        });

        console.log("الأجهزة المحولة:", formattedDevices);
        console.log("عدد الأجهزة المحولة:", formattedDevices.length);

        let loadedDevices = assignDefaultPositions(
          formattedDevices.map(d => ({ ...d, x: undefined, y: undefined }))
        );
        setDevices(loadedDevices);

        // تحويل الأسئلة إلى التنسيق المطلوب
        const formattedQuestions: LabQuestion[] = (labData.questions || []).map((q: any) => ({
          id: q.id,
          question: q.question,
          correct_answer: q.correct_answer,
          explanation: q.explanation,
          points: q.points,
          hints: q.hints?.map((h: any) => ({ id: h.id, hint: h.hint })) || []
        }))

        setLabQuestions(formattedQuestions)

        // تحميل الاتصالات من قاعدة البيانات
        try {
          const { data: connectionsData, error: connectionsError } = await supabase
            .from('lab_connections')
            .select('*')
            .eq('lab_id', id);
          
          console.log("=== تشخيص الاتصالات ===");
          console.log("connectionsData:", connectionsData);
          console.log("connectionsError:", connectionsError);
          console.log("عدد الاتصالات:", connectionsData?.length || 0);
          
          if (!connectionsError && connectionsData) {
            setConnections(connectionsData);
          } else {
            console.error('Error loading connections:', connectionsError);
            setConnections([]);
          }
        } catch (error) {
          console.error('Error loading connections:', error);
          setConnections([]);
        }

        // جلب الأجهزة مباشرة من قاعدة البيانات للتأكد
        try {
          const { data: devicesData, error: devicesError } = await supabase
            .from('lab_devices')
            .select('*')
            .eq('lab_id', id);
          
          console.log("=== تشخيص الأجهزة المباشر ===");
          console.log("devicesData:", devicesData);
          console.log("devicesError:", devicesError);
          console.log("عدد الأجهزة المباشر:", devicesData?.length || 0);
          
          if (devicesError) {
            console.error("خطأ في جلب الأجهزة:", devicesError);
          }
        } catch (error) {
          console.error("خطأ في جلب الأجهزة:", error);
        }

      } catch (err: any) {
        setError(err.message || "حدث خطأ أثناء تحميل بيانات المختبر")
      } finally {
        setLoading(false)
      }
    }

    fetchLabData()
  }, [params, supabase])

  // Get labId from params
  useEffect(() => {
    const getLabId = async () => {
      const resolvedParams = await params
      setLabId(resolvedParams.labId)
    }
    getLabId()
  }, [params])



  // جلب المستخدم الحالي ودوره
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUser(user)
        // جلب الدور من جدول users
        const { data, error } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single()
        if (data && data.role) setUserRole(data.role)
      }
    }
    fetchUser()
  }, [supabase])

  // New effect for current session
  useEffect(() => {
    const startLabSession = async () => {
      if (!labId || !currentUser) return;
      // تحقق إذا كان هناك جلسة نشطة بالفعل
      const res = await fetch(`/api/lab-sessions?labId=${labId}`);
      const data = await res.json();
      if (data.sessions && data.sessions.length > 0) {
        // يوجد جلسة نشطة
        const session = data.sessions[0];
        setCurrentSession(session);
        
        // إذا كانت الجلسة نشطة، تفعيل الأجهزة
        if (session.status === 'running') {
          setLabStatus('running');
          // تفعيل الأجهزة
          setDevices((prev) =>
            prev.map((device) => ({
              ...device,
              status: "online",
            })),
          );
          // تفعيل الاتصالات
          setConnections((prev) =>
            prev.map((connection) => ({
              ...connection,
              status: "connected",
            })),
          );
        }
      } else {
        // أنشئ جلسة جديدة
        const createRes = await fetch('/api/lab-sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ labId })
        });
        const createData = await createRes.json();
        if (createData.session) {
          setCurrentSession(createData.session);
        }
      }
    };
    startLabSession();
  }, [labId, currentUser]);



  const connectWebshell = async (deviceId?: string) => {
    try {
      // 1. تحقق من وجود جلسة نشطة
      let sessionRes = await fetch(`/api/lab-sessions?labId=${labId}`);
      let sessionsData = await sessionRes.json();
      let session = sessionsData.sessions && sessionsData.sessions[0];

      // 2. إذا لم توجد جلسة نشطة، أنشئ واحدة
      if (!session) {
        const createRes = await fetch('/api/lab-sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ labId: Number(labId) }),
        });
        const createData = await createRes.json();
        session = createData.session;
        if (!session) {
          toast({
            title: "خطأ",
            description: createData.error || "تعذر إنشاء جلسة مختبر",
            variant: "destructive"
          });
          return;
        }
      }

      // 3. الآن أرسل طلب إلى /api/webshell
      const response = await fetch('/api/webshell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ labId: Number(labId), deviceId })
      });
      const data = await response.json();
      if (data.success) {
        window.open(data.webshellUrl, '_blank');
        toast({
          title: "تم فتح WebShell",
          description: "تم فتح جلسة WebShell بنجاح",
        });
      } else {
        toast({
          title: "خطأ",
          description: data.error || "فشل في فتح WebShell",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في الاتصال بـ WebShell",
        variant: "destructive"
      });
    }
  }

  const connectToDevice = (device: NetworkDevice) => {
    if (labStatus !== "running") {
      alert("يجب بدء المختبر أولاً قبل الاتصال بالجهاز");
      return;
    }
    // تحقق من وجود اتصال نشط مع هذا الجهاز
    const isConnected = connections.some(
      conn => (conn.source_device_id === device.id || conn.target_device_id === device.id) && conn.status === "connected"
    );
    if (!isConnected) {
      alert("يجب أن يكون الجهاز متصلاً فعلياً في الشبكة داخل المختبر");
      return;
    }
    if (device.status === "online") {
      if (device.url) {
        window.open(device.url, "_blank")
      } else {
        alert(`جاري الاتصال بـ ${device.name} (${device.ip})...`)
      }
    } else {
      alert("الجهاز غير متاح حالياً")
    }
  }



  // وظائف السحب والإفلات للمستخدم
  const handleDeviceDragStart = (e: React.DragEvent, device: NetworkDevice) => {
    setSelectedDevice(device)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDeviceDragEnd = (e: React.DragEvent) => {
    if (selectedDevice) {
      const rect = e.currentTarget.parentElement?.getBoundingClientRect()
      if (rect) {
        const x = e.clientX - rect.left - 40
        const y = e.clientY - rect.top - 40
        updateDevicePosition(selectedDevice.id, Math.max(0, x), Math.max(0, y))
      }
    }
    setSelectedDevice(null)
  }

  const updateDevicePosition = (deviceId: string, x: number, y: number) => {
    setDevices(
      devices.map((device) => (device.id === deviceId ? { ...device, x: Math.max(0, x), y: Math.max(0, y) } : device)),
    )
  }

  // وظائف الأسئلة
  const handleAnswerChange = (questionId: string, answer: string) => {
    setUserAnswers({
      ...userAnswers,
      [questionId]: answer,
    })
  }

  const normalizeAnswer = (answer: string): string => {
    return answer
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ") // استبدال المسافات المتعددة بمسافة واحدة
      .replace(/[^\w\s\u0600-\u06FF]/g, "") // إزالة علامات الترقيم مع الحفاظ على الحروف العربية
      .replace(/[أإآ]/g, "ا") // توحيد الهمزات
      .replace(/[ىي]/g, "ي") // توحيد الياء
      .replace(/[ةه]/g, "ه") // توحيد التاء المربوطة والهاء
      .replace(/[ؤئ]/g, "و") // توحيد الواو
  }

  const checkAnswer = (questionId: string): boolean => {
    const userAnswer = userAnswers[questionId] || ""
    const correctAnswer = labQuestions.find((q) => q.id === questionId)?.correct_answer || ""

    if (!userAnswer.trim() || !correctAnswer.trim()) {
      return false
    }

    const normalizedUser = normalizeAnswer(userAnswer)
    const normalizedCorrect = normalizeAnswer(correctAnswer)

    // التحقق من التطابق الكامل
    if (normalizedUser === normalizedCorrect) {
      return true
    }

    // التحقق من التطابق الجزئي (إذا كانت الإجابة الصحيحة تحتوي على إجابة المستخدم أو العكس)
    if (normalizedCorrect.includes(normalizedUser) && normalizedUser.length >= 3) {
      return true
    }

    if (normalizedUser.includes(normalizedCorrect) && normalizedCorrect.length >= 3) {
      return true
    }

    // التحقق من الكلمات المشتركة (إذا كان 80% من الكلمات متطابقة)
    const userWords = normalizedUser.split(" ").filter(word => word.length > 0)
    const correctWords = normalizedCorrect.split(" ").filter(word => word.length > 0)
    
    if (userWords.length > 0 && correctWords.length > 0) {
      const commonWords = userWords.filter(word => correctWords.includes(word))
      const similarity = commonWords.length / Math.max(userWords.length, correctWords.length)
      
      if (similarity >= 0.8) {
        return true
      }
    }

    return false
  }

  const submitAnswer = async () => {
    const currentQ = labQuestions[currentQuestion]
    if (userAnswers[currentQ.id]?.trim()) {
      // التحقق المحلي أولاً
      const isCorrect = checkAnswer(currentQ.id)
      
      // تحديث النتائج المحلية
      setSubmittedAnswers({
        ...submittedAnswers,
        [currentQ.id]: isCorrect,
      })
      setShowResults(true)
      
      // إرسال الإجابة إلى API للتحقق الإضافي (اختياري)
      try {
        const res = await fetch('/api/lab/check-answer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ questionId: currentQ.id, userAnswer: userAnswers[currentQ.id] })
        })
        
        if (res.ok) {
          const result = await res.json()
          // يمكن استخدام نتيجة API للتحقق الإضافي إذا لزم الأمر
          console.log('API check result:', result)
        }
      } catch (err) {
        console.warn('API check failed, using local validation:', err)
        // نستمر باستخدام التحقق المحلي
      }
    }
  }

  const nextQuestion = () => {
    if (currentQuestion < labQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
      setShowResults(false)
    } else {
      setQuestionsCompleted(true)
    }
  }

  const resetQuestions = () => {
    setCurrentQuestion(0)
    setUserAnswers({})
    setSubmittedAnswers({})
    setShowResults(false)
    setQuestionsCompleted(false)
  }

  const getScore = () => {
    let correct = 0
    labQuestions.forEach((q) => {
      if (submittedAnswers[q.id]) {
        correct++
      }
    })
    const answered = Object.keys(submittedAnswers).length
    return { correct, total: answered, percentage: answered > 0 ? Math.round((correct / answered) * 100) : 0 }
  }

  // دوال إدارة الاتصالات
  const handleConnectionCreate = async (sourceId: string, targetId: string, type: string) => {
    try {
      // تحديد سرعة الاتصال بناءً على النوع
      let bandwidth = "100 Mbps";
      let latency = 5;

      if (type === "wifi") {
        bandwidth = "54 Mbps";
        latency = 10;
      } else if (type === "fiber") {
        bandwidth = "1 Gbps";
        latency = 2;
      } else if (type === "copper") {
        bandwidth = "10 Mbps";
        latency = 15;
      }

      const connectionData = {
        source_device_id: sourceId,
        target_device_id: targetId,
        connection_type: type as "ethernet" | "wifi" | "fiber" | "copper",
        status: "connected" as const,
        bandwidth: bandwidth,
        latency: latency,
        lab_id: Number(labId)
      };

      const newConnection = await addLabConnection(connectionData);
      setConnections(prev => [...prev, newConnection]);

      toast({
        title: "تم إنشاء الاتصال",
        description: `تم توصيل الأجهزة بنجاح`,
      });
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message || "فشل في إنشاء الاتصال",
        variant: "destructive"
      });
    }
  };

  const handleConnectionDelete = async (connectionId: string) => {
    try {
      await deleteLabConnection(connectionId);
      setConnections(prev => prev.filter(conn => conn.id !== connectionId));
      
      toast({
        title: "تم حذف الاتصال",
        description: "تم إزالة الاتصال بنجاح",
      });
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message || "فشل في حذف الاتصال",
        variant: "destructive"
      });
    }
  };

  const handleConnectionToggle = async (connectionId: string) => {
    try {
      const updatedConnection = await toggleConnectionStatus(connectionId);
      setConnections(prev => prev.map(conn => 
        conn.id === connectionId ? updatedConnection : conn
      ));
      
      toast({
        title: "تم تغيير حالة الاتصال",
        description: `الاتصال الآن ${updatedConnection.status === "connected" ? "متصل" : "غير متصل"}`,
      });
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message || "فشل في تغيير حالة الاتصال",
        variant: "destructive"
      });
    }
  };

  const handleDeviceMove = async (deviceId: string, x: number, y: number) => {
    try {
      await updateLabDevice(deviceId, { x, y });
      setDevices(prev => prev.map(device => 
        device.id === deviceId ? { ...device, x, y } : device
      ));
    } catch (error: any) {
      console.error('Error updating device position:', error);
    }
  };



  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumbs */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">الرئيسية</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/courses">المسارات</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href={lab?.course_id ? `/lessons/${lab.course_id}` : "/lessons"}>
                {lab?.lesson?.title || "الدرس"}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{lab?.title || "مختبر لينكس"}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8648f9] mx-auto mb-4"></div>
              <p className="text-gray-300">جاري تحميل بيانات المختبر...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-400 mb-4">{error}</p>
              <Button onClick={() => window.location.reload()} className="bg-[#8648f9] hover:bg-[#8648f9]/80">
                إعادة المحاولة
              </Button>
            </div>
          </div>
        )}

        {/* Main Content */}
        {!loading && !error && lab && (
          <div className="flex flex-col lg:flex-row gap-6 w-full max-w-7xl mx-auto">
            {/* العمود الأيمن: تعليمات المختبر + الأسئلة */}
            <div className="w-full lg:w-1/2 flex flex-col gap-6">
              {/* تعليمات المختبر */}
              {lab.instructions && (
                <Card className="bg-gray-900/50 border-[#8648f9]/20">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center">
                      <Info className="w-5 h-5 ml-2 text-[#8648f9]" />
                      تعليمات المختبر
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-invert max-w-none text-gray-300">
                      <p className="text-lg leading-relaxed">{lab.instructions}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
              {/* أسئلة المختبر */}
              {labQuestions.length > 0 ? (
                <Card className="bg-gray-900/50 border-[#8648f9]/20">
                  <CardHeader>
                    <CardTitle className="text-white">أسئلة المختبر</CardTitle>
                    <CardDescription className="text-gray-300">
                      اختبر معرفتك من خلال الإجابة على الأسئلة
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!questionsCompleted ? (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-300">
                            السؤال {currentQuestion + 1} من {labQuestions.length}
                          </span>
                          <Badge variant="outline" className="border-[#8648f9]/20 text-[#8648f9]">
                            {labQuestions[currentQuestion]?.points ?? 1} نقطة
                          </Badge>
                        </div>

                        {/* عرض السؤال الحالي */}
                        <div className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="text-white font-medium">
                              {labQuestions[currentQuestion]?.question}
                            </h4>
                          </div>
                          
                          {/* عرض التلميحات إذا وجدت */}
                          {labQuestions[currentQuestion]?.hints && labQuestions[currentQuestion].hints!.length > 0 && (
                            <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                              <h4 className="text-blue-400 font-medium mb-2">تلميحات:</h4>
                              <ul className="space-y-1">
                                {labQuestions[currentQuestion].hints!.map((hint, index) => (
                                  <li key={index} className="text-blue-300 text-sm">
                                    • {hint.hint}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>

                        {/* عرض النتيجة إذا تم الإرسال */}
                        {showResults && (
                          <div className={`p-4 rounded-lg border ${
                            submittedAnswers[labQuestions[currentQuestion]?.id || ""] 
                              ? "bg-green-500/10 border-green-500/20" 
                              : "bg-red-500/10 border-red-500/20"
                          }`}>
                            <div className="flex items-center gap-2 mb-2">
                              {submittedAnswers[labQuestions[currentQuestion]?.id || ""] ? (
                                <CheckCircle className="w-5 h-5 text-green-500" />
                              ) : (
                                <XCircle className="w-5 h-5 text-red-500" />
                              )}
                              <span className={`font-medium ${
                                submittedAnswers[labQuestions[currentQuestion]?.id || ""] 
                                  ? "text-green-400" 
                                  : "text-red-400"
                              }`}>
                                {submittedAnswers[labQuestions[currentQuestion]?.id || ""] ? "إجابة صحيحة!" : "إجابة خاطئة"}
                              </span>
                            </div>
                            <div className="text-gray-300 text-sm">
                              <p><strong>إجابتك:</strong> {userAnswers[labQuestions[currentQuestion]?.id || ""] || "لم تجب"}</p>
                              <p><strong>الإجابة الصحيحة:</strong> {labQuestions[currentQuestion]?.correct_answer}</p>
                              {labQuestions[currentQuestion]?.explanation && (
                                <p className="mt-2"><strong>الشرح:</strong> {labQuestions[currentQuestion].explanation}</p>
                              )}
                            </div>
                          </div>
                        )}

                        <Input
                          value={userAnswers[labQuestions[currentQuestion]?.id || ""] || ""}
                          onChange={(e) => handleAnswerChange(labQuestions[currentQuestion]?.id || "", e.target.value)}
                          placeholder="أدخل إجابتك هنا..."
                          className="bg-gray-700/50 border-[#8648f9]/20 text-white rounded-full px-6"
                          disabled={showResults}
                        />
                        <div className="flex gap-2 mt-2">
                          {!showResults ? (
                            <Button onClick={submitAnswer} className="bg-[#8648f9] hover:bg-[#8648f9]/80 text-white" disabled={showResults}>
                              <CheckCircle className="w-4 h-4 ml-2" />
                              إرسال الإجابة
                            </Button>
                          ) : (
                            <Button onClick={nextQuestion} className="bg-[#8648f9] hover:bg-[#8648f9]/80 text-white">
                              السؤال التالي
                            </Button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center">
                        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <h3 className="text-white text-xl font-bold mb-2">أحسنت!</h3>
                        <p className="text-gray-300 mb-4">لقد أكملت جميع أسئلة المختبر</p>
                        <div className="bg-gray-800/30 p-4 rounded-lg inline-block">
                          <p className="text-white">
                            النتيجة النهائية: {getScore().correct} من {getScore().total} ({getScore().percentage}%)
                          </p>
                        </div>
                        <Button 
                          onClick={resetQuestions} 
                          className="mt-4 bg-[#8648f9] hover:bg-[#8648f9]/80 text-white"
                        >
                          إعادة الاختبار
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-gray-900/50 border-[#8648f9]/20">
                  <CardHeader>
                    <CardTitle className="text-white">أسئلة المختبر</CardTitle>
                    <CardDescription className="text-gray-300">
                      لا توجد أسئلة في هذا المختبر حالياً
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <FileText className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                      <h3 className="text-gray-400 text-lg font-medium mb-2">لا توجد أسئلة</h3>
                      <p className="text-gray-500">
                        لم يتم إضافة أسئلة لهذا المختبر بعد.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* العمود الأيسر: لوحة التحكم + مخطط الشبكة */}
            <div className="w-full lg:w-1/2 flex flex-col gap-6">
              <Card className="bg-gray-900/50 border-[#8648f9]/20">
                <CardHeader>
                  <CardTitle className="text-white">مخطط الشبكة التفاعلي</CardTitle>
                  <CardDescription className="text-gray-300">
                    تحكم في بيئة المختبر وانقر على أي جهاز للتفاعل معه أو اسحبه لتغيير موقعه
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-center items-center w-full h-full min-h-[600px]">
                    <NetworkDiagram
                      devices={devices}
                      connections={mapLabConnectionsToNetworkConnections(connections)}
                      onDeviceMove={handleDeviceMove}
                      onConnectionDelete={handleConnectionDelete}
                      readOnly={false}
                      labStatus={labStatus}
                      onConnectWebshell={connectWebshell}
                      hasActiveSession={!!currentSession}
                    />
                  </div>
                 
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}