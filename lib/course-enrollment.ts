import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { awardBadgeToUser } from './badges'

export interface CourseEnrollment {
  id: string
  user_id: string
  course_id: number
  enrolled_at: string
  progress: number
  status: "مستمر" | "مكتمل" | "متوقف"
  last_accessed?: string
  total_time_spent?: number
}

export interface CourseWithEnrollment {
  id: number
  title: string
  description: string
  level: string
  duration: number
  image?: string
  enrollment?: CourseEnrollment
}

export interface EnrollmentStats {
  totalEnrollments: number
  completedCourses: number
  inProgressCourses: number
  averageProgress: number
}

/**
 * الحصول على المستخدم الحالي من الجلسة
 */
async function getCurrentUser() {
  try {
    const supabase = createClientComponentClient()
    
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('Session error:', sessionError)
      if (sessionError.message?.includes('Auth session missing')) {
        console.log('⚠️ Session missing, trying getUser()...')
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError) {
          console.error('User error:', userError)
          return null
        }
        
        if (user) {
          console.log('✅ User found via getUser():', user.email)
          return user
        }
      }
      return null
    }
    
    if (session?.user) {
      console.log('✅ User found via getSession():', session.user.email)
      return session.user
    }
    
    console.log('⚠️ No user in session, trying getUser()...')
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      console.error('User error:', userError)
      return null
    }
    
    if (user) {
      console.log('✅ User found via getUser():', user.email)
      return user
    }
    
    console.log('⚠️ No user found in session or user data')
    return null
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

/**
 * جلب تسجيلات المستخدم
 */
export async function getUserEnrollments(): Promise<{ enrollments: CourseEnrollment[], error: string | null }> {
  try {
    const supabase = createClientComponentClient()
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return { enrollments: [], error: 'يجب تسجيل الدخول أولاً' }
    }

    const { data, error } = await supabase
      .from('course_enrollments')
      .select('*')
      .eq('user_id', user.id)
      .order('enrolled_at', { ascending: false })

    if (error) {
      console.error('Error fetching user enrollments:', error)
      return { enrollments: [], error: 'فشل في جلب تسجيلات المستخدم' }
    }

    return { enrollments: data || [], error: null }
  } catch (error) {
    console.error('Error in getUserEnrollments:', error)
    return { enrollments: [], error: 'حدث خطأ غير متوقع' }
  }
}

/**
 * جلب إحصائيات التسجيل
 */
export async function getEnrollmentStats(): Promise<{ 
  stats: {
    totalEnrollments: number
    completedCourses: number
    inProgressCourses: number
    averageProgress: number
  }, 
  error: string | null 
}> {
  try {
    const supabase = createClientComponentClient()
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return { 
        stats: {
          totalEnrollments: 0,
          completedCourses: 0,
          inProgressCourses: 0,
          averageProgress: 0
        }, 
        error: 'يجب تسجيل الدخول أولاً' 
      }
    }

    const { data: enrollments, error } = await supabase
      .from('course_enrollments')
      .select('*')
      .eq('user_id', user.id)

    if (error) {
      console.error('Error fetching enrollment stats:', error)
      return { 
        stats: {
          totalEnrollments: 0,
          completedCourses: 0,
          inProgressCourses: 0,
          averageProgress: 0
        }, 
        error: 'فشل في جلب إحصائيات التسجيل' 
      }
    }

    const totalEnrollments = enrollments?.length || 0
    const completedCourses = enrollments?.filter(e => e.status === 'مكتمل').length || 0
    const inProgressCourses = enrollments?.filter(e => e.status === 'مستمر').length || 0
    
    const averageProgress = enrollments && enrollments.length > 0
      ? enrollments.reduce((sum, e) => sum + (e.progress || 0), 0) / enrollments.length
      : 0

    return { 
      stats: {
        totalEnrollments,
        completedCourses,
        inProgressCourses,
        averageProgress: Math.round(averageProgress * 10) / 10
      }, 
      error: null 
    }
  } catch (error) {
    console.error('Error in getEnrollmentStats:', error)
    return { 
      stats: {
        totalEnrollments: 0,
        completedCourses: 0,
        inProgressCourses: 0,
        averageProgress: 0
      }, 
      error: 'حدث خطأ غير متوقع' 
    }
  }
}

/**
 * تسجيل المستخدم في مسار معين
 */
export async function enrollInCourse(courseId: number): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🎯 enrollInCourse called with courseId:', courseId)
    const supabase = createClientComponentClient()
    
    // الحصول على المستخدم الحالي من الجلسة
    const user = await getCurrentUser()
    console.log('👤 User from getCurrentUser():', user ? user.email : 'null')
    console.log('👤 User ID:', user?.id)
    
    if (!user) {
      console.log('❌ No user found, returning error')
      return { success: false, error: "يجب تسجيل الدخول أولاً" }
    }

    console.log('✅ User authenticated, checking existing enrollment...')

    // التحقق من عدم التسجيل مسبقاً
    const { data: existingEnrollment, error: checkError } = await supabase
      .from('course_enrollments')
      .select('id')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Error checking existing enrollment:', checkError)
      console.error('❌ Error details:', {
        message: checkError.message,
        code: checkError.code,
        details: checkError.details,
        hint: checkError.hint
      })
    }

    if (existingEnrollment) {
      console.log('⚠️ User already enrolled in this course')
      return { success: false, error: "أنت مسجل بالفعل في هذا المسار" }
    }

    console.log('✅ No existing enrollment found, creating new enrollment...')

    // التحقق من وجود المسار أولاً
    const { data: courseExists, error: courseCheckError } = await supabase
      .from('courses')
      .select('id, title')
      .eq('id', courseId)
      .single()

    if (courseCheckError) {
      console.error('❌ Course not found:', courseCheckError)
      console.error('❌ Course check error details:', {
        message: courseCheckError.message,
        code: courseCheckError.code,
        details: courseCheckError.details,
        hint: courseCheckError.hint
      })
      return { success: false, error: "المسار غير موجود" }
    }

    console.log('✅ Course found:', courseExists.title)

    // إضافة التسجيل الجديد
    const enrollmentData = {
      user_id: user.id,
      course_id: courseId,
      progress: 0,
      status: 'مستمر',
      last_accessed: new Date().toISOString()
    }

    console.log('📝 Inserting enrollment data:', enrollmentData)

    const { data: newEnrollment, error: enrollmentError } = await supabase
      .from('course_enrollments')
      .insert(enrollmentData)
      .select()
      .single()

    if (enrollmentError) {
      console.error('❌ Enrollment error:', enrollmentError)
      console.error('❌ Error details:', {
        message: enrollmentError.message,
        code: enrollmentError.code,
        details: enrollmentError.details,
        hint: enrollmentError.hint,
        fullError: JSON.stringify(enrollmentError, null, 2)
      })
      
      // تحقق من نوع الخطأ
      if (enrollmentError.code === '23505') {
        return { success: false, error: "أنت مسجل بالفعل في هذا المسار" }
      } else if (enrollmentError.code === '23503') {
        return { success: false, error: "المسار أو المستخدم غير موجود" }
      } else if (enrollmentError.message?.includes('RLS')) {
        return { success: false, error: "ليس لديك صلاحية للتسجيل في هذا المسار" }
      } else {
        return { success: false, error: `فشل في تسجيل المسار: ${enrollmentError.message}` }
      }
    }

    console.log('✅ Enrollment created successfully:', newEnrollment)

    // تحديث عدد الطلاب في المسار
    const { data: currentCourse } = await supabase
      .from('courses')
      .select('students')
      .eq('id', courseId)
      .single()

    if (currentCourse) {
      const newStudentsCount = (currentCourse.students || 0) + 1
      console.log('📊 Updating course students count from', currentCourse.students, 'to', newStudentsCount)
      
      const { error: updateError } = await supabase
        .from('courses')
        .update({ students: newStudentsCount })
        .eq('id', courseId)

      if (updateError) {
        console.error('❌ Error updating course students count:', updateError)
        // لا نريد أن يفشل التسجيل بسبب خطأ في تحديث العداد
      } else {
        console.log('✅ Course students count updated successfully')
      }
    }

    console.log('🎉 Enrollment process completed successfully')
    
    return { success: true }
  } catch (error) {
    console.error('❌ Error in enrollInCourse:', error)
    console.error('❌ Error details:', {
      name: (error as any)?.name,
      message: (error as any)?.message,
      stack: (error as any)?.stack,
      fullError: JSON.stringify(error, null, 2)
    })
    return { success: false, error: "حدث خطأ غير متوقع أثناء التسجيل" }
  }
}

/**
 * تحديث تقدم المسار مع التخزين المؤقت المتقدم
 */
export async function updateCourseProgress(
  courseId: number, 
  progress: number, 
  timeSpent?: number
): Promise<{ success: boolean, error: string | null }> {
  try {
    const supabase = createClientComponentClient()
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return { success: false, error: 'يجب تسجيل الدخول أولاً' }
    }

    const updateData: any = {
      progress,
      last_accessed: new Date().toISOString()
    }

    if (timeSpent !== undefined) {
      updateData.total_time_spent = timeSpent
    }

    // إذا وصل التقدم إلى 100%، تحديث الحالة إلى مكتمل
    if (progress >= 100) {
      updateData.status = 'مكتمل'
      updateData.completed_at = new Date().toISOString()
    }

    const { error: updateError } = await supabase
      .from('course_enrollments')
      .update(updateData)
      .eq('user_id', user.id)
      .eq('course_id', courseId)

    if (updateError) {
      throw new Error('فشل في تحديث تقدم المسار')
    }

    // إذا تم إكمال المسار، محاولة منح شارة
    if (progress >= 100) {
      try {
        await awardBadgeToUser(user.id, courseId)
      } catch (badgeError) {
        console.error('Error awarding badge:', badgeError)
      }
    }

    return { success: true, error: null }
  } catch (error) {
    console.error('Error in updateCourseProgress:', error)
    return { success: false, error: 'حدث خطأ غير متوقع' }
  }
}

/**
 * جلب المسارات مع تسجيلات المستخدم
 */
export async function getCoursesWithEnrollments(): Promise<{ 
  courses: CourseWithEnrollment[], 
  error: string | null 
}> {
  try {
    const supabase = createClientComponentClient()
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return { courses: [], error: 'يجب تسجيل الدخول أولاً' }
    }

    // جلب جميع المسارات
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select('*')
      .eq('status', 'منشور')
      .order('created_at', { ascending: false })

    if (coursesError) {
      console.error('Error fetching courses:', coursesError)
      return { courses: [], error: 'فشل في جلب المسارات' }
    }

    // جلب تسجيلات المستخدم
    const { data: enrollments, error: enrollmentsError } = await supabase
      .from('course_enrollments')
      .select('*')
      .eq('user_id', user.id)

    if (enrollmentsError) {
      console.error('Error fetching enrollments:', enrollmentsError)
      return { courses: [], error: 'فشل في جلب تسجيلات المستخدم' }
    }

    // دمج المسارات مع التسجيلات
    const coursesWithEnrollments: CourseWithEnrollment[] = (courses || []).map(course => {
      const enrollment = (enrollments || []).find(e => e.course_id === course.id)
      return {
        ...course,
        enrollment
      }
    })

    return { courses: coursesWithEnrollments, error: null }
  } catch (error) {
    console.error('Error in getCoursesWithEnrollments:', error)
    return { courses: [], error: 'حدث خطأ غير متوقع' }
  }
}

/**
 * التحقق من تسجيل المستخدم في مسار معين
 */
export async function checkEnrollment(courseId: number): Promise<{ isEnrolled: boolean; enrollment?: CourseEnrollment }> {
  try {
    const supabase = createClientComponentClient()
    
    // الحصول على المستخدم الحالي من الجلسة
    const user = await getCurrentUser()
    if (!user) {
      return { isEnrolled: false }
    }

    const { data: enrollment, error: enrollmentError } = await supabase
      .from('course_enrollments')
      .select('*')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .single()

    if (enrollmentError && enrollmentError.code !== 'PGRST116') {
      console.error('Error checking enrollment:', enrollmentError)
      return { isEnrolled: false }
    }

    return { isEnrolled: !!enrollment, enrollment: enrollment || undefined }
  } catch (error) {
    console.error('Error in checkEnrollment:', error)
    return { isEnrolled: false }
  }
}

/**
 * تحديث تقدم المستخدم في مسار معين
 */
export async function updateProgress(courseId: number, progress: number): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClientComponentClient()
    
    // الحصول على المستخدم الحالي من الجلسة
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: "يجب تسجيل الدخول أولاً" }
    }

    const { error: updateError } = await supabase
      .from('course_enrollments')
      .update({ 
        progress: Math.min(100, Math.max(0, progress)),
        last_accessed: new Date().toISOString(),
        status: progress >= 100 ? 'مكتمل' : 'مستمر'
      })
      .eq('user_id', user.id)
      .eq('course_id', courseId)

    if (updateError) {
      console.error('Error updating progress:', updateError)
      return { success: false, error: "فشل في تحديث التقدم" }
    }

    // إذا تم إكمال المسار، محاولة منح شارة
    if (progress >= 100) {
      try {
        await awardBadgeToUser(user.id, courseId)
      } catch (badgeError) {
        console.error('Error awarding badge:', badgeError)
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Error in updateProgress:', error)
    return { success: false, error: "حدث خطأ غير متوقع" }
  }
}

/**
 * إلغاء تسجيل المستخدم من مسار معين
 */
export async function unenrollFromCourse(courseId: number): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClientComponentClient()
    
    // الحصول على المستخدم الحالي من الجلسة
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: "يجب تسجيل الدخول أولاً" }
    }

    // حذف التسجيل
    const { error: deleteError } = await supabase
      .from('course_enrollments')
      .delete()
      .eq('user_id', user.id)
      .eq('course_id', courseId)

    if (deleteError) {
      console.error('Error unenrolling from course:', deleteError)
      return { success: false, error: "فشل في إلغاء التسجيل" }
    }

    // تحديث عدد الطلاب في المسار
    const { data: currentCourse } = await supabase
      .from('courses')
      .select('students')
      .eq('id', courseId)
      .single()

    if (currentCourse && currentCourse.students > 0) {
      const { error: updateError } = await supabase
        .from('courses')
        .update({ students: currentCourse.students - 1 })
        .eq('id', courseId)

      if (updateError) {
        console.error('Error updating course students count:', updateError)
        // لا نريد أن يفشل إلغاء التسجيل بسبب خطأ في تحديث العداد
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Error in unenrollFromCourse:', error)
    return { success: false, error: "حدث خطأ غير متوقع" }
  }
}

/**
 * تحديث آخر وقت وصول للمسار
 */
export async function updateLastAccessed(courseId: number): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClientComponentClient()
    
    // الحصول على المستخدم الحالي من الجلسة
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: "يجب تسجيل الدخول أولاً" }
    }

    const { error: updateError } = await supabase
      .from('course_enrollments')
      .update({ last_accessed: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('course_id', courseId)

    if (updateError) {
      console.error('Error updating last accessed:', updateError)
      return { success: false, error: "فشل في تحديث آخر وصول" }
    }

    return { success: true }
  } catch (error) {
    console.error('Error in updateLastAccessed:', error)
    return { success: false, error: "حدث خطأ غير متوقع" }
  }
}

/**
 * جلب تسجيل مع بيانات المسار
 */
export async function getEnrollmentWithCourse(courseId: number): Promise<{ 
  enrollment?: CourseEnrollment & { course?: any }; 
  error?: string 
}> {
  try {
    const supabase = createClientComponentClient()
    
    // الحصول على المستخدم الحالي من الجلسة
    const user = await getCurrentUser()
    if (!user) {
      return { error: "يجب تسجيل الدخول أولاً" }
    }

    const { data: enrollment, error: enrollmentError } = await supabase
      .from('course_enrollments')
      .select(`
        *,
        course:courses(*)
      `)
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .single()

    if (enrollmentError && enrollmentError.code !== 'PGRST116') {
      console.error('Error fetching enrollment with course:', enrollmentError)
      return { error: "فشل في جلب بيانات التسجيل" }
    }

    return { enrollment: enrollment || undefined }
  } catch (error) {
    console.error('Error in getEnrollmentWithCourse:', error)
    return { error: "حدث خطأ غير متوقع" }
  }
}

/**
 * تحديث حالة المسار إلى مكتمل
 */
export async function markCourseAsCompleted(courseId: number): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🏆 markCourseAsCompleted called with courseId:', courseId)
    const supabase = createClientComponentClient()
    
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: "يجب تسجيل الدخول أولاً" }
    }

    // التحقق من وجود التسجيل
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('course_enrollments')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .single()

    if (enrollmentError) {
      console.error('❌ Error fetching enrollment:', enrollmentError)
      return { success: false, error: "لم يتم العثور على تسجيل المسار" }
    }

    if (enrollment.status === 'مكتمل') {
      console.log('✅ Course already completed')
      return { success: true, error: undefined }
    }

    // تحديث حالة المسار إلى مكتمل
    const { error: updateError } = await supabase
      .from('course_enrollments')
      .update({
        status: 'مكتمل',
        completed_at: new Date().toISOString(),
        progress: 100
      })
      .eq('user_id', user.id)
      .eq('course_id', courseId)

    if (updateError) {
      console.error('❌ Error updating course status:', updateError)
      return { success: false, error: "فشل في تحديث حالة المسار" }
    }

    console.log('✅ Course marked as completed successfully')
    return { success: true, error: undefined }
  } catch (error) {
    console.error('❌ Error in markCourseAsCompleted:', error)
    return { success: false, error: "حدث خطأ غير متوقع" }
  }
}

/**
 * التحقق من إكمال جميع دروس المسار وتحديث حالة المسار
 */
export async function checkAndUpdateCourseCompletion(courseId: number): Promise<{ 
  isCompleted: boolean; 
  totalLessons: number; 
  completedLessons: number; 
  badgeAwarded: boolean;
  error?: string 
}> {
  try {
    console.log('🔍 checkAndUpdateCourseCompletion called with courseId:', courseId)
    const supabase = createClientComponentClient()
    
    const user = await getCurrentUser()
    if (!user) {
      return { isCompleted: false, totalLessons: 0, completedLessons: 0, badgeAwarded: false, error: "يجب تسجيل الدخول أولاً" }
    }

    // جلب جميع دروس المسار
    const { data: lessons, error: lessonsError } = await supabase
      .from('lessons')
      .select('id')
      .eq('course_id', courseId)
      .eq('status', 'منشور')

    if (lessonsError) {
      console.error('❌ Error fetching lessons:', lessonsError)
      return { isCompleted: false, totalLessons: 0, completedLessons: 0, badgeAwarded: false, error: "فشل في جلب دروس المسار" }
    }

    const totalLessons = lessons?.length || 0
    console.log('📚 Total lessons in course:', totalLessons)

    if (totalLessons === 0) {
      return { isCompleted: false, totalLessons: 0, completedLessons: 0, badgeAwarded: false, error: "لا توجد دروس في هذا المسار" }
    }

    // جلب الدروس المكتملة مع تقدم 100%
    const { data: completedLessons, error: completedError } = await supabase
      .from('lesson_progress')
      .select('lesson_id, progress_percentage')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .eq('completed', true)
      .eq('progress_percentage', 100)

    if (completedError) {
      console.error('❌ Error fetching completed lessons:', completedError)
      return { isCompleted: false, totalLessons, completedLessons: 0, badgeAwarded: false, error: "فشل في جلب الدروس المكتملة" }
    }

    const completedLessonsCount = completedLessons?.length || 0
    console.log('✅ Completed lessons with 100% progress:', completedLessonsCount)

    const isCompleted = completedLessonsCount >= totalLessons

    // إذا تم إكمال جميع الدروس، تحديث حالة المسار ومنح الشارة
    if (isCompleted) {
      console.log('🎉 All lessons completed with 100% progress! Marking course as completed...')
      
      // تحديث حالة المسار
      const { success, error } = await markCourseAsCompleted(courseId)
      
      if (!success) {
        console.error('❌ Failed to mark course as completed:', error)
        return { isCompleted: false, totalLessons, completedLessons: completedLessonsCount, badgeAwarded: false, error }
      }

      // منح الشارة تلقائياً
      console.log('🏆 Awarding badge for course completion...')
      const { success: badgeSuccess, error: badgeError } = await awardBadgeToUser(user.id, courseId)
      
      if (badgeSuccess) {
        console.log('✅ Badge awarded successfully!')
        return { 
          isCompleted, 
          totalLessons, 
          completedLessons: completedLessonsCount, 
          badgeAwarded: true,
          error: undefined 
        }
      } else {
        console.log('⚠️ Badge not awarded:', badgeError)
        return { 
          isCompleted, 
          totalLessons, 
          completedLessons: completedLessonsCount, 
          badgeAwarded: false,
          error: undefined 
        }
      }
    }

    return { 
      isCompleted, 
      totalLessons, 
      completedLessons: completedLessonsCount, 
      badgeAwarded: false,
      error: undefined 
    }
  } catch (error) {
    console.error('❌ Error in checkAndUpdateCourseCompletion:', error)
    return { isCompleted: false, totalLessons: 0, completedLessons: 0, badgeAwarded: false, error: "حدث خطأ غير متوقع" }
  }
}

/**
 * جلب المسارات المكتملة للمستخدم
 */
export async function getCompletedCourses(): Promise<{ 
  completedCourses: CourseEnrollment[]; 
  error?: string 
}> {
  try {
    console.log('🏆 getCompletedCourses called')
    const supabase = createClientComponentClient()
    
    const user = await getCurrentUser()
    if (!user) {
      return { completedCourses: [], error: "يجب تسجيل الدخول أولاً" }
    }

    const { data: enrollments, error } = await supabase
      .from('course_enrollments')
      .select(`
        *,
        course:courses(
          id,
          title,
          description,
          level,
          duration,
          image
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'مكتمل')
      .order('completed_at', { ascending: false })

    if (error) {
      console.error('❌ Error fetching completed courses:', error)
      return { completedCourses: [], error: "فشل في جلب المسارات المكتملة" }
    }

    console.log('✅ Completed courses loaded:', enrollments?.length || 0)
    return { completedCourses: enrollments || [] }
  } catch (error) {
    console.error('❌ Error in getCompletedCourses:', error)
    return { completedCourses: [], error: "حدث خطأ غير متوقع" }
  }
} 