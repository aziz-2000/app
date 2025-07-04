import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { stopLabSession, extendLabSession, getLabSession } from '@/lib/lab-sessions'

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // التحقق من المصادقة
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    const session = await getLabSession(params.sessionId)
    if (!session) {
      return NextResponse.json({ error: 'لم يتم العثور على الجلسة' }, { status: 404 })
    }
    
    // التحقق من أن المستخدم يملك الجلسة
    if (session.user_id !== user.id) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
    }
    
    return NextResponse.json({ session })

  } catch (error: any) {
    console.error('Error fetching lab session:', error)
    return NextResponse.json({ 
      error: error.message || 'فشل في جلب جلسة المختبر' 
    }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // التحقق من المصادقة
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    const session = await getLabSession(params.sessionId)
    if (!session) {
      return NextResponse.json({ error: 'لم يتم العثور على الجلسة' }, { status: 404 })
    }
    
    // التحقق من أن المستخدم يملك الجلسة
    if (session.user_id !== user.id) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
    }

    const { action, hours } = await request.json()
    
    switch (action) {
      case 'start':
        await supabase
          .from('lab_sessions')
          .update({ status: 'running' })
          .eq('id', params.sessionId);
        return NextResponse.json({ 
          success: true, 
          message: 'تم بدء الجلسة بنجاح' 
        })
        
      case 'extend':
        await extendLabSession(params.sessionId, hours || 1)
        return NextResponse.json({ 
          success: true, 
          message: 'تم تمديد الجلسة بنجاح' 
        })
        
      case 'stop':
        await stopLabSession(params.sessionId)
        return NextResponse.json({ 
          success: true, 
          message: 'تم إيقاف الجلسة بنجاح' 
        })
        
      default:
        return NextResponse.json({ error: 'إجراء غير معروف' }, { status: 400 })
    }

  } catch (error: any) {
    console.error('Error updating lab session:', error)
    return NextResponse.json({ 
      error: error.message || 'فشل في تحديث جلسة المختبر' 
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // التحقق من المصادقة
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    const session = await getLabSession(params.sessionId)
    if (!session) {
      return NextResponse.json({ error: 'لم يتم العثور على الجلسة' }, { status: 404 })
    }
    
    // التحقق من أن المستخدم يملك الجلسة
    if (session.user_id !== user.id) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
    }

    // إيقاف الجلسة
    await stopLabSession(params.sessionId)
    
    return NextResponse.json({ 
      success: true, 
      message: 'تم حذف الجلسة بنجاح' 
    })

  } catch (error: any) {
    console.error('Error deleting lab session:', error)
    return NextResponse.json({ 
      error: error.message || 'فشل في حذف جلسة المختبر' 
    }, { status: 500 })
  }
} 