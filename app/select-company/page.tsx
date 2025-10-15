"use client"

import { useEffect, useState } from "react"
import { getSupabaseBrowserClient } from "@/lib/database/supabase"
import { useRouter } from "next/navigation"
import { LoadingSpinner } from "@/components/loading-spinner"

interface Company {
  id: number
  name: string
}

export default function SelectCompanyPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const loadCompanies = async () => {
      const supabase = getSupabaseBrowserClient()

      // 쿠키에서 토큰 가져오기
      const cookies = document.cookie.split(";")
      let accessToken = ""
      let refreshToken = ""

      cookies.forEach((cookie) => {
        const trimmed = cookie.trim()
        if (trimmed.startsWith("sb-access-token=")) {
          accessToken = trimmed.substring("sb-access-token=".length)
        }
        if (trimmed.startsWith("sb-refresh-token=")) {
          refreshToken = trimmed.substring("sb-refresh-token=".length)
        }
      })

      if (accessToken && refreshToken) {
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })

        // 사용자의 업체 목록 조회
        const { data: { user } } = await supabase.auth.getUser()
        console.log("Current user:", user?.id, user?.email)

        const { data: userCompanies, error } = await supabase
          .from("user_companies")
          .select("company_id, companies(id, name)")
          .eq("user_id", user?.id || "")

        console.log("User companies data:", userCompanies)
        console.log("Query error:", error)

        if (userCompanies) {
          const companyList = userCompanies
            .map((uc: any) => uc.companies)
            .filter(Boolean)
          console.log("Company list:", companyList)
          setCompanies(companyList)

          // 업체가 1개면 자동 리다이렉트
          if (companyList.length === 1) {
            router.push(`/dashboard/${companyList[0].id}`)
          }
        }
      }
      setIsLoading(false)
    }

    loadCompanies()
  }, [router])

  if (isLoading) {
    return <LoadingSpinner message="업체 목록을 불러오는 중..." />
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#f3f4f6"
    }}>
      <div style={{
        width: "100%",
        maxWidth: "400px",
        padding: "32px",
        backgroundColor: "white",
        borderRadius: "8px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
      }}>
        <h1 style={{
          fontSize: "24px",
          fontWeight: "bold",
          marginBottom: "8px",
          color: "#111827"
        }}>
          업체 선택
        </h1>
        <p style={{
          fontSize: "14px",
          color: "#6b7280",
          marginBottom: "32px"
        }}>
          접속할 업체를 선택하세요
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {companies.map((company) => (
            <button
              key={company.id}
              onClick={() => {
                console.log(`Navigating to company ${company.id}`)
                router.push(`/dashboard/${company.id}`)
              }}
              style={{
                padding: "12px 16px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                backgroundColor: "white",
                cursor: "pointer",
                textAlign: "left",
                fontSize: "14px",
                transition: "all 0.2s"
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = "#f9fafb"
                e.currentTarget.style.borderColor = "#9ca3af"
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = "white"
                e.currentTarget.style.borderColor = "#d1d5db"
              }}
            >
              <div style={{ fontWeight: "500", color: "#111827" }}>
                {company.name}
              </div>
              <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
                업체 번호: {company.id}
              </div>
            </button>
          ))}
        </div>

        {companies.length === 0 && (
          <div style={{
            textAlign: "center",
            padding: "24px",
            color: "#6b7280",
            fontSize: "14px"
          }}>
            접근 가능한 업체가 없습니다.
            <br />
            관리자에게 문의하세요.
          </div>
        )}
      </div>
    </div>
  )
}