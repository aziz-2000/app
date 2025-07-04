'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4">خطأ</h1>
        <p className="text-gray-400 mb-8">حدث خطأ غير متوقع</p>
        <div className="space-x-4">
          <button
            onClick={reset}
            className="bg-[#8648f9] text-white px-6 py-3 rounded-lg hover:bg-[#7c3aed] transition-colors"
          >
            إعادة المحاولة
          </button>
          <a 
            href="/" 
            className="bg-gray-700 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-colors"
          >
            العودة للرئيسية
          </a>
        </div>
      </div>
    </div>
  )
} 