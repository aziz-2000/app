import Sidebar from '@/components/sidebar'

export default function UsersLoading() {
  return (
    <div className="min-h-screen bg-black flex flex-row-reverse">
      <Sidebar />
      <div className="flex-1 mr-64 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-700 rounded w-1/4 mb-6"></div>
          <div className="grid gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-800 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
} 