import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export interface Course {
  id: number
  title: string
  description?: string
  level: 'مبتدئ' | 'متوسط' | 'متقدم'
  category: 'شبكات' | 'اختبار الاختراق' | 'أنظمة التشغيل' | 'التحليل الجنائي' | 'الاستجابة للحوادث' | 'تحليل البرمجيات الخبيثة' | 'التشفير'
  students: number
  status: 'منشور' | 'مسودة'
  created_at: string
  image?: string
  price: number | string
  duration: string
  rating: number
}

export interface Lesson {
  id: number
  title: string
  course_id?: number
  duration?: string
  lesson_order: number
  status: 'منشور' | 'مسودة'
  content: string
  description?: string
  created_at: string
}

export const getCourses = async (): Promise<Course[]> => {
  const supabase = createClientComponentClient()
  const { data, error } = await supabase.from('courses').select('*')
  if (error) throw error
  return data || []
}

export const getCourse = async (id: number): Promise<Course> => {
  const supabase = createClientComponentClient()
  const { data, error } = await supabase.from('courses').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export const getCourseWithLessons = async (id: number): Promise<{ course: Course; lessons: Lesson[] }> => {
  console.log('🔍 getCourseWithLessons called with id:', id)
  
  try {
    const supabase = createClientComponentClient()
    
    // فحص حالة المستخدم أولاً
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    console.log('👤 Current user in getCourseWithLessons:', user, 'User error:', userError)
    
    // أولاً، نتحقق من وجود المسار
    console.log('📚 Fetching course with id:', id)
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', id)
    
    console.log('📚 Courses query result:', { 
      courses, 
      coursesError, 
      coursesCount: courses?.length || 0 
    })
    
    if (coursesError) {
      console.error('❌ Courses error:', coursesError)
      throw coursesError
    }
    
    if (!courses || courses.length === 0) {
      // جلب المسارات المتاحة لعرضها في رسالة الخطأ
      console.log('🔍 No courses found, fetching available courses...')
      const { data: availableCourses, error: availableError } = await supabase
        .from('courses')
        .select('id, title, status')
        .order('id')
      
      console.log('📋 Available courses:', availableCourses, 'Error:', availableError)
      
      const availableIds = availableCourses?.map(c => `${c.id} (${c.title} - ${c.status})`).join(', ') || 'لا توجد مسارات'
      throw new Error(`المسار برقم ${id} غير موجود. المسارات المتاحة: ${availableIds}`)
    }
    
    if (courses.length > 1) {
      console.warn(`⚠️ Multiple courses found with id ${id}, using the first one`)
    }
    
    const course = courses[0]
    console.log('✅ Course found:', course)
    
    // جلب دروس المسار
    console.log('📖 Fetching lessons for course:', id)
    const { data: lessons, error: lessonsError } = await supabase
      .from('lessons')
      .select('*')
      .eq('course_id', id)
      .eq('status', 'منشور')
      .order('lesson_order', { ascending: true })
    
    console.log('📖 Lessons query result:', { 
      lessons, 
      lessonsError, 
      lessonsCount: lessons?.length || 0,
      query: `course_id = ${id} AND status = 'منشور'`
    })
    
    if (lessonsError) {
      console.error('❌ Lessons error:', lessonsError)
      throw lessonsError
    }
    
    // فحص إضافي للدروس
    if (!lessons || lessons.length === 0) {
      console.log('⚠️ No published lessons found, checking all lessons...')
      
      // جلب جميع الدروس (بغض النظر عن الحالة) للتشخيص
      const { data: allLessons, error: allLessonsError } = await supabase
        .from('lessons')
        .select('id, title, course_id, status, lesson_order')
        .eq('course_id', id)
        .order('lesson_order')
      
      console.log('📖 All lessons for course:', { 
        allLessons, 
        allLessonsError, 
        allLessonsCount: allLessons?.length || 0 
      })
      
      if (allLessons && allLessons.length > 0) {
        const statusCounts = allLessons.reduce((acc, lesson) => {
          acc[lesson.status || 'غير محدد'] = (acc[lesson.status || 'غير محدد'] || 0) + 1
          return acc
        }, {} as Record<string, number>)
        
        console.log('📊 Lesson status counts:', statusCounts)
        console.warn(`⚠️ Found ${allLessons.length} lessons but none are published. Status counts:`, statusCounts)
      }
    }
    
    const result = { course, lessons: lessons || [] }
    console.log('✅ getCourseWithLessons result:', {
      courseId: course.id,
      courseTitle: course.title,
      lessonsCount: result.lessons.length,
      lessons: result.lessons.map(l => ({ id: l.id, title: l.title, status: l.status }))
    })
    
    return result
  } catch (error: any) {
    console.error('❌ getCourseWithLessons error:', error)
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      error: error
    })
    throw error
  }
}

export const createCourse = async (course: Omit<Course, 'id' | 'created_at'>): Promise<Course> => {
  const supabase = createClientComponentClient()
  const { data, error } = await supabase.from('courses').insert(course).select().single()
  if (error) throw error
  return data
}

export const updateCourse = async (id: number, course: Partial<Course>): Promise<Course> => {
  const supabase = createClientComponentClient()
  const { data, error } = await supabase.from('courses').update(course).eq('id', id).select().single()
  if (error) throw error
  return data
}

export const deleteCourse = async (id: number): Promise<void> => {
  const supabase = createClientComponentClient()
  const { error } = await supabase.from('courses').delete().eq('id', id)
  if (error) throw error
}

export const toggleCourseStatus = async (id: number, currentStatus: 'منشور' | 'مسودة'): Promise<Course> => {
  return updateCourse(id, { status: currentStatus === 'منشور' ? 'مسودة' : 'منشور' })
}