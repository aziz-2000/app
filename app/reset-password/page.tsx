"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Lock, Key, AlertCircle, CheckCircle } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // تحقق من أن المستخدم لديه جلسة نشطة
    const checkSession = async () => {
      try {
        const supabase = createClientComponentClient()
        const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
          router.push('/login')
        }
      } catch (error) {
        console.error('Session check error:', error)
        router.push('/login')
      }
    }
    
    checkSession()
  }, [router])

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
      const { error: resetError } = await supabase.auth.updateUser({
        password: password,
      })

      if (resetError) throw resetError

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
                  className="bg-gray-800/50 border-[#8648f9]/20 text-white"
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
                  className="bg-gray-800/50 border-[#8648f9]/20 text-white"
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
        </div>
      </div>
    </div>
  )
} 