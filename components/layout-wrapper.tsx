"use client"

import { usePathname } from "next/navigation"
import { useMemo, memo } from "react"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import { Toaster } from "@/components/ui/toaster"

// استخدام memo لمنع إعادة التحميل غير الضروري
const LayoutWrapper = memo(function LayoutWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  
  // استخدام useMemo لمنع إعادة الحساب عند تبديل التبويبات
  const isAdminPage = useMemo(() => {
    return pathname?.startsWith('/admin')
  }, [pathname])

  return (
    <>
      {!isAdminPage && <Navbar />}
      <main>{children}</main>
      {!isAdminPage && <Footer />}
      <Toaster />
    </>
  )
})

export default LayoutWrapper 