"use client"

import Link from "next/link"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Users, BookOpen, FileText, Monitor, LayoutDashboard } from "lucide-react"

const sidebarItems = [
  { href: "/admin/dashboard?tab=dashboard", label: "لوحة التحكم", icon: LayoutDashboard },
  { href: "/admin/users", label: "إدارة المستخدمين", icon: Users },
  { href: "/admin/dashboard?tab=courses", label: "إدارة المسارات", icon: BookOpen },
  { href: "/admin/dashboard?tab=lessons", label: "إدارة الدروس", icon: FileText },
  { href: "/admin/dashboard?tab=labs", label: "إدارة المختبرات", icon: Monitor },
]

export default function Sidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const handleNavigation = (href: string) => {
    router.push(href)
  }

  return (
    <aside className="h-full w-64 bg-gray-900/80 border-l border-[#8648f9]/20 flex flex-col py-8 px-4 gap-4 fixed right-0 top-0 z-40 min-h-screen">
      <div className="mb-8 flex flex-col items-center">
        <Link href="/" className="mb-2">
          <img src="/logo.png" alt="Logo" className="w-32 h-auto" />
        </Link>
        <span className="text-white text-lg font-bold">لوحة التحكم</span>
      </div>
      <nav className="flex flex-col gap-2">
        {sidebarItems.map((item) => {
          const Icon = item.icon
          const isActive = (pathname === "/admin/dashboard" && searchParams.get('tab') === item.href.split('=')[1]) || 
                          (pathname === item.href)
          
          return (
            <button
              key={item.href}
              onClick={() => handleNavigation(item.href)}
              className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors font-medium ${
                isActive 
                  ? "bg-[#8648f9] text-white" 
                  : "text-gray-300 hover:bg-[#8648f9]/20 hover:text-white"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>
    </aside>
  )
} 