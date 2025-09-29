"use client"

import { useState } from 'react'
import Link from 'next/link'

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false)

  return (
    <form
      action="/api/login"
      method="POST"
      onSubmit={() => setIsLoading(true)}
    >
      <div style={{ marginBottom: '20px' }}>
        <label style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: '500',
          marginBottom: '8px',
          color: '#374151'
        }}>
          이메일
        </label>
        <input
          name="email"
          type="email"
          required
          placeholder="your@email.com"
          style={{
            width: '100%',
            padding: '10px 12px',
            fontSize: '14px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            outline: 'none',
            boxSizing: 'border-box'
          }}
        />
      </div>

      <div style={{ marginBottom: '24px' }}>
        <label style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: '500',
          marginBottom: '8px',
          color: '#374151'
        }}>
          비밀번호
        </label>
        <input
          name="password"
          type="password"
          required
          placeholder="••••••••"
          style={{
            width: '100%',
            padding: '10px 12px',
            fontSize: '14px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            outline: 'none',
            boxSizing: 'border-box'
          }}
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        style={{
          width: '100%',
          padding: '10px',
          fontSize: '14px',
          fontWeight: '500',
          color: 'white',
          backgroundColor: isLoading ? '#9ca3af' : '#3b82f6',
          border: 'none',
          borderRadius: '6px',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}
      >
        {isLoading ? (
          <>
            <svg
              style={{ animation: 'spin 1s linear infinite' }}
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                opacity="0.25"
              />
              <path
                d="M12 2a10 10 0 0 1 0 20"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
              />
            </svg>
            로그인 중...
          </>
        ) : (
          '로그인'
        )}
      </button>

      <div style={{
        marginTop: '24px',
        textAlign: 'center',
        fontSize: '14px',
        color: '#6b7280'
      }}>
        계정이 없으신가요?{' '}
        <Link
          href="/signup"
          style={{
            color: '#3b82f6',
            textDecoration: 'none',
            fontWeight: '500'
          }}
        >
          회원가입
        </Link>
      </div>

      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </form>
  )
}