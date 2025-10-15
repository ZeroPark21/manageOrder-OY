"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/database/supabase"
import { Loader2 } from "lucide-react"

export default function RootPage() {
  const router = useRouter()

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      const supabase = getSupabaseBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        // 로그인 안되어 있으면 로그인 페이지로
        router.push('/login')
        return
      }

      // 로그인 되어 있으면 사용자의 첫 번째 회사 대시보드로
      const { data: userCompanies } = await supabase
        .from('user_companies')
        .select('company_id')
        .eq('user_id', user.id)
        .order('company_id', { ascending: true })
        .limit(1)

      if (userCompanies && userCompanies.length > 0) {
        const companyId = userCompanies[0].company_id
        router.push(`/dashboard/${companyId}`)
      } else {
        // 회사가 없으면 로그인 페이지로
        router.push('/login')
      }
    }

    checkAuthAndRedirect()
  }, [router])

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="mt-4 text-muted-foreground">로딩 중...</p>
      </div>
    </div>
  )
}
