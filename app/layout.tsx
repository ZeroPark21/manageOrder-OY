import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AuthProvider } from "@/components/auth-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "제품 발송 현황",
  description: "TikTok 제품 발송 및 콘텐츠 발행 현황 대시보드",
  generator: 'v0.dev',
  icons: {
    icon: '/icon.png',
    shortcut: '/icon.png',
    apple: '/icon.png',
  }
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
            <AppSidebar />
            <SidebarInset className="border-0 outline-0 overflow-x-hidden">{children}</SidebarInset>
          </SidebarProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
