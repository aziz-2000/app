import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { createLabSession, getUserActiveSessions, getLabSession } from '@/lib/lab-sessions'

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // التحقق من المصادقة
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    const { labId } = await request.json()
    
    if (!labId) {
      return NextResponse.json({ error: 'معرف المختبر مطلوب' }, { status: 400 })
    }

    // إنشاء جلسة جديدة
    const session = await createLabSession(user.id, labId)
    
    return NextResponse.json({ 
      success: true, 
      session,
      message: 'تم إنشاء جلسة المختبر بنجاح'
    })

  } catch (error: any) {
    console.error('Error creating lab session:', error)
    return NextResponse.json({ 
      error: error.message || 'فشل في إنشاء جلسة المختبر' 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // التحقق من المصادقة
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    const labId = searchParams.get('labId')

    if (sessionId) {
      // جلب جلسة محددة
      const session = await getLabSession(sessionId)
      if (!session) {
        return NextResponse.json({ error: 'لم يتم العثور على الجلسة' }, { status: 404 })
      }
      
      // التحقق من أن المستخدم يملك الجلسة
      if (session.user_id !== user.id) {
        return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
      }
      
      return NextResponse.json({ session })
    } else {
      // جلب جميع الجلسات النشطة للمستخدم
      let sessions = await getUserActiveSessions(user.id)
      
      // فلترة حسب labId إذا تم تمريره
      if (labId) {
        sessions = sessions.filter(session => session.lab_id === parseInt(labId))
      }
      
      return NextResponse.json({ sessions })
    }

  } catch (error: any) {
    console.error('Error fetching lab sessions:', error)
    return NextResponse.json({ 
      error: error.message || 'فشل في جلب جلسات المختبر' 
    }, { status: 500 })
  }
} 