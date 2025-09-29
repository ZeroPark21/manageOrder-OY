"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/database/supabase";
import { PasswordChangeDialog } from "./password-change-dialog";

export function AuthSection() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 쿠키 확인 및 사용자 정보 가져오기
    const checkAuth = async () => {
      const cookies = document.cookie.split(";");
      const hasAccessToken = cookies.some((cookie) =>
        cookie.trim().startsWith("sb-access-token=")
      );
      const hasRefreshToken = cookies.some((cookie) =>
        cookie.trim().startsWith("sb-refresh-token=")
      );

      if (hasAccessToken || hasRefreshToken) {
        setIsLoggedIn(true);

        // 쿠키에서 토큰 추출
        let accessToken = "";
        let refreshToken = "";

        cookies.forEach((cookie) => {
          const trimmed = cookie.trim();
          if (trimmed.startsWith("sb-access-token=")) {
            accessToken = trimmed.substring("sb-access-token=".length);
          }
          if (trimmed.startsWith("sb-refresh-token=")) {
            refreshToken = trimmed.substring("sb-refresh-token=".length);
          }
        });

        // Supabase로 사용자 정보 가져오기
        try {
          const supabase = getSupabaseBrowserClient();

          // 세션 설정
          if (accessToken && refreshToken) {
            const {
              data: { user },
              error,
            } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            console.log("User from setSession:", user);
            if (user) {
              setEmail(user.email || null);
            }
          }
        } catch (error) {
          console.error("Error getting user:", error);
        }
      } else {
        setIsLoggedIn(false);
      }
      setIsLoading(false);
    };

    checkAuth();
    // 페이지 포커스 시 재확인
    window.addEventListener("focus", checkAuth);
    return () => window.removeEventListener("focus", checkAuth);
  }, []);

  if (isLoading) {
    return (
      <div
        style={{
          padding: "12px",
          borderTop: "1px solid #e5e7eb",
          textAlign: "center",
        }}
      >
        <span style={{ fontSize: "13px", color: "#9ca3af" }}>...</span>
      </div>
    );
  }

  // 로그인된 경우
  if (isLoggedIn) {
    return (
      <div
        style={{
          padding: "12px",
          borderTop: "1px solid #e5e7eb",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "8px",
          }}
        >
          <span
            style={{
              fontSize: "13px",
              color: "#6b7280",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flex: 1,
            }}
          >
            {email || "로그인됨"}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <PasswordChangeDialog />
            <form action="/api/logout" method="POST">
              <button
                type="submit"
                style={{
                  padding: "4px",
                  backgroundColor: "transparent",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                }}
                title="로그아웃"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#6b7280"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // 로그아웃된 경우
  return null;
}
