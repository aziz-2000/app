import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export interface LessonProgress {
  id: string
  user_id: string
  lesson_id: number
  course_id: number
  completed: boolean
  completed_at?: string
  time_spent: number
  last_accessed: string
  progress_percentage: number
  notes?: string
}

export interface LessonProgressStats {
  totalLessons: number
  completedLessons: number
  inProgressLessons: number
  averageProgress: number
  totalTimeSpent: number
}

/**
 * الحصول على المستخدم الحالي من الجلسة
 */
async function getCurrentUser() {
  try {
    const supabase = createClientComponentClient()
    
    // محاولة الحصول على الجلسة أولاً
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('Session error:', sessionError)
      // إذا كان خطأ الجلسة مفقودة، جرب getUser
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
    
    // إذا لم نجد المستخدم في الجلسة، جرب getUser
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

// جلب تقدم المستخدم في درس معين
export async function getLessonProgress(lessonId: number, courseId: number): Promise<{ progress: LessonProgress | null, error: string | null }> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { progress: null, error: 'يجب تسجيل الدخول أولاً' }
    }

    const supabase = createClientComponentClient()
    const { data: progress, error } = await supabase
      .from('lesson_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('lesson_id', lessonId)
      .eq('course_id', courseId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching lesson progress:', error)
      return { progress: null, error: 'فشل في جلب تقدم الدرس' }
    }

    return { progress: progress || null, error: null }
  } catch (error) {
    console.error('Error in getLessonProgress:', error)
    return { progress: null, error: 'حدث خطأ غير متوقع' }
  }
}

// تحديث تقدم الدرس
export async function updateLessonProgress(
  lessonId: number, 
  courseId: number, 
  progressData: {
    completed?: boolean
    time_spent?: number
    progress_percentage?: number
    notes?: string
  }
): Promise<{ success: boolean, error: string | null }> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      console.error('No authenticated user found')
      return { success: false, error: 'يجب تسجيل الدخول أولاً' }
    }

    const supabase = createClientComponentClient()

    console.log('=== Lesson Progress Debug ===')
    console.log('User ID:', user.id)
    console.log('User Email:', user.email)
    console.log('Lesson ID:', lessonId)
    console.log('Course ID:', courseId)
    console.log('Progress Data:', progressData)

    // التحقق من وجود الجدول أولاً
    const { data: tableCheck, error: tableError } = await supabase
      .from('lesson_progress')
      .select('count', { count: 'exact', head: true })
      .limit(1)
    
    if (tableError) {
      console.error('Table check error:', tableError)
      return { success: false, error: `جدول التقدم غير متاح: ${tableError.message}` }
    }

    // التحقق من وجود الدرس
    console.log('Checking if lesson exists...')
    const { data: lessonExists, error: lessonCheckError } = await supabase
      .from('lessons')
      .select('id')
      .eq('id', lessonId)
      .single()

    if (lessonCheckError || !lessonExists) {
      console.error('Lesson not found:', lessonCheckError)
      return { success: false, error: `الدرس غير موجود: ${lessonCheckError?.message || 'معرف الدرس غير صحيح'}` }
    }

    // التحقق من وجود المسار
    console.log('Checking if course exists...')
    const { data: courseExists, error: courseCheckError } = await supabase
      .from('courses')
      .select('id')
      .eq('id', courseId)
      .single()

    if (courseCheckError || !courseExists) {
      console.error('Course not found:', courseCheckError)
      return { success: false, error: `المسار غير موجود: ${courseCheckError?.message || 'معرف المسار غير صحيح'}` }
    }

    const now = new Date().toISOString()
    const updateData = {
      ...progressData,
      last_accessed: now,
      ...(progressData.completed && { completed_at: now })
    }

    console.log('Update data:', updateData)

    // استخدام upsert بدلاً من insert/update منفصلين
    // هذا سيتعامل مع constraint الفريد تلقائياً
    const upsertData = {
      user_id: user.id,
      lesson_id: lessonId,
      course_id: courseId,
      completed: progressData.completed || false,
      time_spent: progressData.time_spent || 0,
      progress_percentage: progressData.progress_percentage || 0,
      notes: progressData.notes,
      last_accessed: now,
      completed_at: progressData.completed ? now : null
    }

    console.log('Upsert data:', upsertData)

    const { data: upsertResult, error: upsertError } = await supabase
      .from('lesson_progress')
      .upsert(upsertData, {
        onConflict: 'user_id,lesson_id',
        ignoreDuplicates: false
      })
      .select()

    if (upsertError) {
      console.error('Upsert error:', upsertError)
      console.error('Error details:', {
        code: upsertError.code,
        message: upsertError.message,
        details: upsertError.details,
        hint: upsertError.hint
      })
      
      // إذا كان الخطأ بسبب عدم وجود المستخدم في جدول users، 
      // فهذا يعني أن trigger المزامنة لم يعمل بشكل صحيح
      if (upsertError.code === '23503' && upsertError.message?.includes('user_id')) {
        console.error('User not found in users table. This might indicate a sync issue.')
        return { success: false, error: 'خطأ في مزامنة بيانات المستخدم. يرجى المحاولة مرة أخرى.' }
      }
      
      return { success: false, error: `فشل في تحديث تقدم الدرس: ${upsertError.message}` }
    }

    console.log('Upsert successful:', upsertResult)
    return { success: true, error: null }
  } catch (error: any) {
    console.error('Unexpected error in updateLessonProgress:', error)
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    return { success: false, error: `حدث خطأ غير متوقع: ${error.message}` }
  }
}

// وضع علامة الدرس كمكتمل
export async function markLessonAsCompleted(lessonId: number, courseId: number): Promise<{ success: boolean, error: string | null }> {
  const result = await updateLessonProgress(lessonId, courseId, {
    completed: true,
    progress_percentage: 100
  })
  
  // إذا تم إكمال الدرس بنجاح، سجل نشاط إكمال الدرس
  if (result.success) {
    // await recordLessonCompletion(lessonId, courseId)
  }
  
  return result
}

// جلب جميع تقدم المستخدم في مسار معين
export async function getCourseProgress(courseId: number): Promise<{ progress: LessonProgress[], error: string | null }> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { progress: [], error: 'يجب تسجيل الدخول أولاً' }
    }

    const supabase = createClientComponentClient()
    const { data: progress, error } = await supabase
      .from('lesson_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .order('last_accessed', { ascending: false })

    if (error) {
      console.error('Error fetching course progress:', error)
      return { progress: [], error: 'فشل في جلب تقدم المسار' }
    }

    return { progress: progress || [], error: null }
  } catch (error) {
    console.error('Error in getCourseProgress:', error)
    return { progress: [], error: 'حدث خطأ غير متوقع' }
  }
}

// جلب إحصائيات تقدم المستخدم في مسار معين
export async function getCourseProgressStats(courseId: number): Promise<{ stats: LessonProgressStats, error: string | null }> {
  try {
    const { progress, error } = await getCourseProgress(courseId)
    if (error) {
      return { stats: {
        totalLessons: 0,
        completedLessons: 0,
        inProgressLessons: 0,
        averageProgress: 0,
        totalTimeSpent: 0
      }, error }
    }

    const completedLessons = progress.filter(p => p.completed).length
    const totalTimeSpent = progress.reduce((sum, p) => sum + (p.time_spent || 0), 0)
    const averageProgress = progress.length > 0 
      ? progress.reduce((sum, p) => sum + (p.progress_percentage || 0), 0) / progress.length 
      : 0

    const stats: LessonProgressStats = {
      totalLessons: progress.length,
      completedLessons,
      inProgressLessons: progress.length - completedLessons,
      averageProgress: Math.round(averageProgress),
      totalTimeSpent
    }

    return { stats, error: null }
  } catch (error) {
    console.error('Error in getCourseProgressStats:', error)
    return { 
      stats: {
        totalLessons: 0,
        completedLessons: 0,
        inProgressLessons: 0,
        averageProgress: 0,
        totalTimeSpent: 0
      }, 
      error: 'حدث خطأ غير متوقع' 
    }
  }
}

// جلب الدروس المكتملة للمستخدم في مسار معين
export async function getCompletedLessons(courseId: number): Promise<{ lessonIds: number[], error: string | null }> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { lessonIds: [], error: 'يجب تسجيل الدخول أولاً' }
    }

    const supabase = createClientComponentClient()
    const { data: completedProgress, error } = await supabase
      .from('lesson_progress')
      .select('lesson_id')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .eq('completed', true)

    if (error) {
      console.error('Error fetching completed lessons:', error)
      return { lessonIds: [], error: 'فشل في جلب الدروس المكتملة' }
    }

    const completedLessonIds = completedProgress?.map(p => p.lesson_id) || []

    return { lessonIds: completedLessonIds, error: null }
  } catch (error) {
    console.error('Error in getCompletedLessons:', error)
    return { lessonIds: [], error: 'حدث خطأ غير متوقع' }
  }
}

/**
 * التحقق من إكمال المسار عند إكمال درس
 */
export async function checkCourseCompletionOnLessonComplete(lessonId: number, courseId: number): Promise<{ 
  courseCompleted: boolean; 
  error?: string 
}> {
  try {
    console.log('🔍 checkCourseCompletionOnLessonComplete called')
    const supabase = createClientComponentClient()
    
    const user = await getCurrentUser()
    if (!user) {
      return { courseCompleted: false, error: "يجب تسجيل الدخول أولاً" }
    }

    // جلب جميع دروس المسار
    const { data: lessons, error: lessonsError } = await supabase
      .from('lessons')
      .select('id')
      .eq('course_id', courseId)
      .eq('status', 'منشور')

    if (lessonsError) {
      console.error('❌ Error fetching lessons:', lessonsError)
      return { courseCompleted: false, error: "فشل في جلب دروس المسار" }
    }

    const totalLessons = lessons?.length || 0
    if (totalLessons === 0) {
      return { courseCompleted: false, error: "لا توجد دروس في هذا المسار" }
    }

    // جلب الدروس المكتملة
    const { data: completedLessons, error: completedError } = await supabase
      .from('lesson_progress')
      .select('lesson_id')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .eq('completed', true)

    if (completedError) {
      console.error('❌ Error fetching completed lessons:', completedError)
      return { courseCompleted: false, error: "فشل في جلب الدروس المكتملة" }
    }

    const completedLessonsCount = completedLessons?.length || 0
    const courseCompleted = completedLessonsCount >= totalLessons

    console.log(`📊 Course completion check: ${completedLessonsCount}/${totalLessons} lessons completed`)

    if (courseCompleted) {
      console.log('🎉 Course completed! Updating enrollment status...')
      
      // تحديث حالة التسجيل في المسار
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
        console.error('❌ Error updating course enrollment:', updateError)
        return { courseCompleted: false, error: "فشل في تحديث حالة المسار" }
      }

      console.log('✅ Course enrollment updated to completed')

      // منح الشارة تلقائياً عند إكمال المسار
      try {
        console.log('🏆 Awarding badge for course completion...')
        
        // جلب معلومات المسار
        const { data: course, error: courseError } = await supabase
          .from('courses')
          .select('title, level')
          .eq('id', courseId)
          .single()

        if (courseError) {
          console.error('❌ Error fetching course info:', courseError)
        } else {
          // جلب الشارة المرتبطة بالمسار
          const { data: badge, error: badgeError } = await supabase
            .from('course_badges')
            .select('id, name, image_url, color')
            .eq('course_id', courseId)
            .single()

          if (badgeError) {
            console.error('❌ Error fetching badge:', {
              message: badgeError.message || 'No message',
              details: badgeError.details || 'No details',
              hint: badgeError.hint || 'No hint',
              code: badgeError.code || 'No code',
              fullError: JSON.stringify(badgeError, null, 2)
            })
            
            let errorMessage = "فشل في جلب الشارة"
            if (badgeError.message) {
              errorMessage = `فشل في جلب الشارة: ${badgeError.message}`
            } else if (badgeError.details) {
              errorMessage = `فشل في جلب الشارة: ${badgeError.details}`
            } else if (badgeError.hint) {
              errorMessage = `فشل في جلب الشارة: ${badgeError.hint}`
            }
            
            console.error('❌ Error fetching badge:', errorMessage)
            
            // إذا لم توجد شارة، أنشئ واحدة تلقائياً باستخدام الدالة الجديدة
            console.log('🔄 Creating badge automatically using RLS-aware function...')
            try {
              const { ensureCourseBadgeExists } = await import('./badge-creation')
              const ensureResult = await ensureCourseBadgeExists(courseId, course.title, course.level)
              
              if (ensureResult.success && ensureResult.badgeId) {
                console.log('✅ Badge created/ensured successfully:', ensureResult.badgeId)
                // منح الشارة للمستخدم باستخدام الدالة الجديدة
                const { awardBadgeToUserWithRLS } = await import('./badge-creation')
                const awardResult = await awardBadgeToUserWithRLS(user.id, ensureResult.badgeId)
                
                if (awardResult.success) {
                  console.log('✅ Badge awarded successfully')
                } else {
                  console.error('❌ Failed to award badge:', awardResult.error)
                }
              } else {
                console.error('❌ Failed to ensure badge exists:', ensureResult.error)
              }
            } catch (importError) {
              console.error('❌ Error importing badge creation functions:', importError)
              
              // Fallback to old method
              console.log('🔄 Falling back to old badge creation method...')
              const { data: newBadge, error: createBadgeError } = await supabase
                .from('course_badges')
                .insert({
                  course_id: courseId,
                  name: `شارة ${course.title}`,
                  description: `شارة إنجاز لإكمال مسار ${course.title}`,
                  color: getBadgeColor(course.level)
                })
                .select()
                .single()

              if (createBadgeError) {
                console.error('❌ Error creating badge:', {
                  message: createBadgeError.message || 'No message',
                  details: createBadgeError.details || 'No details',
                  hint: createBadgeError.hint || 'No hint',
                  code: createBadgeError.code || 'No code',
                  fullError: JSON.stringify(createBadgeError, null, 2)
                })
                
                let errorMessage = "فشل في إنشاء الشارة"
                if (createBadgeError.message) {
                  errorMessage = `فشل في إنشاء الشارة: ${createBadgeError.message}`
                } else if (createBadgeError.details) {
                  errorMessage = `فشل في إنشاء الشارة: ${createBadgeError.details}`
                } else if (createBadgeError.hint) {
                  errorMessage = `فشل في إنشاء الشارة: ${createBadgeError.hint}`
                }
                
                console.error('❌ Error creating badge:', errorMessage)
              } else {
                console.log('✅ Badge created:', newBadge)
                // منح الشارة الجديدة للمستخدم
                await awardBadgeToUser(user.id, newBadge.id)
              }
            }
          } else {
            console.log('✅ Badge found:', badge)
            // منح الشارة الموجودة للمستخدم باستخدام الدالة الجديدة
            try {
              const { awardBadgeToUserWithRLS } = await import('./badge-creation')
              const awardResult = await awardBadgeToUserWithRLS(user.id, badge.id)
              
              if (awardResult.success) {
                console.log('✅ Badge awarded successfully')
              } else {
                console.error('❌ Failed to award badge:', awardResult.error)
                // Fallback to old method
                await awardBadgeToUser(user.id, badge.id)
              }
            } catch (importError) {
              console.error('❌ Error importing badge awarding functions:', importError)
              // Fallback to old method
              await awardBadgeToUser(user.id, badge.id)
            }
          }
        }
        
        // بعد منح الشارة، قم بإصلاح الشارات المفقودة تلقائياً
        console.log('🔧 Running automatic missing badges fix after course completion...')
        try {
          // استيراد دالة إصلاح الشارات المفقودة
          const { checkAndFixMissingBadges } = await import('./badges')
          const fixResult = await checkAndFixMissingBadges()
          if (fixResult.success && (fixResult.createdBadges > 0 || fixResult.awardedBadges > 0)) {
            console.log(`✅ Auto-fix completed after course completion: ${fixResult.createdBadges} badges created, ${fixResult.awardedBadges} badges awarded`)
          }
        } catch (fixError) {
          console.error('⚠️ Auto-fix failed after course completion:', fixError)
          // لا نعيد خطأ لأن المسار تم إكماله بنجاح
        }
        
      } catch (badgeError) {
        console.error('❌ Error in badge awarding process:', badgeError)
        // لا نريد أن نفشل العملية بأكملها بسبب خطأ في الشارات
      }
    }

    return { courseCompleted, error: undefined }
  } catch (error) {
    console.error('❌ Error in checkCourseCompletionOnLessonComplete:', error)
    return { courseCompleted: false, error: "حدث خطأ غير متوقع" }
  }
}

/**
 * منح شارة للمستخدم
 */
async function awardBadgeToUser(userId: string, badgeId: string) {
  try {
    const supabase = createClientComponentClient()
    
    // التحقق من عدم وجود الشارة مسبقاً للمستخدم
    const { data: existingBadge, error: checkError } = await supabase
      .from('user_course_badges')
      .select('id')
      .eq('user_id', userId)
      .eq('badge_id', badgeId)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Error checking existing badge:', checkError)
      return
    }

    if (existingBadge) {
      console.log('ℹ️ Badge already awarded to user')
      return
    }

    // منح الشارة للمستخدم
    const { data: awardedBadge, error: awardError } = await supabase
      .from('user_course_badges')
      .insert({
        user_id: userId,
        badge_id: badgeId,
        awarded_at: new Date().toISOString()
      })
      .select()
      .single()

    if (awardError) {
      console.error('❌ Error awarding badge:', awardError)
    } else {
      console.log('🏆 Badge awarded successfully:', awardedBadge)
    }
  } catch (error) {
    console.error('❌ Error in awardBadgeToUser:', error)
  }
}

/**
 * تحديد لون الشارة حسب مستوى المسار
 */
function getBadgeColor(level: string): string {
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

/**
 * جلب إحصائيات إكمال المسارات
 */
export async function getCourseCompletionStats(): Promise<{ 
  stats: {
    totalCourses: number
    completedCourses: number
    inProgressCourses: number
    completionRate: number
    totalLessonsCompleted: number
    averageProgress: number
  }; 
  error?: string 
}> {
  try {
    console.log('📊 getCourseCompletionStats called')
    const supabase = createClientComponentClient()
    
    const user = await getCurrentUser()
    if (!user) {
      return { 
        stats: {
          totalCourses: 0,
          completedCourses: 0,
          inProgressCourses: 0,
          completionRate: 0,
          totalLessonsCompleted: 0,
          averageProgress: 0
        }, 
        error: "يجب تسجيل الدخول أولاً" 
      }
    }

    // جلب جميع تسجيلات المسارات
    const { data: enrollments, error: enrollmentsError } = await supabase
      .from('course_enrollments')
      .select('course_id, status, progress')
      .eq('user_id', user.id)

    if (enrollmentsError) {
      console.error('❌ Error fetching enrollments:', enrollmentsError)
      return { 
        stats: {
          totalCourses: 0,
          completedCourses: 0,
          inProgressCourses: 0,
          completionRate: 0,
          totalLessonsCompleted: 0,
          averageProgress: 0
        }, 
        error: "فشل في جلب تسجيلات المسارات" 
      }
    }

    const totalCourses = enrollments?.length || 0
    const completedCourses = enrollments?.filter(e => e.status === 'مكتمل').length || 0
    const inProgressCourses = enrollments?.filter(e => e.status === 'مستمر').length || 0
    const completionRate = totalCourses > 0 ? (completedCourses / totalCourses) * 100 : 0
    const averageProgress = enrollments?.reduce((sum, e) => sum + (e.progress || 0), 0) / totalCourses || 0

    // جلب إجمالي الدروس المكتملة
    const { data: completedLessons, error: lessonsError } = await supabase
      .from('lesson_progress')
      .select('id', { count: 'exact' })
      .eq('user_id', user.id)
      .eq('completed', true)

    if (lessonsError) {
      console.error('❌ Error fetching completed lessons:', lessonsError)
    }

    const totalLessonsCompleted = completedLessons?.length || 0

    const stats = {
      totalCourses,
      completedCourses,
      inProgressCourses,
      completionRate: Math.round(completionRate),
      totalLessonsCompleted,
      averageProgress: Math.round(averageProgress)
    }

    console.log('✅ Course completion stats:', stats)
    return { stats, error: undefined }
  } catch (error) {
    console.error('❌ Error in getCourseCompletionStats:', error)
    return { 
      stats: {
        totalCourses: 0,
        completedCourses: 0,
        inProgressCourses: 0,
        completionRate: 0,
        totalLessonsCompleted: 0,
        averageProgress: 0
      }, 
      error: "حدث خطأ غير متوقع" 
    }
  }
} 