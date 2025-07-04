export default function Loading() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-[#8648f9]/20 border-t-[#8648f9] rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-white">جاري تحميل المختبر...</p>
      </div>
    </div>
  )
}
