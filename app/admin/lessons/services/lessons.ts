import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { uploadLessonFile, deleteLessonFile } from '@/lib/supabase'

export interface Lesson {
  id: number
  title: string
  course_id: number | null
  duration: string
  lesson_order: number
  status: 'منشور' | 'مسودة'
  content: string
  description?: string
  created_at: string
}

export interface LessonMaterial {
  id: number
  lesson_id: number
  file_url: string
  file_name: string
  uploaded_at: string
}

export const getLessons = async (): Promise<Lesson[]> => {
  const supabase = createClientComponentClient()
  const { data, error } = await supabase.from('lessons').select('*').order('lesson_order', { ascending: true })
  if (error) throw error
  return data || []
}

export const getLesson = async (id: number): Promise<Lesson> => {
  const supabase = createClientComponentClient()
  const { data, error } = await supabase.from('lessons').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export const createLesson = async (lesson: Omit<Lesson, 'id' | 'created_at'>) => {
  const supabase = createClientComponentClient()
  const { data, error } = await supabase.from('lessons').insert(lesson).select().single()
  if (error) throw error
  return data
}

export const updateLesson = async (id: number, lesson: Partial<Lesson>) => {
  const supabase = createClientComponentClient()
  const { data, error } = await supabase.from('lessons').update(lesson).eq('id', id).select().single()
  if (error) throw error
  return data
}

export const deleteLesson = async (id: number) => {
  const supabase = createClientComponentClient()
  // حذف جميع الملفات المرفقة أولاً
  const { data: materials, error: matErr } = await supabase.from('lesson_materials').select('*').eq('lesson_id', id)
  if (matErr) throw matErr
  for (const mat of materials || []) {
    await deleteLessonFile(mat.file_url)
    await supabase.from('lesson_materials').delete().eq('id', mat.id)
  }
  // حذف الدرس
  const { error } = await supabase.from('lessons').delete().eq('id', id)
  if (error) throw error
  return true
}

export const getLessonMaterials = async (lesson_id: number): Promise<LessonMaterial[]> => {
  const supabase = createClientComponentClient()
  const { data, error } = await supabase.from('lesson_materials').select('*').eq('lesson_id', lesson_id)
  if (error) throw error
  return data || []
}

export const deleteLessonMaterialAndFile = async (materialId: number, fileUrl: string) => {
  const supabase = createClientComponentClient()
  await deleteLessonFile(fileUrl)
  const { error } = await supabase.from('lesson_materials').delete().eq('id', materialId)
  if (error) throw error
  return true
} 