import { unstable_cache } from 'next/cache'

export const CACHE_TAGS = {
  GMV_DATA: 'gmv-data',
  BUDGET_PLAN: 'budget-plan',
  SALES_STATS: 'sales-stats',
  ORDERS: 'orders'
} as const

export const CACHE_TIMES = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 3600, // 1 hour
} as const

export function getCachedData<T>(
  fn: () => Promise<T>,
  keys: string[],
  options?: {
    revalidate?: number
    tags?: string[]
  }
) {
  return unstable_cache(
    fn,
    keys,
    {
      revalidate: options?.revalidate ?? CACHE_TIMES.SHORT,
      tags: options?.tags ?? []
    }
  )()
}

export class MemoryCache {
  private cache = new Map<string, { data: any; timestamp: number; version: string }>()
  private ttl: number
  private version: string = '1.0.0'

  constructor(ttl = 60000) {
    this.ttl = ttl
  }

  get(key: string) {
    const cached = this.cache.get(key)
    if (!cached) return null
    
    // Check version mismatch
    if (cached.version !== this.version) {
      this.cache.delete(key)
      return null
    }
    
    // Check TTL
    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(key)
      return null
    }
    
    return cached.data
  }

  set(key: string, data: any) {
    // Validate data before caching
    if (data && typeof data === 'object') {
      // Log important metrics for debugging
      if (data.uniqueCreators !== undefined) {
        console.log(`[Cache] Storing data with ${data.uniqueCreators} unique creators`)
      }
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      version: this.version
    })
  }

  clear() {
    console.log('[Cache] Clearing all cached data')
    this.cache.clear()
  }
  
  invalidate(pattern?: string) {
    if (pattern) {
      // Invalidate keys matching pattern
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          console.log(`[Cache] Invalidating key: ${key}`)
          this.cache.delete(key)
        }
      }
    } else {
      this.clear()
    }
  }
  
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      version: this.version
    }
  }
}

export const globalCache = new MemoryCache()