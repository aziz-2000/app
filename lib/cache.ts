// نظام تخزين مؤقت بسيط للبيانات
interface CacheItem<T> {
  data: T
  timestamp: number
  ttl: number
}

class SimpleCache {
  private cache = new Map<string, CacheItem<any>>()

  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key)
    
    if (!item) {
      return null
    }

    const isExpired = Date.now() - item.timestamp > item.ttl
    if (isExpired) {
      this.cache.delete(key)
      return null
    }

    return item.data
  }

  delete(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  // تنظيف العناصر المنتهية الصلاحية
  cleanup(): void {
    const now = Date.now()
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key)
      }
    }
  }
}

export const dataCache = new SimpleCache()

// تنظيف التخزين المؤقت كل دقيقة
if (typeof window !== 'undefined') {
  setInterval(() => {
    dataCache.cleanup()
  }, 60 * 1000)
}

// مفاتيح التخزين المؤقت
export const CACHE_KEYS = {
  USER_ENROLLMENTS: (userId: string) => `enrollments_${userId}`,
  COURSE_PROGRESS: (userId: string, courseId: number) => `progress_${userId}_${courseId}`,
  USER_BADGES: (userId: string) => `badges_${userId}`,
  USER_PROFILE: (userId: string) => `profile_${userId}`,
  COURSES: 'courses',
  LESSONS: (courseId: number) => `lessons_${courseId}`,
  LABS: (courseId: number) => `labs_${courseId}`,
  USERS: 'users',
  ADMIN_DATA: 'admin_data',
  // مفاتيح التخزين المؤقت للستريك
  USER_STREAK: (userId: string) => `user_streak_${userId}`,
  STREAK_STATS: (userId: string) => `streak_stats_${userId}`,
  DAILY_ACTIVITY: (userId: string, date: string, activityType: string) => `daily_activity_${userId}_${date}_${activityType}`
}

// دالة مساعدة لمسح التخزين المؤقت للمستخدم
export const clearUserCache = (userId: string) => {
  const keysToDelete = [
    CACHE_KEYS.USER_ENROLLMENTS(userId),
    CACHE_KEYS.USER_BADGES(userId),
    CACHE_KEYS.USER_PROFILE(userId),
    CACHE_KEYS.USER_STREAK(userId),
    CACHE_KEYS.STREAK_STATS(userId)
  ]
  
  keysToDelete.forEach(key => dataCache.delete(key))
  console.log(`🧹 Cleared cache for user: ${userId}`)
}

// دالة مساعدة لمسح التخزين المؤقت للستريك
export const clearStreakCache = (userId: string) => {
  const keysToDelete = [
    CACHE_KEYS.USER_STREAK(userId),
    CACHE_KEYS.STREAK_STATS(userId)
  ]
  
  keysToDelete.forEach(key => dataCache.delete(key))
  console.log(`🧹 Cleared streak cache for user: ${userId}`)
} 