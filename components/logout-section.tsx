"use client"

import { useState, useEffect } from "react"
import { getSupabaseBrowserClient } from "@/lib/database/supabase"
import Link from "next/link"

export function LogoutSection() {
  const [email, setEmail] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const getUser = async () => {
      const supabase = getSupabaseBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setEmail(user.email || null)
      }
      setIsLoading(false)
    }
    getUser()
  }, [])

  if (isLoading) {
    return (
      <div style={{
        padding: '12px',
        borderTop: '1px solid #e5e7eb',
        textAlign: 'center'
      }}>
        <span style={{ fontSize: '13px', color: '#9ca3af' }}>...</span>
      </div>
    )
  }

  // 로그인된 경우
  if (email) {
    return (
      <div style={{
        padding: '12px',
        borderTop: '1px solid #e5e7eb'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px'
        }}>
          <span style={{
            fontSize: '13px',
            color: '#6b7280',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {email}
          </span>
          <form action="/api/logout" method="POST">
            <button
              type="submit"
              style={{
                padding: '4px 12px',
                backgroundColor: 'transparent',
                color: '#6b7280',
                border: '1px solid #e5e7eb',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              로그아웃
            </button>
          </form>
        </div>
      </div>
    )
  }

  // 로그아웃된 경우
  return (
    <div style={{
      padding: '12px',
      borderTop: '1px solid #e5e7eb'
    }}>
      <Link href="/login" style={{
        display: 'block',
        width: '100%',
        padding: '6px',
        backgroundColor: 'transparent',
        color: '#6b7280',
        textAlign: 'center',
        border: '1px solid #e5e7eb',
        borderRadius: '4px',
        fontSize: '13px',
        textDecoration: 'none'
      }}>
        로그인
      </Link>
    </div>
  )
}