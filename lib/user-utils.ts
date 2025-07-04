import { supabase } from './supabase'

export async function createAdminUser(email: string, password: string, name: string) {
    // 1. تسجيل المستخدم في نظام المصادقة
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    })
  
    if (authError) throw authError
  
    // 2. إنشاء المستخدم في جدول users مع دور المسؤول
    const { error: userError } = await supabase
      .from('users')
      .insert([{
        id: authData.user?.id,
        email,
        name,
        role: 'مسؤول',
        status: 'نشط'
      }])
  
    if (userError) throw userError
  
    return true
  }