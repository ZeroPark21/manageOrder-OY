"use client"

import { useState } from "react"
import { getSupabaseBrowserClient } from "@/lib/database/supabase"

export function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const supabase = getSupabaseBrowserClient()

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      if (data.user) {
        window.location.href = "/"
      }
    } catch (err) {
      setError("로그인 중 오류가 발생했습니다.")
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleLogin}>
      <div style={{ marginBottom: "16px" }}>
        <label
          style={{
            display: "block",
            marginBottom: "8px",
            fontSize: "14px",
            fontWeight: "500",
          }}
        >
          이메일
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
          style={{
            width: "100%",
            padding: "8px 12px",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            fontSize: "14px",
          }}
        />
      </div>

      <div style={{ marginBottom: "16px" }}>
        <label
          style={{
            display: "block",
            marginBottom: "8px",
            fontSize: "14px",
            fontWeight: "500",
          }}
        >
          비밀번호
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={loading}
          style={{
            width: "100%",
            padding: "8px 12px",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            fontSize: "14px",
          }}
        />
      </div>

      {error && (
        <div
          style={{
            padding: "12px",
            backgroundColor: "#fee2e2",
            border: "1px solid #fecaca",
            borderRadius: "6px",
            marginBottom: "16px",
            color: "#dc2626",
            fontSize: "14px",
          }}
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        style={{
          width: "100%",
          padding: "10px",
          backgroundColor: loading ? "#9ca3af" : "#3b82f6",
          color: "white",
          borderRadius: "6px",
          border: "none",
          fontSize: "14px",
          fontWeight: "500",
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "로그인 중..." : "로그인"}
      </button>
    </form>
  )
}