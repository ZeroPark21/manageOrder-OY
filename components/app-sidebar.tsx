"use client"

import * as React from "react"
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
  ShoppingCart,
  type LucideIcon
} from "lucide-react"
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

// 메뉴 아이템 타입 정의
interface MenuItem {
  title: string
  url: string
  icon: LucideIcon
  description: string
  devOnly?: boolean
}

interface SubMenuItem {
  title: string
  url: string
  icon: LucideIcon
  description: string
}

interface GmvMenuItem {
  title: string
  url: string
  icon: LucideIcon
  description: string
  subItems: SubMenuItem[]
}

// 메뉴 데이터
const allMenuItems: MenuItem[] = [
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
  {
    title: "Affiliate 영상 판매 발생",
    url: "/product-sales",
    icon: ShoppingCart,
    description: "Affiliate 영상을 통한 제품 판매 데이터 분석",
    devOnly: true,
  },
]


// GMV MAX 분석 하위 메뉴
const gmvMaxItems: GmvMenuItem[] = [
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

const utilityItems: MenuItem[] = [
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
  
  // 개발 환경 체크 (클라이언트 사이드에서 사용 가능한 환경 변수)
  const isDev = process.env.NEXT_PUBLIC_IS_DEV === 'true'
  
  // 개발 환경에 따라 메뉴 필터링 - 안전한 필터링
  const menuItems = React.useMemo(() => {
    if (!Array.isArray(allMenuItems)) return []
    return allMenuItems.filter(item => !item?.devOnly || isDev)
  }, [isDev])

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <div className="relative px-4 py-6 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 dark:from-blue-500/20 dark:to-purple-500/20" />
          <div className="relative flex items-center gap-3">
            <div className="flex aspect-square size-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg">
              <Package className="size-5" />
            </div>
            <div className="flex-1">
              <h2 className="font-bold text-lg gradient-text">Cosduck Agency</h2>
              <p className="text-xs text-muted-foreground">OliveYoung Data</p>
            </div>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {/* 메인 메뉴 */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">분석 대시보드</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = pathname === item.url
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      className={`
                        group relative overflow-hidden transition-all duration-300
                        ${isActive ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50'}
                      `}
                    >
                      <Link href={item.url}>
                        <div className={`
                          p-2 rounded-lg transition-all duration-300
                          ${isActive ? 'bg-primary/20' : 'bg-muted/30 group-hover:bg-muted/50'}
                        `}>
                          <item.icon className={`size-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                        </div>
                        <span className="font-medium">{item.title}</span>
                        {isActive && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full" />
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
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
                          <item.icon className="size-4" />
                          <span>{item.title}</span>
                          <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.subItems && item.subItems.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton asChild isActive={pathname === subItem.url}>
                                <Link href={subItem.url}>
                                  <subItem.icon className="size-4" />
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
          <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">데이터 관리</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {utilityItems.map((item) => {
                const isActive = pathname === item.url
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      className={`
                        group relative overflow-hidden transition-all duration-300
                        ${isActive ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50'}
                      `}
                    >
                      <Link href={item.url}>
                        <div className={`
                          p-2 rounded-lg transition-all duration-300
                          ${isActive ? 'bg-primary/20' : 'bg-muted/30 group-hover:bg-muted/50'}
                        `}>
                          <item.icon className={`size-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                        </div>
                        <span className="font-medium">{item.title}</span>
                        {isActive && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full" />
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
