import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { updateLessonProgress } from '@/lib/course-completion'

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // التحقق من تسجيل الدخول
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'يجب تسجيل الدخول أولاً' },
        { status: 401 }
      )
    }

    // جلب البيانات من الطلب
    const body = await request.json()
    const { lessonId, courseId, progress, completed, timeSpent } = body

    // التحقق من البيانات المطلوبة
    if (!lessonId || !courseId || progress === undefined) {
      return NextResponse.json(
        { error: 'البيانات المطلوبة غير مكتملة' },
        { status: 400 }
      )
    }

    // التحقق من صحة البيانات
    if (progress < 0 || progress > 100) {
      return NextResponse.json(
        { error: 'نسبة التقدم يجب أن تكون بين 0 و 100' },
        { status: 400 }
      )
    }

    console.log(`📝 Updating lesson progress: lesson ${lessonId}, course ${courseId}, progress ${progress}%`)

    // تحديث تقدم الدرس وفحص إكمال المسار
    const result = await updateLessonProgress(
      lessonId,
      courseId,
      progress,
      completed || false,
      timeSpent || 0
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'فشل في تحديث تقدم الدرس' },
        { status: 500 }
      )
    }

    // إرجاع النتيجة
    return NextResponse.json({
      success: true,
      completed: result.completed,
      progress: result.progress,
      badgeAwarded: result.badgeAwarded || false,
      message: result.completed 
        ? 'تم إكمال المسار بنجاح!' + (result.badgeAwarded ? ' وتم منح الشارة!' : '')
        : 'تم تحديث التقدم بنجاح'
    })

  } catch (error) {
    console.error('❌ Error in lesson progress update API:', error)
    return NextResponse.json(
      { error: 'حدث خطأ غير متوقع' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // التحقق من تسجيل الدخول
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'يجب تسجيل الدخول أولاً' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')

    if (!courseId) {
      return NextResponse.json(
        { error: 'معرف المسار مطلوب' },
        { status: 400 }
      )
    }

    // جلب تقدم المستخدم في المسار
    const { data: progress, error } = await supabase
      .from('lesson_progress')
      .select(`
        lesson_id,
        progress_percentage,
        completed,
        time_spent,
        lessons (
          id,
          title,
          lesson_order
        )
      `)
      .eq('user_id', user.id)
      .eq('course_id', parseInt(courseId))
      .order('lessons.lesson_order', { ascending: true })

    if (error) {
      console.error('❌ Error fetching lesson progress:', error)
      return NextResponse.json(
        { error: 'فشل في جلب تقدم الدروس' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      progress: progress || []
    })

  } catch (error) {
    console.error('❌ Error in lesson progress GET API:', error)
    return NextResponse.json(
      { error: 'حدث خطأ غير متوقع' },
      { status: 500 }
    )
  }
} 