'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-4">خطأ عام</h1>
            <p className="text-gray-400 mb-8">حدث خطأ في التطبيق</p>
            <button
              onClick={reset}
              className="bg-[#8648f9] text-white px-6 py-3 rounded-lg hover:bg-[#7c3aed] transition-colors"
            >
              إعادة المحاولة
            </button>
          </div>
        </div>
      </body>
    </html>
  )
} 