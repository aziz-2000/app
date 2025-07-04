import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// نفس دالة التطبيع المستخدمة في الواجهة الأمامية
const normalizeAnswer = (answer: string): string => {
  return answer
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ") // استبدال المسافات المتعددة بمسافة واحدة
    .replace(/[^\w\s\u0600-\u06FF]/g, "") // إزالة علامات الترقيم مع الحفاظ على الحروف العربية
    .replace(/[أإآ]/g, "ا") // توحيد الهمزات
    .replace(/[ىي]/g, "ي") // توحيد الياء
    .replace(/[ةه]/g, "ه") // توحيد التاء المربوطة والهاء
    .replace(/[ؤئ]/g, "و") // توحيد الواو
}

// نفس دالة التحقق المستخدمة في الواجهة الأمامية
const checkAnswer = (userAnswer: string, correctAnswer: string): boolean => {
  if (!userAnswer.trim() || !correctAnswer.trim()) {
    return false
  }

  const normalizedUser = normalizeAnswer(userAnswer)
  const normalizedCorrect = normalizeAnswer(correctAnswer)

  // التحقق من التطابق الكامل
  if (normalizedUser === normalizedCorrect) {
    return true
  }

  // التحقق من التطابق الجزئي (إذا كانت الإجابة الصحيحة تحتوي على إجابة المستخدم أو العكس)
  if (normalizedCorrect.includes(normalizedUser) && normalizedUser.length >= 3) {
    return true
  }

  if (normalizedUser.includes(normalizedCorrect) && normalizedCorrect.length >= 3) {
    return true
  }

  // التحقق من الكلمات المشتركة (إذا كان 80% من الكلمات متطابقة)
  const userWords = normalizedUser.split(" ").filter(word => word.length > 0)
  const correctWords = normalizedCorrect.split(" ").filter(word => word.length > 0)
  
  if (userWords.length > 0 && correctWords.length > 0) {
    const commonWords = userWords.filter(word => correctWords.includes(word))
    const similarity = commonWords.length / Math.max(userWords.length, correctWords.length)
    
    if (similarity >= 0.8) {
      return true
    }
  }

  return false
}

export async function POST(req: NextRequest) {
  try {
    const { questionId, userAnswer } = await req.json();
    if (!questionId || typeof userAnswer !== 'string') {
      return NextResponse.json({ correct: false, error: 'بيانات غير مكتملة' }, { status: 400 });
    }

    // جلب الإجابة الصحيحة من قاعدة البيانات
    const { data, error } = await supabase
      .from('lab_questions')
      .select('correct_answer')
      .eq('id', questionId)
      .single();

    if (error || !data) {
      return NextResponse.json({ correct: false, error: 'لم يتم العثور على السؤال' }, { status: 404 });
    }

    // استخدام نفس خوارزمية التحقق
    const isCorrect = checkAnswer(userAnswer, data.correct_answer);

    return NextResponse.json({ 
      correct: isCorrect,
      userAnswer: userAnswer,
      correctAnswer: data.correct_answer,
      normalizedUser: normalizeAnswer(userAnswer),
      normalizedCorrect: normalizeAnswer(data.correct_answer)
    });
  } catch (err: any) {
    return NextResponse.json({ correct: false, error: err.message || 'خطأ في الخادم' }, { status: 500 });
  }
} 