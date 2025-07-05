import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // التحقق من المصادقة
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.log('Auth error:', authError)
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    console.log('User authenticated:', user.id)

    const { labId, deviceId } = await request.json()
    
    if (!labId) {
      return NextResponse.json({ error: 'معرف المختبر مطلوب' }, { status: 400 })
    }

    console.log('Looking for session:', { userId: user.id, labId, deviceId })

    // التحقق من وجود جلسة نشطة للمستخدم في هذا المختبر
    const { data: session, error: sessionError } = await supabase
      .from('lab_sessions')
      .select('*')
      .eq('user_id', user.id)
      .eq('lab_id', labId)
      .in('status', ['starting', 'running'])
      .single()

    if (sessionError) {
      console.log('Session error:', sessionError)
    }

    if (!session) {
      console.log('No active session found for user:', user.id, 'lab:', labId)
      return NextResponse.json({ error: 'لا توجد جلسة نشطة لهذا المختبر' }, { status: 400 })
    }

    console.log('Found session:', { sessionId: session.id, status: session.status })

    // إنشاء أو جلب حساب webshell للمستخدم
    const webshellAccount = await createOrGetWebshellAccount(user.id, labId, deviceId)

    console.log('WebShell account ready:', webshellAccount.username)

    // إنشاء مستخدم ديناميكي في الحاوية (اختياري)
    try {
      await createDynamicUser(webshellAccount.username, webshellAccount.password);
    } catch (error) {
      console.warn('فشل في إنشاء مستخدم ديناميكي:', error);
      // نستمر حتى لو فشل إنشاء المستخدم الديناميكي
    }

    // استخدام اسم المستخدم المخصص بدلاً من root
    // تمرير المعاملات في URL بطريقة يمكن لـ ttyd قراءتها
    const webshellUrl = `https://platform.puntguard.com/shell/?username=${encodeURIComponent(webshellAccount.username)}&password=${encodeURIComponent(webshellAccount.password)}&session_id=${encodeURIComponent(session.id)}&lab_id=${labId}`
    console.log('WebShell URL:', webshellUrl)

    return NextResponse.json({ 
      success: true, 
      webshellUrl,
      credentials: {
        username: webshellAccount.username,
        password: webshellAccount.password
      },
      message: 'تم إنشاء جلسة webshell بنجاح'
    })

  } catch (error: any) {
    console.error('Error creating webshell session:', error)
    return NextResponse.json({ 
      error: error.message || 'فشل في إنشاء جلسة webshell' 
    }, { status: 500 })
  }
}

// إنشاء أو جلب حساب webshell للمستخدم
async function createOrGetWebshellAccount(userId: string, labId: number, deviceId?: string) {
  const supabase = createRouteHandlerClient({ cookies })
  
  try {
    console.log('Creating/getting WebShell account for:', { userId, labId, deviceId })
    
    // البحث عن حساب موجود
    const { data: existingAccount, error: selectError } = await supabase
      .from('webshell_accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('lab_id', labId)
      .single()

    if (selectError) {
      console.log('Select error:', selectError)
      if (selectError.code !== 'PGRST116') {
        console.error('Error selecting existing account:', selectError)
        throw new Error(`فشل في البحث عن حساب موجود: ${selectError.message}`)
      }
    }

    if (existingAccount) {
      console.log('Found existing webshell account:', existingAccount.username)
      return existingAccount
    }

    console.log('No existing account found, creating new one...')

    // إنشاء حساب جديد
    const username = `user_${userId}_${labId}_${Date.now()}`
    const password = generatePassword(12)
    
    console.log('Creating new webshell account:', { username, labId, deviceId })
    
    const { data: newAccount, error: insertError } = await supabase
      .from('webshell_accounts')
      .insert({
        user_id: userId,
        lab_id: labId,
        device_id: deviceId || null,
        username: username,
        password: password,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting new account:', insertError)
      throw new Error(`فشل في إنشاء حساب webshell: ${insertError.message}`)
    }

    console.log('Successfully created webshell account:', newAccount.username)
    return newAccount

  } catch (error: any) {
    console.error('Error in createOrGetWebshellAccount:', error)
    throw new Error(`فشل في إنشاء حساب webshell: ${error.message}`)
  }
}

// إنشاء مستخدم ديناميكي في الحاوية
async function createDynamicUser(username: string, password: string) {
  try {
    // يمكنك هنا إضافة كود للاتصال بالحاوية وإنشاء المستخدم
    // مثال باستخدام Docker API أو SSH
    console.log(`إنشاء مستخدم ديناميكي: ${username}`);
    
    // يمكنك استخدام Docker API أو exec command
    // const { exec } = require('child_process');
    // exec(`docker exec webshell1 /usr/local/bin/create_user.sh ${username} ${password}`);
    
    return true;
  } catch (error) {
    console.error('خطأ في إنشاء المستخدم الديناميكي:', error);
    throw error;
  }
}

// توليد كلمة مرور عشوائية
function generatePassword(length: number = 12): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  let password = ''
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length))
  }
  return password
} 