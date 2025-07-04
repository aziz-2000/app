import type React from "react"
import { Tajawal } from "next/font/google"

const tajawal = Tajawal({
  subsets: ["arabic"],
  weight: ["200", "300", "400", "500", "700", "800", "900"],
})

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className={`${tajawal.className} bg-black text-white min-h-screen`}>
      <div className="p-8">
        {children}
      </div>
    </div>
  )
} 