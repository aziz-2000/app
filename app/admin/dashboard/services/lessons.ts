import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { uploadLessonFile } from '@/lib/supabase'

export interface Lesson {
  id: number
  title: string
  course_id?: number
  duration?: string
  lesson_order: number
  status: 'منشور' | 'مسودة'
  content: string
  description?: string
  created_at: string
  admin_id?: string
  materials?: any
}

export const getLessons = async (): Promise<Lesson[]> => {
  const supabase = createClientComponentClient()
  const { data, error } = await supabase.from('lessons').select('*')
  if (error) throw error
  
  // جلب المواد التعليمية لكل درس
  const lessonsWithMaterials = await Promise.all(
    (data || []).map(async (lesson) => {
      const materials = await getLessonMaterials(lesson.id);
      return { ...lesson, materials };
    })
  );
  
  return lessonsWithMaterials;
}

export const getLesson = async (id: number): Promise<Lesson> => {
  const supabase = createClientComponentClient()
  const { data, error } = await supabase.from('lessons').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export const createLesson = async (
  lesson: Omit<Lesson, 'id' | 'created_at'> & { materials?: { name: string; url: string }[] }
): Promise<Lesson & { materials?: { name: string; url: string }[] }> => {
  const supabase = createClientComponentClient()
  
  // الحصول على المستخدم الحالي
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('يجب تسجيل الدخول لإنشاء درس');
  }
  
  const { materials, admin_id, ...lessonDataRaw } = lesson
  // تنظيف lessonData من أي undefined/null أو قيم غير مقبولة
  const lessonData: any = {}
  Object.entries(lessonDataRaw).forEach(([key, value]) => {
    if (
      value !== undefined &&
      value !== null &&
      !(key === 'course_id' && (value === 0 || value === '0'))
    ) {
      lessonData[key] = value
    }
  })
  // لا ترسل course_id إذا كان 0 أو غير معرف
  if ('course_id' in lessonData && (!lessonData.course_id || lessonData.course_id === 0)) {
    delete lessonData.course_id
  }
  
  // إضافة user_id للدرس
  lessonData.user_id = user.id;
  
  // اطبع البيانات قبل الإرسال
  console.log('lessonData to send:', lessonData)
  const { data, error } = await supabase.from('lessons').insert(lessonData).select().single()
  if (error) {
    console.error('Supabase error details:', error, 'lessonData:', lessonData)
    throw error
  }
  if (materials && Array.isArray(materials) && data?.id) {
    const inserts = materials
      .filter(m => m.url)
      .map(m => ({ lesson_id: data.id, file_url: m.url, file_name: m.name }))
    if (inserts.length > 0) {
      const { error: matError } = await supabase.from('lesson_materials').insert(inserts)
      if (matError) {
        console.error('Error inserting lesson materials:', matError)
      }
    }
    return { ...data, materials }
  }
  return data
}

export const updateLesson = async (id: number, lesson: Partial<Lesson>): Promise<Lesson> => {
  const supabase = createClientComponentClient()
  const { data, error } = await supabase.from('lessons').update(lesson).eq('id', id).select().single()
  if (error) throw error
  return data
}

export const deleteLesson = async (id: number): Promise<void> => {
  const supabase = createClientComponentClient()
  const { error } = await supabase.from('lessons').delete().eq('id', id)
  if (error) throw error
}

export const toggleLessonStatus = async (id: number, currentStatus: 'منشور' | 'مسودة'): Promise<Lesson> => {
  return updateLesson(id, { status: currentStatus === 'منشور' ? 'مسودة' : 'منشور' })
}

// إضافة درس جديد مع ملفات مواد تعليمية
export const createLessonWithMaterials = async (lessonData: any, files: File[]) => {
  const supabase = createClientComponentClient()
  console.log('Creating lesson with materials:', { lessonData, filesCount: files.length });
  
  // الحصول على المستخدم الحالي
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('يجب تسجيل الدخول لإنشاء درس');
  }
  
  // تنظيف البيانات من updated_at إذا كان موجوداً
  const { updated_at, ...cleanLessonData } = lessonData;
  
  // إضافة user_id للدرس
  const lessonDataWithUser = {
    ...cleanLessonData,
    user_id: user.id
  };
  
  // 1. أضف الدرس
  const { data: lesson, error } = await supabase.from('lessons').insert(lessonDataWithUser).select().single()
  if (error) {
    console.error('Error creating lesson:', error);
    throw error;
  }
  
  console.log('Lesson created successfully:', lesson);

  // 2. ارفع الملفات وأضفها في lesson_materials
  if (files && files.length > 0) {
    for (const file of files) {
      try {
        console.log('Uploading file:', file.name);
        const { filePath, publicUrl } = await uploadLessonFile(file, lesson.id);
        console.log('File uploaded successfully:', { filePath, publicUrl });
        
        const { error: matError } = await supabase.from('lesson_materials').insert({
          lesson_id: lesson.id,
          file_url: publicUrl, // استخدم publicUrl بدلاً من filePath
          file_name: file.name,
        });
        
        if (matError) {
          console.error('Error inserting lesson material:', matError);
          throw matError;
        }
        
        console.log('Lesson material record created successfully');
      } catch (fileError) {
        console.error('Error processing file:', file.name, fileError);
        throw fileError;
      }
    }
  }
  
  return lesson;
}

// تعديل درس مع إضافة ملفات جديدة
export async function updateLessonWithMaterials(lessonId: number, lessonData: any, files: File[]) {
  const supabase = createClientComponentClient()
  try {
    console.log('Updating lesson with materials:', { lessonId, lessonData, filesCount: files.length });

    // الحصول على المستخدم الحالي
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('يجب تسجيل الدخول لتحديث الدرس');
    }

    // التحقق من وجود user_id في الدرس الحالي
    const { data: currentLesson } = await supabase
      .from('lessons')
      .select('user_id')
      .eq('id', lessonId)
      .single();

    // إضافة user_id إذا لم يكن موجوداً
    const updateData = {
        title: lessonData.title,
        course_id: lessonData.course_id,
        duration: lessonData.duration,
        lesson_order: lessonData.lesson_order,
        content: lessonData.content,
        description: lessonData.description,
      status: lessonData.status,
      ...(currentLesson && !currentLesson.user_id && { user_id: user.id })
    };

    // تحديث بيانات الدرس (بدون updated_at)
    const { data: updatedLesson, error: lessonError } = await supabase
      .from('lessons')
      .update(updateData)
      .eq('id', lessonId)
      .select()
      .maybeSingle();

    if (lessonError) {
      console.error('Error updating lesson:', lessonError);
      throw new Error(`فشل في تحديث الدرس: ${lessonError.message}`);
    }

    console.log('Lesson updated successfully:', updatedLesson);

    // معالجة الملفات الجديدة
    if (files.length > 0) {
      console.log('Processing new files:', files.map(f => f.name));
      
      for (const file of files) {
        try {
          console.log('Processing file:', file.name);
          
          // رفع الملف
          const uploadResult = await uploadLessonFile(file, lessonId);
          console.log('File uploaded successfully:', uploadResult);

          // حفظ مرجع الملف في قاعدة البيانات
          const { error: materialError } = await supabase
            .from('lesson_materials')
            .insert({
              lesson_id: lessonId,
              file_name: file.name,
              file_url: uploadResult.publicUrl,
              file_size: file.size,
              mime_type: file.type
            });

          if (materialError) {
            console.error('Error inserting material record:', materialError);
            throw materialError;
          }

          console.log('Material record created successfully');
        } catch (fileError: any) {
          console.error('Error processing file:', file.name, fileError);
          
          let errorMessage = `فشل في معالجة الملف ${file.name}: `;
          
          if (fileError.message?.includes('bucket')) {
            errorMessage += 'bucket المواد التعليمية غير موجود. يرجى تنفيذ ملف create_bucket_manually.sql في Supabase أولاً';
          } else if (fileError.message?.includes('mime type')) {
            errorMessage += 'نوع الملف غير مدعوم. الأنواع المدعومة: PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, TXT, MP4, MP3, WAV, OGG, ZIP, RAR, 7Z';
          } else if (fileError.message?.includes('size')) {
            errorMessage += 'حجم الملف كبير جداً. الحد الأقصى 50 ميجابايت';
          } else {
            errorMessage += fileError.message || 'خطأ غير معروف';
          }
          
          throw new Error(errorMessage);
        }
      }
    }

    return updatedLesson;
  } catch (error: any) {
    console.error('Error in updateLessonWithMaterials:', error);
    throw error;
  }
}

// جلب المواد التعليمية المرتبطة بالدرس
export const getLessonMaterials = async (lessonId: number) => {
  const supabase = createClientComponentClient()
  const { data, error } = await supabase
    .from('lesson_materials')
    .select('*')
    .eq('lesson_id', lessonId);
  
  if (error) {
    console.error('Error fetching lesson materials:', error);
    return [];
  }
  
  return data || [];
}

// إنشاء درس مع روابط المواد التعليمية
export const createLessonWithUrls = async (lessonData: any, urls: string[]) => {
  const supabase = createClientComponentClient()
  try {
    console.log('Creating lesson with URLs:', { lessonData, urls });

    // الحصول على المستخدم الحالي
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('يجب تسجيل الدخول لإنشاء درس');
    }

    // إضافة user_id للدرس
    const lessonDataWithUser = {
      ...lessonData,
      user_id: user.id
    };

    // 1. إنشاء الدرس
    const { data: lesson, error } = await supabase
      .from('lessons')
      .insert([lessonDataWithUser])
      .select()
      .single();

    if (error) {
      console.error('Error creating lesson:', error);
      throw error;
    }

    console.log('Lesson created successfully:', lesson);

    // 2. إضافة الروابط في lesson_materials
    if (urls && urls.length > 0) {
      const materialData = urls
        .filter(url => url.trim() !== '')
        .map(url => ({
          lesson_id: lesson.id,
          file_url: url.trim(),
          file_name: extractFileNameFromUrl(url.trim()),
        }));

      if (materialData.length > 0) {
        const { error: matError } = await supabase
          .from('lesson_materials')
          .insert(materialData);

        if (matError) {
          console.error('Error inserting lesson materials:', matError);
          throw matError;
        }

        console.log('Lesson materials created successfully');
      }
    }

    return lesson;
  } catch (error) {
    console.error('Error in createLessonWithUrls:', error);
    throw error;
  }
};

// دالة مساعدة لاستخراج اسم الملف من الرابط
function extractFileNameFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const fileName = pathname.split('/').pop() || 'ملف';
    return decodeURIComponent(fileName);
  } catch {
    // إذا فشل في تحليل الرابط، استخدم الرابط كاملاً
    return url.split('/').pop() || 'ملف';
  }
}

// تحديث درس مع روابط المواد التعليمية
export const updateLessonWithUrls = async (lessonId: number, lessonData: any, urls: string[]) => {
  const supabase = createClientComponentClient()
  try {
    console.log('Updating lesson with URLs:', { lessonId, lessonData, urls });

    // الحصول على المستخدم الحالي
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('يجب تسجيل الدخول لتحديث الدرس');
    }

    // التحقق من وجود user_id في الدرس الحالي
    const { data: currentLesson } = await supabase
      .from('lessons')
      .select('user_id')
      .eq('id', lessonId)
      .single();

    // إضافة user_id إذا لم يكن موجوداً
    const updateData = {
        title: lessonData.title,
        course_id: lessonData.course_id,
        duration: lessonData.duration,
        lesson_order: lessonData.lesson_order,
        content: lessonData.content,
        description: lessonData.description,
      status: lessonData.status,
      ...(currentLesson && !currentLesson.user_id && { user_id: user.id })
    };

    // 1. تحديث بيانات الدرس
    const { data: updatedLesson, error: lessonError } = await supabase
      .from('lessons')
      .update(updateData)
      .eq('id', lessonId)
      .select()
      .maybeSingle();

    if (lessonError) {
      console.error('Error updating lesson:', lessonError);
      throw new Error(`فشل في تحديث الدرس: ${lessonError.message || JSON.stringify(lessonError)}`);
    }

    console.log('Lesson updated successfully:', updatedLesson);

    // 2. حذف المواد التعليمية القديمة
    const { error: deleteError } = await supabase
      .from('lesson_materials')
      .delete()
      .eq('lesson_id', lessonId);

    if (deleteError) {
      console.error('Error deleting old materials:', deleteError);
      // لا نوقف العملية هنا
    }

    // 3. إضافة الروابط الجديدة
    if (urls && urls.length > 0) {
      const materialData = urls
        .filter(url => url.trim() !== '')
        .map(url => ({
          lesson_id: lessonId,
          file_url: url.trim(),
          file_name: extractFileNameFromUrl(url.trim()),
        }));

      if (materialData.length > 0) {
        const { error: matError } = await supabase
          .from('lesson_materials')
          .insert(materialData);

        if (matError) {
          console.error('Error inserting new materials:', matError);
          throw new Error(`فشل في حفظ المواد التعليمية: ${matError.message}`);
        }

        console.log('New lesson materials created successfully');
      }
    }

    return updatedLesson;
  } catch (error) {
    console.error('Error in updateLessonWithUrls:', error);
    throw error;
  }
};