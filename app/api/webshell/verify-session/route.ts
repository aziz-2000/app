import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { sessionId, username, labId } = await request.json();

    // التحقق من صحة الجلسة
    const { data: session } = await supabase
      .from('lab_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('lab_id', labId)
      .single();

    if (!session) {
      return NextResponse.json({ error: 'جلسة غير صالحة' }, { status: 401 });
    }

    // إنشاء/تحديث حساب WebShell
    const password = Math.random().toString(36).slice(-8);
    const { data: account } = await supabase
      .from('webshell_accounts')
      .upsert(
        {
          username,
          password,
          lab_id: labId,
          user_id: session.user_id,
          last_used: new Date().toISOString()
        },
        { onConflict: 'username,lab_id' }
      )
      .select()
      .single();

    return NextResponse.json({
      success: true,
      webshell_url: `https://platform.puntguard.com/shell/?username=${username}&password=${password}&session_id=${sessionId}&lab_id=${labId}`
    });

  } catch (error) {
    return NextResponse.json({ error: 'فشل في إنشاء الجلسة' }, { status: 500 });
  }
}

// مثال على كيفية إنشاء الرابط
// const webshellUrl = `https://platform.puntguard.com/shell/?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&session_id=${encodeURIComponent(sessionId)}&lab_id=${labId}`; 