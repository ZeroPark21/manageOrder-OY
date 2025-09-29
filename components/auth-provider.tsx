"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { getSupabaseBrowserClient } from "@/lib/database/supabase"
import { useRouter, usePathname } from "next/navigation"

interface AuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: true,
  refreshSession: async () => {}
})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  const supabase = getSupabaseBrowserClient()

  const refreshSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error) {
        console.error("Session refresh error:", error)
        setIsAuthenticated(false)

        // 로그인 페이지가 아닌 경우에만 리다이렉트
        if (!pathname.startsWith('/login')) {
          router.push('/login')
        }
        return
      }

      if (session) {
        setIsAuthenticated(true)

        // 세션이 만료되기 전에 자동으로 갱신 (만료 5분 전)
        const expiresAt = new Date(session.expires_at! * 1000)
        const now = new Date()
        const timeUntilExpiry = expiresAt.getTime() - now.getTime()
        const refreshTime = Math.max(timeUntilExpiry - 5 * 60 * 1000, 0) // 5분 전에 갱신

        if (refreshTime > 0) {
          setTimeout(async () => {
            // console.log("자동 세션 갱신 시작...")
            await refreshSession()
          }, refreshTime)
        }
      } else {
        setIsAuthenticated(false)
        if (!pathname.startsWith('/login')) {
          router.push('/login')
        }
      }
    } catch (error) {
      console.error("Session check error:", error)
      setIsAuthenticated(false)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // 초기 세션 체크
    refreshSession()

    // Supabase auth 상태 변경 리스너
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // 개발 환경에서만 로그 출력
      if (process.env.NODE_ENV === 'development' && event !== 'SIGNED_IN') {
        console.log(`Auth event: ${event}`)
      }

      switch (event) {
        case 'SIGNED_IN':
          setIsAuthenticated(true)
          break

        case 'SIGNED_OUT':
          setIsAuthenticated(false)
          // 로그아웃 시 쿠키 정리
          document.cookie = 'sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
          document.cookie = 'sb-refresh-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
          router.push('/login')
          break

        case 'TOKEN_REFRESHED':
          // console.log("토큰이 자동으로 갱신되었습니다")
          setIsAuthenticated(true)

          // 새 토큰으로 쿠키 업데이트
          if (session) {
            document.cookie = `sb-access-token=${session.access_token}; path=/; max-age=3600`
            document.cookie = `sb-refresh-token=${session.refresh_token}; path=/; max-age=604800`
          }
          break

        case 'USER_UPDATED':
          // console.log("사용자 정보가 업데이트되었습니다")
          break
      }
    })

    // 페이지 포커스 시 세션 체크
    const handleFocus = () => {
      // console.log("페이지 포커스 - 세션 체크")
      refreshSession()
    }

    window.addEventListener('focus', handleFocus)

    // 주기적 세션 체크 (30분마다)
    const intervalId = setInterval(() => {
      // console.log("주기적 세션 체크")
      refreshSession()
    }, 30 * 60 * 1000)

    return () => {
      subscription.unsubscribe()
      window.removeEventListener('focus', handleFocus)
      clearInterval(intervalId)
    }
  }, [])

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, refreshSession }}>
      {children}
    </AuthContext.Provider>
  )
}