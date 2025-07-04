"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import {
  Users, BookOpen, Plus, Edit, Trash2, Search, Settings,
  Monitor, FileText, Eye, Server, Router, Wifi, Globe,
  HardDrive, Laptop, Network, Save, X, Check, AlertCircle, Star, LogOut, Upload, XCircle, CheckCircle, Bell
} from "lucide-react";
import Image from "next/image";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { diagnoseSystem } from "@/lib/supabase";
import Sidebar from "@/components/sidebar";
import { getUsers, createUser, updateUser, deleteUser, User } from "./services/users";
import { getCourses, createCourse, updateCourse, deleteCourse, Course } from "./services/courses";
import { getLessons, createLesson, updateLesson, deleteLesson, Lesson, createLessonWithMaterials, updateLessonWithMaterials, createLessonWithUrls, updateLessonWithUrls, getLessonMaterials } from "./services/lessons";
import { getLabs, createLab, updateLab, deleteLab, Lab, getLabWithDetails } from "./services/labs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  addLabDevice, updateLabDevice, deleteLabDevice, 
  addLabQuestion, updateLabQuestion, deleteLabQuestion,
  addLabQuestionHint, updateLabQuestionHint, deleteLabQuestionHint,
  LabDevice, LabQuestion, LabQuestionHint, DEVICE_TYPES, DeviceType, createNewDevice, createNewQuestion,
  getLabConnections, LabConnection, addLabConnection, updateLabConnection, deleteLabConnection, toggleConnectionStatus
} from "./services/labs";
import NetworkDiagram from "@/components/network-diagram";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

type UserRole = "طالب" | "مدرب" | "مسؤول";
type CourseLevel = "مبتدئ" | "متوسط" | "متقدم";
type CourseCategory = "شبكات" | "اختبار الاختراق" | "أنظمة التشغيل" | "التحليل الجنائي" | "الاستجابة للحوادث" | "تحليل البرمجيات الخبيثة" | "التشفير";
type LabDifficulty = "مبتدئ" | "متوسط" | "متقدم";

interface Admin {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
}

export default function AdminDashboard() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'dashboard');
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  // State for data
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [labConnections, setLabConnections] = useState<LabConnection[]>([]);

  // State for forms
  const [newUser, setNewUser] = useState<{ name: string; email: string; role: UserRole; avatar_url?: string }>({ name: "", email: "", role: "طالب" });
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newCourse, setNewCourse] = useState<{
    title: string
    description: string
    level: CourseLevel
    category: CourseCategory
  }>({
    title: '',
    description: '',
    level: 'مبتدئ',
    category: 'شبكات'
  });
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [newLab, setNewLab] = useState<{ title: string; description: string; instructions: string; course_id: number; difficulty: LabDifficulty }>({ title: "", description: "", instructions: "", course_id: 0, difficulty: "مبتدئ" });
  const [editingLab, setEditingLab] = useState<Lab | null>(null);
  const [newLesson, setNewLesson] = useState({
    title: "",
    course_id: 0,
    duration: "",
    lesson_order: 1,
    content: "",
    description: "",
    status: "مسودة" as 'منشور' | 'مسودة'
  });
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [courseImageFile, setCourseImageFile] = useState<File | null>(null);
  const [editingCourseImageFile, setEditingCourseImageFile] = useState<File | null>(null);
  const [badgeImageFile, setBadgeImageFile] = useState<File | null>(null);
  const [editingBadgeImageFile, setEditingBadgeImageFile] = useState<File | null>(null);
  
  // Badge state
  const [newBadge, setNewBadge] = useState<{ name: string; description: string }>({ name: "", description: "" });
  const [editingBadge, setEditingBadge] = useState<{ name: string; description: string }>({ name: "", description: "" });

  // Dialog states
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [courseDialogOpen, setCourseDialogOpen] = useState(false);
  const [labDialogOpen, setLabDialogOpen] = useState(false);
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);

  // Search and filter states
  const [userSearch, setUserSearch] = useState("");
  const [courseSearch, setCourseSearch] = useState("");
  const [lessonSearch, setLessonSearch] = useState("");
  const [labSearch, setLabSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Add state for lab devices and questions
  const [labDevices, setLabDevices] = useState<LabDevice[]>([]);
  const [labQuestions, setLabQuestions] = useState<LabQuestion[]>([]);
  const [selectedLab, setSelectedLab] = useState<Lab | null>(null);

  // State for new device
  const [newDevice, setNewDevice] = useState<{
    name: string;
    type: DeviceType;
    ip: string;
    url: string;
    lab_id: number;
  }>({
    name: "",
    type: "server",
    ip: "",
    url: "",
    lab_id: 0
  });

  // State for new question
  const [newQuestion, setNewQuestion] = useState({
    question: "",
    correct_answer: "",
    explanation: "",
    lab_id: 0,
    points: 1,
    hints: [] as string[]
  });

  // State for new connection
  const [newConnection, setNewConnection] = useState({
    source_device_id: "",
    target_device_id: "",
    connection_type: "ethernet" as "ethernet" | "wifi" | "fiber" | "copper",
    lab_id: 0
  });

  // State for editing
  const [editingDevice, setEditingDevice] = useState<LabDevice | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<LabQuestion | null>(null);
  const [editingConnection, setEditingConnection] = useState<LabConnection | null>(null);

  // Dialog states
  const [deviceDialogOpen, setDeviceDialogOpen] = useState(false);
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [connectionDialogOpen, setConnectionDialogOpen] = useState(false);
  const [labDetailsDialogOpen, setLabDetailsDialogOpen] = useState(false);

  // State for editing hints
  const [editingHints, setEditingHints] = useState<string[]>([]);

  // إضافة حالة لتخزين بيانات المسؤولين
  const [admins, setAdmins] = useState<Admin[]>([]);

  // متغير لحفظ نص التلميحة الجديدة في نافذة تعديل السؤال
  const [editNewHint, setEditNewHint] = useState("");

  // دالة لتحميل الأجهزة والأسئلة والاتصالات للمختبر المحدد
  const loadLabDetails = async (labId: number) => {
    try {
      const labDetails = await getLabWithDetails(labId);
      setLabDevices(labDetails.devices || []);
      setLabQuestions(labDetails.questions || []);
      
      // تحميل الاتصالات
      const connections = await getLabConnections(labId);
      setLabConnections(connections);
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ أثناء تحميل تفاصيل المختبر",
        variant: "destructive"
      });
    }
  };

  // دالة لتحميل جميع الاتصالات
  const loadAllConnections = async () => {
    try {
      const { data: connectionsData, error: connectionsError } = await createClientComponentClient()
        .from('lab_connections')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!connectionsError && connectionsData) {
        setLabConnections(connectionsData);
      } else {
        console.error('Error loading all connections:', connectionsError);
        setLabConnections([]);
      }
    } catch (error: any) {
      console.error('Error loading all connections:', error);
      setLabConnections([]);
    }
  };

  // جلب بيانات المسؤولين عند تحميل الدروس
  useEffect(() => {
    const fetchAdmins = async () => {
      const adminIds = Array.from(new Set(lessons.map(l => l.admin_id).filter(Boolean)));
      if (adminIds.length === 0) return;
      const { data, error } = await createClientComponentClient()
        .from('admins')
        .select('id, name, email, avatar_url')
        .in('id', adminIds);
      if (!error && data) setAdmins(data);
    };
    fetchAdmins();
  }, [lessons]);

  const getAdminById = (id: string) => admins.find(a => a.id === id);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['dashboard', 'users', 'courses', 'lessons', 'labs'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.pushState({}, '', url.toString());
    
    // تحميل الاتصالات عند فتح تبويب الاتصالات
    if (tab === 'connections') {
      loadAllConnections();
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [usersData, coursesData, lessonsData, labsData] = await Promise.all([
          getUsers(),
          getCourses(),
          getLessons(),
          getLabs()
        ]);
        setUsers(usersData);
        setCourses(coursesData);
        setLessons(lessonsData);
        setLabs(labsData);
      } catch (error: any) {
        toast({ 
          title: "خطأ", 
          description: error.message || "حدث خطأ أثناء جلب البيانات", 
          variant: "destructive" 
        });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const fetchAdminUser = async () => {
      try {
        const { data: { user } } = await createClientComponentClient().auth.getUser();
        if (!user) {
          router.push('/admin/login');
          return;
        }
        const { data: userData, error } = await createClientComponentClient()
          .from('users')
          .select('id, name, email, role')
          .eq('id', user.id)
          .single();
        if (error || !userData) {
          await createClientComponentClient().auth.signOut();
          router.push('/admin/login');
          toast({
            title: "خطأ في الوصول",
            description: "المستخدم غير موجود في قاعدة البيانات",
            variant: "destructive",
          });
          return;
        }
        if (userData.role !== 'مسؤول') {
          await createClientComponentClient().auth.signOut();
          router.push('/admin/login');
          toast({
            title: "غير مصرح بالوصول",
            description: "ليس لديك صلاحيات المسؤول",
            variant: "destructive",
          });
          return;
        }
        setAdminUser(userData);
      } catch (error) {
        await createClientComponentClient().auth.signOut();
        router.push('/admin/login');
        toast({
          title: "خطأ في الوصول",
          description: "حدث خطأ أثناء التحقق من صلاحياتك",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchAdminUser();
  }, [router]);

  // Filtered data based on search
  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    user.email.toLowerCase().includes(userSearch.toLowerCase()) ||
    user.role.toLowerCase().includes(userSearch.toLowerCase())
  )

  const filteredCourses = courses.filter(course =>
    course.title.toLowerCase().includes(courseSearch.toLowerCase()) ||
    (course.description && course.description.toLowerCase().includes(courseSearch.toLowerCase())) ||
    course.level.toLowerCase().includes(courseSearch.toLowerCase())
  )

  const filteredLessons = lessons.filter(
    (lesson): lesson is Lesson => !!lesson && typeof lesson === 'object' && 'title' in lesson
  ).filter(lesson => {
    const matchesSearch = (lesson.title && lesson.title.toLowerCase().includes(lessonSearch.toLowerCase())) ||
    (lesson.description && lesson.description.toLowerCase().includes(lessonSearch.toLowerCase())) ||
      (lesson.status && lesson.status.toLowerCase().includes(lessonSearch.toLowerCase()));
    
    const matchesCourseFilter = courseFilter === 'all' || courseFilter === '' || (lesson.course_id && lesson.course_id.toString() === courseFilter);
    const matchesStatusFilter = statusFilter === 'all' || statusFilter === '' || lesson.status === statusFilter;
    
    return matchesSearch && matchesCourseFilter && matchesStatusFilter;
  })

  const filteredLabs = labs.filter(lab =>
    lab.title.toLowerCase().includes(labSearch.toLowerCase()) ||
    (lab.description && lab.description.toLowerCase().includes(labSearch.toLowerCase())) ||
    lab.difficulty.toLowerCase().includes(labSearch.toLowerCase()) ||
    (courses.find(c => c.id === lab.course_id)?.title.toLowerCase().includes(labSearch.toLowerCase()) || false)
  )

  // User functions
  const handleAddUser = async () => {
    try {
      if (!newUser.name || !newUser.email) {
        throw new Error("يرجى ملء جميع الحقول المطلوبة")
      }

      const user = await createUser({
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        status: "نشط",
        join_date: new Date().toISOString().split('T')[0]
      })

      setUsers([...users, user])
      setNewUser({ name: "", email: "", role: "طالب" })
      setUserDialogOpen(false)
      toast({
        title: "تم بنجاح",
        description: "تم إضافة المستخدم بنجاح",
      })
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ أثناء إضافة المستخدم",
        variant: "destructive",
      })
    }
  }

  const handleUpdateUser = async () => {
    try {
      if (!editingUser) return

      const updatedUser = await updateUser(editingUser.id, editingUser)
      setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u))
      setEditingUser(null)
      toast({
        title: "تم بنجاح",
        description: "تم تحديث بيانات المستخدم",
      })
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ أثناء تحديث المستخدم",
        variant: "destructive",
      })
    }
  }

  const handleDeleteUser = async (id: string) => {
    try {
      await deleteUser(id)
      setUsers(users.filter(u => u.id !== id))
      toast({
        title: "تم بنجاح",
        description: "تم حذف المستخدم",
      })
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ أثناء حذف المستخدم",
        variant: "destructive",
      })
    }
  }

  // Course functions
  const handleAddCourse = async () => {
    try {
      if (!newCourse.title) throw new Error("يرجى إدخال عنوان المسار")
      
      let imageUrl = ''
      
      if (courseImageFile) {
        try {
          const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp', 'image/tiff']
          if (!allowedTypes.includes(courseImageFile.type)) {
            throw new Error(`نوع الملف ${courseImageFile.type} غير مدعوم. الأنواع المدعومة: JPG, PNG, GIF, WebP, SVG, BMP, TIFF`)
          }
          
          const fileExt = courseImageFile.name.split('.').pop()
          const fileName = `course-${Date.now()}.${fileExt}`
          
          const { data: uploadData, error: uploadError } = await createClientComponentClient()
            .storage
            .from('course-images')
            .upload(fileName, courseImageFile)
          
          if (uploadError) {
            if (uploadError.message?.includes('bucket')) {
              throw new Error('bucket صور المسارات غير موجود. يرجى تنفيذ ملف create_bucket_manually.sql في Supabase أولاً')
            }
            if (uploadError.message?.includes('mime type')) {
              throw new Error(`نوع الملف غير مدعوم. يرجى اختيار ملف بصيغة: JPG, PNG, GIF, WebP, SVG, BMP, TIFF`)
            }
            throw new Error(`فشل في رفع الصورة: ${uploadError.message || 'خطأ غير معروف'}`)
          }
          
          const { data: urlData } = createClientComponentClient()
            .storage
            .from('course-images')
            .getPublicUrl(fileName)
          
          imageUrl = urlData.publicUrl
          
        } catch (uploadError: any) {
          throw new Error(`خطأ في رفع الصورة: ${uploadError.message}`)
        }
      }
      
      const course = await createCourse({
        title: newCourse.title,
        description: newCourse.description,
        level: newCourse.level,
        category: newCourse.category,
        status: "منشور",
        students: 0,
        price: 0,
        duration: '',
        rating: 0,
        image: imageUrl
      })

      // إنشاء شارة للمسار تلقائياً بدون صورة
      try {
        const supabase = createClientComponentClient()
        
        // التحقق من وجود جدول course_badges أولاً
        const { data: tableCheck, error: tableError } = await supabase
          .from('course_badges')
          .select('id')
          .limit(1)
        
        if (tableError) {
          console.error('Table check error:', tableError)
          toast({ 
            title: "تحذير", 
            description: "تم إنشاء المسار بنجاح ولكن جدول الشارات غير موجود. يرجى تنفيذ ملف check_badge_system.sql في Supabase", 
            variant: "destructive" 
          })
        } else {
          // إنشاء الشارة بدون صورة
          const { data: badgeData, error: badgeError } = await supabase
            .from('course_badges')
            .insert({
              course_id: course.id,
              name: `شارة ${newCourse.title}`,
              description: `شارة إنجاز لإكمال مسار ${newCourse.title}`,
              color: getBadgeColor(newCourse.level)
            })
            .select()
            .single()

          if (badgeError) {
            console.error('Error creating badge:', badgeError)
            let errorMessage = "تم إنشاء المسار بنجاح ولكن فشل في إنشاء الشارة"
            
            if (badgeError.code === '23505') {
              errorMessage = "تم إنشاء المسار بنجاح ولكن الشارة موجودة مسبقاً"
            } else if (badgeError.code === '23503') {
              errorMessage = "تم إنشاء المسار بنجاح ولكن فشل في إنشاء الشارة - مشكلة في العلاقة مع المسار"
            } else if (badgeError.message) {
              errorMessage = `تم إنشاء المسار بنجاح ولكن فشل في إنشاء الشارة: ${badgeError.message}`
            } else if (badgeError.details) {
              errorMessage = `تم إنشاء المسار بنجاح ولكن فشل في إنشاء الشارة: ${badgeError.details}`
            } else if (badgeError.hint) {
              errorMessage = `تم إنشاء المسار بنجاح ولكن فشل في إنشاء الشارة: ${badgeError.hint}`
            }
            
            toast({ 
              title: "تحذير", 
              description: errorMessage, 
              variant: "destructive" 
            })
          } else {
            console.log('Badge created successfully:', badgeData)
            toast({ 
              title: "تم بنجاح", 
              description: "تم إنشاء المسار والشارة بنجاح" 
            })
          }
        }
      } catch (badgeError: any) {
        console.error('Error creating badge:', badgeError)
        let errorMessage = "تم إنشاء المسار بنجاح ولكن فشل في إنشاء الشارة"
        
        if (badgeError.message) {
          errorMessage = `تم إنشاء المسار بنجاح ولكن فشل في إنشاء الشارة: ${badgeError.message}`
        }
        
        toast({ 
          title: "تحذير", 
          description: errorMessage, 
          variant: "destructive" 
        })
      }

      setCourses([...courses, course])
      setNewCourse({ title: "", description: "", level: "مبتدئ", category: "شبكات" })
      setCourseImageFile(null)
      setCourseDialogOpen(false)
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message || "حدث خطأ أثناء إضافة المسار", variant: "destructive" })
    }
  }

  // دالة لتحديد لون الشارة حسب مستوى المسار
  const getBadgeColor = (level: CourseLevel) => {
    switch (level) {
      case 'مبتدئ':
        return '#fbbf24' // yellow
      case 'متوسط':
        return '#3b82f6' // blue
      case 'متقدم':
        return '#10b981' // green
      default:
        return '#8b5cf6' // purple
    }
  }

  const handleUpdateCourse = async () => {
    try {
      if (!editingCourse) return
      
      let imageUrl = editingCourse.image || ''
      
      // Handle course image upload
      if (editingCourseImageFile) {
        try {
          const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp', 'image/tiff']
          if (!allowedTypes.includes(editingCourseImageFile.type)) {
            throw new Error(`نوع الملف ${editingCourseImageFile.type} غير مدعوم. الأنواع المدعومة: JPG, PNG, GIF, WebP, SVG, BMP, TIFF`)
          }
          
          const fileExt = editingCourseImageFile.name.split('.').pop()
          const fileName = `course-${Date.now()}.${fileExt}`
          
          const { data: uploadData, error: uploadError } = await createClientComponentClient()
            .storage
            .from('course-images')
            .upload(fileName, editingCourseImageFile)
          
          if (uploadError) {
            if (uploadError.message?.includes('bucket')) {
              throw new Error('bucket صور المسارات غير موجود. يرجى تنفيذ ملف create_bucket_manually.sql في Supabase أولاً')
            }
            if (uploadError.message?.includes('mime type')) {
              throw new Error(`نوع الملف غير مدعوم. يرجى اختيار ملف بصيغة: JPG, PNG, GIF, WebP, SVG, BMP, TIFF`)
            }
            throw new Error(`فشل في رفع الصورة: ${uploadError.message || 'خطأ غير معروف'}`)
          }
          
          const { data: urlData } = createClientComponentClient()
            .storage
            .from('course-images')
            .getPublicUrl(fileName)
          
          imageUrl = urlData.publicUrl
          
        } catch (uploadError: any) {
          throw new Error(`خطأ في رفع الصورة: ${uploadError.message}`)
        }
      }
      
      // Update course
      const updated = await updateCourse(editingCourse.id, { ...editingCourse, image: imageUrl })
      setCourses(courses.map(c => c.id === updated.id ? updated : c))
      
      // Update or create badge
      try {
        const supabase = createClientComponentClient()
        
        // Check if badge already exists for this course
        const { data: existingBadge } = await supabase
          .from('course_badges')
          .select('id')
          .eq('course_id', editingCourse.id)
          .single()
        
        if (existingBadge) {
          // Update existing badge
          const { error: badgeError } = await supabase
            .from('course_badges')
            .update({
              name: `شارة ${editingCourse.title}`,
              description: `شارة إنجاز لإكمال مسار ${editingCourse.title}`,
              color: getBadgeColor(editingCourse.level),
              updated_at: new Date().toISOString()
            })
            .eq('course_id', editingCourse.id)
          
          if (badgeError) {
            console.error('Error updating badge:', badgeError)
            toast({ 
              title: "تحذير", 
              description: "تم تحديث المسار بنجاح ولكن فشل في تحديث الشارة", 
              variant: "destructive" 
            })
          } else {
            toast({ 
              title: "تم بنجاح", 
              description: "تم تحديث المسار والشارة بنجاح" 
            })
          }
        } else {
          // Create new badge
          const { error: badgeError } = await supabase
            .from('course_badges')
            .insert({
              course_id: editingCourse.id,
              name: `شارة ${editingCourse.title}`,
              description: `شارة إنجاز لإكمال مسار ${editingCourse.title}`,
              color: getBadgeColor(editingCourse.level)
            })
          
          if (badgeError) {
            console.error('Error creating badge:', badgeError)
            toast({ 
              title: "تحذير", 
              description: "تم تحديث المسار بنجاح ولكن فشل في إنشاء الشارة", 
              variant: "destructive" 
            })
          } else {
            toast({ 
              title: "تم بنجاح", 
              description: "تم تحديث المسار وإنشاء شارة جديدة" 
            })
          }
        }
      } catch (badgeError: any) {
        console.error('Error handling badge:', badgeError)
        toast({ 
          title: "تحذير", 
          description: "تم تحديث المسار بنجاح ولكن فشل في تحديث الشارة", 
          variant: "destructive" 
        })
      }
      
      setEditingCourse(null)
      setEditingCourseImageFile(null)
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message || "حدث خطأ أثناء تحديث المسار", variant: "destructive" })
    }
  }

  const handleDeleteCourse = async (id: number) => {
    try {
      await deleteCourse(id)
      setCourses(courses.filter(c => c.id !== id))
      toast({ title: "تم بنجاح", description: "تم حذف المسار" })
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message || "حدث خطأ أثناء حذف المسار", variant: "destructive" })
    }
  }

  // Lesson functions
  const handleAddLesson = async () => {
    try {
      if (!newLesson.title || !newLesson.course_id || !newLesson.content) {
        toast({ 
          title: "خطأ", 
          description: "يرجى ملء العنوان والمسار والمحتوى", 
          variant: "destructive" 
        })
        return
      }
      
      const lessonData = {
        title: newLesson.title,
        course_id: newLesson.course_id,
        duration: newLesson.duration || undefined,
        lesson_order: newLesson.lesson_order,
        content: newLesson.content,
        description: newLesson.description || undefined,
        status: newLesson.status
      }
      
      // إنشاء الدرس مع الروابط
      const lesson = await createLessonWithUrls(lessonData, lessonMaterialUrls.filter(url => url.trim() !== ''));
      setLessons([...lessons, lesson]);
      setNewLesson({ title: "", course_id: 0, duration: "", lesson_order: 1, content: "", description: "", status: "مسودة" });
      setLessonMaterialUrls(['']);
      setLessonDialogOpen(false);
      toast({ title: "تم بنجاح", description: "تم إضافة الدرس بنجاح" });
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message || "حدث خطأ أثناء إضافة الدرس", variant: "destructive" })
    }
  }

  const handleUpdateLesson = async () => {
    try {
      if (!editingLesson) return;
      
      if (!editingLesson.title || !editingLesson.course_id || !editingLesson.content) {
        toast({ 
          title: "خطأ", 
          description: "يرجى ملء العنوان والمسار والمحتوى", 
          variant: "destructive" 
        })
        return
      }
      const lessonData = {
        title: editingLesson.title,
        course_id: editingLesson.course_id,
        duration: editingLesson.duration || undefined,
        lesson_order: editingLesson.lesson_order,
        content: editingLesson.content,
        description: editingLesson.description || undefined,
        status: editingLesson.status
      }
      // استخدم updateLessonWithUrls
      const lesson = await updateLessonWithUrls(editingLesson.id, lessonData, editLessonMaterialUrls.filter(url => url.trim() !== ''));
      setLessons(lessons.map(l => l.id === editingLesson.id ? lesson : l));
      setEditingLesson(null);
      setEditLessonMaterialUrls(['']);
      setEditLessonMaterials([]);
      toast({ title: "تم بنجاح", description: "تم تحديث الدرس بنجاح" });
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message || "حدث خطأ أثناء تحديث الدرس", variant: "destructive" })
    }
  }

  const handleDeleteLesson = async (id: number) => {
    try {
      await deleteLesson(id)
      setLessons(lessons.filter(l => l.id !== id))
      toast({ title: "تم بنجاح", description: "تم حذف الدرس" })
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message || "حدث خطأ أثناء حذف الدرس", variant: "destructive" })
    }
  }

  // Lab functions
  const handleAddLab = async () => {
    try {
      if (!newLab.title || !newLab.course_id) {
        toast({ 
          title: "خطأ", 
          description: "يرجى ملء العنوان والمسار", 
          variant: "destructive" 
        })
        return
      }

      const lab = await createLab({
        title: newLab.title,
        description: newLab.description,
        instructions: newLab.instructions,
        course_id: newLab.course_id,
        difficulty: newLab.difficulty,
        status: "نشط"
      })

      setLabs([...labs, lab])
      setNewLab({ title: "", description: "", instructions: "", course_id: 0, difficulty: "مبتدئ" })
      setLabDialogOpen(false)
      toast({ title: "تم بنجاح", description: "تم إضافة المختبر بنجاح" })
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message || "حدث خطأ أثناء إضافة المختبر", variant: "destructive" })
    }
  }

  const handleUpdateLab = async () => {
    try {
      if (!editingLab) return

      const updatedLab = await updateLab(editingLab.id, editingLab)
      setLabs(labs.map(l => l.id === updatedLab.id ? updatedLab : l))
      setEditingLab(null)
      toast({ title: "تم بنجاح", description: "تم تحديث بيانات المختبر" })
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message || "حدث خطأ أثناء تحديث المختبر", variant: "destructive" })
    }
  }

  const handleDeleteLab = async (id: number) => {
    try {
      await deleteLab(id)
      setLabs(labs.filter(l => l.id !== id))
      toast({ title: "تم بنجاح", description: "تم حذف المختبر" })
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message || "حدث خطأ أثناء حذف المختبر", variant: "destructive" })
    }
  }

  // Lab Device functions
  const handleAddDevice = async () => {
    try {
      console.log('Adding device with data:', newDevice);

      if (!newDevice.name || !newDevice.ip || !newDevice.lab_id) {
        toast({ 
          title: "خطأ", 
          description: "يرجى ملء جميع الحقول المطلوبة", 
          variant: "destructive" 
        })
        return
      }

      // تحقق من صحة الرابط إذا كان غير فارغ
      if (newDevice.url && newDevice.url.trim() !== "") {
        const url = newDevice.url.trim();
        const isRDP = url.endsWith('.rdp');
        const isSSH = url.startsWith('ssh://');
        const isVPC = url.startsWith('vpc://');
        if (!isRDP && !isSSH && !isVPC) {
          toast({
            title: "رابط غير مدعوم",
            description: "يجب أن يكون الرابط ملف RDP أو SSH أو VPC فقط (ssh:// أو vpc:// أو .rdp)",
            variant: "destructive"
          });
          return;
        }
      }

      // رفع ملف RDP إذا تم اختياره
      let uploadedRdpUrl = "";
      if (newDeviceFile) {
        if (!newDeviceFile.name.endsWith('.rdp')) {
          toast({ title: "خطأ", description: "يجب أن يكون الملف بصيغة .rdp فقط", variant: "destructive" });
          return;
        }
        const fileName = `device-${Date.now()}.rdp`;
        const { data, error } = await createClientComponentClient()
          .storage
          .from('device-files')
          .upload(fileName, newDeviceFile);
        if (error) {
          toast({ title: "خطأ في رفع الملف", description: error.message, variant: "destructive" });
          return;
        }
        const { data: urlData } = createClientComponentClient()
          .storage
          .from('device-files')
          .getPublicUrl(fileName);
        uploadedRdpUrl = urlData.publicUrl;
      }

      const deviceData = {
        name: newDevice.name,
        type: newDevice.type,
        ip: newDevice.ip,
        url: uploadedRdpUrl || newDevice.url, // إذا تم رفع ملف استخدم رابطه، وإلا استخدم الرابط النصي
        lab_id: newDevice.lab_id,
        color: "#10B981",
        x: 100,
        y: 100,
        icon: DEVICE_TYPES[newDevice.type].icon
      };

      console.log('Sending device data:', deviceData);

      const device = await addLabDevice(deviceData)

      console.log('Device added successfully:', device);

      setLabDevices([...labDevices, device])
      setNewDevice({ name: "", type: "server", ip: "", url: "", lab_id: 0 })
      setNewDeviceFile(null)
      setDeviceDialogOpen(false)

      // تحديث القائمة من قاعدة البيانات
      if (selectedLab) {
        await loadLabDetails(selectedLab.id);
      }

      toast({ title: "تم بنجاح", description: "تم إضافة الجهاز بنجاح" })
    } catch (error: any) {
      console.error('Error adding device:', error);
      toast({ title: "خطأ", description: error.message || "حدث خطأ أثناء إضافة الجهاز", variant: "destructive" })
    }
  }

  const handleUpdateDevice = async (updatedDeviceOverride?: LabDevice) => {
    try {
      const deviceToUpdate = updatedDeviceOverride || editingDevice;
      if (!deviceToUpdate) return;
      const updatedDevice = await updateLabDevice(deviceToUpdate.id, deviceToUpdate)
      setLabDevices(labDevices.map(d => d.id === updatedDevice.id ? updatedDevice : d))
      setEditingDevice(null)
      toast({ title: "تم بنجاح", description: "تم تحديث بيانات الجهاز" })
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message || "حدث خطأ أثناء تحديث الجهاز", variant: "destructive" })
    }
  }

  const handleDeleteDevice = async (id: string) => {
    try {
      await deleteLabDevice(id)
      setLabDevices(labDevices.filter(d => d.id !== id))
      
      // تحديث القائمة من قاعدة البيانات
      if (selectedLab) {
        await loadLabDetails(selectedLab.id);
      }
      
      toast({ title: "تم بنجاح", description: "تم حذف الجهاز" })
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message || "حدث خطأ أثناء حذف الجهاز", variant: "destructive" })
    }
  }

  // Lab Question functions
  const handleAddQuestion = async () => {
    try {
      console.log('Adding question with data:', newQuestion);
      
      if (!newQuestion.question || !newQuestion.correct_answer || !newQuestion.lab_id) {
        console.log('Validation failed:', {
          question: newQuestion.question,
          correct_answer: newQuestion.correct_answer,
          lab_id: newQuestion.lab_id
        });
        toast({ 
          title: "خطأ", 
          description: "يرجى ملء جميع الحقول المطلوبة", 
          variant: "destructive" 
        })
        return
      }
      
      const questionData = {
        question: newQuestion.question,
        correct_answer: newQuestion.correct_answer,
        explanation: newQuestion.explanation,
        lab_id: newQuestion.lab_id,
        points: newQuestion.points,
        hints: newQuestion.hints.map((hint, index) => ({ hint, id: index + 1 }))
      };
      
      console.log('Sending question data:', questionData);
      
      const question = await addLabQuestion(questionData)

      console.log('Question added successfully:', question);
      
      setLabQuestions([...labQuestions, question])
      setNewQuestion({ question: "", correct_answer: "", explanation: "", lab_id: 0, points: 1, hints: [] })
      setQuestionDialogOpen(false)
      
      // تحديث القائمة من قاعدة البيانات
      if (selectedLab) {
        await loadLabDetails(selectedLab.id);
      }
      
      toast({ title: "تم بنجاح", description: "تم إضافة السؤال بنجاح" })
    } catch (error: any) {
      console.error('Error adding question:', error);
      toast({ title: "خطأ", description: error.message || "حدث خطأ أثناء إضافة السؤال", variant: "destructive" })
    }
  }

  const handleUpdateQuestion = async () => {
    try {
      if (!editingQuestion) return
      
      const updatedQuestion = await updateLabQuestion(editingQuestion.id, editingQuestion)
      setLabQuestions(labQuestions.map(q => q.id === updatedQuestion.id ? updatedQuestion : q))
      setEditingQuestion(null)
      toast({ title: "تم بنجاح", description: "تم تحديث السؤال" })
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message || "حدث خطأ أثناء تحديث السؤال", variant: "destructive" })
    }
  }

  const handleDeleteQuestion = async (id: string) => {
    try {
      await deleteLabQuestion(id)
      setLabQuestions(labQuestions.filter(q => q.id !== id))
      
      // تحديث القائمة من قاعدة البيانات
      if (selectedLab) {
        await loadLabDetails(selectedLab.id);
      }
      
      toast({ title: "تم بنجاح", description: "تم حذف السؤال" })
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message || "حدث خطأ أثناء حذف السؤال", variant: "destructive" })
    }
  }

  // Lab Connection functions
  const handleAddConnection = async () => {
    try {
      console.log('Adding connection with data:', newConnection);
      
      if (!newConnection.source_device_id || !newConnection.target_device_id || !newConnection.lab_id) {
      toast({ 
          title: "خطأ", 
          description: "يرجى اختيار الجهازين والمختبر", 
          variant: "destructive" 
        })
        return
      }

      if (newConnection.source_device_id === newConnection.target_device_id) {
        toast({ 
          title: "خطأ", 
          description: "لا يمكن إنشاء اتصال بين الجهاز ونفسه", 
          variant: "destructive" 
        })
        return
      }
      
      // تحديد سرعة الاتصال بناءً على النوع
      let bandwidth = "100 Mbps";
      let latency = 5;

      if (newConnection.connection_type === "wifi") {
        bandwidth = "54 Mbps";
        latency = 10;
      } else if (newConnection.connection_type === "fiber") {
        bandwidth = "1 Gbps";
        latency = 2;
      } else if (newConnection.connection_type === "copper") {
        bandwidth = "10 Mbps";
        latency = 15;
      }

      const connectionData = {
        source_device_id: newConnection.source_device_id,
        target_device_id: newConnection.target_device_id,
        connection_type: newConnection.connection_type,
        status: "disconnected" as "connected" | "disconnected" | "connecting",
        bandwidth,
        latency,
        lab_id: newConnection.lab_id
      };
      
      console.log('Sending connection data:', connectionData);
      
      const connection = await addLabConnection(connectionData)

      console.log('Connection added successfully:', connection);
      
      setLabConnections([...labConnections, connection])
      setNewConnection({ source_device_id: "", target_device_id: "", connection_type: "ethernet", lab_id: 0 })
      setConnectionDialogOpen(false)
      
      // تحديث القائمة من قاعدة البيانات
      if (selectedLab) {
        await loadLabDetails(selectedLab.id);
      }
      
      toast({ title: "تم بنجاح", description: "تم إضافة الاتصال بنجاح" })
    } catch (error: any) {
      console.error('Error adding connection:', error);
      toast({ title: "خطأ", description: error.message || "حدث خطأ أثناء إضافة الاتصال", variant: "destructive" })
    }
  }

  const handleUpdateConnection = async () => {
    try {
      if (!editingConnection) return
      
      const updatedConnection = await updateLabConnection(editingConnection.id, editingConnection)
      setLabConnections(labConnections.map(c => c.id === updatedConnection.id ? updatedConnection : c))
      setEditingConnection(null)
      toast({ title: "تم بنجاح", description: "تم تحديث الاتصال" })
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message || "حدث خطأ أثناء تحديث الاتصال", variant: "destructive" })
    }
  }

  const handleDeleteConnection = async (id: string) => {
    try {
      await deleteLabConnection(id)
      setLabConnections(labConnections.filter(c => c.id !== id))
      
      // تحديث القائمة من قاعدة البيانات
      if (selectedLab) {
        await loadLabDetails(selectedLab.id);
      }
      
      toast({ title: "تم بنجاح", description: "تم حذف الاتصال" })
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message || "حدث خطأ أثناء حذف الاتصال", variant: "destructive" })
    }
  }

  const handleToggleConnectionStatus = async (id: string) => {
    try {
      const updatedConnection = await toggleConnectionStatus(id)
      setLabConnections(labConnections.map(c => c.id === updatedConnection.id ? updatedConnection : c))
      toast({ 
        title: "تم بنجاح", 
        description: `الاتصال الآن ${updatedConnection.status === "connected" ? "متصل" : "غير متصل"}` 
      })
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message || "حدث خطأ أثناء تغيير حالة الاتصال", variant: "destructive" })
    }
  }

  const handleDeviceMove = (deviceId: string, x: number, y: number) => {
    // Implement device move logic
    console.log(`Device ${deviceId} moved to (${x}, ${y})`);
  };

  // بعد تعريف useState للحقول الأخرى:
  const [lessonFiles, setLessonFiles] = useState<File[]>([]);
  const [editLessonFiles, setEditLessonFiles] = useState<File[]>([]);
  const [editLessonMaterials, setEditLessonMaterials] = useState<{id:number, name:string, url:string}[]>([]);
  const [lessonMaterialUrls, setLessonMaterialUrls] = useState<string[]>(['']);
  const [editLessonMaterialUrls, setEditLessonMaterialUrls] = useState<string[]>(['']);

  // دالة التشخيص
  const handleDiagnose = async () => {
    try {
      console.log('بدء تشخيص النظام...');
      const results = await diagnoseSystem();
      
      toast({
        title: "تم التشخيص",
        description: `تم فحص النظام. راجع Console (F12) للتفاصيل.`,
        variant: "default"
      });
    } catch (error: any) {
      toast({
        title: "خطأ في التشخيص",
        description: error.message || "حدث خطأ أثناء التشخيص",
        variant: "destructive"
      });
    }
  };

  // بعد تعريف useState للحقول الأخرى:
  const [newDeviceFile, setNewDeviceFile] = useState<File | null>(null);
  const [editDeviceFile, setEditDeviceFile] = useState<File | null>(null);

  const [notificationForm, setNotificationForm] = useState({
    title: '',
    message: '',
    user_id: 'all' // all = إشعار عام
  });
  const [sending, setSending] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  if (loading) {
    return <div className="text-center text-white p-10">جاري التحميل...</div>;
  }
  if (!adminUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black flex flex-row-reverse">
      <Sidebar />
      <div className="flex-1 mr-64 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
            <div className="flex justify-between items-center mb-8">
              <div>
            <h1 className="text-2xl font-bold text-white mb-2">لوحة تحكم المسؤول</h1>
            <p className="text-gray-300">مرحباً {adminUser.name} ({adminUser.email})</p>
                </div>
                <Button
                  variant="outline"
            className="border-red-500/20 text-red-500 hover:bg-red-500/10 hover:border-red-500/40"
                  onClick={async () => {
              await createClientComponentClient().auth.signOut();
              router.push("/admin/login");
            }}
          >
            <LogOut className="w-4 h-4 ml-2" /> تسجيل خروج
                </Button>
              </div>
        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-8">
          <Button variant={activeTab === 'dashboard' ? 'default' : 'outline'} onClick={() => handleTabChange('dashboard')}><Monitor className="w-4 h-4 ml-2" />الرئيسية</Button>
          <Button variant={activeTab === 'users' ? 'default' : 'outline'} onClick={() => handleTabChange('users')}><Users className="w-4 h-4 ml-2" />المستخدمون</Button>
          <Button variant={activeTab === 'courses' ? 'default' : 'outline'} onClick={() => handleTabChange('courses')}><BookOpen className="w-4 h-4 ml-2" />المسارات</Button>
          <Button variant={activeTab === 'lessons' ? 'default' : 'outline'} onClick={() => handleTabChange('lessons')}><FileText className="w-4 h-4 ml-2" />الدروس</Button>
          <Button variant={activeTab === 'labs' ? 'default' : 'outline'} onClick={() => handleTabChange('labs')}><Network className="w-4 h-4 ml-2" />المختبرات</Button>
          <Button variant={activeTab === 'connections' ? 'default' : 'outline'} onClick={() => handleTabChange('connections')}><Network className="w-4 h-4 ml-2" />الاتصالات</Button>
          <Button variant={activeTab === 'notifications' ? 'default' : 'outline'} onClick={() => handleTabChange('notifications')}>
            <Bell className="w-4 h-4 ml-2" />الإشعارات
          </Button>
            </div>
        {/* محتوى التبويبات سيضاف لاحقاً */}
            {activeTab === 'dashboard' && (
          <Card className="bg-gray-900/50 border-[#8648f9]/20 mb-6">
            <CardHeader>
              <CardTitle className="text-white">
                إحصائيات سريعة
              </CardTitle>
              <CardDescription className="text-gray-300">نظرة عامة على النظام</CardDescription>
                    </CardHeader>
                    <CardContent>
              <ul className="space-y-2 text-lg">
                <li>عدد المستخدمين: {users.length}</li>
                <li>عدد المسارات: {courses.length}</li>
                <li>عدد الدروس: {lessons.length}</li>
                <li>عدد المختبرات: {labs.length}</li>
              </ul>
                    </CardContent>
                  </Card>
        )}
        {activeTab === 'users' && (
          <Card className="bg-gray-900/50 border-[#8648f9]/20 mb-6">
                  <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="w-5 h-5 ml-2" /> إدارة المستخدمين
                <Button size="sm" className="ml-auto" onClick={() => setUserDialogOpen(true)}>
                  <Plus className="w-4 h-4 ml-1" /> مستخدم جديد
                </Button>
              </CardTitle>
              <CardDescription className="text-gray-300">إضافة وتعديل وحذف المستخدمين</CardDescription>
                    </CardHeader>
                    <CardContent>
              <div className="mb-4 flex items-center gap-2">
                <Input
                  placeholder="بحث بالاسم أو البريد أو الدور..."
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  className="w-64"
                />
                      </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الاسم</TableHead>
                      <TableHead>البريد</TableHead>
                      <TableHead>الدور</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>تاريخ الانضمام</TableHead>
                      <TableHead>إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-gray-400">لا يوجد مستخدمون</TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers.map(user => (
                        <TableRow key={user.id}>
                          <TableCell>{user.name}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>{user.role}</TableCell>
                          <TableCell>
                            <Badge variant={user.status === 'نشط' ? 'default' : 'outline'} className={user.status === 'نشط' ? 'border-green-500/20 text-green-500' : 'border-red-500/20 text-red-500'}>
                              {user.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{user.join_date}</TableCell>
                          <TableCell>
                            <Button size="icon" variant="outline" onClick={() => setEditingUser(user)}><Edit className="w-4 h-4" /></Button>
                            <Button size="icon" variant="outline" className="ml-2" onClick={() => handleDeleteUser(user.id)}><Trash2 className="w-4 h-4" /></Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                    </div>
                    </CardContent>
                  </Card>
        )}
        {activeTab === 'courses' && (
          <Card className="bg-gray-900/50 border-[#8648f9]/20 mb-6">
                <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 ml-2" /> إدارة المسارات
                <Button size="sm" className="ml-auto" onClick={() => setCourseDialogOpen(true)}>
                  <Plus className="w-4 h-4 ml-1" /> مسار جديد
                        </Button>
              </CardTitle>
              <CardDescription className="text-gray-300">إضافة وتعديل وحذف المسارات التعليمية</CardDescription>
                    </CardHeader>
                    <CardContent>
              <div className="mb-4 flex items-center gap-2">
                            <Input
                  placeholder="بحث في المسارات..."
                  value={courseSearch}
                  onChange={e => setCourseSearch(e.target.value)}
                  className="w-64"
                            />
                          </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCourses.length === 0 ? (
                  <div className="col-span-full text-center text-gray-400 py-8">لا يوجد مسارات</div>
                ) : (
                  filteredCourses.map(course => (
                    <Card key={course.id} className="bg-gray-800/50 border-gray-700">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-white text-lg">{course.title}</CardTitle>
                          <div className="flex gap-1">
                            <Button size="icon" variant="outline" onClick={() => setEditingCourse(course)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="outline" onClick={() => handleDeleteCourse(course.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          </div>
                        <CardDescription className="text-gray-300">{course.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between text-sm">
                          <Badge variant="outline" className="border-blue-500/20 text-blue-500">
                            {course.level}
                          </Badge>
                          <Badge variant="outline" className="border-green-500/20 text-green-500">
                            {course.category}
                          </Badge>
                          <Badge variant={course.status === 'منشور' ? 'default' : 'outline'}>
                            {course.status}
                          </Badge>
                        </div>
                        {course.image && (
                          <div className="mt-3">
                            <Image
                              src={course.image}
                              alt={course.title}
                              width={200}
                              height={120}
                              className="rounded-md object-cover"
                            />
                              </div>
                        )}
                    </CardContent>
                  </Card>
                  ))
                            )}
                          </div>
            </CardContent>
          </Card>
        )}
        {activeTab === 'lessons' && (
          <Card className="bg-gray-900/50 border-[#8648f9]/20 mb-6">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <FileText className="w-5 h-5 ml-2" /> إدارة الدروس
                <Button size="sm" className="ml-auto" onClick={() => setLessonDialogOpen(true)}>
                  <Plus className="w-4 h-4 ml-1" /> درس جديد
                            </Button>
              </CardTitle>
              <CardDescription className="text-gray-300">إضافة وتعديل وحذف الدروس التعليمية</CardDescription>
                    </CardHeader>
                    <CardContent>
              <div className="mb-4 flex items-center gap-2">
                      <Input
                  placeholder="بحث في الدروس..."
                  value={lessonSearch}
                  onChange={e => setLessonSearch(e.target.value)}
                  className="w-64"
                />
                <Select value={courseFilter} onValueChange={setCourseFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="تصفية حسب المسار" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع المسارات</SelectItem>
                    {courses.map(course => (
                      <SelectItem key={course.id.toString()} value={course.id.toString()}>
                        {course.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="تصفية حسب الحالة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الحالات</SelectItem>
                    <SelectItem value="منشور">منشور</SelectItem>
                    <SelectItem value="مسودة">مسودة</SelectItem>
                  </SelectContent>
                </Select>
                    </div>
              <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>العنوان</TableHead>
                        <TableHead>المسار</TableHead>
                        <TableHead>المدرب</TableHead>
                        <TableHead>الحالة</TableHead>
                        <TableHead>المدة</TableHead>
                        <TableHead>الترتيب</TableHead>
                        <TableHead>المواد التعليمية</TableHead>
                        <TableHead>إجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLessons.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-gray-400">لا يوجد دروس</TableCell>
                        </TableRow>
                      ) : (
                        filteredLessons.map(lesson => (
                          <TableRow key={lesson.id}>
                            <TableCell className="font-medium">{lesson.title}</TableCell>
                            <TableCell>{courses.find(c => c.id === lesson.course_id)?.title || 'غير محدد'}</TableCell>
                            <TableCell>{getAdminById(lesson.admin_id || '')?.name || 'غير محدد'}</TableCell>
                            <TableCell>
                              <Badge variant={lesson.status === 'منشور' ? 'default' : 'outline'}>
                                {lesson.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{lesson.duration || 'غير محدد'}</TableCell>
                            <TableCell>{lesson.lesson_order}</TableCell>
                            <TableCell>
                              {lesson.materials && lesson.materials.length > 0 ? (
                                <div className="space-y-1">
                                  {lesson.materials.slice(0, 2).map((mat: any, idx: number) => (
                                    <div key={mat.id || idx} className="text-xs">
                                      <a href={mat.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                                        {mat.file_name}
                                      </a>
                                    </div>
                                  ))}
                                  {lesson.materials.length > 2 && (
                                    <div className="text-xs text-gray-400">
                                      +{lesson.materials.length - 2} ملفات أخرى
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-400 text-xs">لا توجد ملفات</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button size="icon" variant="outline" onClick={async () => {
                                setEditingLesson(lesson);
                                // تحميل المواد التعليمية
                                try {
                                  const materials = await getLessonMaterials(lesson.id);
                                  const urls = materials.map((mat: any) => mat.file_url);
                                  setEditLessonMaterialUrls(urls.length > 0 ? urls : ['']);
                                  setEditLessonMaterials(materials);
                                } catch (error) {
                                  console.error('Error loading lesson materials:', error);
                                  setEditLessonMaterialUrls(['']);
                                  setEditLessonMaterials([]);
                                }
                              }}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button size="icon" variant="outline" className="ml-2" onClick={() => handleDeleteLesson(lesson.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
              </div>
                    </CardContent>
                  </Card>
        )}
        {activeTab === 'labs' && (
          <Card className="bg-gray-900/50 border-[#8648f9]/20 mb-6">
                  <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Network className="w-5 h-5 ml-2" /> إدارة المختبرات
                <Button size="sm" className="ml-auto" onClick={() => setLabDialogOpen(true)}>
                  <Plus className="w-4 h-4 ml-1" /> مختبر جديد
                                  </Button>
              </CardTitle>
              <CardDescription className="text-gray-300">إضافة وتعديل وحذف المختبرات العملية</CardDescription>
                  </CardHeader>
                  <CardContent>
              <div className="mb-4 flex items-center gap-2">
                                        <Input
                  placeholder="بحث في المختبرات..."
                  value={labSearch}
                  onChange={e => setLabSearch(e.target.value)}
                  className="w-64"
                                        />
                      </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredLabs.length === 0 ? (
                  <div className="col-span-full text-center text-gray-400 py-8">لا يوجد مختبرات</div>
                ) : (
                  filteredLabs.map(lab => (
                    <Card key={lab.id} className="bg-gray-800/50 border-gray-700">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-white text-lg">{lab.title}</CardTitle>
                          <div className="flex gap-1">
                            <Button size="icon" variant="outline" onClick={() => setEditingLab(lab)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="outline" onClick={() => handleDeleteLab(lab.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                      </div>
                      </div>
                        <CardDescription className="text-gray-300">{lab.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">المسار:</span>
                            <span className="text-white">{courses.find(c => c.id === lab.course_id)?.title || 'غير محدد'}</span>
                      </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">المستوى:</span>
                            <Badge variant="outline" className="border-orange-500/20 text-orange-500">
                              {lab.difficulty}
                            </Badge>
                                      </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">الحالة:</span>
                            <Badge variant={lab.status === 'نشط' ? 'default' : 'outline'}>
                              {lab.status}
                            </Badge>
                                      </div>
                                    </div>
                        <div className="mt-4 pt-4 border-t border-gray-700">
                              <Button
                                size="sm"
                                variant="outline"
                            className="w-full"
                            onClick={() => {
                              setSelectedLab(lab);
                              setLabDetailsDialogOpen(true);
                              loadLabDetails(lab.id);
                            }}
                          >
                            <Eye className="w-4 h-4 ml-2" />
                            عرض التفاصيل
                              </Button>
                    </div>
                  </CardContent>
                </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
            )}

        {activeTab === 'connections' && (
          <Card className="bg-gray-900/50 border-[#8648f9]/20 mb-6">
                <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Network className="w-5 h-5 ml-2" /> نظرة عامة على الاتصالات
              </CardTitle>
              <CardDescription className="text-gray-300">إدارة جميع الاتصالات في المختبرات مع مخطط تفاعلي</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* إحصائيات سريعة */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="bg-gray-800/50 border-gray-700">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                    <div>
                          <p className="text-gray-400 text-sm">إجمالي الاتصالات</p>
                          <p className="text-white text-2xl font-bold">{labConnections.length}</p>
                    </div>
                        <Network className="w-8 h-8 text-[#8648f9]" />
                          </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gray-800/50 border-gray-700">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                          <div>
                          <p className="text-gray-400 text-sm">متصل</p>
                          <p className="text-green-500 text-2xl font-bold">
                            {labConnections.filter(c => c.status === 'connected').length}
                          </p>
                          </div>
                        <CheckCircle className="w-8 h-8 text-green-500" />
                          </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gray-800/50 border-gray-700">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                          <div>
                          <p className="text-gray-400 text-sm">غير متصل</p>
                          <p className="text-red-500 text-2xl font-bold">
                            {labConnections.filter(c => c.status === 'disconnected').length}
                          </p>
                              </div>
                        <XCircle className="w-8 h-8 text-red-500" />
                          </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gray-800/50 border-gray-700">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-gray-400 text-sm">المختبرات النشطة</p>
                          <p className="text-blue-500 text-2xl font-bold">
                            {Array.from(new Set(labConnections.map(c => c.lab_id))).length}
                          </p>
                          </div>
                        <Server className="w-8 h-8 text-blue-500" />
                        </div>
                    </CardContent>
                  </Card>
                  </div>

                {/* مخطط الشبكة التفاعلي */}
                {selectedLab && (
                  <Card className="bg-gray-800/50 border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-white">مخطط الشبكة - {selectedLab.title}</CardTitle>
                      <CardDescription className="text-gray-300">
                        عرض تفاعلي للأجهزة والاتصالات في المختبر
                      </CardDescription>
                </CardHeader>
                <CardContent>
                      <div className="h-96 border border-gray-600/20 rounded-lg overflow-hidden">
                        <NetworkDiagram
                          devices={labDevices.map(device => ({
                            ...device,
                            status: "online" as "online" | "offline" | "connecting"
                          }))}
                          connections={labConnections}
                          onDeviceMove={handleDeviceMove}
                          onConnectionCreate={handleAddConnection}
                          onConnectionDelete={handleDeleteConnection}
                          onConnectionToggle={handleToggleConnectionStatus}
                          readOnly={false}
                          labStatus="active"
                      />
                    </div>
                    </CardContent>
                  </Card>
                )}

                {/* قائمة الاتصالات */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-white text-lg font-medium">جميع الاتصالات</h3>
                    <Select 
                      value={selectedLab?.id?.toString() || "all"} 
                      onValueChange={(value) => {
                        if (value === "all") {
                          setSelectedLab(null);
                        } else {
                          const lab = labs.find(l => l.id.toString() === value);
                          if (lab) {
                            setSelectedLab(lab);
                            loadLabDetails(lab.id);
                          }
                        }
                      }}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="تصفية حسب المختبر" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">جميع المختبرات</SelectItem>
                        {labs.map(lab => (
                          <SelectItem key={lab.id} value={lab.id.toString()}>
                            {lab.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(selectedLab ? labConnections : labConnections).length === 0 ? (
                      <div className="col-span-full text-center text-gray-400 py-8">
                        لا توجد اتصالات {selectedLab ? `في ${selectedLab.title}` : ''}
                      </div>
                    ) : (
                      (selectedLab ? labConnections : labConnections).map(connection => {
                        const sourceDevice = labDevices.find(d => d.id === connection.source_device_id);
                        const targetDevice = labDevices.find(d => d.id === connection.target_device_id);
                        const lab = labs.find(l => l.id === connection.lab_id);
                        
                        if (!sourceDevice || !targetDevice) return null;
                        
                        return (
                          <Card key={connection.id} className="bg-gray-800/50 border-gray-700">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-3 h-3 rounded-full"
                                    style={{ 
                                      backgroundColor: connection.status === "connected" ? "#10b981" : "#6b7280" 
                                    }}
                                  />
                                  <Badge variant="outline" className="border-gray-500/20 text-gray-300 text-xs">
                                    {connection.connection_type}
                            </Badge>
                                </div>
                            <Badge
                              variant="outline"
                              className={
                                    connection.status === "connected"
                                  ? "border-green-500/20 text-green-500"
                                  : "border-red-500/20 text-red-500"
                              }
                            >
                                  {connection.status === "connected" ? "متصل" : "غير متصل"}
                            </Badge>
                                      </div>
                              
                              <div className="space-y-2 text-sm">
                                <div className="flex items-center justify-between">
                                  <span className="text-gray-400">من:</span>
                                  <span className="text-white">{sourceDevice.name}</span>
                                      </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-gray-400">إلى:</span>
                                  <span className="text-white">{targetDevice.name}</span>
                                      </div>
                                {connection.bandwidth && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-gray-400">السرعة:</span>
                                    <span className="text-white">{connection.bandwidth}</span>
                                          </div>
                                        )}
                                {connection.latency && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-gray-400">الاستجابة:</span>
                                    <span className="text-white">{connection.latency}ms</span>
                                      </div>
                                )}
                                {lab && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-gray-400">المختبر:</span>
                                    <span className="text-white">{lab.title}</span>
                                    </div>
                                  )}
                              </div>

                              <div className="flex gap-2 mt-3 pt-3 border-t border-gray-600/20">
                              <Button
                                size="sm"
                                variant="outline"
                                  onClick={() => handleToggleConnectionStatus(connection.id)}
                                className={
                                    connection.status === "connected"
                                      ? "border-green-500/20 text-green-500 hover:bg-green-500/10"
                                      : "border-red-500/20 text-red-500 hover:bg-red-500/10"
                                  }
                                >
                                  {connection.status === "connected" ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                  {connection.status === "connected" ? "فصل" : "اتصال"}
                              </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                  onClick={() => setEditingConnection(connection)}
                                  >
                                  <Edit className="w-3 h-3" />
                                  تعديل
                                  </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => handleDeleteConnection(connection.id)}
                                  className="border-red-500/20 text-red-500 hover:bg-red-500/10"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  حذف
                                </Button>
                            </div>
                </CardContent>
              </Card>
                        );
                      })
                    )}
                    </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* User Dialog */}
        <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
                      <DialogContent className="bg-gray-900 border-[#8648f9]/20">
                        <DialogHeader>
              <DialogTitle className="text-white">إضافة مستخدم جديد</DialogTitle>
              <DialogDescription className="text-gray-300">أدخل بيانات المستخدم الجديد</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                <Label htmlFor="name" className="text-white">الاسم</Label>
                            <Input
                  id="name"
                  value={newUser.name}
                  onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                  className="bg-gray-800 border-gray-700 text-white"
                            />
                          </div>
                          <div>
                <Label htmlFor="email" className="text-white">البريد الإلكتروني</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUser.email}
                  onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                  className="bg-gray-800 border-gray-700 text-white"
                            />
                          </div>
                          <div>
                <Label htmlFor="role" className="text-white">الدور</Label>
                <Select value={newUser.role} onValueChange={(value: UserRole) => setNewUser({ ...newUser, role: value })}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="طالب">طالب</SelectItem>
                    <SelectItem value="مدرب">مدرب</SelectItem>
                    <SelectItem value="مسؤول">مسؤول</SelectItem>
                  </SelectContent>
                </Select>
                          </div>
                            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setUserDialogOpen(false)}>إلغاء</Button>
              <Button onClick={handleAddUser}>إضافة</Button>
            </DialogFooter>
                      </DialogContent>
                    </Dialog>

        {/* Course Dialog */}
        <Dialog open={courseDialogOpen} onOpenChange={setCourseDialogOpen}>
                                <DialogContent className="bg-gray-900 border-[#8648f9]/20">
                                  <DialogHeader>
              <DialogTitle className="text-white">إضافة مسار جديد</DialogTitle>
              <DialogDescription className="text-gray-300">أدخل بيانات المسار الجديد</DialogDescription>
                                  </DialogHeader>
                                    <div className="space-y-4">
                                      <div>
                <Label htmlFor="courseTitle" className="text-white">العنوان</Label>
                                        <Input
                  id="courseTitle"
                  value={newCourse.title}
                  onChange={e => setNewCourse({ ...newCourse, title: e.target.value })}
                  className="bg-gray-800 border-gray-700 text-white"
                                        />
                                      </div>
                                      <div>
                <Label htmlFor="courseDescription" className="text-white">الوصف</Label>
                                        <Textarea
                  id="courseDescription"
                  value={newCourse.description}
                  onChange={e => setNewCourse({ ...newCourse, description: e.target.value })}
                  className="bg-gray-800 border-gray-700 text-white"
                                        />
                                      </div>
                                      <div>
                <Label htmlFor="courseLevel" className="text-white">المستوى</Label>
                <Select value={newCourse.level} onValueChange={(value: CourseLevel) => setNewCourse({ ...newCourse, level: value })}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="مبتدئ">مبتدئ</SelectItem>
                    <SelectItem value="متوسط">متوسط</SelectItem>
                    <SelectItem value="متقدم">متقدم</SelectItem>
                  </SelectContent>
                </Select>
                                      </div>
                                      <div>
                <Label htmlFor="courseCategory" className="text-white">التصنيف</Label>
                <Select value={newCourse.category} onValueChange={(value: CourseCategory) => setNewCourse({ ...newCourse, category: value })}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="أساسيات">أساسيات</SelectItem>
                    <SelectItem value="اختبار الاختراق">اختبار الاختراق</SelectItem>
                    <SelectItem value="الاستجابة للحوادث">الاستجابة للحوادث</SelectItem>
                    <SelectItem value="أمان التطبيقات">أمان التطبيقات</SelectItem>
                    <SelectItem value="قواعد البيانات">قواعد البيانات</SelectItem>
                    <SelectItem value="أمان الشبكات">أمان الشبكات</SelectItem>
                    <SelectItem value="تحليل البرمجيات الخبيثة">تحليل البرمجيات الخبيثة</SelectItem>
                    <SelectItem value="أمان السحابة">أمان السحابة</SelectItem>
                    <SelectItem value="أمان الأجهزة المحمولة">أمان الأجهزة المحمولة</SelectItem>
                    <SelectItem value="أمان إنترنت الأشياء">أمان إنترنت الأشياء</SelectItem>
                    <SelectItem value="أمان البنية التحتية">أمان البنية التحتية</SelectItem>
                    <SelectItem value="أمان الذكاء الاصطناعي">أمان الذكاء الاصطناعي</SelectItem>
                  </SelectContent>
                </Select>
                                      </div>
                                      <div>
                <Label htmlFor="courseImage" className="text-white">صورة المسار (اختياري)</Label>
                                          <Input
                  id="courseImage"
                                            type="file"
                                            accept="image/*"
                  onChange={e => setCourseImageFile(e.target.files?.[0] || null)}
                  className="bg-gray-800 border-gray-700 text-white"
                                          />
                                        </div>
                                        <div className="border-t border-gray-700 pt-4">
                                          <h4 className="text-white font-medium mb-3">صورة شارة المسار (اختياري)</h4>
                                          <p className="text-gray-400 text-sm mb-3">
                                            سيتم إنشاء شارة تلقائياً للمسار مع هذه الصورة. عند إكمال المستخدم للمسار سيحصل على هذه الشارة.
                                          </p>
                                          <div>
                                            <Label htmlFor="badgeImage" className="text-white">صورة الشارة</Label>
                                            <Input
                                              id="badgeImage"
                                              type="file"
                                              accept="image/*"
                                              onChange={e => setBadgeImageFile(e.target.files?.[0] || null)}
                                              className="bg-gray-800 border-gray-700 text-white"
                                            />
                                            <p className="text-xs text-gray-400 mt-1">
                                              إذا لم ترفع صورة، سيتم إنشاء شارة بلون افتراضي حسب مستوى المسار
                                            </p>
                                          </div>
                                        </div>
                                          </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCourseDialogOpen(false)}>إلغاء</Button>
              <Button onClick={handleAddCourse}>إضافة</Button>
            </DialogFooter>
                                </DialogContent>
                              </Dialog>

        {/* Lesson Dialog */}
                    <Dialog open={lessonDialogOpen} onOpenChange={setLessonDialogOpen}>
                      <DialogContent className="bg-gray-900 border-[#8648f9]/20 max-w-4xl">
                        <DialogHeader>
                          <DialogTitle className="text-white">إضافة درس جديد</DialogTitle>
                          <DialogDescription className="text-gray-300">أدخل بيانات الدرس الجديد</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                <Label htmlFor="lessonTitle" className="text-white">العنوان</Label>
                            <Input
                              id="lessonTitle"
                              value={newLesson.title}
                  onChange={e => setNewLesson({ ...newLesson, title: e.target.value })}
                  className="bg-gray-800 border-gray-700 text-white"
                            />
                          </div>
                          <div>
                <Label htmlFor="lessonCourse" className="text-white">المسار</Label>
                <Select value={newLesson.course_id.toString()} onValueChange={(value) => setNewLesson({ ...newLesson, course_id: parseInt(value) })}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="اختر المسار" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map(course => (
                      <SelectItem key={course.id} value={course.id.toString()}>
                                  {course.title}
                      </SelectItem>
                              ))}
                  </SelectContent>
                </Select>
                          </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                <Label htmlFor="lessonDuration" className="text-white">المدة</Label>
                <Input
                  id="lessonDuration"
                  placeholder="مثال: 30 دقيقة، ساعة واحدة، 2 ساعة"
                  value={newLesson.duration}
                  onChange={e => setNewLesson({ ...newLesson, duration: e.target.value })}
                  className="bg-gray-800 border-gray-700 text-white"
                />
                          </div>
                          <div>
                <Label htmlFor="lessonOrder" className="text-white">ترتيب الدرس</Label>
                <Input
                  id="lessonOrder"
                  type="number"
                  min="1"
                  value={newLesson.lesson_order}
                  onChange={e => setNewLesson({ ...newLesson, lesson_order: parseInt(e.target.value) || 1 })}
                  className="bg-gray-800 border-gray-700 text-white"
                />
                          </div>
                          </div>
                          <div>
                <Label htmlFor="lessonDescription" className="text-white">الوصف (اختياري)</Label>
                <Textarea
                  id="lessonDescription"
                  placeholder="وصف مختصر للدرس"
                  value={newLesson.description}
                  onChange={e => setNewLesson({ ...newLesson, description: e.target.value })}
                  className="bg-gray-800 border-gray-700 text-white"
                />
                          </div>
                          <div>
                <Label htmlFor="lessonContent" className="text-white">المحتوى</Label>
                <div className="bg-gray-800 border border-gray-700 rounded-md p-3">
                  <div className="flex gap-2 mb-3 border-b border-gray-600 pb-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const textarea = document.getElementById('lessonContent') as HTMLTextAreaElement;
                        const start = textarea.selectionStart;
                        const end = textarea.selectionEnd;
                        const text = textarea.value;
                        const before = text.substring(0, start);
                        const selection = text.substring(start, end);
                        const after = text.substring(end);
                        const newText = before + '<strong>' + selection + '</strong>' + after;
                        setNewLesson({ ...newLesson, content: newText });
                        setTimeout(() => {
                          textarea.focus();
                          textarea.setSelectionRange(start + 8, end + 8);
                        }, 0);
                      }}
                      className="text-xs"
                    >
                      عريض
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const textarea = document.getElementById('lessonContent') as HTMLTextAreaElement;
                        const start = textarea.selectionStart;
                        const end = textarea.selectionEnd;
                        const text = textarea.value;
                        const before = text.substring(0, start);
                        const selection = text.substring(start, end);
                        const after = text.substring(end);
                        const newText = before + '<em>' + selection + '</em>' + after;
                        setNewLesson({ ...newLesson, content: newText });
                        setTimeout(() => {
                          textarea.focus();
                          textarea.setSelectionRange(start + 4, end + 4);
                        }, 0);
                      }}
                      className="text-xs"
                    >
                      مائل
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const textarea = document.getElementById('lessonContent') as HTMLTextAreaElement;
                        const start = textarea.selectionStart;
                        const end = textarea.selectionEnd;
                        const text = textarea.value;
                        const before = text.substring(0, start);
                        const selection = text.substring(start, end);
                        const after = text.substring(end);
                        const newText = before + '<u>' + selection + '</u>' + after;
                        setNewLesson({ ...newLesson, content: newText });
                        setTimeout(() => {
                          textarea.focus();
                          textarea.setSelectionRange(start + 3, end + 3);
                        }, 0);
                      }}
                      className="text-xs"
                    >
                      خط تحت
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const textarea = document.getElementById('lessonContent') as HTMLTextAreaElement;
                        const start = textarea.selectionStart;
                        const end = textarea.selectionEnd;
                        const text = textarea.value;
                        const before = text.substring(0, start);
                        const selection = text.substring(start, end);
                        const after = text.substring(end);
                        const newText = before + '<h3>' + selection + '</h3>' + after;
                        setNewLesson({ ...newLesson, content: newText });
                        setTimeout(() => {
                          textarea.focus();
                          textarea.setSelectionRange(start + 4, end + 4);
                        }, 0);
                      }}
                      className="text-xs"
                    >
                      عنوان
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const textarea = document.getElementById('lessonContent') as HTMLTextAreaElement;
                        const start = textarea.selectionStart;
                        const end = textarea.selectionEnd;
                        const text = textarea.value;
                        const before = text.substring(0, start);
                        const selection = text.substring(start, end);
                        const after = text.substring(end);
                        const newText = before + '<ul><li>' + selection + '</li></ul>' + after;
                        setNewLesson({ ...newLesson, content: newText });
                        setTimeout(() => {
                          textarea.focus();
                          textarea.setSelectionRange(start + 8, end + 8);
                        }, 0);
                      }}
                      className="text-xs"
                    >
                      قائمة
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const textarea = document.getElementById('lessonContent') as HTMLTextAreaElement;
                        const start = textarea.selectionStart;
                        const end = textarea.selectionEnd;
                        const text = textarea.value;
                        const before = text.substring(0, start);
                        const selection = text.substring(start, end);
                        const after = text.substring(end);
                        const newText = before + '<ol><li>' + selection + '</li></ol>' + after;
                        setNewLesson({ ...newLesson, content: newText });
                        setTimeout(() => {
                          textarea.focus();
                          textarea.setSelectionRange(start + 8, end + 8);
                        }, 0);
                      }}
                      className="text-xs"
                    >
                      قائمة مرقمة
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const textarea = document.getElementById('lessonContent') as HTMLTextAreaElement;
                        const start = textarea.selectionStart;
                        const end = textarea.selectionEnd;
                        const text = textarea.value;
                        const before = text.substring(0, start);
                        const selection = text.substring(start, end);
                        const after = text.substring(end);
                        const newText = before + '<code>' + selection + '</code>' + after;
                        setNewLesson({ ...newLesson, content: newText });
                        setTimeout(() => {
                          textarea.focus();
                          textarea.setSelectionRange(start + 6, end + 6);
                        }, 0);
                      }}
                      className="text-xs"
                    >
                      كود
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const textarea = document.getElementById('lessonContent') as HTMLTextAreaElement;
                        const start = textarea.selectionStart;
                        const end = textarea.selectionEnd;
                        const text = textarea.value;
                        const before = text.substring(0, start);
                        const selection = text.substring(start, end);
                        const after = text.substring(end);
                        const newText = before + '<blockquote>' + selection + '</blockquote>' + after;
                        setNewLesson({ ...newLesson, content: newText });
                        setTimeout(() => {
                          textarea.focus();
                          textarea.setSelectionRange(start + 12, end + 12);
                        }, 0);
                      }}
                      className="text-xs"
                    >
                      اقتباس
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const url = prompt('أدخل الرابط:');
                        if (url) {
                          const textarea = document.getElementById('lessonContent') as HTMLTextAreaElement;
                          const start = textarea.selectionStart;
                          const end = textarea.selectionEnd;
                          const text = textarea.value;
                          const before = text.substring(0, start);
                          const selection = text.substring(start, end) || 'رابط';
                          const after = text.substring(end);
                          const newText = before + '<a href="' + url + '" target="_blank">' + selection + '</a>' + after;
                          setNewLesson({ ...newLesson, content: newText });
                          setTimeout(() => {
                            textarea.focus();
                            textarea.setSelectionRange(start + 9 + url.length, start + 9 + url.length + selection.length);
                          }, 0);
                        }
                      }}
                      className="text-xs"
                    >
                      رابط
                    </Button>
                  </div>
                  <Textarea
                    id="lessonContent"
                    placeholder="محتوى الدرس الكامل (يدعم HTML)"
                    value={newLesson.content}
                    onChange={e => setNewLesson({ ...newLesson, content: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white min-h-[200px] resize-none"
                  />
                  <div className="mt-2 text-xs text-gray-400">
                    يمكنك استخدام HTML tags مثل: &lt;strong&gt;, &lt;em&gt;, &lt;h3&gt;, &lt;ul&gt;, &lt;li&gt;, &lt;code&gt;, &lt;blockquote&gt;, &lt;a&gt;
                  </div>
                </div>
                          </div>
                          <div>
                <Label htmlFor="lessonStatus" className="text-white">الحالة</Label>
                <Select value={newLesson.status} onValueChange={(value: 'منشور' | 'مسودة') => setNewLesson({ ...newLesson, status: value })}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="مسودة">مسودة</SelectItem>
                    <SelectItem value="منشور">منشور</SelectItem>
                  </SelectContent>
                </Select>
              </div>
                          <div className="mb-2">
                <Label className="text-white">روابط المواد التعليمية</Label>
                <div className="space-y-2">
                  {lessonMaterialUrls.map((url, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        type="url"
                        placeholder="رابط الملف (مثال: https://example.com/file.pdf)"
                        value={url}
                        onChange={(e) => {
                          const newUrls = [...lessonMaterialUrls];
                          newUrls[index] = e.target.value;
                          setLessonMaterialUrls(newUrls);
                        }}
                        className="bg-gray-800 border-gray-700 text-white flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setLessonMaterialUrls(lessonMaterialUrls.filter((_, i) => i !== index))}
                        className="text-red-400 border-red-400 hover:bg-red-400/10"
                      >
                        حذف
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setLessonMaterialUrls([...lessonMaterialUrls, ''])}
                    className="w-full"
                  >
                    + إضافة رابط ملف
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setLessonDialogOpen(false)}>إلغاء</Button>
              <Button onClick={handleAddLesson}>إضافة</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Lab Dialog */}
        <Dialog open={labDialogOpen} onOpenChange={setLabDialogOpen}>
          <DialogContent className="bg-gray-900 border-[#8648f9]/20 max-w-4xl">
            <DialogHeader>
              <DialogTitle className="text-white">إضافة مختبر جديد</DialogTitle>
              <DialogDescription className="text-gray-300">أدخل بيانات المختبر الجديد</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                <Label htmlFor="labTitle" className="text-white">العنوان</Label>
                              <Input
                  id="labTitle"
                  value={newLab.title}
                  onChange={e => setNewLab({ ...newLab, title: e.target.value })}
                  className="bg-gray-800 border-gray-700 text-white"
                              />
                            </div>
                            <div>
                <Label htmlFor="labCourse" className="text-white">المسار</Label>
                <Select value={newLab.course_id.toString()} onValueChange={(value) => setNewLab({ ...newLab, course_id: parseInt(value) })}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="اختر المسار" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map(course => (
                      <SelectItem key={course.id} value={course.id.toString()}>
                        {course.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                          </div>
                          </div>
                          <div>
                <Label htmlFor="labDifficulty" className="text-white">المستوى</Label>
                <Select value={newLab.difficulty} onValueChange={(value: LabDifficulty) => setNewLab({ ...newLab, difficulty: value })}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="مبتدئ">مبتدئ</SelectItem>
                    <SelectItem value="متوسط">متوسط</SelectItem>
                    <SelectItem value="متقدم">متقدم</SelectItem>
                  </SelectContent>
                </Select>
                          </div>
                          <div>
                <Label htmlFor="labDescription" className="text-white">الوصف</Label>
                <Textarea
                  id="labDescription"
                  value={newLab.description}
                  onChange={e => setNewLab({ ...newLab, description: e.target.value })}
                  className="bg-gray-800 border-gray-700 text-white"
                              />
                            </div>
                          <div>
                <Label htmlFor="labInstructions" className="text-white">التعليمات</Label>
                <Textarea
                  id="labInstructions"
                  value={newLab.instructions}
                  onChange={e => setNewLab({ ...newLab, instructions: e.target.value })}
                  className="bg-gray-800 border-gray-700 text-white min-h-[150px]"
                />
                              </div>
                          </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setLabDialogOpen(false)}>إلغاء</Button>
              <Button onClick={handleAddLab}>إضافة</Button>
            </DialogFooter>
                      </DialogContent>
                    </Dialog>

        {/* Edit User Dialog */}
        {editingUser && (
          <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
            <DialogContent className="bg-gray-900 border-[#8648f9]/20">
              <DialogHeader>
                <DialogTitle className="text-white">تعديل المستخدم</DialogTitle>
                <DialogDescription className="text-gray-300">تعديل بيانات المستخدم</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="editName" className="text-white">الاسم</Label>
                  <Input
                    id="editName"
                    value={editingUser.name}
                    onChange={e => setEditingUser({ ...editingUser, name: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                  </div>
                <div>
                  <Label htmlFor="editEmail" className="text-white">البريد الإلكتروني</Label>
                      <Input
                    id="editEmail"
                    type="email"
                    value={editingUser.email}
                    onChange={e => setEditingUser({ ...editingUser, email: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white"
                      />
                    </div>
                <div>
                  <Label htmlFor="editRole" className="text-white">الدور</Label>
                  <Select value={editingUser.role} onValueChange={(value: UserRole) => setEditingUser({ ...editingUser, role: value })}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="طالب">طالب</SelectItem>
                      <SelectItem value="مدرب">مدرب</SelectItem>
                      <SelectItem value="مسؤول">مسؤول</SelectItem>
                    </SelectContent>
                  </Select>
                  </div>
                <div>
                  <Label htmlFor="editStatus" className="text-white">الحالة</Label>
                  <Select value={editingUser.status} onValueChange={(value: 'نشط' | 'معطل') => setEditingUser({ ...editingUser, status: value })}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="نشط">نشط</SelectItem>
                      <SelectItem value="معطل">معطل</SelectItem>
                    </SelectContent>
                  </Select>
                                </div>
                            </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingUser(null)}>إلغاء</Button>
                <Button onClick={handleUpdateUser}>حفظ التغييرات</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Edit Course Dialog */}
        {editingCourse && (
          <Dialog open={!!editingCourse} onOpenChange={() => setEditingCourse(null)}>
                                  <DialogContent className="bg-gray-900 border-[#8648f9]/20">
                                    <DialogHeader>
                <DialogTitle className="text-white">تعديل المسار</DialogTitle>
                <DialogDescription className="text-gray-300">تعديل بيانات المسار</DialogDescription>
                                    </DialogHeader>
                                      <div className="space-y-4">
                                        <div>
                  <Label htmlFor="editCourseTitle" className="text-white">العنوان</Label>
                                          <Input
                    id="editCourseTitle"
                    value={editingCourse.title}
                    onChange={e => setEditingCourse({ ...editingCourse, title: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white"
                                          />
                                        </div>
                                        <div>
                  <Label htmlFor="editCourseDescription" className="text-white">الوصف</Label>
                                          <Textarea
                    id="editCourseDescription"
                    value={editingCourse.description || ''}
                    onChange={e => setEditingCourse({ ...editingCourse, description: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white"
                                          />
                                        </div>
                                        <div>
                  <Label htmlFor="editCourseLevel" className="text-white">المستوى</Label>
                  <Select value={editingCourse.level} onValueChange={(value: CourseLevel) => setEditingCourse({ ...editingCourse, level: value })}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="مبتدئ">مبتدئ</SelectItem>
                      <SelectItem value="متوسط">متوسط</SelectItem>
                      <SelectItem value="متقدم">متقدم</SelectItem>
                    </SelectContent>
                  </Select>
                                        </div>
                                          <div>
                  <Label htmlFor="editCourseCategory" className="text-white">التصنيف</Label>
                  <Select value={editingCourse.category} onValueChange={(value: CourseCategory) => setEditingCourse({ ...editingCourse, category: value })}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="أساسيات">أساسيات</SelectItem>
                      <SelectItem value="اختبار الاختراق">اختبار الاختراق</SelectItem>
                      <SelectItem value="الاستجابة للحوادث">الاستجابة للحوادث</SelectItem>
                      <SelectItem value="أمان التطبيقات">أمان التطبيقات</SelectItem>
                      <SelectItem value="قواعد البيانات">قواعد البيانات</SelectItem>
                      <SelectItem value="أمان الشبكات">أمان الشبكات</SelectItem>
                      <SelectItem value="تحليل البرمجيات الخبيثة">تحليل البرمجيات الخبيثة</SelectItem>
                      <SelectItem value="أمان السحابة">أمان السحابة</SelectItem>
                      <SelectItem value="أمان الأجهزة المحمولة">أمان الأجهزة المحمولة</SelectItem>
                      <SelectItem value="أمان إنترنت الأشياء">أمان إنترنت الأشياء</SelectItem>
                      <SelectItem value="أمان البنية التحتية">أمان البنية التحتية</SelectItem>
                      <SelectItem value="أمان الذكاء الاصطناعي">أمان الذكاء الاصطناعي</SelectItem>
                    </SelectContent>
                  </Select>
                                          </div>
                                          <div>
                  <Label htmlFor="editCourseImage" className="text-white">صورة جديدة (اختياري)</Label>
                                            <Input
                    id="editCourseImage"
                    type="file"
                    accept="image/*"
                    onChange={e => setEditingCourseImageFile(e.target.files?.[0] || null)}
                    className="bg-gray-800 border-gray-700 text-white"
                                            />
                                          </div>
                                          <div className="border-t border-gray-700 pt-4">
                                            <h4 className="text-white font-medium mb-3">صورة شارة المسار (اختياري)</h4>
                                            <p className="text-gray-400 text-sm mb-3">
                                              سيتم تحديث شارة المسار بهذه الصورة. إذا لم ترفع صورة جديدة، سيتم الاحتفاظ بالصورة الحالية.
                                            </p>
                                            <div>
                                              <Label htmlFor="editBadgeImage" className="text-white">صورة الشارة الجديدة</Label>
                                              <Input
                                                id="editBadgeImage"
                                                type="file"
                                                accept="image/*"
                                                onChange={e => setEditingBadgeImageFile(e.target.files?.[0] || null)}
                                                className="bg-gray-800 border-gray-700 text-white"
                                              />
                                              <p className="text-xs text-gray-400 mt-1">
                                                إذا لم ترفع صورة جديدة، سيتم الاحتفاظ بالصورة الحالية للشارة
                                              </p>
                                            </div>
                                          </div>
                                          </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingCourse(null)}>إلغاء</Button>
                <Button onClick={handleUpdateCourse}>حفظ التغييرات</Button>
              </DialogFooter>
                                  </DialogContent>
                                </Dialog>
        )}

        {/* Edit Lesson Dialog */}
        {editingLesson && (
          <Dialog open={!!editingLesson} onOpenChange={() => setEditingLesson(null)}>
                      <DialogContent className="bg-gray-900 border-[#8648f9]/20 max-w-4xl">
                        <DialogHeader>
                <DialogTitle className="text-white">تعديل الدرس</DialogTitle>
                <DialogDescription className="text-gray-300">تعديل بيانات الدرس</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                  <Label htmlFor="editLessonTitle" className="text-white">العنوان</Label>
                            <Input
                    id="editLessonTitle"
                    value={editingLesson.title}
                    onChange={e => setEditingLesson({ ...editingLesson, title: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white"
                            />
                          </div>
                          <div>
                  <Label htmlFor="editLessonCourse" className="text-white">المسار</Label>
                  <Select value={(editingLesson.course_id || 0).toString()} onValueChange={(value) => setEditingLesson({ ...editingLesson, course_id: parseInt(value) })}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map(course => (
                        <SelectItem key={course.id} value={course.id.toString()}>
                          {course.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                          </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                  <Label htmlFor="editLessonDuration" className="text-white">المدة</Label>
                  <Input
                    id="editLessonDuration"
                    placeholder="مثال: 30 دقيقة، ساعة واحدة، 2 ساعة"
                    value={editingLesson.duration || ''}
                    onChange={e => setEditingLesson({ ...editingLesson, duration: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                          </div>
                          <div>
                  <Label htmlFor="editLessonOrder" className="text-white">ترتيب الدرس</Label>
                  <Input
                    id="editLessonOrder"
                    type="number"
                    min="1"
                    value={editingLesson.lesson_order}
                    onChange={e => setEditingLesson({ ...editingLesson, lesson_order: parseInt(e.target.value) || 1 })}
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                          </div>
                          </div>
                          <div>
                  <Label htmlFor="editLessonDescription" className="text-white">الوصف (اختياري)</Label>
                  <Textarea
                    id="editLessonDescription"
                    placeholder="وصف مختصر للدرس"
                    value={editingLesson.description || ''}
                    onChange={e => setEditingLesson({ ...editingLesson, description: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                          </div>
                          <div>
                  <Label htmlFor="editLessonContent" className="text-white">المحتوى</Label>
                            <div className="bg-gray-800 border border-gray-700 rounded-md p-3">
                              <div className="flex gap-2 mb-3 border-b border-gray-600 pb-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    const textarea = document.getElementById('editLessonContent') as HTMLTextAreaElement;
                                    const start = textarea.selectionStart;
                                    const end = textarea.selectionEnd;
                                    const text = textarea.value;
                                    const before = text.substring(0, start);
                                    const selection = text.substring(start, end);
                                    const after = text.substring(end);
                                    const newText = before + '<strong>' + selection + '</strong>' + after;
                                    setEditingLesson({ ...editingLesson, content: newText });
                                    setTimeout(() => {
                                      textarea.focus();
                                      textarea.setSelectionRange(start + 8, end + 8);
                                    }, 0);
                                  }}
                                  className="text-xs"
                                >
                                  عريض
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    const textarea = document.getElementById('editLessonContent') as HTMLTextAreaElement;
                                    const start = textarea.selectionStart;
                                    const end = textarea.selectionEnd;
                                    const text = textarea.value;
                                    const before = text.substring(0, start);
                                    const selection = text.substring(start, end);
                                    const after = text.substring(end);
                                    const newText = before + '<em>' + selection + '</em>' + after;
                                    setEditingLesson({ ...editingLesson, content: newText });
                                    setTimeout(() => {
                                      textarea.focus();
                                      textarea.setSelectionRange(start + 4, end + 4);
                                    }, 0);
                                  }}
                                  className="text-xs"
                                >
                                  مائل
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    const textarea = document.getElementById('editLessonContent') as HTMLTextAreaElement;
                                    const start = textarea.selectionStart;
                                    const end = textarea.selectionEnd;
                                    const text = textarea.value;
                                    const before = text.substring(0, start);
                                    const selection = text.substring(start, end);
                                    const after = text.substring(end);
                                    const newText = before + '<u>' + selection + '</u>' + after;
                                    setEditingLesson({ ...editingLesson, content: newText });
                                    setTimeout(() => {
                                      textarea.focus();
                                      textarea.setSelectionRange(start + 3, end + 3);
                                    }, 0);
                                  }}
                                  className="text-xs"
                                >
                                  خط تحت
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    const textarea = document.getElementById('editLessonContent') as HTMLTextAreaElement;
                                    const start = textarea.selectionStart;
                                    const end = textarea.selectionEnd;
                                    const text = textarea.value;
                                    const before = text.substring(0, start);
                                    const selection = text.substring(start, end);
                                    const after = text.substring(end);
                                    const newText = before + '<h3>' + selection + '</h3>' + after;
                                    setEditingLesson({ ...editingLesson, content: newText });
                                    setTimeout(() => {
                                      textarea.focus();
                                      textarea.setSelectionRange(start + 4, end + 4);
                                    }, 0);
                                  }}
                                  className="text-xs"
                                >
                                  عنوان
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    const textarea = document.getElementById('editLessonContent') as HTMLTextAreaElement;
                                    const start = textarea.selectionStart;
                                    const end = textarea.selectionEnd;
                                    const text = textarea.value;
                                    const before = text.substring(0, start);
                                    const selection = text.substring(start, end);
                                    const after = text.substring(end);
                                    const newText = before + '<ul><li>' + selection + '</li></ul>' + after;
                                    setEditingLesson({ ...editingLesson, content: newText });
                                    setTimeout(() => {
                                      textarea.focus();
                                      textarea.setSelectionRange(start + 8, end + 8);
                                    }, 0);
                                  }}
                                  className="text-xs"
                                >
                                  قائمة
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    const textarea = document.getElementById('editLessonContent') as HTMLTextAreaElement;
                                    const start = textarea.selectionStart;
                                    const end = textarea.selectionEnd;
                                    const text = textarea.value;
                                    const before = text.substring(0, start);
                                    const selection = text.substring(start, end);
                                    const after = text.substring(end);
                                    const newText = before + '<ol><li>' + selection + '</li></ol>' + after;
                                    setEditingLesson({ ...editingLesson, content: newText });
                                    setTimeout(() => {
                                      textarea.focus();
                                      textarea.setSelectionRange(start + 8, end + 8);
                                    }, 0);
                                  }}
                                  className="text-xs"
                                >
                                  قائمة مرقمة
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    const textarea = document.getElementById('editLessonContent') as HTMLTextAreaElement;
                                    const start = textarea.selectionStart;
                                    const end = textarea.selectionEnd;
                                    const text = textarea.value;
                                    const before = text.substring(0, start);
                                    const selection = text.substring(start, end);
                                    const after = text.substring(end);
                                    const newText = before + '<code>' + selection + '</code>' + after;
                                    setEditingLesson({ ...editingLesson, content: newText });
                                    setTimeout(() => {
                                      textarea.focus();
                                      textarea.setSelectionRange(start + 6, end + 6);
                                    }, 0);
                                  }}
                                  className="text-xs"
                                >
                                  كود
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    const textarea = document.getElementById('editLessonContent') as HTMLTextAreaElement;
                                    const start = textarea.selectionStart;
                                    const end = textarea.selectionEnd;
                                    const text = textarea.value;
                                    const before = text.substring(0, start);
                                    const selection = text.substring(start, end);
                                    const after = text.substring(end);
                                    const newText = before + '<blockquote>' + selection + '</blockquote>' + after;
                                    setEditingLesson({ ...editingLesson, content: newText });
                                    setTimeout(() => {
                                      textarea.focus();
                                      textarea.setSelectionRange(start + 12, end + 12);
                                    }, 0);
                                  }}
                                  className="text-xs"
                                >
                                  اقتباس
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    const url = prompt('أدخل الرابط:');
                                    if (url) {
                                      const textarea = document.getElementById('editLessonContent') as HTMLTextAreaElement;
                                      const start = textarea.selectionStart;
                                      const end = textarea.selectionEnd;
                                      const text = textarea.value;
                                      const before = text.substring(0, start);
                                      const selection = text.substring(start, end) || 'رابط';
                                      const after = text.substring(end);
                                      const newText = before + '<a href="' + url + '" target="_blank">' + selection + '</a>' + after;
                                      setEditingLesson({ ...editingLesson, content: newText });
                                      setTimeout(() => {
                                        textarea.focus();
                                        textarea.setSelectionRange(start + 9 + url.length, start + 9 + url.length + selection.length);
                                      }, 0);
                                    }
                                  }}
                                  className="text-xs"
                                >
                                  رابط
                                </Button>
                              </div>
                              <Textarea
                                id="editLessonContent"
                                value={editingLesson.content}
                                onChange={e => setEditingLesson({ ...editingLesson, content: e.target.value })}
                                className="bg-gray-800 border-gray-700 text-white min-h-[200px] resize-none"
                              />
                              <div className="mt-2 text-xs text-gray-400">
                                يمكنك استخدام HTML tags مثل: &lt;strong&gt;, &lt;em&gt;, &lt;h3&gt;, &lt;ul&gt;, &lt;li&gt;, &lt;code&gt;, &lt;blockquote&gt;, &lt;a&gt;
                              </div>
                            </div>
                          </div>
                          <div>
                <Label htmlFor="editLessonStatus" className="text-white">الحالة</Label>
                  <Select value={editingLesson.status} onValueChange={(value: 'منشور' | 'مسودة') => setEditingLesson({ ...editingLesson, status: value })}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="مسودة">مسودة</SelectItem>
                      <SelectItem value="منشور">منشور</SelectItem>
                    </SelectContent>
                  </Select>
                          </div>
                          <div className="mb-2">
                <Label className="text-white">روابط المواد التعليمية</Label>
                <div className="space-y-2">
                  {editLessonMaterialUrls.map((url, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        type="url"
                        placeholder="رابط الملف (مثال: https://example.com/file.pdf)"
                        value={url}
                        onChange={(e) => {
                          const newUrls = [...editLessonMaterialUrls];
                          newUrls[index] = e.target.value;
                          setEditLessonMaterialUrls(newUrls);
                        }}
                        className="bg-gray-800 border-gray-700 text-white flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setEditLessonMaterialUrls(editLessonMaterialUrls.filter((_, i) => i !== index))}
                        className="text-red-400 border-red-400 hover:bg-red-400/10"
                      >
                        حذف
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditLessonMaterialUrls([...editLessonMaterialUrls, ''])}
                    className="w-full"
                  >
                    + إضافة رابط ملف
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingLesson(null)}>إلغاء</Button>
              <Button onClick={handleUpdateLesson}>حفظ التغييرات</Button>
            </DialogFooter>
                      </DialogContent>
                    </Dialog>
        )}

        {/* Edit Lab Dialog */}
        {editingLab && (
          <Dialog open={!!editingLab} onOpenChange={() => setEditingLab(null)}>
                                <DialogContent className="bg-gray-900 border-[#8648f9]/20 max-w-4xl">
                                  <DialogHeader>
                <DialogTitle className="text-white">تعديل المختبر</DialogTitle>
                <DialogDescription className="text-gray-300">تعديل بيانات المختبر</DialogDescription>
                                  </DialogHeader>
                                    <div className="space-y-4">
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                  <Label htmlFor="editLabTitle" className="text-white">العنوان</Label>
                                        <Input
                    id="editLabTitle"
                                          value={editingLab.title}
                    onChange={e => setEditingLab({ ...editingLab, title: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white"
                                        />
                                      </div>
                                      <div>
                  <Label htmlFor="editLabCourse" className="text-white">المسار</Label>
                  <Select value={(editingLab.course_id || 0).toString()} onValueChange={(value) => setEditingLab({ ...editingLab, course_id: parseInt(value) })}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map(course => (
                        <SelectItem key={course.id} value={course.id.toString()}>
                                              {course.title}
                        </SelectItem>
                                          ))}
                    </SelectContent>
                  </Select>
                                      </div>
                                      </div>
                                      <div>
                  <Label htmlFor="editLabDifficulty" className="text-white">المستوى</Label>
                  <Select value={editingLab.difficulty} onValueChange={(value: LabDifficulty) => setEditingLab({ ...editingLab, difficulty: value })}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="مبتدئ">مبتدئ</SelectItem>
                      <SelectItem value="متوسط">متوسط</SelectItem>
                      <SelectItem value="متقدم">متقدم</SelectItem>
                    </SelectContent>
                  </Select>
                                      </div>
                                      <div>
                  <Label htmlFor="editLabDescription" className="text-white">الوصف</Label>
                                        <Textarea
                    id="editLabDescription"
                                          value={editingLab.description || ''}
                    onChange={e => setEditingLab({ ...editingLab, description: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white"
                                        />
                                      </div>
                <div>
                  <Label htmlFor="editLabInstructions" className="text-white">التعليمات</Label>
                                        <Textarea
                    id="editLabInstructions"
                                          value={editingLab.instructions || ''}
                    onChange={e => setEditingLab({ ...editingLab, instructions: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white min-h-[150px]"
                                        />
                                      </div>
                                      </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingLab(null)}>إلغاء</Button>
                <Button onClick={handleUpdateLab}>حفظ التغييرات</Button>
              </DialogFooter>
                                </DialogContent>
                              </Dialog>
            )}

            {/* Lab Details Dialog */}
            <Dialog open={labDetailsDialogOpen} onOpenChange={setLabDetailsDialogOpen}>
          <DialogContent className="bg-gray-900 border-[#8648f9]/20 max-w-4xl">
                <DialogHeader>
              <DialogTitle className="text-white">تفاصيل المختبر</DialogTitle>
              <DialogDescription className="text-gray-300">إدارة الأجهزة والأسئلة والاتصالات في المختبر</DialogDescription>
                </DialogHeader>
                {selectedLab && (
                  <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* الأجهزة */}
                  <Card className="bg-gray-800/50 border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Server className="w-4 h-4" /> الأجهزة
                        <Button size="sm" className="ml-auto" onClick={() => {
                          setNewDevice({ ...newDevice, lab_id: selectedLab?.id || 0 });
                          setDeviceDialogOpen(true);
                        }}>
                          <Plus className="w-4 h-4 ml-1" /> جهاز جديد
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {labDevices.length === 0 ? (
                          <p className="text-gray-400 text-sm">لا يوجد أجهزة</p>
                        ) : (
                          labDevices.map(device => (
                            <div key={device.id} className="flex items-center justify-between p-2 bg-gray-700/50 rounded">
                              <div>
                                <p className="text-white font-medium">{device.name}</p>
                                <p className="text-gray-400 text-sm">{device.ip}</p>
                              </div>
                              <div className="flex gap-1">
                                <Button size="icon" variant="outline" onClick={() => setEditingDevice(device)}>
                                  <Edit className="w-3 h-3" />
                                </Button>
                                <Button size="icon" variant="outline" onClick={() => handleDeleteDevice(device.id)}>
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* الأسئلة */}
                  <Card className="bg-gray-800/50 border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <FileText className="w-4 h-4" /> الأسئلة
                        <Button size="sm" className="ml-auto" onClick={() => {
                          setNewQuestion({ 
                            question: "", 
                            correct_answer: "", 
                            explanation: "", 
                            lab_id: selectedLab?.id || 0, 
                            points: 1, 
                            hints: [] 
                          });
                          setQuestionDialogOpen(true);
                        }}>
                          <Plus className="w-4 h-4 ml-1" /> سؤال جديد
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {labQuestions.length === 0 ? (
                          <p className="text-gray-400 text-sm">لا يوجد أسئلة</p>
                        ) : (
                          labQuestions.map(question => (
                            <div key={question.id} className="p-2 bg-gray-700/50 rounded flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <h4 className="text-white font-medium mb-2">{question.question}</h4>
                                {(adminUser?.role === "مسؤول" || adminUser?.role === "مدرب") && (
                                  <Button size="icon" variant="outline" onClick={() => setEditingQuestion(question)}>
                                    <Edit className="w-3 h-3" />
                                  </Button>
                                )}
                              </div>
                              <div className="flex gap-1">
                                <Button size="icon" variant="outline" onClick={() => handleDeleteQuestion(question.id)}>
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* الاتصالات */}
                  <Card className="bg-gray-800/50 border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Network className="w-4 h-4" /> الاتصالات
                        <Button size="sm" className="ml-auto" onClick={() => {
                          setNewConnection({ 
                            source_device_id: "", 
                            target_device_id: "", 
                            connection_type: "ethernet", 
                            lab_id: selectedLab?.id || 0 
                          });
                          setConnectionDialogOpen(true);
                        }}>
                          <Plus className="w-4 h-4 ml-1" /> اتصال جديد
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {labConnections.length === 0 ? (
                          <p className="text-gray-400 text-sm">لا يوجد اتصالات</p>
                        ) : (
                          labConnections.map(connection => {
                            const sourceDevice = labDevices.find(d => d.id === connection.source_device_id);
                            const targetDevice = labDevices.find(d => d.id === connection.target_device_id);
                            
                            return (
                              <div key={connection.id} className="p-2 bg-gray-700/50 rounded">
                                <div className="flex items-center justify-between mb-1">
                                  <p className="text-white text-sm">
                                    {sourceDevice?.name} → {targetDevice?.name}
                                  </p>
                                  <Badge variant="outline" className="border-gray-500/20 text-gray-300 text-xs">
                                    {connection.connection_type}
                                  </Badge>
                                </div>
                                <div className="flex gap-1">
                                  <Button
                                    size="icon" 
                                    variant="outline"
                                    onClick={() => handleToggleConnectionStatus(connection.id)}
                                    className={
                                      connection.status === "connected"
                                        ? "border-green-500/20 text-green-500 hover:bg-green-500/10"
                                        : "border-red-500/20 text-red-500 hover:bg-red-500/10"
                                    }
                                  >
                                    {connection.status === "connected" ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                  </Button>
                                  <Button size="icon" variant="outline" onClick={() => setEditingConnection(connection)}>
                                    <Edit className="w-3 h-3" />
                                  </Button>
                                  <Button size="icon" variant="outline" onClick={() => handleDeleteConnection(connection.id)}>
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                            </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                </CardContent>
              </Card>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setLabDetailsDialogOpen(false)}>إغلاق</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Connection Dialog */}
        <Dialog open={connectionDialogOpen} onOpenChange={setConnectionDialogOpen}>
          <DialogContent className="bg-gray-900 border-[#8648f9]/20">
                <DialogHeader>
              <DialogTitle className="text-white">إضافة اتصال جديد</DialogTitle>
              <DialogDescription className="text-gray-300">أدخل بيانات الاتصال الجديد</DialogDescription>
                </DialogHeader>
            <div className="space-y-4">
                        <div>
                <Label htmlFor="sourceDevice" className="text-white">الجهاز المصدر</Label>
                <Select value={newConnection.source_device_id} onValueChange={(value) => setNewConnection({ ...newConnection, source_device_id: value })}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="اختر الجهاز" />
                  </SelectTrigger>
                  <SelectContent>
                    {labDevices.map(device => (
                      <SelectItem key={device.id} value={device.id}>
                        {device.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                        </div>
                        <div>
                <Label htmlFor="targetDevice" className="text-white">الجهاز الهدف</Label>
                <Select value={newConnection.target_device_id} onValueChange={(value) => setNewConnection({ ...newConnection, target_device_id: value })}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="اختر الجهاز" />
                  </SelectTrigger>
                  <SelectContent>
                    {labDevices.map(device => (
                      <SelectItem key={device.id} value={device.id}>
                        {device.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                        </div>
                        <div>
                <Label htmlFor="connectionType" className="text-white">نوع الاتصال</Label>
                <Select value={newConnection.connection_type} onValueChange={(value: "ethernet" | "wifi" | "fiber" | "copper") => setNewConnection({ ...newConnection, connection_type: value })}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="اختر نوع الاتصال" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ethernet">Ethernet (100 Mbps)</SelectItem>
                    <SelectItem value="wifi">Wi-Fi (54 Mbps)</SelectItem>
                    <SelectItem value="fiber">Fiber (1 Gbps)</SelectItem>
                    <SelectItem value="copper">Copper (10 Mbps)</SelectItem>
                  </SelectContent>
                </Select>
                        </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConnectionDialogOpen(false)}>إلغاء</Button>
              <Button onClick={handleAddConnection}>إضافة</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Connection Dialog */}
        {editingConnection && (
          <Dialog open={!!editingConnection} onOpenChange={() => setEditingConnection(null)}>
            <DialogContent className="bg-gray-900 border-[#8648f9]/20">
              <DialogHeader>
                <DialogTitle className="text-white">تعديل الاتصال</DialogTitle>
                <DialogDescription className="text-gray-300">تعديل بيانات الاتصال</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                        <div>
                  <Label htmlFor="editConnectionType" className="text-white">نوع الاتصال</Label>
                  <Select value={editingConnection.connection_type} onValueChange={(value: "ethernet" | "wifi" | "fiber" | "copper") => setEditingConnection({ ...editingConnection, connection_type: value })}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ethernet">Ethernet (100 Mbps)</SelectItem>
                      <SelectItem value="wifi">Wi-Fi (54 Mbps)</SelectItem>
                      <SelectItem value="fiber">Fiber (1 Gbps)</SelectItem>
                      <SelectItem value="copper">Copper (10 Mbps)</SelectItem>
                    </SelectContent>
                  </Select>
                        </div>
                <div>
                  <Label htmlFor="editConnectionStatus" className="text-white">حالة الاتصال</Label>
                  <Select value={editingConnection.status} onValueChange={(value: "connected" | "disconnected" | "connecting") => setEditingConnection({ ...editingConnection, status: value })}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="connected">متصل</SelectItem>
                      <SelectItem value="disconnected">غير متصل</SelectItem>
                      <SelectItem value="connecting">جاري الاتصال</SelectItem>
                    </SelectContent>
                  </Select>
                      </div>
                    </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingConnection(null)}>إلغاء</Button>
                <Button onClick={handleUpdateConnection}>حفظ التغييرات</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Device Dialog */}
                        <Dialog open={deviceDialogOpen} onOpenChange={setDeviceDialogOpen}>
                          <DialogContent className="bg-gray-900 border-[#8648f9]/20">
                            <DialogHeader>
                              <DialogTitle className="text-white">إضافة جهاز جديد</DialogTitle>
              <DialogDescription className="text-gray-300">أدخل بيانات الجهاز الجديد</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                <Label htmlFor="deviceName" className="text-white">اسم الجهاز</Label>
                                <Input
                                  id="deviceName"
                                  value={newDevice.name}
                  onChange={e => setNewDevice({ ...newDevice, name: e.target.value })}
                  className="bg-gray-800 border-gray-700 text-white"
                                />
                              </div>
                              <div>
                <Label htmlFor="deviceType" className="text-white">نوع الجهاز</Label>
                <Select value={newDevice.type} onValueChange={(value: DeviceType) => setNewDevice({ ...newDevice, type: value })}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(DEVICE_TYPES).map(([type, _]) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                              </div>
                              <div>
                <Label htmlFor="deviceIP" className="text-white">عنوان IP</Label>
                                <Input
                                  id="deviceIP"
                                  value={newDevice.ip}
                  onChange={e => setNewDevice({ ...newDevice, ip: e.target.value })}
                  className="bg-gray-800 border-gray-700 text-white"
                                />
                              </div>
                              <div>
                <Label htmlFor="deviceURL" className="text-white">الرابط (اختياري)</Label>
                                <Input
                                  id="deviceURL"
                                  value={newDevice.url}
                  onChange={e => setNewDevice({ ...newDevice, url: e.target.value })}
                  className="bg-gray-800 border-gray-700 text-white"
                                  placeholder="مثال: ssh://user@host أو vpc://network أو ملف.rdp"
                                />
                              </div>
                              <div>
                <Label htmlFor="deviceRDPFile" className="text-white">ملف RDP (اختياري)</Label>
                <Input
                  id="deviceRDPFile"
                  type="file"
                  accept=".rdp"
                  onChange={e => setNewDeviceFile(e.target.files?.[0] || null)}
                  className="bg-gray-800 border-gray-700 text-white"
                />
                {newDeviceFile && (
                  <div className="text-xs text-green-400 mt-1 flex items-center gap-2">
                    {newDeviceFile.name}
                    <Button size="sm" variant="outline" onClick={() => setNewDeviceFile(null)} className="text-red-400 border-red-400 ml-2">حذف الملف</Button>
                  </div>
                )}
                              </div>
                              </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeviceDialogOpen(false)}>إلغاء</Button>
              <Button onClick={handleAddDevice}>إضافة</Button>
            </DialogFooter>
                          </DialogContent>
                        </Dialog>

        {/* Question Dialog */}
                        <Dialog open={questionDialogOpen} onOpenChange={setQuestionDialogOpen}>
                          <DialogContent className="bg-gray-900 border-[#8648f9]/20">
                            <DialogHeader>
                              <DialogTitle className="text-white">إضافة سؤال جديد</DialogTitle>
              <DialogDescription className="text-gray-300">
                أدخل بيانات السؤال الجديد
                {newQuestion.lab_id > 0 && (
                  <span className="block text-sm text-blue-400 mt-1">
                    المختبر: {selectedLab?.title} (ID: {newQuestion.lab_id})
                  </span>
                )}
              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                <Label htmlFor="questionText" className="text-white">السؤال *</Label>
                                <Textarea
                                  id="questionText"
                                  value={newQuestion.question}
                    onChange={e => setNewQuestion({ ...newQuestion, question: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white"
                                />
                              </div>
                              <div>
                  <Label htmlFor="correctAnswer" className="text-white">الإجابة الصحيحة *</Label>
                                <Input
                                  id="correctAnswer"
                                  value={newQuestion.correct_answer}
                    onChange={e => setNewQuestion({ ...newQuestion, correct_answer: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white"
                                />
                              </div>
                              <div>
                  <Label htmlFor="explanation" className="text-white">التوضيح</Label>
                                <Textarea
                                  id="explanation"
                                  value={newQuestion.explanation}
                    onChange={e => setNewQuestion({ ...newQuestion, explanation: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white"
                                />
                              </div>
                              <div>
                  <Label htmlFor="points" className="text-white">النقاط *</Label>
                                <Input
                                  id="points"
                                  type="number"
                                  min={1}
                                  value={newQuestion.points}
                                  onChange={e => setNewQuestion({ ...newQuestion, points: Math.max(1, Number(e.target.value)) })}
                                  className="bg-gray-800 border-gray-700 text-white"
                                />
                              </div>
                                  </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setQuestionDialogOpen(false)}>إلغاء</Button>
              <Button onClick={handleAddQuestion}>إضافة</Button>
            </DialogFooter>
                          </DialogContent>
                        </Dialog>

        {/* Edit Device Dialog (lab details) */}
        {editingDevice && (
          <Dialog open={!!editingDevice} onOpenChange={() => { setEditingDevice(null); setEditDeviceFile(null); }}>
            <DialogContent className="bg-gray-900 border-[#8648f9]/20">
              <DialogHeader>
                <DialogTitle className="text-white">تعديل الجهاز</DialogTitle>
                <DialogDescription className="text-gray-300">تعديل بيانات الجهاز</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="editDeviceName" className="text-white">اسم الجهاز</Label>
                  <Input
                    id="editDeviceName"
                    value={editingDevice.name}
                    onChange={e => setEditingDevice(dev => dev ? { ...dev, name: e.target.value } : dev)}
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="editDeviceType" className="text-white">نوع الجهاز</Label>
                  <Select value={editingDevice.type} onValueChange={(value: DeviceType) => setEditingDevice(dev => dev ? { ...dev, type: value } : dev)}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(DEVICE_TYPES).map(([type, _]) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="editDeviceIP" className="text-white">عنوان IP</Label>
                  <Input
                    id="editDeviceIP"
                    value={editingDevice.ip}
                    onChange={e => setEditingDevice(dev => dev ? { ...dev, ip: e.target.value } : dev)}
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="editDeviceURL" className="text-white">الرابط (اختياري)</Label>
                  <Input
                    id="editDeviceURL"
                    value={editingDevice.url}
                    onChange={e => setEditingDevice(dev => dev ? { ...dev, url: e.target.value } : dev)}
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="editDeviceRDPFile" className="text-white">ملف RDP (اختياري)</Label>
                  <Input
                    id="editDeviceRDPFile"
                    type="file"
                    accept=".rdp"
                    onChange={e => setEditDeviceFile(e.target.files?.[0] || null)}
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                  {editDeviceFile && (
                    <div className="text-xs text-green-400 mt-1 flex items-center gap-2">
                      {editDeviceFile.name}
                      <Button size="sm" variant="outline" onClick={() => setEditDeviceFile(null)} className="text-red-400 border-red-400 ml-2">حذف الملف</Button>
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setEditingDevice(null); setEditDeviceFile(null); }}>إلغاء</Button>
                <Button onClick={async () => {
                  // تحقق من صحة الرابط إذا كان غير فارغ
                  if (editingDevice.url && editingDevice.url.trim() !== "") {
                    const url = editingDevice.url.trim();
                    const isRDP = url.endsWith('.rdp');
                    const isSSH = url.startsWith('ssh://');
                    const isVPC = url.startsWith('vpc://');
                    if (!isRDP && !isSSH && !isVPC) {
                      toast({
                        title: "رابط غير مدعوم",
                        description: "يجب أن يكون الرابط ملف RDP أو SSH أو VPC فقط (ssh:// أو vpc:// أو .rdp)",
                        variant: "destructive"
                      });
                      return;
                    }
                  }
                  // رفع ملف RDP إذا تم اختياره
                  let uploadedRdpUrl = "";
                  if (editDeviceFile) {
                    if (!editDeviceFile.name.endsWith('.rdp')) {
                      toast({ title: "خطأ", description: "يجب أن يكون الملف بصيغة .rdp فقط", variant: "destructive" });
                      return;
                    }
                    const fileName = `device-${Date.now()}.rdp`;
                    const { data, error } = await createClientComponentClient()
                      .storage
                      .from('device-files')
                      .upload(fileName, editDeviceFile);
                    if (error) {
                      toast({ title: "خطأ في رفع الملف", description: error.message, variant: "destructive" });
                      return;
                    }
                    const { data: urlData } = createClientComponentClient()
                      .storage
                      .from('device-files')
                      .getPublicUrl(fileName);
                    uploadedRdpUrl = urlData.publicUrl;
                  }
                  // تحديث بيانات الجهاز
                  const updatedDevice = {
                    ...editingDevice,
                    url: uploadedRdpUrl || editingDevice.url
                  };
                  await handleUpdateDevice(updatedDevice);
                  setEditDeviceFile(null);
                }}>حفظ التغييرات</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
        {/* Edit Question Dialog (lab details) */}
        {editingQuestion && (
          <Dialog open={!!editingQuestion} onOpenChange={() => { setEditingQuestion(null); setEditNewHint(""); }}>
            <DialogContent className="bg-gray-900 border-[#8648f9]/20">
              <DialogHeader>
                <DialogTitle className="text-white">تعديل السؤال</DialogTitle>
                <DialogDescription className="text-gray-300">تعديل بيانات السؤال</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="editQuestionText" className="text-white">السؤال *</Label>
                  <Textarea
                    id="editQuestionText"
                    value={editingQuestion.question}
                    onChange={e => setEditingQuestion(q => q ? { ...q, question: e.target.value } : q)}
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="editCorrectAnswer" className="text-white">الإجابة الصحيحة *</Label>
                  <Input
                    id="editCorrectAnswer"
                    value={editingQuestion.correct_answer}
                    onChange={e => setEditingQuestion(q => q ? { ...q, correct_answer: e.target.value } : q)}
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="editExplanation" className="text-white">التوضيح</Label>
                  <Textarea
                    id="editExplanation"
                    value={editingQuestion.explanation}
                    onChange={e => setEditingQuestion(q => q ? { ...q, explanation: e.target.value } : q)}
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="editPoints" className="text-white">النقاط *</Label>
                  <Input
                    id="editPoints"
                    type="number"
                    min={1}
                    value={editingQuestion.points}
                    onChange={e => setEditingQuestion(q => q ? { ...q, points: Math.max(1, Number(e.target.value)) } : q)}
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
                {/* قسم التلميحات */}
                <div>
                  <Label className="text-white">التلميحات</Label>
                  <div className="space-y-2 mt-2">
                    {(editingQuestion.hints && editingQuestion.hints.length > 0) ? (
                      editingQuestion.hints.map((hintObj, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                          <Input
                            type="text"
                            value={hintObj.hint}
                            onChange={e => setEditingQuestion(q => {
                              if (!q) return q;
                              const newHints = [...(q.hints || [])];
                              newHints[idx] = { ...newHints[idx], hint: e.target.value };
                              return { ...q, hints: newHints };
                            })}
                            className="bg-gray-800 border-gray-700 text-white flex-1"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingQuestion(q => {
                              if (!q) return q;
                              const newHints = [...(q.hints || [])];
                              newHints.splice(idx, 1);
                              return { ...q, hints: newHints };
                            })}
                            className="text-red-400 border-red-400 hover:bg-red-400/10"
                          >
                            حذف
                          </Button>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-gray-400">لا توجد تلميحات</div>
                    )}
                    {/* إضافة تلميحة جديدة */}
                    <div className="flex gap-2 mt-2">
                      <Input
                        type="text"
                        placeholder="أدخل تلميحة جديدة"
                        value={editNewHint}
                        onChange={e => setEditNewHint(e.target.value)}
                        className="bg-gray-800 border-gray-700 text-white flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const hintText = editNewHint.trim();
                          if (!hintText) return;
                          setEditingQuestion(q => {
                            if (!q) return q;
                            const newHints = [...(q.hints || []), { hint: hintText, id: Date.now() }];
                            return { ...q, hints: newHints };
                          });
                          setEditNewHint("");
                        }}
                        className="w-24"
                      >
                        إضافة
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setEditingQuestion(null); setEditNewHint(""); }}>إلغاء</Button>
                <Button onClick={handleUpdateQuestion}>حفظ التغييرات</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
        {activeTab === 'notifications' && (
          <>
            <Card className="bg-gray-900/50 border-[#8648f9]/20 mb-6">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Bell className="w-5 h-5 ml-2" /> إرسال إشعار
                </CardTitle>
                <CardDescription className="text-gray-300">إرسال إشعار لجميع المستخدمين أو لمستخدم محدد</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label className="text-white">العنوان</Label>
                    <Input
                      value={notificationForm.title}
                      onChange={e => setNotificationForm(f => ({ ...f, title: e.target.value }))}
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-white">الرسالة</Label>
                    <Textarea
                      value={notificationForm.message}
                      onChange={e => setNotificationForm(f => ({ ...f, message: e.target.value }))}
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-white">إرسال إلى مستخدم محدد (اختياري)</Label>
                    <Select value={notificationForm.user_id} onValueChange={v => setNotificationForm(f => ({ ...f, user_id: v }))}>
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                        <SelectValue placeholder="جميع المستخدمين" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">جميع المستخدمين</SelectItem>
                        {users.map(u => (
                          <SelectItem key={u.id} value={u.id}>{u.name} ({u.email})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={async () => {
                      if (!notificationForm.title || !notificationForm.message) {
                        toast({ title: "خطأ", description: "يرجى إدخال العنوان والرسالة", variant: "destructive" });
                        return;
                      }
                      setSending(true);
                      const supabase = createClientComponentClient();
                      const { error } = await supabase.from('notifications').insert({
                        user_id: notificationForm.user_id === 'all' ? null : notificationForm.user_id,
                        type: 'admin',
                        title: notificationForm.title,
                        message: notificationForm.message,
                        is_read: false
                      });
                      setSending(false);
                      if (error) {
                        toast({ title: "خطأ", description: error.message, variant: "destructive" });
                      } else {
                        toast({ title: "تم الإرسال", description: "تم إرسال الإشعار بنجاح" });
                        setNotificationForm({ title: '', message: '', user_id: 'all' });
                      }
                    }}
                    disabled={sending}
                  >
                    {sending ? "جاري الإرسال..." : "إرسال الإشعار"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* قسم إدارة الإشعارات */}
            <Card className="bg-gray-900/50 border-[#8648f9]/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Bell className="w-5 h-5 ml-2" /> إدارة الإشعارات
                </CardTitle>
                <CardDescription className="text-gray-300">عرض وحذف الإشعارات المرسلة</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={async () => {
                        const supabase = createClientComponentClient();
                        const { data, error } = await supabase
                          .from('notifications')
                          .select('*')
                          .order('created_at', { ascending: false })
                          .limit(50);
                        
                        if (error) {
                          toast({ title: "خطأ", description: "فشل في تحميل الإشعارات", variant: "destructive" });
                        } else {
                          setNotifications(data || []);
                        }
                      }}
                      className="border-[#8648f9] text-[#8648f9] hover:bg-[#8648f9]/10"
                    >
                      تحديث القائمة
                    </Button>
                    <Button
                      variant="outline"
                      onClick={async () => {
                        if (confirm('هل أنت متأكد من حذف جميع الإشعارات؟')) {
                          const supabase = createClientComponentClient();
                          const { error } = await supabase
                            .from('notifications')
                            .delete()
                            .neq('id', 0); // حذف جميع الإشعارات
                          
                          if (error) {
                            toast({ title: "خطأ", description: "فشل في حذف الإشعارات", variant: "destructive" });
                          } else {
                            toast({ title: "تم الحذف", description: "تم حذف جميع الإشعارات بنجاح" });
                            setNotifications([]);
                          }
                        }
                      }}
                      className="border-red-500 text-red-500 hover:bg-red-500/10"
                    >
                      حذف جميع الإشعارات
                    </Button>
                  </div>
                  
                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {notifications.length === 0 ? (
                      <div className="text-center text-gray-400 py-8">لا توجد إشعارات</div>
                    ) : (
                      notifications.map((notification) => (
                        <div key={notification.id} className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-semibold text-white">{notification.title}</h4>
                                <Badge variant="outline" className="text-xs">
                                  {notification.type === 'admin' ? 'إداري' : 'نظام'}
                                </Badge>
                                {notification.is_read && (
                                  <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-400">
                                    مقروء
                                  </Badge>
                                )}
                              </div>
                              <p className="text-gray-300 text-sm mb-2">{notification.message}</p>
                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                <span>تاريخ الإرسال: {new Date(notification.created_at).toLocaleString('ar-EG')}</span>
                                {notification.user_id ? (
                                  <span>إلى: {getAdminById(notification.user_id)?.name || 'مستخدم غير معروف'}</span>
                                ) : (
                                  <span>إلى: جميع المستخدمين</span>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              onClick={async () => {
                                if (confirm('هل أنت متأكد من حذف هذا الإشعار؟')) {
                                  const supabase = createClientComponentClient();
                                  const { error } = await supabase
                                    .from('notifications')
                                    .delete()
                                    .eq('id', notification.id);
                                  
                                  if (error) {
                                    toast({ title: "خطأ", description: "فشل في حذف الإشعار", variant: "destructive" });
                                  } else {
                                    toast({ title: "تم الحذف", description: "تم حذف الإشعار بنجاح" });
                                    setNotifications(prev => prev.filter(n => n.id !== notification.id));
                                  }
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
    );
}