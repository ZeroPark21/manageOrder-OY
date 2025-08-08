import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Cosudck Agency",
  description: "TTS Dashboard",
  generator: 'v0.dev',
  icons: {
    icon: [
      { url: '/icon.png', sizes: '500x500', type: 'image/png' },
      { url: '/icon.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon.png', sizes: '16x16', type: 'image/png' }
    ],
    apple: '/icon.png',
    shortcut: '/icon.png'
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
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset className="overflow-hidden">{children}</SidebarInset>
        </SidebarProvider>
      </body>
    </html>
  )
}
