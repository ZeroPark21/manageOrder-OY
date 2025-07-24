"use client"

import type * as React from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { Package, Video, Upload, BarChart3 } from "lucide-react"

// 메뉴 데이터
const menuItems = [
  {
    title: "제품 발송 현황",
    url: "/",
    icon: Package,
    description: "TikTok 제품 발송 데이터 분석",
  },
  {
    title: "콘텐츠 발행 현황",
    url: "/content",
    icon: Video,
    description: "시딩 콘텐츠 발행 추이 분석",
  },
]

const utilityItems = [
  {
    title: "제품 데이터 업로드",
    url: "/upload",
    icon: Upload,
    description: "제품 발송 데이터 업로드",
  },
  {
    title: "콘텐츠 데이터 업로드",
    url: "/upload-content",
    icon: BarChart3,
    description: "콘텐츠 발행 데이터 업로드",
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-4 py-2">
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-blue-600 text-white">
            <Package className="size-4" />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">TTS 대시보드</span>
            <span className="truncate text-xs text-muted-foreground">분석 시스템</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {/* 메인 메뉴 */}
        <SidebarGroup>
          <SidebarGroupLabel>분석 대시보드</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <Link href={item.url}>
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* 유틸리티 메뉴 */}
        <SidebarGroup>
          <SidebarGroupLabel>데이터 관리</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {utilityItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <Link href={item.url}>
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
