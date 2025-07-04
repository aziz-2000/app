export default function NotFound() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4">404</h1>
        <p className="text-gray-400 mb-8">الصفحة غير موجودة</p>
        <a 
          href="/" 
          className="bg-[#8648f9] text-white px-6 py-3 rounded-lg hover:bg-[#7c3aed] transition-colors"
        >
          العودة للرئيسية
        </a>
      </div>
    </div>
  )
} 