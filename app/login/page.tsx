"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Eye, EyeOff, Mail, Lock, User, Phone } from "lucide-react"
import Link from "next/link"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [registerEmail, setRegisterEmail] = useState("")
  const [registerPassword, setRegisterPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [phone, setPhone] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [successMsg, setSuccessMsg] = useState("")
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [resetEmail, setResetEmail] = useState("")
  const [resetLoading, setResetLoading] = useState(false)
  const [resetMsg, setResetMsg] = useState("")
  const router = useRouter()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash.includes('type=recovery') || hash.includes('access_token')) {
        router.replace('/reset-password');
      }
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMsg("")
    setSuccessMsg("")
    
    try {
      const supabase = createClientComponentClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    })
      
    if (error) {
      setErrorMsg(error.message || "فشل تسجيل الدخول")
    } else {
      setSuccessMsg("تم تسجيل الدخول بنجاح!")
      setTimeout(() => {
        router.push('/dashboard')
      }, 1500)
      }
    } catch (error) {
      console.error('Login error:', error)
      setErrorMsg("حدث خطأ أثناء تسجيل الدخول")
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMsg("")
    setSuccessMsg("")
    
    if (registerPassword !== confirmPassword) {
      setErrorMsg("كلمتا المرور غير متطابقتين")
      setIsLoading(false)
      return
    }
    
    try {
      const supabase = createClientComponentClient()
    const { error } = await supabase.auth.signUp({
      email: registerEmail,
      password: registerPassword,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          phone,
        },
      },
    })
      
    if (error) {
      setErrorMsg(error.message || "فشل إنشاء الحساب")
    } else {
      setSuccessMsg("تم إنشاء الحساب بنجاح! تحقق من بريدك الإلكتروني.")
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
      }
    } catch (error) {
      console.error('Register error:', error)
      setErrorMsg("حدث خطأ أثناء إنشاء الحساب")
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setResetLoading(true)
    setResetMsg("")
    
    try {
      const supabase = createClientComponentClient()
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail)
      
    if (error) {
      setResetMsg(error.message || "فشل إرسال رابط إعادة التعيين")
    } else {
      setResetMsg("تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني إذا كان مسجلاً.")
      }
    } catch (error) {
      console.error('Reset password error:', error)
      setResetMsg("حدث خطأ أثناء إرسال رابط إعادة التعيين")
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-2">مرحباً بك</h2>
          <p className="text-gray-300">ادخل إلى حسابك أو أنشئ حساباً جديداً</p>
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-gray-900/50 border border-[#8648f9]/20">
            <TabsTrigger
              value="login"
              className="data-[state=active]:bg-[#8648f9] data-[state=active]:text-white text-gray-300"
            >
              تسجيل الدخول
            </TabsTrigger>
            <TabsTrigger
              value="register"
              className="data-[state=active]:bg-[#8648f9] data-[state=active]:text-white text-gray-300"
            >
              إنشاء حساب
            </TabsTrigger>
          </TabsList>

          {/* تسجيل الدخول */}
          <TabsContent value="login">
            <Card className="bg-gray-900/50 border-[#8648f9]/20">
              <CardHeader>
                <CardTitle className="text-white text-center">تسجيل الدخول</CardTitle>
                <CardDescription className="text-gray-300 text-center">أدخل بياناتك للوصول إلى حسابك</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {errorMsg && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-md text-red-300 text-sm">
                    {errorMsg}
                  </div>
                )}
                {successMsg && (
                  <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-md text-green-300 text-sm">
                    {successMsg}
                  </div>
                )}
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
                        placeholder="أدخل بريدك الإلكتروني"
                        className="pr-10 bg-gray-800/50 border-[#8648f9]/20 text-white placeholder:text-gray-400"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
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
                        className="pr-10 pl-10 bg-gray-800/50 border-[#8648f9]/20 text-white placeholder:text-gray-400"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <input
                        id="remember"
                        type="checkbox"
                        className="h-4 w-4 text-[#8648f9] focus:ring-[#8648f9] border-gray-300 rounded"
                      />
                      <Label htmlFor="remember" className="mr-2 text-sm text-gray-300">
                        تذكرني
                      </Label>
                    </div>
                    <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
                      <DialogTrigger asChild>
                        <button type="button" className="text-sm text-[#8648f9] hover:text-[#8648f9]/80">نسيت كلمة المرور؟</button>
                      </DialogTrigger>
                      <DialogContent className="bg-gray-900 border-[#8648f9]/20">
                        <DialogHeader>
                          <DialogTitle className="text-white">إعادة تعيين كلمة المرور</DialogTitle>
                          <DialogDescription className="text-gray-300">أدخل بريدك الإلكتروني لإرسال رابط إعادة تعيين كلمة المرور</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleResetPassword} className="space-y-4 mt-2">
                          <Input
                            id="resetEmail"
                            type="email"
                            placeholder="أدخل بريدك الإلكتروني"
                            className="bg-gray-800 border-gray-700 text-white"
                            value={resetEmail}
                            onChange={e => setResetEmail(e.target.value)}
                            required
                          />
                          <Button type="submit" className="w-full bg-[#8648f9] hover:bg-[#8648f9]/80 text-white" disabled={resetLoading}>
                            {resetLoading ? "جاري الإرسال..." : "إرسال رابط إعادة التعيين"}
                          </Button>
                          {resetMsg && <div className="text-center text-sm mt-2 text-white">{resetMsg}</div>}
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>

                  <Button type="submit" className="w-full bg-[#8648f9] hover:bg-[#8648f9]/80 text-white" disabled={isLoading}>
                    {isLoading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
                  </Button>
                </form>

                <div className="text-center">
                  <p className="text-sm text-gray-300">
                    ليس لديك حساب؟ <button className="text-[#8648f9] hover:text-[#8648f9]/80">أنشئ حساباً جديداً</button>
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* إنشاء حساب */}
          <TabsContent value="register">
            <Card className="bg-gray-900/50 border-[#8648f9]/20">
              <CardHeader>
                <CardTitle className="text-white text-center">إنشاء حساب جديد</CardTitle>
                <CardDescription className="text-gray-300 text-center">أدخل بياناتك لإنشاء حساب جديد</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {errorMsg && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-md text-red-300 text-sm">
                    {errorMsg}
                  </div>
                )}
                {successMsg && (
                  <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-md text-green-300 text-sm">
                    {successMsg}
                  </div>
                )}
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="text-white">
                        الاسم الأول
                      </Label>
                      <div className="relative">
                        <User className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          id="firstName"
                          type="text"
                          placeholder="الاسم الأول"
                          className="pr-10 bg-gray-800/50 border-[#8648f9]/20 text-white placeholder:text-gray-400"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="text-white">
                        الاسم الأخير
                      </Label>
                      <div className="relative">
                        <User className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          id="lastName"
                          type="text"
                          placeholder="الاسم الأخير"
                          className="pr-10 bg-gray-800/50 border-[#8648f9]/20 text-white placeholder:text-gray-400"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="registerEmail" className="text-white">
                      البريد الإلكتروني
                    </Label>
                    <div className="relative">
                      <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        id="registerEmail"
                        type="email"
                        placeholder="أدخل بريدك الإلكتروني"
                        className="pr-10 bg-gray-800/50 border-[#8648f9]/20 text-white placeholder:text-gray-400"
                        value={registerEmail}
                        onChange={(e) => setRegisterEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-white">
                      رقم الهاتف
                    </Label>
                    <div className="relative">
                      <Phone className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="أدخل رقم هاتفك"
                        className="pr-10 bg-gray-800/50 border-[#8648f9]/20 text-white placeholder:text-gray-400"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="registerPassword" className="text-white">
                      كلمة المرور
                    </Label>
                    <div className="relative">
                      <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        id="registerPassword"
                        type={showPassword ? "text" : "password"}
                        placeholder="أدخل كلمة المرور"
                        className="pr-10 pl-10 bg-gray-800/50 border-[#8648f9]/20 text-white placeholder:text-gray-400"
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-white">
                      تأكيد كلمة المرور
                    </Label>
                    <div className="relative">
                      <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="أعد إدخال كلمة المرور"
                        className="pr-10 pl-10 bg-gray-800/50 border-[#8648f9]/20 text-white placeholder:text-gray-400"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <input
                      id="terms"
                      type="checkbox"
                      className="h-4 w-4 text-[#8648f9] focus:ring-[#8648f9] border-gray-300 rounded"
                      required
                    />
                    <Label htmlFor="terms" className="mr-2 text-sm text-gray-300">
                      أوافق على{" "}
                      <Link href="#" className="text-[#8648f9] hover:text-[#8648f9]/80">
                        الشروط والأحكام
                      </Link>
                    </Label>
                  </div>

                  <Button type="submit" className="w-full bg-[#8648f9] hover:bg-[#8648f9]/80 text-white" disabled={isLoading}>
                    {isLoading ? "جاري إنشاء الحساب..." : "إنشاء حساب"}
                  </Button>
                </form>

                <div className="text-center">
                  <p className="text-sm text-gray-300">
                    لديك حساب بالفعل؟ <button className="text-[#8648f9] hover:text-[#8648f9]/80">سجل دخولك</button>
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
