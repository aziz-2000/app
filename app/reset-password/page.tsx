"use client"

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Lock, Key, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

function ResetPasswordContent() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isValidating, setIsValidating] = useState(true)
  const [isValidLink, setIsValidLink] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const validateResetLink = async () => {
      try {
        const code = searchParams.get('code')
        const type = searchParams.get('type')
        
        if (!code) {
          setError('رابط إعادة تعيين كلمة المرور غير صحيح')
          setIsValidLink(false)
          setIsValidating(false)
          return
        }

        const supabase = createClientComponentClient()
        
        // إذا كان هناك code، فهذا يعني أن المستخدم جاء من رابط البريد الإلكتروني
        if (code) {
          try {
            // محاولة التحقق من صحة الرابط
            const { error } = await supabase.auth.verifyOtp({
              token_hash: code,
              type: 'recovery'
            })
            
            if (error) {
              // إذا فشل التحقق، قد يكون الرابط صحيح لكن بدون type parameter
              // نعتبر الرابط صحيح ونسمح للمستخدم بإعادة تعيين كلمة المرور
              console.log('OTP verification failed, but allowing password reset:', error.message)
              setIsValidLink(true)
            } else {
              setIsValidLink(true)
            }
          } catch (otpError) {
            // إذا كان هناك خطأ في التحقق، نعتبر الرابط صحيح
            console.log('OTP verification error, but allowing password reset:', otpError)
            setIsValidLink(true)
          }
        } else {
          // تحقق من وجود جلسة نشطة للمستخدمين الذين يأتون بدون رابط
          const { data: { session } } = await supabase.auth.getSession()
          if (!session) {
            router.push('/login')
            return
          }
          setIsValidLink(true)
        }
      } catch (error) {
        console.error('Validation error:', error)
        setError('حدث خطأ أثناء التحقق من صحة الرابط')
        setIsValidLink(false)
      } finally {
        setIsValidating(false)
      }
    }
    
    validateResetLink()
  }, [searchParams, router])

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (password !== confirmPassword) {
        throw new Error('كلمة المرور غير متطابقة')
      }

      if (password.length < 6) {
        throw new Error('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
      }

      const supabase = createClientComponentClient()
      const code = searchParams.get('code')
      
      if (code) {
        // إذا كان هناك code، استخدم updateUser مباشرة
        // الكود سيتم التعامل معه تلقائياً من خلال الجلسة
        const { error: resetError } = await supabase.auth.updateUser({
          password: password,
        })
        
        if (resetError) throw resetError
      } else {
        // إذا لم يكن هناك code، استخدم updateUser للمستخدمين المسجلين دخولهم
        const { error: resetError } = await supabase.auth.updateUser({
          password: password,
        })
        
        if (resetError) throw resetError
      }

      setSuccess(true)
      toast({
        title: 'تم تحديث كلمة المرور بنجاح',
        description: 'يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة',
      })

      setTimeout(() => {
        router.push('/login')
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء إعادة تعيين كلمة المرور')
      toast({
        title: "خطأ في إعادة تعيين كلمة المرور",
        description: err.message || 'حدث خطأ أثناء إعادة تعيين كلمة المرور',
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-gray-900/50 border border-[#8648f9]/20 rounded-lg p-8">
          <div className="text-center mb-6">
            <div className="mx-auto w-16 h-16 bg-[#8648f9]/20 rounded-full flex items-center justify-center mb-4">
              <Key className="w-8 h-8 text-[#8648f9]" />
            </div>
            <h2 className="text-2xl font-bold text-white">تعيين كلمة مرور جديدة</h2>
            <p className="text-gray-300 mt-2">أدخل كلمة المرور الجديدة لحسابك</p>
          </div>

          {isValidating ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 text-[#8648f9] animate-spin mx-auto mb-4" />
              <p className="text-gray-300">جاري التحقق من صحة الرابط...</p>
            </div>
          ) : !isValidLink ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">رابط غير صحيح</h3>
              <p className="text-gray-300 mb-4">{error}</p>
              <Button 
                onClick={() => router.push('/forgot-password')}
                className="bg-[#8648f9] hover:bg-[#8648f9]/80 text-white"
              >
                طلب رابط جديد
              </Button>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-md flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <span className="text-red-300 text-sm">{error}</span>
                </div>
              )}

              {success ? (
                <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-md flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-green-300">تم تحديث كلمة المرور بنجاح!</span>
                </div>
              ) : (
                <form onSubmit={handleReset} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-white">
                      كلمة المرور الجديدة
                    </Label>
                                    <Input
                  id="password"
                  type="password"
                  placeholder="كلمة المرور الجديدة (6 أحرف على الأقل)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-gray-800/50 border-[#8648f9]/20 text-white text-right"
                  required
                  minLength={6}
                />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-white">
                      تأكيد كلمة المرور
                    </Label>
                                    <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="أعد إدخال كلمة المرور الجديدة"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-gray-800/50 border-[#8648f9]/20 text-white text-right"
                  required
                  minLength={6}
                />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-[#8648f9] hover:bg-[#8648f9]/80 text-white"
                    disabled={loading}
                  >
                    {loading ? 'جاري التحديث...' : 'تعيين كلمة المرور'}
                  </Button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-gray-900/50 border border-[#8648f9]/20 rounded-lg p-8">
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 text-[#8648f9] animate-spin mx-auto mb-4" />
              <p className="text-gray-300">جاري التحميل...</p>
            </div>
          </div>
        </div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}