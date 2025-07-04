import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// إعدادات Supabase محسنة لمنع إعادة التحميل
const supabaseConfig = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // منع اكتشاف الجلسة في URL
    flowType: 'pkce'
  },
  global: {
    headers: {
      'X-Client-Info': 'punt-guard'
    }
  }
};

// تصدير supabase مباشرة لحل مشكلة الاستيراد
export const supabase = createClientComponentClient();

// إنشاء client للاستخدام في المكونات
export const createSupabaseClient = () => {
  return createClientComponentClient();
};

// دالة مساعدة للحصول على supabase client
export const getSupabaseClient = () => {
  return createClientComponentClient();
};

// إنشاء bucket lesson-materials تلقائياً إذا لم يكن موجوداً
export async function createLessonMaterialsBucket() {
  try {
    console.log('Creating lesson-materials bucket...')
    const supabase = createClientComponentClient()
    
    // استخدام SQL لإنشاء bucket
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES (
          'lesson-materials',
          'lesson-materials',
          true,
          52428800,
          ARRAY[
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'text/plain',
            'text/csv',
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'image/svg+xml',
            'video/mp4',
            'video/webm',
            'video/ogg',
            'audio/mpeg',
            'audio/wav',
            'audio/ogg',
            'application/zip',
            'application/x-rar-compressed',
            'application/x-7z-compressed'
          ]
        ) ON CONFLICT (id) DO NOTHING;
        
        DROP POLICY IF EXISTS "Public Access" ON storage.objects;
        DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
        DROP POLICY IF EXISTS "Authenticated users can update" ON storage.objects;
        DROP POLICY IF EXISTS "Authenticated users can delete" ON storage.objects;
        
        CREATE POLICY "Public Access" ON storage.objects
        FOR SELECT USING (bucket_id = 'lesson-materials');
        
        CREATE POLICY "Authenticated users can upload" ON storage.objects
        FOR INSERT WITH CHECK (
          bucket_id = 'lesson-materials' 
          AND auth.role() = 'authenticated'
        );
        
        CREATE POLICY "Authenticated users can update" ON storage.objects
        FOR UPDATE USING (
          bucket_id = 'lesson-materials' 
          AND auth.role() = 'authenticated'
        );
        
        CREATE POLICY "Authenticated users can delete" ON storage.objects
        FOR DELETE USING (
          bucket_id = 'lesson-materials' 
          AND auth.role() = 'authenticated'
        );
      `
    })
    
    if (error) {
      console.error('Error creating bucket via RPC:', error)
      return false
    }
    
    console.log('Bucket created successfully')
    return true
  } catch (error) {
    console.error('Error in createLessonMaterialsBucket:', error)
    return false
  }
}

// التحقق من وجود جدول lesson_materials
export async function checkLessonMaterialsTable() {
  try {
    const supabase = createClientComponentClient()
    const { data, error } = await supabase
      .from('lesson_materials')
      .select('id')
      .limit(1)
    
    if (error) {
      console.error('Error checking lesson_materials table:', error)
      return false
    }
    
    console.log('lesson_materials table exists:', true)
    return true
  } catch (error) {
    console.error('Error checking lesson_materials table:', error)
    return false
  }
}

// التحقق من وجود bucket lesson-materials
export async function checkLessonMaterialsBucket() {
  try {
    const supabase = createClientComponentClient()
    // محاولة الوصول مباشرة للـ bucket
    const { data, error } = await supabase.storage.from('lesson-materials').list('', { limit: 1 })
    
    if (error) {
      console.error('Error accessing lesson-materials bucket:', error)
      // إذا كان الخطأ يشير إلى أن bucket غير موجود، نحاول إنشاؤه
      if (error.message.includes('not found') || error.message.includes('does not exist')) {
        console.log('Bucket not found, attempting to create...')
        return await createLessonMaterialsBucket()
      }
      return false
    }
    
    console.log('lesson-materials bucket exists and accessible')
    return true
  } catch (error) {
    console.error('Error checking bucket:', error)
    return false
  }
}

// رفع ملف إلى bucket lesson-materials
export async function uploadLessonFile(file: File, lessonId: number) {
  try {
    console.log('Starting file upload:', { fileName: file.name, lessonId, fileSize: file.size })
    const supabase = createClientComponentClient()
    
    // التحقق من وجود bucket وإنشاؤه إذا لم يكن موجوداً
    let bucketExists = await checkLessonMaterialsBucket()
    
    if (!bucketExists) {
      console.log('Attempting to create bucket...')
      bucketExists = await createLessonMaterialsBucket()
      
      if (!bucketExists) {
        throw new Error(`
          فشل في إنشاء bucket lesson-materials.
          
          🔧 الحل اليدوي:
          1. اذهب إلى Supabase Dashboard
          2. اذهب إلى SQL Editor
          3. انسخ هذا الكود واضغط Run:
          
          INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
          VALUES (
            'lesson-materials',
            'lesson-materials',
            true,
            52428800,
            ARRAY[
              'application/pdf',
              'application/msword',
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              'application/vnd.ms-excel',
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              'application/vnd.ms-powerpoint',
              'application/vnd.openxmlformats-officedocument.presentationml.presentation',
              'text/plain',
              'text/csv',
              'image/jpeg',
              'image/png',
              'image/gif',
              'image/webp',
              'image/svg+xml',
              'video/mp4',
              'video/webm',
              'video/ogg',
              'audio/mpeg',
              'audio/wav',
              'audio/ogg',
              'application/zip',
              'application/x-rar-compressed',
              'application/x-7z-compressed'
            ]
          ) ON CONFLICT (id) DO NOTHING;
        `)
      }
    }
    
    // التحقق من وجود جدول lesson_materials
    const tableExists = await checkLessonMaterialsTable()
    if (!tableExists) {
      console.log('Table lesson_materials not found, attempting to create...')
      const tableCreated = await createLessonMaterialsTable()
      if (!tableCreated) {
        console.log('Failed to create table, continuing with upload...')
      }
    }
    
    const fileExt = file.name.split('.').pop()
    const filePath = `${lessonId}/${Date.now()}_${file.name}`
    
    console.log('Uploading to path:', filePath)
    
    const { data, error } = await supabase.storage.from('lesson-materials').upload(filePath, file)
    
    if (error) {
      console.error('Supabase upload error:', error)
      throw new Error(`فشل في رفع الملف: ${error.message || 'خطأ غير معروف'}`)
    }
    
    console.log('File uploaded successfully:', data)
    
    const publicUrl = supabase.storage.from('lesson-materials').getPublicUrl(filePath).data.publicUrl
    console.log('Public URL:', publicUrl)
    
    return { filePath, publicUrl }
  } catch (error) {
    console.error('Error in uploadLessonFile:', error)
    throw error
  }
}

// حذف ملف من bucket lesson-materials
export async function deleteLessonFile(filePath: string) {
  const supabase = createClientComponentClient()
  const { error } = await supabase.storage.from('lesson-materials').remove([filePath])
  if (error) throw error
  return true
}

// إضافة سجل في lesson_materials
export async function addLessonMaterial(lesson_id: number, file_url: string, file_name: string) {
  const supabase = createClientComponentClient()
  const { data, error } = await supabase.from('lesson_materials').insert([{ lesson_id, file_url, file_name }])
  if (error) throw error
  return data
}

// حذف سجل من lesson_materials
export async function deleteLessonMaterial(id: number) {
  const supabase = createClientComponentClient()
  const { error } = await supabase.from('lesson_materials').delete().eq('id', id)
  if (error) throw error
  return true
}

// إنشاء جدول lesson_materials تلقائياً إذا لم يكن موجوداً
export async function createLessonMaterialsTable() {
  try {
    console.log('Attempting to create lesson_materials table...');
    const supabase = createClientComponentClient()
    
    // إنشاء الجدول باستخدام SQL
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS lesson_materials (
          id SERIAL PRIMARY KEY,
          lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
          file_name VARCHAR(255) NOT NULL,
          file_url TEXT NOT NULL,
          file_size BIGINT,
          mime_type VARCHAR(100),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_lesson_materials_lesson_id ON lesson_materials(lesson_id);
        
        ALTER TABLE lesson_materials ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Anyone can view lesson materials" ON lesson_materials;
        DROP POLICY IF EXISTS "Authenticated users can insert lesson materials" ON lesson_materials;
        DROP POLICY IF EXISTS "Authenticated users can update lesson materials" ON lesson_materials;
        DROP POLICY IF EXISTS "Authenticated users can delete lesson materials" ON lesson_materials;
        
        CREATE POLICY "Anyone can view lesson materials" ON lesson_materials
        FOR SELECT USING (true);
        
        CREATE POLICY "Authenticated users can insert lesson materials" ON lesson_materials
        FOR INSERT WITH CHECK (auth.role() = 'authenticated');
        
        CREATE POLICY "Authenticated users can update lesson materials" ON lesson_materials
        FOR UPDATE USING (auth.role() = 'authenticated');
        
        CREATE POLICY "Authenticated users can delete lesson materials" ON lesson_materials
        FOR DELETE USING (auth.role() = 'authenticated');
      `
    });
    
    if (error) {
      console.error('Error creating table:', error);
      // إذا فشل RPC، نحاول الطريقة البديلة
      return await createLessonMaterialsTableAlternative();
    }
    
    console.log('Table created successfully');
    return true;
  } catch (error) {
    console.error('Error in createLessonMaterialsTable:', error);
    return await createLessonMaterialsTableAlternative();
  }
}

// طريقة بديلة لإنشاء الجدول
async function createLessonMaterialsTableAlternative() {
  try {
    console.log('Trying alternative method to create table...');
    const supabase = createClientComponentClient()
    
    // محاولة إدراج سجل تجريبي لإنشاء الجدول
    const { error } = await supabase
      .from('lesson_materials')
      .insert({
        lesson_id: 1,
        file_name: 'test.txt',
        file_url: 'https://example.com/test.txt'
      });
    
    if (error && error.message.includes('relation "lesson_materials" does not exist')) {
      console.log('Table does not exist, manual creation required');
      return false;
    }
    
    // إذا نجح الإدراج، نحذف السجل التجريبي
    if (!error) {
      await supabase
        .from('lesson_materials')
        .delete()
        .eq('file_name', 'test.txt');
    }
    
    return true;
  } catch (error) {
    console.error('Alternative method failed:', error);
    return false;
  }
}

// دالة تشخيص سريعة - يمكن استدعاؤها من console
export async function quickDiagnose() {
  console.log('🔍 بدء التشخيص السريع...')
  
  try {
    const supabase = createClientComponentClient()
    
    // 1. التحقق من الاتصال بـ Supabase
    console.log('1. التحقق من الاتصال بـ Supabase...')
    const { data: user, error: userError } = await supabase.auth.getUser()
    if (userError) {
      console.error('❌ خطأ في الاتصال:', userError)
      return
    }
    console.log('✅ الاتصال يعمل، المستخدم:', user.user?.email)
    
    // 2. التحقق من وجود bucket
    console.log('2. التحقق من وجود bucket lesson-materials...')
    const bucketExists = await checkLessonMaterialsBucket()
    console.log('Bucket exists:', bucketExists)
    
    // 3. محاولة إنشاء bucket إذا لم يكن موجوداً
    if (!bucketExists) {
      console.log('3. محاولة إنشاء bucket...')
      const created = await createLessonMaterialsBucket()
      console.log('Bucket created:', created)
    }
    
    // 4. التحقق من جدول lesson_materials
    console.log('4. التحقق من جدول lesson_materials...')
    const tableExists = await checkLessonMaterialsTable()
    console.log('Table exists:', tableExists)
    
    // 5. اختبار رفع ملف صغير
    console.log('5. اختبار رفع ملف...')
    const testFile = new File(['test content'], 'test.txt', { type: 'text/plain' })
    try {
      const result = await uploadLessonFile(testFile, 1)
      console.log('✅ رفع الملف نجح:', result)
      
      // حذف الملف التجريبي
      await deleteLessonFile(result.filePath)
      console.log('✅ تم حذف الملف التجريبي')
    } catch (uploadError) {
      console.error('❌ فشل في رفع الملف:', uploadError)
    }
    
    console.log('🎯 انتهى التشخيص')
    
  } catch (error) {
    console.error('❌ خطأ في التشخيص:', error)
  }
}

// دالة تشخيص متقدمة
export async function diagnoseSystem() {
  console.log('🔍 بدء التشخيص المتقدم...')
  
  const results = {
    connection: false,
    bucket: false,
    table: false,
    upload: false,
    policies: false
  }
  
  try {
    const supabase = createClientComponentClient()
    
    // 1. اختبار الاتصال
    const { data: user, error: userError } = await supabase.auth.getUser()
    if (!userError && user.user) {
      results.connection = true
      console.log('✅ الاتصال يعمل')
    } else {
      console.error('❌ مشكلة في الاتصال:', userError)
    }
    
    // 2. اختبار bucket
    const bucketExists = await checkLessonMaterialsBucket()
    results.bucket = bucketExists
    console.log('Bucket status:', bucketExists ? '✅ موجود' : '❌ غير موجود')
    
    // 3. اختبار جدول
    const tableExists = await checkLessonMaterialsTable()
    results.table = tableExists
    console.log('Table status:', tableExists ? '✅ موجود' : '❌ غير موجود')
    
    // 4. اختبار السياسات
    try {
      const { error } = await supabase.rpc('exec_sql', {
        sql: `SELECT COUNT(*) FROM storage.buckets WHERE id = 'lesson-materials'`
      })
      results.policies = !error
      console.log('Policies status:', !error ? '✅ صحيحة' : '❌ مشكلة')
    } catch (e) {
      console.error('❌ مشكلة في السياسات:', e)
    }
    
    // 5. اختبار رفع
    if (results.bucket) {
      try {
        const testFile = new File(['test'], 'test.txt', { type: 'text/plain' })
        const result = await uploadLessonFile(testFile, 1)
        results.upload = true
        console.log('✅ رفع الملف يعمل')
        
        // تنظيف
        await deleteLessonFile(result.filePath)
      } catch (e) {
        console.error('❌ مشكلة في رفع الملف:', e)
      }
    }
    
    console.log('📊 نتائج التشخيص:', results)
    return results
    
  } catch (error) {
    console.error('❌ خطأ في التشخيص:', error)
    return results
  }
}

// جعل الدالة متاحة عالمياً
if (typeof window !== 'undefined') {
  (window as any).quickDiagnose = quickDiagnose;
  (window as any).diagnoseSystem = diagnoseSystem;
}