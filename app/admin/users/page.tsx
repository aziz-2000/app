'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { User, getUsers, createUser, updateUser, deleteUser, toggleUserStatus } from '../dashboard/services/users'
import { Plus, Edit, Trash2, Eye, EyeOff, Upload } from 'lucide-react'
import Sidebar from '@/components/sidebar'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'

export default function UsersManagementPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'طالب' as 'طالب' | 'مدرب' | 'مسؤول',
    avatar_url: '/placeholder-user.jpg',
    status: 'نشط' as 'نشط' | 'معطل',
    join_date: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      const data = await getUsers()
      setUsers(data)
    } catch (error) {
      toast.error('خطأ في تحميل المستخدمين')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    let avatarUrl = formData.avatar_url

    // إذا تم اختيار صورة جديدة
    if (avatarFile) {
      try {
        // التحقق من حجم الملف (5MB)
        if (avatarFile.size > 5 * 1024 * 1024) {
          toast.error('حجم الصورة يجب أن يكون أقل من 5MB')
          return
        }

        // التحقق من نوع الملف
        if (!avatarFile.type.startsWith('image/')) {
          toast.error('يجب اختيار ملف صورة صحيح')
          return
        }

        const fileExt = avatarFile.name.split('.').pop()
        const fileName = `${Date.now()}.${fileExt}`
        
        console.log('Attempting to upload file:', fileName, 'Size:', avatarFile.size, 'Type:', avatarFile.type)
        
        const { data, error } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile, { 
            upsert: true,
            cacheControl: '3600'
          })
        
        if (error) {
          console.error('Upload error details:', {
            message: error.message,
            error: error
          })
          
          if (error.message?.includes('bucket')) {
            toast.error('خطأ: تأكد من إنشاء bucket "avatars" في Supabase Storage')
          } else if (error.message?.includes('permission')) {
            toast.error('خطأ: تأكد من إعداد سياسات RLS للرفع')
          } else {
            toast.error(`فشل رفع الصورة: ${error.message}`)
          }
          return
        }
        
        console.log('Upload successful:', data)
        
        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName)
        
        avatarUrl = urlData.publicUrl
        console.log('Public URL:', avatarUrl)
        toast.success('تم رفع الصورة بنجاح')
      } catch (error: any) {
        console.error('Upload exception:', error)
        toast.error(`فشل رفع الصورة: ${error.message || 'خطأ غير معروف'}`)
        return
      }
    }

    try {
      if (editingUser) {
        await updateUser(editingUser.id, { ...formData, avatar_url: avatarUrl })
        toast.success('تم تحديث المستخدم بنجاح')
      } else {
        await createUser({ ...formData, avatar_url: avatarUrl })
        toast.success('تم إضافة المستخدم بنجاح')
      }
      setIsDialogOpen(false)
      resetForm()
      setAvatarFile(null)
      loadUsers()
    } catch (error) {
      toast.error('خطأ في حفظ المستخدم: ' + ((error as any)?.message || JSON.stringify(error)))
      console.error('User save error:', error, JSON.stringify(error))
    }
  }

  const handleEdit = (user: User) => {
    setEditingUser(user)
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      avatar_url: user.avatar_url || '/placeholder-user.jpg',
      status: user.status,
      join_date: user.join_date
    })
    setAvatarFile(null)
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا المستخدم؟')) {
      try {
        await deleteUser(id)
        toast.success('تم حذف المستخدم بنجاح')
        loadUsers()
      } catch (error) {
        toast.error('خطأ في حذف المستخدم')
        console.error(error)
      }
    }
  }

  const handleToggleStatus = async (user: User) => {
    try {
      await toggleUserStatus(user.id, user.status)
      toast.success('تم تحديث حالة المستخدم')
      loadUsers()
    } catch (error) {
      toast.error('خطأ في تحديث حالة المستخدم')
      console.error(error)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      role: 'طالب' as 'طالب' | 'مدرب' | 'مسؤول',
      avatar_url: '/placeholder-user.jpg',
      status: 'نشط' as 'نشط' | 'معطل',
      join_date: new Date().toISOString().split('T')[0]
    })
    setEditingUser(null)
    setAvatarFile(null)
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-row-reverse">
        <Sidebar />
        <div className="flex-1 mr-64 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-700 rounded w-1/4 mb-6"></div>
            <div className="grid gap-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-800 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex flex-row-reverse">
      <Sidebar />
      <div className="flex-1 mr-64 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-white">إدارة المستخدمين</h1>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => resetForm()}>
                  <Plus className="ml-2 h-4 w-4" />
                  إضافة مستخدم جديد
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>
                    {editingUser ? 'تعديل المستخدم' : 'إضافة مستخدم جديد'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="flex justify-center mb-4">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={formData.avatar_url} />
                      <AvatarFallback>{getInitials(formData.name)}</AvatarFallback>
                    </Avatar>
                  </div>
                  
                  <div>
                    <Label htmlFor="avatar_file">الصورة الشخصية</Label>
                    <div className="flex items-center gap-4">
                      <Input
                        id="avatar_file"
                        type="file"
                        accept="image/*"
                        onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                        className="flex-1"
                      />
                      <Upload className="w-5 h-5 text-gray-400" />
                    </div>
                    {formData.avatar_url && formData.avatar_url !== '/placeholder-user.jpg' && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-400 mb-2">الصورة الحالية:</p>
                        <Image 
                          src={formData.avatar_url} 
                          alt="الصورة الحالية" 
                          width={80} 
                          height={80} 
                          className="rounded-full border-2 border-[#8648f9]/20" 
                        />
                      </div>
                    )}
                    {avatarFile && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-400 mb-2">الصورة المختارة:</p>
                        <Image 
                          src={URL.createObjectURL(avatarFile)} 
                          alt="الصورة المختارة" 
                          width={80} 
                          height={80} 
                          className="rounded-full border-2 border-green-500/20" 
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="name">الاسم</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">البريد الإلكتروني</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="role">الدور</Label>
                    <Select
                      value={formData.role}
                      onValueChange={(value: 'طالب' | 'مدرب' | 'مسؤول') => 
                        setFormData({ ...formData, role: value })
                      }
                    >
                      <SelectTrigger>
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
                    <Label htmlFor="status">الحالة</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value: 'نشط' | 'معطل') => 
                        setFormData({ ...formData, status: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="نشط">نشط</SelectItem>
                        <SelectItem value="معطل">معطل</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button type="submit" className="flex-1">
                      {editingUser ? 'تحديث' : 'إضافة'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      إلغاء
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {users.map((user) => (
              <Card key={user.id} className="bg-gray-900/50 border-[#8648f9]/20">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 space-x-reverse">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={user.avatar_url} />
                        <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold text-white">{user.name}</h3>
                        <p className="text-sm text-gray-400">{user.email}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={user.role === 'مسؤول' ? 'destructive' : user.role === 'مدرب' ? 'secondary' : 'default'}>
                            {user.role}
                          </Badge>
                          <Badge variant={user.status === 'نشط' ? 'default' : 'secondary'}>
                            {user.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleStatus(user)}
                      >
                        {user.status === 'نشط' ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(user)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(user.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {users.length === 0 && (
            <Card className="bg-gray-900/50 border-[#8648f9]/20">
              <CardContent className="p-6 text-center">
                <p className="text-gray-400">لا يوجد مستخدمين</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
} 