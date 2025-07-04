import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  console.log('=== API Route Started ===')
  
  try {
    // اختبار بسيط أولاً
    const body = await request.json()
    console.log('Request body received:', body)
    
    if (body.test) {
      console.log('Test request detected')
      return NextResponse.json({ 
        success: true, 
        message: 'API route is working',
        timestamp: new Date().toISOString()
      })
    }
    
    // إنشاء عميل Supabase
    console.log('Creating Supabase client...')
    let supabase
    try {
      supabase = createRouteHandlerClient({ cookies })
      console.log('Supabase client created successfully')
    } catch (clientError: any) {
      console.error('Failed to create Supabase client:', clientError)
      return NextResponse.json(
        { error: 'فشل في إنشاء عميل Supabase', details: clientError.message },
        { status: 500 }
      )
    }
    
    // التحقق من تسجيل الدخول
    console.log('Checking authentication...')
    let user
    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      
      console.log('Auth result:', { user: authUser?.id, error: authError })
      
      if (authError) {
        console.error('Auth error:', authError)
        return NextResponse.json(
          { error: 'خطأ في المصادقة', details: authError.message },
          { status: 401 }
        )
      }
      
      if (!authUser) {
        console.error('No user found')
        return NextResponse.json(
          { error: 'يجب تسجيل الدخول أولاً' },
          { status: 401 }
        )
      }
      
      user = authUser
    } catch (authError: any) {
      console.error('Authentication check failed:', authError)
      return NextResponse.json(
        { error: 'فشل في التحقق من المصادقة', details: authError.message },
        { status: 500 }
      )
    }
    
    const { lesson_id, course_id, rating, comment } = body
    
    // التحقق من البيانات المطلوبة
    if (!lesson_id || !course_id || !rating) {
      console.error('Missing required fields:', { lesson_id, course_id, rating })
      return NextResponse.json(
        { error: 'جميع الحقول مطلوبة', details: { lesson_id, course_id, rating } },
        { status: 400 }
      )
    }
    
    // التحقق من صحة التقييم
    if (rating < 1 || rating > 5) {
      console.error('Invalid rating:', rating)
      return NextResponse.json(
        { error: 'التقييم يجب أن يكون بين 1 و 5' },
        { status: 400 }
      )
    }
    
    console.log('Data validation passed:', {
      lesson_id,
      course_id,
      rating,
      user_id: user.id,
      comment
    })
    
    // محاولة إدراج التقييم مباشرة
    console.log('Attempting to insert rating...')
    const ratingData = {
      lesson_id,
      user_id: user.id,
      course_id,
      rating,
      comment: comment || null
    }
    
    console.log('Rating data to insert:', ratingData)
    
    try {
      const { data: ratingResult, error: insertError } = await supabase
        .from('lesson_ratings')
        .upsert(ratingData, {
          onConflict: 'user_id,lesson_id'
        })
        .select()
      
      console.log('Insert result:', { data: ratingResult, error: insertError })
      
      if (insertError) {
        console.error('Rating insertion error:', insertError)
        return NextResponse.json(
          { 
            error: 'فشل في إدراج التقييم', 
            details: insertError.message,
            code: insertError.code
          },
          { status: 500 }
        )
      }
      
      console.log('Rating inserted successfully:', ratingResult)
      
      const response = {
        success: true,
        rating: ratingResult?.[0],
        message: 'تم إرسال التقييم بنجاح'
      }
      
      console.log('Sending success response:', response)
      return NextResponse.json(response)
      
    } catch (insertError: any) {
      console.error('Insert operation failed:', insertError)
      return NextResponse.json(
        { 
          error: 'فشل في عملية الإدراج', 
          details: insertError.message
        },
        { status: 500 }
      )
    }
    
  } catch (error: any) {
    console.error('=== API Route Error ===')
    console.error('Error type:', typeof error)
    console.error('Error message:', error?.message)
    console.error('Error stack:', error?.stack)
    console.error('Full error:', error)
    
    return NextResponse.json(
      { 
        error: 'حدث خطأ في الخادم',
        details: error?.message || 'خطأ غير معروف',
        type: typeof error
      },
      { status: 500 }
    )
  }
} 