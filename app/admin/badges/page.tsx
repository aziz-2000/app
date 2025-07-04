"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/hooks/use-toast'
import { 
  Plus, Edit, Trash2, Upload, Award, Star, Users, 
  CheckCircle, XCircle, Image as ImageIcon, Palette
} from 'lucide-react'
import Image from 'next/image'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { 
  getAllCourseBadges, 
  createCourseBadge, 
  updateCourseBadge, 
  deleteCourseBadge,
  uploadBadgeImage,
  deleteBadgeImage
} from '@/lib/badges'
import { BadgeWithCourseInfo } from '@/lib/badges'

export default function AdminBadgesPage() {
  const [badges, setBadges] = useState<BadgeWithCourseInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [courses, setCourses] = useState<{ id: number; title: string; level: string }[]>([])
  
  // Dialog states
  const [badgeDialogOpen, setBadgeDialogOpen] = useState(false)
  const [editingBadge, setEditingBadge] = useState<BadgeWithCourseInfo | null>(null)
  
  // Form states
  const [newBadge, setNewBadge] = useState({
    course_id: 0,
    name: '',
    description: '',
    color: '#8648f9'
  })
  
  // Image states
  const [badgeImageFile, setBadgeImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  const [uploadingImage, setUploadingImage] = useState(false)

  // Color presets
  const colorPresets = [
    { name: 'بنفسجي', value: '#8b5cf6' },
    { name: 'أزرق', value: '#3b82f6' },
    { name: 'أخضر', value: '#10b981' },
    { name: 'أصفر', value: '#fbbf24' },
    { name: 'برتقالي', value: '#f97316' },
    { name: 'أحمر', value: '#ef4444' },
    { name: 'وردي', value: '#ec4899' },
    { name: 'رمادي', value: '#6b7280' }
  ]

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // جلب الشارات
      const { badges: badgesData, error: badgesError } = await getAllCourseBadges()
      if (badgesError) {
        toast({ title: "خطأ", description: badgesError, variant: "destructive" })
        return
      }
      setBadges(badgesData)

      // جلب المسارات
      const supabase = createClientComponentClient()
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('id, title, level')
        .eq('status', 'منشور')
        .order('title')

      if (coursesError) {
        toast({ title: "خطأ", description: "فشل في جلب المسارات", variant: "destructive" })
        return
      }
      setCourses(coursesData || [])

    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = async (file: File) => {
    try {
      setUploadingImage(true)
      const result = await uploadBadgeImage(file)
      
      if (result.success && result.imageUrl) {
        setImagePreview(result.imageUrl)
        return result.imageUrl
      } else {
        toast({ title: "خطأ", description: result.error || "فشل في رفع الصورة", variant: "destructive" })
        return null
      }
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" })
      return null
    } finally {
      setUploadingImage(false)
    }
  }

  const handleCreateBadge = async () => {
    try {
      if (!newBadge.course_id || !newBadge.name) {
        toast({ title: "خطأ", description: "يرجى ملء جميع الحقول المطلوبة", variant: "destructive" })
        return
      }

      let imageUrl = ''
      if (badgeImageFile) {
        imageUrl = await handleImageUpload(badgeImageFile) || ''
      }

      const result = await createCourseBadge({
        course_id: newBadge.course_id,
        name: newBadge.name,
        description: newBadge.description,
        image_url: imageUrl,
        color: newBadge.color
      })

      if (result.success) {
        toast({ title: "تم بنجاح", description: "تم إنشاء الشارة بنجاح" })
        setBadgeDialogOpen(false)
        resetForm()
        fetchData()
      } else {
        toast({ title: "خطأ", description: result.error || "فشل في إنشاء الشارة", variant: "destructive" })
      }
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" })
    }
  }

  const handleUpdateBadge = async () => {
    try {
      if (!editingBadge) return

      if (!editingBadge.course_id || !editingBadge.name) {
        toast({ title: "خطأ", description: "يرجى ملء جميع الحقول المطلوبة", variant: "destructive" })
        return
      }

      let imageUrl = editingBadge.image_url || ''
      if (badgeImageFile) {
        imageUrl = await handleImageUpload(badgeImageFile) || imageUrl
      }

      const result = await updateCourseBadge(editingBadge.id, {
        name: editingBadge.name,
        description: editingBadge.description,
        image_url: imageUrl,
        color: editingBadge.color
      })

      if (result.success) {
        toast({ title: "تم بنجاح", description: "تم تحديث الشارة بنجاح" })
        setBadgeDialogOpen(false)
        setEditingBadge(null)
        resetForm()
        fetchData()
      } else {
        toast({ title: "خطأ", description: result.error || "فشل في تحديث الشارة", variant: "destructive" })
      }
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" })
    }
  }

  const handleDeleteBadge = async (badgeId: number) => {
    try {
      const result = await deleteCourseBadge(badgeId)
      
      if (result.success) {
        toast({ title: "تم بنجاح", description: "تم حذف الشارة بنجاح" })
        fetchData()
      } else {
        toast({ title: "خطأ", description: result.error || "فشل في حذف الشارة", variant: "destructive" })
      }
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" })
    }
  }

  const resetForm = () => {
    setNewBadge({
      course_id: 0,
      name: '',
      description: '',
      color: '#8648f9'
    })
    setBadgeImageFile(null)
    setImagePreview('')
  }

  const openEditDialog = (badge: BadgeWithCourseInfo) => {
    setEditingBadge(badge)
    setImagePreview(badge.image_url || '')
    setBadgeDialogOpen(true)
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'مبتدئ': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/20'
      case 'متوسط': return 'bg-blue-500/20 text-blue-500 border-blue-500/20'
      case 'متقدم': return 'bg-green-500/20 text-green-500 border-green-500/20'
      default: return 'bg-gray-500/20 text-gray-500 border-gray-500/20'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8648f9] mx-auto mb-4"></div>
          <p className="text-gray-400">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">إدارة الشارات</h1>
            <p className="text-gray-300">إنشاء وتعديل وحذف شارات المسارات التعليمية</p>
          </div>
          <Button onClick={() => setBadgeDialogOpen(true)} className="bg-[#8648f9] hover:bg-[#7c3aed]">
            <Plus className="w-4 h-4 ml-2" />
            شارة جديدة
          </Button>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gray-900/50 border-[#8648f9]/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">إجمالي الشارات</p>
                  <p className="text-white text-2xl font-bold">{badges.length}</p>
                </div>
                <Award className="w-8 h-8 text-[#8648f9]" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-[#8648f9]/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">الشارات الممنوحة</p>
                  <p className="text-white text-2xl font-bold">
                    {badges.reduce((sum, badge) => sum + (badge.total_awarded || 0), 0)}
                  </p>
                </div>
                <Star className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-[#8648f9]/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">المستخدمين الحاصلين</p>
                  <p className="text-white text-2xl font-bold">
                    {new Set(badges.flatMap(badge => 
                      Array.from({ length: badge.total_awarded || 0 }, () => badge.id)
                    )).size}
                  </p>
                </div>
                <Users className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-[#8648f9]/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">المسارات مع شارات</p>
                  <p className="text-white text-2xl font-bold">
                    {badges.filter(badge => badge.course_title).length}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Badges Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {badges.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Award className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-300 mb-2">لا توجد شارات</h3>
              <p className="text-gray-400 mb-4">ابدأ بإنشاء شارة جديدة للمسارات التعليمية</p>
              <Button onClick={() => setBadgeDialogOpen(true)} className="bg-[#8648f9] hover:bg-[#7c3aed]">
                <Plus className="w-4 h-4 ml-2" />
                إنشاء شارة جديدة
              </Button>
            </div>
          ) : (
            badges.map((badge) => (
              <Card key={badge.id} className="bg-gray-900/50 border-[#8648f9]/20 hover:border-[#8648f9]/40 transition-colors">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {badge.image_url ? (
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-800 flex items-center justify-center">
                          <Image
                            src={badge.image_url}
                            alt={badge.name}
                            width={48}
                            height={48}
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div 
                          className="w-12 h-12 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: badge.color }}
                        >
                          <Award className="w-6 h-6 text-white" />
                        </div>
                      )}
                      <div>
                        <CardTitle className="text-white text-lg">{badge.name}</CardTitle>
                        <p className="text-gray-400 text-sm">{badge.course_title}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => openEditDialog(badge)}
                        className="border-gray-600 hover:border-[#8648f9]"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => handleDeleteBadge(badge.id)}
                        className="border-red-500/20 text-red-500 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300 text-sm mb-4 line-clamp-2">
                    {badge.description || 'لا يوجد وصف'}
                  </p>
                  
                  <div className="flex items-center justify-between mb-3">
                    <Badge 
                      variant="outline" 
                      className={getLevelColor(badge.course_level || '')}
                    >
                      {badge.course_level || 'غير محدد'}
                    </Badge>
                    <div className="flex items-center gap-1 text-sm text-gray-400">
                      <Users className="w-4 h-4" />
                      <span>{badge.total_awarded || 0}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded-full border border-gray-600"
                      style={{ backgroundColor: badge.color }}
                    />
                    <span className="text-xs text-gray-400">{badge.color}</span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Create/Edit Badge Dialog */}
        <Dialog open={badgeDialogOpen} onOpenChange={setBadgeDialogOpen}>
          <DialogContent className="bg-gray-900 border-[#8648f9]/20 max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-white">
                {editingBadge ? 'تعديل الشارة' : 'إنشاء شارة جديدة'}
              </DialogTitle>
              <DialogDescription className="text-gray-300">
                {editingBadge ? 'تعديل بيانات الشارة' : 'أدخل بيانات الشارة الجديدة'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Course Selection */}
              <div>
                <Label htmlFor="course" className="text-white">المسار</Label>
                <Select 
                  value={editingBadge ? editingBadge.course_id.toString() : newBadge.course_id.toString()} 
                  onValueChange={(value) => {
                    if (editingBadge) {
                      setEditingBadge({ ...editingBadge, course_id: parseInt(value) })
                    } else {
                      setNewBadge({ ...newBadge, course_id: parseInt(value) })
                    }
                  }}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="اختر المسار" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map(course => (
                      <SelectItem key={course.id} value={course.id.toString()}>
                        {course.title} ({course.level})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Badge Name */}
              <div>
                <Label htmlFor="name" className="text-white">اسم الشارة</Label>
                <Input
                  id="name"
                  value={editingBadge ? editingBadge.name : newBadge.name}
                  onChange={(e) => {
                    if (editingBadge) {
                      setEditingBadge({ ...editingBadge, name: e.target.value })
                    } else {
                      setNewBadge({ ...newBadge, name: e.target.value })
                    }
                  }}
                  className="bg-gray-800 border-gray-700 text-white"
                  placeholder="مثال: شارة الأمن السيبراني"
                />
              </div>

              {/* Badge Description */}
              <div>
                <Label htmlFor="description" className="text-white">وصف الشارة</Label>
                <Textarea
                  id="description"
                  value={editingBadge ? editingBadge.description || '' : newBadge.description}
                  onChange={(e) => {
                    if (editingBadge) {
                      setEditingBadge({ ...editingBadge, description: e.target.value })
                    } else {
                      setNewBadge({ ...newBadge, description: e.target.value })
                    }
                  }}
                  className="bg-gray-800 border-gray-700 text-white"
                  placeholder="وصف الشارة التي سيحصل عليها الطالب عند إكمال المسار"
                  rows={3}
                />
              </div>

              {/* Color Selection */}
              <div>
                <Label className="text-white">لون الشارة</Label>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {colorPresets.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      className={`w-12 h-12 rounded-lg border-2 transition-all ${
                        (editingBadge ? editingBadge.color : newBadge.color) === color.value
                          ? 'border-white scale-110'
                          : 'border-gray-600 hover:border-gray-400'
                      }`}
                      style={{ backgroundColor: color.value }}
                      onClick={() => {
                        if (editingBadge) {
                          setEditingBadge({ ...editingBadge, color: color.value })
                        } else {
                          setNewBadge({ ...newBadge, color: color.value })
                        }
                      }}
                      title={color.name}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Palette className="w-4 h-4 text-gray-400" />
                  <Input
                    value={editingBadge ? editingBadge.color : newBadge.color}
                    onChange={(e) => {
                      if (editingBadge) {
                        setEditingBadge({ ...editingBadge, color: e.target.value })
                      } else {
                        setNewBadge({ ...newBadge, color: e.target.value })
                      }
                    }}
                    className="bg-gray-800 border-gray-700 text-white w-32"
                    placeholder="#8648f9"
                  />
                </div>
              </div>

              {/* Image Upload */}
              <div>
                <Label className="text-white">صورة الشارة</Label>
                <div className="mt-2 space-y-4">
                  {/* Image Preview */}
                  {(imagePreview || (editingBadge?.image_url)) && (
                    <div className="relative w-32 h-32 bg-gray-800 rounded-lg overflow-hidden">
                      <Image
                        src={imagePreview || editingBadge?.image_url || ''}
                        alt="Badge preview"
                        fill
                        className="object-cover"
                      />
                      <Button
                        size="icon"
                        variant="outline"
                        className="absolute top-2 right-2 w-6 h-6 bg-red-500/20 border-red-500/20 text-red-500 hover:bg-red-500/30"
                        onClick={() => {
                          setImagePreview('')
                          setBadgeImageFile(null)
                        }}
                      >
                        <XCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  )}

                  {/* Upload Button */}
                  <div className="flex items-center gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('badge-image')?.click()}
                      className="border-gray-600 hover:border-[#8648f9]"
                      disabled={uploadingImage}
                    >
                      {uploadingImage ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#8648f9] mr-2" />
                      ) : (
                        <Upload className="w-4 h-4 mr-2" />
                      )}
                      {uploadingImage ? 'جاري الرفع...' : 'رفع صورة'}
                    </Button>
                    <input
                      id="badge-image"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          setBadgeImageFile(file)
                          // Create preview
                          const reader = new FileReader()
                          reader.onload = (e) => {
                            setImagePreview(e.target?.result as string)
                          }
                          reader.readAsDataURL(file)
                        }
                      }}
                    />
                    <span className="text-xs text-gray-400">
                      JPG, PNG, GIF, WebP (أقصى 5MB)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setBadgeDialogOpen(false)
                  setEditingBadge(null)
                  resetForm()
                }}
              >
                إلغاء
              </Button>
              <Button
                onClick={editingBadge ? handleUpdateBadge : handleCreateBadge}
                className="bg-[#8648f9] hover:bg-[#7c3aed]"
                disabled={uploadingImage}
              >
                {editingBadge ? 'تحديث الشارة' : 'إنشاء الشارة'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
} 