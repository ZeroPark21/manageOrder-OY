import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AppSidebarNew } from "@/components/app-sidebar-new"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AuthProvider } from "@/components/auth-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Cosduck Agency Dashboard",
  description: "TikTok Shop & Amazon 통합 판매 분석 대시보드",
  generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <AuthProvider>
          <SidebarProvider>
            <AppSidebarNew />
            <SidebarInset className="border-0 outline-0 overflow-x-hidden">{children}</SidebarInset>
          </SidebarProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
