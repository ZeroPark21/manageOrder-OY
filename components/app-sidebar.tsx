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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { 
  Package, 
  Video, 
  Upload, 
  BarChart3, 
  FileSearch, 
  TrendingUp, 
  ChevronRight,
  Users,
  PieChart,
  ShoppingCart 
} from "lucide-react"
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

// 개발 환경 체크
const isDev = process.env.NODE_ENV === 'development'

// 메뉴 데이터
const menuItems = [
  {
    title: "샘플 발송 현황",
    url: "/",
    icon: Package,
    description: "TikTok 샘플 발송 데이터 분석",
  },
  {
    title: "콘텐츠 발행 현황",
    url: "/content",
    icon: Video,
    description: "시딩 콘텐츠 발행 추이 분석",
  },
  {
    title: "콘텐츠 분석",
    url: "/content-analysis",
    icon: FileSearch,
    description: "콘텐츠 성과 분석",
  },
  ...(isDev ? [{
    title: "Affiliate 영상 판매 발생",
    url: "/product-sales",
    icon: ShoppingCart,
    description: "Affiliate 영상을 통한 제품 판매 데이터 분석",
  }] : []),
]


// GMV MAX 분석 하위 메뉴
const gmvMaxItems = [
  {
    title: "GMV MAX 분석",
    url: "/gmv-max",
    icon: TrendingUp,
    description: "GMV MAX 성과 분석",
    subItems: [
      {
        title: "전체 현황",
        url: "/gmv-max",
        icon: PieChart,
        description: "GMV MAX 전체 성과 대시보드",
      },
      {
        title: "크리에이터별 GMV 상세",
        url: "/gmv-max/creator-details",
        icon: Users,
        description: "크리에이터별 상세 GMV 분석",
      },
    ]
  }
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

        {/* GMV MAX 분석 메뉴 - 개발 환경에서만 표시 */}
        {isDev && (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {gmvMaxItems.map((item) => (
                  <Collapsible key={item.title} asChild defaultOpen={pathname.startsWith(item.url)}>
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton tooltip={item.title}>
                          <item.icon />
                          <span>{item.title}</span>
                          <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.subItems.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton asChild isActive={pathname === subItem.url}>
                                <Link href={subItem.url}>
                                  <subItem.icon />
                                  <span>{subItem.title}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

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
