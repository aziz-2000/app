"use client"

import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-black py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/login" 
            className="inline-flex items-center gap-2 text-sm text-[#8648f9] hover:text-[#8648f9]/80 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            العودة إلى تسجيل الدخول
          </Link>
          <h1 className="text-3xl font-bold text-white mb-4">الشروط والأحكام</h1>
          <p className="text-gray-300">آخر تحديث: يناير 2025</p>
        </div>

        {/* Content */}
        <div className="bg-gray-900/50 border border-[#8648f9]/20 rounded-lg p-8 space-y-6 text-gray-300">
          
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. قبول الشروط</h2>
            <p className="text-right leading-relaxed">
              باستخدام منصة بونت جارد، فإنك توافق على الالتزام بهذه الشروط والأحكام. إذا كنت لا توافق على أي جزء من هذه الشروط، يرجى عدم استخدام المنصة.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. وصف الخدمة</h2>
            <p className="text-right leading-relaxed">
              منصة بونت جارد هي منصة تعليمية متخصصة في مجال الأمن السيبراني، تقدم دورات تعليمية ومحتوى تدريبي باللغة العربية. المنصة مخصصة للأفراد والمؤسسات المهتمة بتطوير مهاراتهم في مجال الأمن السيبراني.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. التسجيل والحساب</h2>
            <div className="space-y-3 text-right leading-relaxed">
              <p>عند التسجيل في المنصة، يجب عليك:</p>
              <ul className="list-disc list-inside space-y-2 mr-4">
                <li>تقديم معلومات دقيقة وكاملة</li>
                <li>الحفاظ على سرية كلمة المرور الخاصة بك</li>
                <li>إخطارنا فوراً بأي استخدام غير مصرح به لحسابك</li>
                <li>عدم مشاركة حسابك مع أي شخص آخر</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. الاستخدام المقبول</h2>
            <div className="space-y-3 text-right leading-relaxed">
              <p>يجب استخدام المنصة للأغراض التعليمية المشروعة فقط. يحظر:</p>
              <ul className="list-disc list-inside space-y-2 mr-4">
                <li>استخدام المنصة لأي غرض غير قانوني</li>
                <li>محاولة اختراق أو تعطيل المنصة</li>
                <li>نشر محتوى ضار أو مسيء</li>
                <li>انتهاك حقوق الملكية الفكرية</li>
                <li>إرسال رسائل غير مرغوب فيها أو محتوى تجاري</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. المحتوى التعليمي</h2>
            <div className="space-y-3 text-right leading-relaxed">
              <p>جميع المحتوى التعليمي في المنصة محمي بحقوق الملكية الفكرية. يحظر:</p>
              <ul className="list-disc list-inside space-y-2 mr-4">
                <li>نسخ أو توزيع المحتوى بدون إذن</li>
                <li>إعادة إنتاج أو تعديل المحتوى</li>
                <li>استخدام المحتوى لأغراض تجارية</li>
                <li>نشر المحتوى على منصات أخرى</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. الخصوصية</h2>
            <p className="text-right leading-relaxed">
              نحن نلتزم بحماية خصوصيتك. يتم جمع واستخدام معلوماتك وفقاً لسياسة الخصوصية الخاصة بنا. لن نشارك معلوماتك الشخصية مع أي طرف ثالث بدون موافقتك، إلا في الحالات التي يقتضيها القانون.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. الدفع والاشتراكات</h2>
            <div className="space-y-3 text-right leading-relaxed">
              <p>بالنسبة للدورات المدفوعة:</p>
              <ul className="list-disc list-inside space-y-2 mr-4">
                <li>يتم الدفع مقدماً قبل الوصول للمحتوى</li>
                <li>الأسعار قابلة للتغيير مع إشعار مسبق</li>
                <li>لا توجد استردادات بعد 7 أيام من الشراء</li>
                <li>الاشتراكات تجدد تلقائياً ما لم يتم إلغاؤها</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">8. إيقاف الحساب</h2>
            <p className="text-right leading-relaxed">
              نحتفظ بالحق في إيقاف أو حذف أي حساب ينتهك هذه الشروط والأحكام، أو لأي سبب آخر نراه مناسباً. في حالة الإيقاف، لن يكون لديك حق في استرداد أي رسوم مدفوعة.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">9. المسؤولية القانونية</h2>
            <p className="text-right leading-relaxed">
              منصة بونت جارد غير مسؤولة عن أي أضرار مباشرة أو غير مباشرة تنشأ عن استخدام المنصة. نحن نقدم المحتوى "كما هو" دون أي ضمانات صريحة أو ضمنية.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">10. التعديلات</h2>
            <p className="text-right leading-relaxed">
              نحتفظ بالحق في تعديل هذه الشروط والأحكام في أي وقت. سيتم إشعارك بأي تغييرات جوهرية عبر البريد الإلكتروني أو من خلال المنصة. استمرارك في استخدام المنصة بعد التعديلات يعني موافقتك على الشروط الجديدة.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">11. القانون المطبق</h2>
            <p className="text-right leading-relaxed">
              تخضع هذه الشروط والأحكام لقوانين سلطنة عمان. أي نزاعات تنشأ عن هذه الشروط سيتم حلها في المحاكم المختصة في سلطنة عمان.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">12. التواصل</h2>
            <p className="text-right leading-relaxed">
              إذا كان لديك أي أسئلة حول هذه الشروط والأحكام، يمكنك التواصل معنا عبر:
            </p>
            <div className="mt-3 text-right">
              <p>البريد الإلكتروني: info@puntguard.com</p>
              <p>الهاتف:91475573</p>
              <p>العنوان: ظفار، سلطنة عمان</p>
            </div>
          </section>

        </div>
      </div>
    </div>
  )
} 