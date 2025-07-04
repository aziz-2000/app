"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, Mail, Lock, Shield, AlertCircle, Key, CheckCircle } from "lucide-react"
import { toast } from "@/hooks/use-toast"

export default function AdminLoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showResetForm, setShowResetForm] = useState(false)
  const [resetEmail, setResetEmail] = useState("")
  const [resetSent, setResetSent] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      // التحقق من صحة المدخلات
      if (!email || !password) {
        throw new Error("الرجاء إدخال البريد الإلكتروني وكلمة المرور")
      }

      if (!email.includes("@") || !email.includes(".")) {
        throw new Error("صيغة البريد الإلكتروني غير صالحة")
      }

      if (password.length < 6) {
        throw new Error("كلمة المرور يجب أن تكون 6 أحرف على الأقل")
      }

      const supabase = createClientComponentClient()

      // تسجيل الدخول باستخدام Supabase
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      })

      if (authError) {
        if (authError.message.includes("Invalid login credentials")) {
          throw new Error("البريد الإلكتروني أو كلمة المرور غير صحيحة")
        }
        throw authError
      }

      // التحقق من أن المستخدم مسؤول
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, name, role, status')
        .eq('id', data.user.id)
        .single()

      if (userError || !userData) {
        await supabase.auth.signOut()
        throw new Error('المستخدم غير موجود في قاعدة البيانات')
      }

      if (userData.role !== 'مسؤول') {
        await supabase.auth.signOut()
        throw new Error('ليس لديك صلاحيات المسؤول')
      }

      if (userData.status !== 'نشط') {
        await supabase.auth.signOut()
        throw new Error('حسابك معطل، الرجاء التواصل مع الإدارة')
      }

      // تسجيل دخول ناجح
      toast({
        title: "تم تسجيل الدخول بنجاح",
        description: `مرحباً ${userData.name}`,
      })
      router.push("/admin/dashboard")
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تسجيل الدخول')
      toast({
        title: "خطأ في تسجيل الدخول",
        description: err.message || 'حدث خطأ أثناء تسجيل الدخول',
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async () => {
    if (!resetEmail) {
      setError("الرجاء إدخال البريد الإلكتروني المسجل")
      return
    }

    try {
      setLoading(true)
      const supabase = createClientComponentClient()
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/admin/auth/callback`,
      })

      if (error) throw error

      setResetSent(true)
      toast({
        title: "تم إرسال رابط إعادة التعيين",
        description: "الرجاء التحقق من بريدك الإلكتروني لتعيين كلمة مرور جديدة",
      })
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء إرسال رابط إعادة تعيين كلمة المرور')
      toast({
        title: "خطأ في إرسال رابط إعادة تعيين كلمة المرور",
        description: err.message?.includes('Password reset email rate limit exceeded')
          ? "تم تجاوز الحد المسموح لإرسال رسائل إعادة تعيين كلمة المرور. يرجى المحاولة لاحقاً."
          : err.message || 'حدث خطأ أثناء إرسال رابط إعادة تعيين كلمة المرور',
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-[#8648f9]/20 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-[#8648f9]" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">لوحة تحكم المسؤول</h2>
          <p className="text-gray-300">ادخل بيانات المسؤول للوصول إلى لوحة التحكم</p>
        </div>

        <Card className="bg-gray-900/50 border-[#8648f9]/20">
          <CardHeader>
            <CardTitle className="text-white text-center">
              {showResetForm ? "إعادة تعيين كلمة المرور" : "تسجيل دخول المسؤول"}
            </CardTitle>
            <CardDescription className="text-gray-300 text-center">
              {showResetForm 
                ? "أدخل بريدك الإلكتروني لاستلام رابط التعيين" 
                : "أدخل بيانات المسؤول للوصول إلى النظام"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-md flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <span className="text-red-300 text-sm">{error}</span>
              </div>
            )}

            {showResetForm ? (
              <div className="space-y-4">
                {resetSent ? (
                  <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-md text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <p className="text-green-300">
                        تم إرسال رابط إعادة التعيين إلى <span className="font-medium">{resetEmail}</span>
                      </p>
                    </div>
                    <Button 
                      variant="link" 
                      className="text-[#8648f9] mt-2"
                      onClick={() => {
                        setShowResetForm(false)
                        setResetSent(false)
                      }}
                    >
                      العودة إلى تسجيل الدخول
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="reset-email" className="text-white">
                        البريد الإلكتروني المسجل
                      </Label>
                      <div className="relative">
                        <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          id="reset-email"
                          type="email"
                          placeholder="admin@example.com"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          className="pr-10 bg-gray-800/50 border-[#8648f9]/20 text-white placeholder:text-gray-400"
                          required
                          disabled={loading}
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        className="w-full bg-[#8648f9] hover:bg-[#8648f9]/80 text-white"
                        onClick={handleResetPassword}
                        disabled={loading}
                      >
                        {loading ? (
                          <span className="flex items-center gap-2">
                            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            جاري الإرسال...
                          </span>
                        ) : (
                          <>
                            <Key className="w-4 h-4 mr-2" />
                            إرسال رابط التعيين
                          </>
                        )}
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        className="w-full text-white border-gray-600 hover:bg-gray-800/50"
                        onClick={() => setShowResetForm(false)}
                        disabled={loading}
                      >
                        إلغاء
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-white">
                      البريد الإلكتروني
                    </Label>
                    <div className="relative">
                      <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="admin@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pr-10 bg-gray-800/50 border-[#8648f9]/20 text-white placeholder:text-gray-400"
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-white">
                      كلمة المرور
                    </Label>
                    <div className="relative">
                      <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="أدخل كلمة المرور"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pr-10 pl-10 bg-gray-800/50 border-[#8648f9]/20 text-white placeholder:text-gray-400"
                        required
                        disabled={loading}
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                        disabled={loading}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-[#8648f9] hover:bg-[#8648f9]/80 text-white"
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        جاري تسجيل الدخول...
                      </span>
                    ) : (
                      "دخول لوحة التحكم"
                    )}
                  </Button>
                </form>

                <div className="mt-6 p-4 bg-gray-800/30 rounded-lg border border-[#8648f9]/10">
                  <p className="text-sm text-gray-400 mb-2">في حالة نسيان كلمة المرور:</p>
                  <Button 
                    variant="link" 
                    className="text-[#8648f9] p-0 h-auto flex items-center gap-1"
                    onClick={() => setShowResetForm(true)}
                    disabled={loading}
                  >
                    <Key className="w-4 h-4" />
                    اضغط هنا لإعادة تعيين كلمة المرور
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}