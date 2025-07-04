"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Plus, Edit, Trash2, Search, Eye, Save, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import Link from "next/link"
import {
  getLessons,
  getLessonMaterials,
  createLesson,
  updateLesson,
  deleteLesson,
  deleteLessonMaterialAndFile,
} from "./services/lessons"
import { uploadLessonFile, addLessonMaterial } from "@/lib/supabase"

console.log("DEBUG: هذا هو ملف صفحة الدروس الفعلي!");

export default function AdminLessonsPage() {
  const [lessons, setLessons] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [courses] = useState([
    { id: 1, title: "أساسيات الأمن السيبراني" },
    { id: 2, title: "اختبار الاختراق الأخلاقي" },
    { id: 3, title: "الاستجابة للحوادث السيبرانية" },
  ])
  const [editingLesson, setEditingLesson] = useState<any>(null)
  const [editingLessonMaterials, setEditingLessonMaterials] = useState<any[]>([])
  const [newLesson, setNewLesson] = useState({
    title: "",
    course: "",
    duration: "",
    order: 1,
    content: "",
    description: "",
  })
  const [newLessonFiles, setNewLessonFiles] = useState<File[]>([])
  const [editingLessonFiles, setEditingLessonFiles] = useState<File[]>([])

  // جلب الدروس من القاعدة
  useEffect(() => {
    const fetchLessons = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await getLessons()
        // جلب الملفات المرفقة لكل درس
        const lessonsWithFiles = await Promise.all(
          data.map(async (lesson: any) => {
            const files = await getLessonMaterials(lesson.id)
            return { ...lesson, files }
          })
        )
        setLessons(lessonsWithFiles)
      } catch (e: any) {
        setError(e.message)
      }
      setLoading(false)
    }
    fetchLessons()
  }, [])

  // إضافة درس جديد
  const handleAddLesson = async () => {
    setLoading(true)
    setError(null)
    try {
      // إيجاد course_id
      const course = courses.find((c) => c.title === newLesson.course)
      const lessonData = {
        title: newLesson.title,
        course_id: course ? course.id : null,
        duration: newLesson.duration,
        lesson_order: newLesson.order,
        status: 'مسودة' as 'مسودة',
        content: newLesson.content,
        description: newLesson.description,
      }
      const lesson = await createLesson(lessonData)
      // رفع الملفات
      for (const file of newLessonFiles) {
        const { filePath, publicUrl } = await uploadLessonFile(file, lesson.id)
        await addLessonMaterial(lesson.id, filePath, file.name)
      }
      // تحديث القائمة
      const data = await getLessons()
      const lessonsWithFiles = await Promise.all(
        data.map(async (lesson: any) => {
          const files = await getLessonMaterials(lesson.id)
          return { ...lesson, files }
        })
      )
      setLessons(lessonsWithFiles)
      setNewLesson({
        title: "",
        course: "",
        duration: "",
        order: 1,
        content: "",
        description: "",
      })
      setNewLessonFiles([])
    } catch (e: any) {
      setError(e.message)
    }
    setLoading(false)
  }

  // تعديل درس
  const handleUpdateLesson = async () => {
    if (!editingLesson) return
    setLoading(true)
    setError(null)
    try {
      // تحديث بيانات الدرس
      const course = courses.find((c) => c.title === editingLesson.course)
      const lessonData = {
        title: editingLesson.title,
        course_id: course ? course.id : null,
        duration: editingLesson.duration,
        lesson_order: editingLesson.order,
        status: editingLesson.status as 'مسودة' | 'منشور',
        content: editingLesson.content,
        description: editingLesson.description,
      }
      await updateLesson(editingLesson.id, lessonData)
      // رفع الملفات الجديدة
      for (const file of editingLessonFiles) {
        const { filePath, publicUrl } = await uploadLessonFile(file, editingLesson.id)
        await addLessonMaterial(editingLesson.id, filePath, file.name)
      }
      // تحديث القائمة
      const data = await getLessons()
      const lessonsWithFiles = await Promise.all(
        data.map(async (lesson: any) => {
          const files = await getLessonMaterials(lesson.id)
          return { ...lesson, files }
        })
      )
      setLessons(lessonsWithFiles)
      setEditingLesson(null)
      setEditingLessonFiles([])
      setEditingLessonMaterials([])
    } catch (e: any) {
      setError(e.message)
    }
    setLoading(false)
  }

  // عند الضغط على حذف ملف مرفق أثناء التعديل
  const handleDeleteMaterial = async (materialId: number, fileUrl: string) => {
    setLoading(true)
    setError(null)
    try {
      await deleteLessonMaterialAndFile(materialId, fileUrl)
      // تحديث قائمة الملفات للدرس الجاري تعديله
      const files = await getLessonMaterials(editingLesson.id)
      setEditingLessonMaterials(files)
    } catch (e: any) {
      setError(e.message)
    }
    setLoading(false)
  }

  // عند الضغط على تعديل درس: جلب الملفات المرفقة
  const handleEditLesson = async (lesson: any) => {
    setEditingLesson(lesson)
    setEditingLessonFiles([])
    setLoading(true)
    try {
      const files = await getLessonMaterials(lesson.id)
      setEditingLessonMaterials(files)
    } catch {
      setEditingLessonMaterials([])
    }
    setLoading(false)
  }

  // حذف درس بالكامل
  const handleDeleteLesson = async (id: number) => {
    setLoading(true)
    setError(null)
    try {
      await deleteLesson(id)
      setLessons(lessons.filter((l) => l.id !== id))
    } catch (e: any) {
      setError(e.message)
    }
    setLoading(false)
  }

  const toggleStatus = (id: number) => {
    setLessons(
      lessons.map((lesson) =>
        lesson.id === id ? { ...lesson, status: lesson.status === "منشور" ? "مسودة" : "منشور" } : lesson,
      ),
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <Link href="/admin/dashboard" className="text-[#8648f9] hover:text-[#8648f9]/80 flex items-center ml-4">
              <ArrowLeft className="w-4 h-4 ml-1" />
              العودة للوحة التحكم
            </Link>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white">إدارة الدروس</h1>
              <p className="text-gray-300">إنشاء وتحرير محتوى الدروس التعليمية</p>
            </div>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-[#8648f9] hover:bg-[#8648f9]/80 text-white">
                <Plus className="w-4 h-4 ml-2" />
                إضافة درس جديد
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border-[#8648f9]/20 max-w-6xl max-h-[95vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-white">إضافة درس جديد</DialogTitle>
                <div style={{
                  color: 'red',
                  fontSize: 30,
                  margin: 8,
                  background: 'yellow',
                  zIndex: 999999,
                  position: 'relative',
                  display: 'block'
                }}>
                  اختبار: يجب أن ترى هذا النص هنا!
                </div>
                <div style={{
                  background: 'yellow',
                  zIndex: 999999,
                  position: 'relative',
                  display: 'block',
                  padding: 12
                }}>
                  <input
                    type="file"
                    multiple
                    style={{
                      fontSize: 20,
                      background: 'white',
                      color: 'black',
                      display: 'block'
                    }}
                    onChange={e => {
                      if (e.target.files) {
                        setNewLessonFiles(Array.from(e.target.files))
                      }
                    }}
                  />
                </div>
                <DialogDescription className="text-gray-300">أنشئ درساً جديداً مع المحتوى التعليمي</DialogDescription>
              </DialogHeader>

              {/* رسالة بارزة وحقل رفع الملفات */}
              <div className="bg-yellow-100 border border-yellow-400 rounded-md p-4 mb-4 text-yellow-900 font-bold text-lg flex items-center gap-2">
                <Plus className="w-6 h-6" />
                هام: يمكنك هنا رفع ملفات المواد التعليمية (PDF، صور، فيديو، صوت، مستندات، ...).
              </div>
              <div>
                <Label htmlFor="lessonFiles" className="text-black font-bold flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  إرفاق مواد تعليمية (ملفات)
                </Label>
                <Input
                  id="lessonFiles"
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.ppt,.pptx,.zip,.rar,.txt,.mp4,.mp3"
                  className="bg-gray-200 border border-yellow-400 text-black"
                  onChange={e => {
                    if (e.target.files) {
                      setNewLessonFiles(Array.from(e.target.files))
                    }
                  }}
                />
                <div className="mt-1 text-xs text-yellow-700">
                  يمكنك رفع ملفات PDF، صور، فيديو، صوت، مستندات، مضغوطات ...الخ
                </div>
                {newLessonFiles.length > 0 && (
                  <ul className="mt-2 text-xs text-yellow-900">
                    {newLessonFiles.map((file, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <span>{file.name}</span>
                        <button
                          type="button"
                          className="text-red-600 hover:underline"
                          onClick={() => setNewLessonFiles(newLessonFiles.filter((_, i) => i !== idx))}
                        >
                          حذف
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Form Section */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="lessonTitle" className="text-white">
                      عنوان الدرس *
                    </Label>
                    <Input
                      id="lessonTitle"
                      value={newLesson.title}
                      onChange={(e) => setNewLesson({ ...newLesson, title: e.target.value })}
                      className="bg-gray-800/50 border-[#8648f9]/20 text-white"
                      placeholder="أدخل عنوان الدرس"
                    />
                  </div>

                  <div>
                    <Label htmlFor="lessonCourse" className="text-white">
                      المسار *
                    </Label>
                    <select
                      id="lessonCourse"
                      value={newLesson.course}
                      onChange={(e) => setNewLesson({ ...newLesson, course: e.target.value })}
                      className="w-full p-2 bg-gray-800/50 border border-[#8648f9]/20 rounded-md text-white"
                    >
                      <option value="">اختر المسار</option>
                      {courses.map((course) => (
                        <option key={course.id} value={course.title}>
                          {course.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="lessonDuration" className="text-white">
                        مدة القراءة
                      </Label>
                      <Input
                        id="lessonDuration"
                        value={newLesson.duration}
                        onChange={(e) => setNewLesson({ ...newLesson, duration: e.target.value })}
                        className="bg-gray-800/50 border-[#8648f9]/20 text-white"
                        placeholder="15 دقيقة قراءة"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lessonOrder" className="text-white">
                        ترتيب الدرس
                      </Label>
                      <Input
                        id="lessonOrder"
                        type="number"
                        value={newLesson.order}
                        onChange={(e) => setNewLesson({ ...newLesson, order: Number.parseInt(e.target.value) })}
                        className="bg-gray-800/50 border-[#8648f9]/20 text-white"
                        min="1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="lessonDescription" className="text-white">
                      وصف مختصر
                    </Label>
                    <Textarea
                      id="lessonDescription"
                      value={newLesson.description}
                      onChange={(e) => setNewLesson({ ...newLesson, description: e.target.value })}
                      className="bg-gray-800/50 border-[#8648f9]/20 text-white"
                      placeholder="وصف مختصر للدرس"
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="lessonContent" className="text-white">
                      محتوى الدرس (HTML) *
                    </Label>
                    <Textarea
                      id="lessonContent"
                      value={newLesson.content}
                      onChange={(e) => setNewLesson({ ...newLesson, content: e.target.value })}
                      className="bg-gray-800/50 border-[#8648f9]/20 text-white font-mono text-sm"
                      placeholder="أدخل محتوى الدرس بصيغة HTML..."
                      rows={12}
                    />
                    <div className="mt-2 text-xs text-gray-400">
                      <p>
                        العلامات المدعومة: &lt;h2&gt;, &lt;h3&gt;, &lt;p&gt;, &lt;ul&gt;, &lt;li&gt;, &lt;strong&gt;,
                        &lt;em&gt;
                      </p>
                    </div>
                  </div>

                  <Button onClick={handleAddLesson} className="w-full bg-[#8648f9] hover:bg-[#8648f9]/80 text-white">
                    <Save className="w-4 h-4 ml-2" />
                    حفظ الدرس
                  </Button>
                </div>

                {/* Preview Section */}
                <div className="bg-gray-800/30 rounded-lg p-4">
                  <h3 className="text-white font-semibold mb-4">معاينة المحتوى</h3>
                  <div className="bg-gray-900/50 rounded-lg p-4 max-h-96 overflow-y-auto">
                    {newLesson.title && <h2 className="text-xl font-bold text-white mb-2">{newLesson.title}</h2>}
                    {newLesson.description && <p className="text-gray-300 mb-4 text-sm">{newLesson.description}</p>}
                    <div
                      className="prose prose-invert prose-sm max-w-none text-gray-300"
                      dangerouslySetInnerHTML={{
                        __html: newLesson.content || "<p class='text-gray-500'>ابدأ بكتابة المحتوى لرؤية المعاينة</p>",
                      }}
                    />
                    {newLessonFiles.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-white text-sm font-bold mb-1">الملفات المرفقة:</h4>
                        <ul className="text-xs text-gray-400">
                          {newLessonFiles.map((file, idx) => (
                            <li key={idx}>{file.name}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search and Filter */}
        <Card className="bg-gray-900/50 border-[#8648f9]/20 mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="البحث في الدروس..."
                  className="pr-10 bg-gray-800/50 border-[#8648f9]/20 text-white placeholder:text-gray-400"
                />
              </div>
              <select className="p-2 bg-gray-800/50 border border-[#8648f9]/20 rounded-md text-white">
                <option value="">جميع المسارات</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.title}>
                    {course.title}
                  </option>
                ))}
              </select>
              <select className="p-2 bg-gray-800/50 border border-[#8648f9]/20 rounded-md text-white">
                <option value="">جميع الحالات</option>
                <option value="منشور">منشور</option>
                <option value="مسودة">مسودة</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Lessons Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {lessons.map((lesson) => (
            <Card
              key={lesson.id}
              className="bg-gray-900/50 border-[#8648f9]/20 hover:border-[#8648f9]/40 transition-colors"
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-white text-lg mb-2">{lesson.title}</CardTitle>
                    <CardDescription className="text-gray-300 text-sm">{lesson.description}</CardDescription>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      lesson.status === "منشور"
                        ? "border-green-500/20 text-green-500"
                        : "border-yellow-500/20 text-yellow-500"
                    }
                  >
                    {lesson.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm text-gray-400">
                    <span>المسار: {lesson.course}</span>
                    <span>الترتيب: {lesson.order}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-400">
                    <span>{lesson.duration}</span>
                    <span>{lesson.created}</span>
                  </div>

                  <div className="flex gap-2 pt-3">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 border-blue-500/20 text-blue-500 hover:bg-blue-500/10"
                        >
                          <Eye className="w-3 h-3 ml-1" />
                          معاينة
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-gray-900 border-[#8648f9]/20 max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle className="text-white">{lesson.title}</DialogTitle>
                          <DialogDescription className="text-gray-300">
                            {lesson.course} • {lesson.duration}
                          </DialogDescription>
                        </DialogHeader>
                        <div
                          className="prose prose-invert max-w-none text-gray-300"
                          dangerouslySetInnerHTML={{ __html: lesson.content }}
                        />
                      </DialogContent>
                    </Dialog>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditLesson(lesson)}
                      className="border-[#8648f9]/20 text-[#8648f9] hover:bg-[#8648f9]/10"
                    >
                      <Edit className="w-3 h-3" />
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleStatus(lesson.id)}
                      className={
                        lesson.status === "منشور"
                          ? "border-yellow-500/20 text-yellow-500 hover:bg-yellow-500/10"
                          : "border-green-500/20 text-green-500 hover:bg-green-500/10"
                      }
                    >
                      {lesson.status === "منشور" ? "إخفاء" : "نشر"}
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteLesson(lesson.id)}
                      className="border-red-500/20 text-red-500 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Edit Dialog */}
        {editingLesson && (
          <Dialog open={!!editingLesson} onOpenChange={() => setEditingLesson(null)}>
            <DialogContent className="bg-gray-900 border-[#8648f9]/20 max-w-6xl max-h-[95vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-white">تحرير الدرس</DialogTitle>
                <div style={{color: 'red', fontSize: 24, margin: 8}}>اختبار: يجب أن ترى هذا النص هنا!</div>
<div className="mb-4">
  <Label htmlFor="editLessonFiles" className="text-black font-bold flex items-center gap-2">
    <Plus className="w-5 h-5" />
    إرفاق مواد تعليمية جديدة (ملفات)
  </Label>
  <Input
    id="editLessonFiles"
    type="file"
    multiple
    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.ppt,.pptx,.zip,.rar,.txt,.mp4,.mp3"
    className="bg-gray-200 border border-yellow-400 text-black"
    onChange={e => {
      if (e.target.files) {
        setEditingLessonFiles(Array.from(e.target.files))
      }
    }}
  />
  <div className="mt-1 text-xs text-yellow-700">
    يمكنك رفع ملفات PDF، صور، فيديو، صوت، مستندات، مضغوطات ...الخ
  </div>
  {editingLessonFiles.length > 0 && (
    <ul className="mt-2 text-xs text-yellow-900">
      {editingLessonFiles.map((file, idx) => (
        <li key={idx} className="flex items-center gap-2">
          <span>{file.name}</span>
          <button
            type="button"
            className="text-red-600 hover:underline"
            onClick={() => setEditingLessonFiles(editingLessonFiles.filter((_, i) => i !== idx))}
          >
            حذف
          </button>
        </li>
      ))}
    </ul>
  )}
</div>
                <DialogDescription className="text-gray-300">تحرير محتوى الدرس</DialogDescription>
              </DialogHeader>

              {/* رسالة بارزة وحقل رفع الملفات في نافذة التعديل */}
              <div className="bg-yellow-100 border border-yellow-400 rounded-md p-4 mb-4 text-yellow-900 font-bold text-lg flex items-center gap-2">
                <Plus className="w-6 h-6" />
                هام: يمكنك هنا رفع ملفات مواد تعليمية جديدة (PDF، صور، فيديو، صوت، مستندات، ...). الملفات الجديدة ستُضاف للدرس.
              </div>
              <div>
                <Label htmlFor="editLessonFiles" className="text-black font-bold flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  إرفاق مواد تعليمية جديدة (ملفات)
                </Label>
                <Input
                  id="editLessonFiles"
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.ppt,.pptx,.zip,.rar,.txt,.mp4,.mp3"
                  className="bg-gray-200 border border-yellow-400 text-black"
                  onChange={e => {
                    if (e.target.files) {
                      setEditingLessonFiles(Array.from(e.target.files))
                    }
                  }}
                />
                <div className="mt-1 text-xs text-yellow-700">
                  يمكنك رفع ملفات PDF، صور، فيديو، صوت، مستندات، مضغوطات ...الخ
                </div>
                {editingLessonFiles.length > 0 && (
                  <ul className="mt-2 text-xs text-yellow-900">
                    {editingLessonFiles.map((file, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <span>{file.name}</span>
                        <button
                          type="button"
                          className="text-red-600 hover:underline"
                          onClick={() => setEditingLessonFiles(editingLessonFiles.filter((_, i) => i !== idx))}
                        >
                          حذف
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Form Section */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="editTitle" className="text-white">
                      عنوان الدرس
                    </Label>
                    <Input
                      id="editTitle"
                      value={editingLesson.title}
                      onChange={(e) => setEditingLesson({ ...editingLesson, title: e.target.value })}
                      className="bg-gray-800/50 border-[#8648f9]/20 text-white"
                    />
                  </div>

                  <div>
                    <Label htmlFor="editCourse" className="text-white">
                      المسار
                    </Label>
                    <select
                      id="editCourse"
                      value={editingLesson.course}
                      onChange={(e) => setEditingLesson({ ...editingLesson, course: e.target.value })}
                      className="w-full p-2 bg-gray-800/50 border border-[#8648f9]/20 rounded-md text-white"
                    >
                      {courses.map((course) => (
                        <option key={course.id} value={course.title}>
                          {course.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="editDuration" className="text-white">
                        مدة القراءة
                      </Label>
                      <Input
                        id="editDuration"
                        value={editingLesson.duration}
                        onChange={(e) => setEditingLesson({ ...editingLesson, duration: e.target.value })}
                        className="bg-gray-800/50 border-[#8648f9]/20 text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="editOrder" className="text-white">
                        ترتيب الدرس
                      </Label>
                      <Input
                        id="editOrder"
                        type="number"
                        value={editingLesson.order}
                        onChange={(e) => setEditingLesson({ ...editingLesson, order: Number.parseInt(e.target.value) })}
                        className="bg-gray-800/50 border-[#8648f9]/20 text-white"
                        min="1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="editDescription" className="text-white">
                      وصف مختصر
                    </Label>
                    <Textarea
                      id="editDescription"
                      value={editingLesson.description}
                      onChange={(e) => setEditingLesson({ ...editingLesson, description: e.target.value })}
                      className="bg-gray-800/50 border-[#8648f9]/20 text-white"
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="editContent" className="text-white">
                      محتوى الدرس (HTML)
                    </Label>
                    <Textarea
                      id="editContent"
                      value={editingLesson.content}
                      onChange={(e) => setEditingLesson({ ...editingLesson, content: e.target.value })}
                      className="bg-gray-800/50 border-[#8648f9]/20 text-white font-mono text-sm"
                      rows={12}
                    />
                  </div>

                  <div>
                    <Label htmlFor="editLessonFiles" className="text-white">
                      إرفاق محتوى تعليمي (ملفات)
                    </Label>
                    <Input
                      id="editLessonFiles"
                      type="file"
                      multiple
                      className="bg-gray-800/50 border-[#8648f9]/20 text-white"
                      onChange={e => {
                        if (e.target.files) {
                          setEditingLessonFiles(Array.from(e.target.files))
                        }
                      }}
                    />
                    {editingLessonMaterials.length > 0 && (
                      <ul className="mt-2 text-xs text-gray-400">
                        {editingLessonMaterials.map((file, idx) => (
                          <li key={idx} className="flex items-center gap-2">
                            <span>{file.file_name}</span>
                            <button type="button" className="text-red-400 hover:underline" onClick={() => handleDeleteMaterial(file.id, file.file_url)}>حذف</button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {editingLessonFiles.length > 0 && (
                      <ul className="mt-2 text-xs text-gray-400">
                        {editingLessonFiles.map((file, idx) => (
                          <li key={idx} className="flex items-center gap-2">
                            <span>{file.name}</span>
                            <button type="button" className="text-red-400 hover:underline" onClick={() => setEditingLessonFiles(editingLessonFiles.filter((_, i) => i !== idx))}>حذف</button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleUpdateLesson} className="flex-1 bg-[#8648f9] hover:bg-[#8648f9]/80 text-white">
                      <Save className="w-4 h-4 ml-2" />
                      حفظ التغييرات
                    </Button>
                    <Button
                      onClick={() => setEditingLesson(null)}
                      variant="outline"
                      className="border-gray-500/20 text-gray-300 hover:bg-gray-500/10"
                    >
                      <X className="w-4 h-4 ml-2" />
                      إلغاء
                    </Button>
                  </div>
                </div>

                {/* Preview Section */}
                <div className="bg-gray-800/30 rounded-lg p-4">
                  <h3 className="text-white font-semibold mb-4">معاينة المحتوى</h3>
                  <div className="bg-gray-900/50 rounded-lg p-4 max-h-96 overflow-y-auto">
                    <h2 className="text-xl font-bold text-white mb-2">{editingLesson.title}</h2>
                    {editingLesson.description && (
                      <p className="text-gray-300 mb-4 text-sm">{editingLesson.description}</p>
                    )}
                    <div
                      className="prose prose-invert prose-sm max-w-none text-gray-300"
                      dangerouslySetInnerHTML={{ __html: editingLesson.content }}
                    />
                    {(editingLessonMaterials.length > 0 || editingLessonFiles.length > 0) && (
                      <div className="mt-4">
                        <h4 className="text-white text-sm font-bold mb-1">الملفات المرفقة:</h4>
                        <ul className="text-xs text-gray-400">
                          {editingLessonMaterials.map((file, idx) => (
                            <li key={"exist-"+idx}>{file.file_name}</li>
                          ))}
                          {editingLessonFiles.map((file, idx) => (
                            <li key={"new-"+idx}>{file.name}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  )
}
