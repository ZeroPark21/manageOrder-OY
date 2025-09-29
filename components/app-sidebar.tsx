"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { useEffect, useState } from "react"
import { getSupabaseBrowserClient } from "@/lib/database/supabase"
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
import {
  Package,
  Video,
  Upload,
  BarChart3,
  FileSearch,
  TrendingUp,
  ChevronDown,
  Building2,
  type LucideIcon
} from "lucide-react"
import { AuthSection } from "@/components/auth-section"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

// 메뉴 아이템 타입 정의
interface MenuItem {
  title: string
  url: string
  icon: LucideIcon
  description: string
  devOnly?: boolean
}


// 메뉴 데이터
const allMenuItems: MenuItem[] = [
  {
    title: "샘플 발송 현황",
    url: "",  // 동적으로 설정됨
    icon: Package,
    description: "TikTok 샘플 발송 데이터 분석",
  },
  {
    title: "SKU별 판매량",
    url: "/sales-analysis",
    icon: TrendingUp,
    description: "실제 매출이 발생한 주문 분석",
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

interface Company {
  id: number
  name: string
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const router = useRouter()
  const [companyId, setCompanyId] = useState<string>('')
  const [companyName, setCompanyName] = useState<string>('')
  const [userRole, setUserRole] = useState<string>('viewer')
  const [allCompanies, setAllCompanies] = useState<Company[]>([])
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false)

  // URL에서 companyId 추출 및 권한 정보 가져오기
  useEffect(() => {
    const match = pathname.match(/^\/(\d+)/)
    if (match) {
      const id = match[1]

      // companyId가 변경되었을 때만 업데이트
      if (id !== companyId) {
        setCompanyId(id)
        setCompanyName('') // 이전 회사명 초기화

        // 업체 이름과 사용자 권한 가져오기
        const getCompanyAndRole = async () => {
          const supabase = getSupabaseBrowserClient()

          // 현재 사용자 가져오기
          const { data: { user } } = await supabase.auth.getUser()

          if (user) {
            console.log('🔍 Current user:', user.email)

            // 회사 정보 가져오기 (먼저 companies 테이블에서 직접 조회)
            const { data: company } = await supabase
              .from('companies')
              .select('name')
              .eq('id', parseInt(id))
              .single()

            if (company) {
              setCompanyName((company as any).name)
            } else {
              // 회사를 찾을 수 없으면 기본값 설정
              setCompanyName(`Company ${id}`)
            }

            // 사용자의 모든 회사 권한 정보 가져오기
            const { data: userCompanies } = await supabase
              .from('user_companies')
              .select('company_id, role')
              .eq('user_id', user.id)

            console.log('👤 User companies:', userCompanies)

            // admin 권한 체크
            const hasAdminRole = userCompanies?.some(uc => uc.role === 'admin')
            console.log('🔑 Has admin role:', hasAdminRole)

            if (hasAdminRole) {
              setUserRole('admin')

              // admin인 경우 모든 회사 목록 가져오기
              setIsLoadingCompanies(true)
              const { data: allCompanyData, error: allCompanyError } = await supabase
                .from('companies')
                .select('id, name')
                .order('name')

              console.log('🏢 Admin fetching all companies:', {
                data: allCompanyData,
                error: allCompanyError,
                count: allCompanyData?.length || 0
              })

              if (allCompanyData && allCompanyData.length > 0) {
                setAllCompanies(allCompanyData as any)
                console.log('✅ All companies set:', allCompanyData)
                // 강제로 업데이트 트리거
                setTimeout(() => {
                  console.log('🔄 Companies after timeout:', allCompanyData)
                }, 100)
              } else if (allCompanyError) {
                console.error('❌ Error fetching all companies:', allCompanyError)
              } else {
                console.log('⚠️ No companies found or empty result')
              }
              setIsLoadingCompanies(false)
            } else {
              // 특정 회사에서의 권한 확인
              const userCompany = userCompanies?.find(uc => uc.company_id === parseInt(id))
              setUserRole((userCompany?.role || 'viewer') as string)
              console.log('👥 User role for company:', userCompany?.role || 'viewer')
            }
          }
        }

        getCompanyAndRole()
      }
    }
  }, [pathname, companyId])

  // 개발 환경 체크 (클라이언트 사이드에서 사용 가능한 환경 변수)
  const isDev = process.env.NEXT_PUBLIC_IS_DEV === 'true'

  // 개발 환경에 따라 메뉴 필터링 - 안전한 필터링
  const menuItems = React.useMemo(() => {
    if (!Array.isArray(allMenuItems)) return []
    return allMenuItems.filter(item => !item?.devOnly || isDev)
  }, [isDev])

  // 디버그 로그
  React.useEffect(() => {
    console.log('🎯 Sidebar State:', {
      companyId,
      companyName,
      userRole,
      allCompaniesCount: allCompanies.length,
      allCompanies,
      isLoadingCompanies,
      shouldShowDropdown: userRole === 'admin' && allCompanies.length > 0,
      dropdownCondition: `userRole === 'admin' (${userRole === 'admin'}) && allCompanies.length > 0 (${allCompanies.length > 0})`
    })
  }, [companyId, companyName, userRole, allCompanies, isLoadingCompanies])

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <div className="relative px-3 py-4 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 dark:from-blue-500/20 dark:to-purple-500/20" />
          <div className="relative flex flex-col gap-3">
            {/* Cosduck Agency 타이틀 */}
            <div className="flex items-center gap-2">
              <div className="flex aspect-square size-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-md flex-shrink-0">
                <Package className="size-4" />
              </div>
              <div className="flex flex-col">
                <h2 className="font-bold text-base leading-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Cosduck Agency
                </h2>
                <p className="text-[10px] text-muted-foreground leading-tight">
                  TTS Management Dashboard
                </p>
              </div>
            </div>

            {/* 회사 정보 */}
            {companyName && (
              <div className="pl-2 border-l-2 border-muted-foreground/20 flex-1">
                {userRole === 'admin' ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="w-full justify-between h-auto p-0 hover:bg-transparent"
                        disabled={isLoadingCompanies}
                      >
                        <div className="flex flex-col items-start">
                          <div className="text-sm font-medium text-foreground flex items-center gap-1">
                            {companyName}
                            <ChevronDown className="h-3 w-3" />
                          </div>
                          <div className="text-xs text-muted-foreground">
                            업체번호: {companyId} · 관리자
                          </div>
                        </div>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                      {allCompanies.length > 0 ? (
                        allCompanies.map(company => (
                          <DropdownMenuItem
                            key={company.id}
                            onClick={() => {
                              const currentPath = pathname.replace(/^\/\d+/, `/${company.id}`)
                              router.push(currentPath)
                            }}
                            className="flex items-center gap-2"
                          >
                            <Building2 className="h-3 w-3" />
                            <span className="flex-1">{company.name}</span>
                            {company.id.toString() === companyId && (
                              <span className="text-xs text-muted-foreground">현재</span>
                            )}
                          </DropdownMenuItem>
                        ))
                      ) : (
                        <DropdownMenuItem disabled>
                          <span className="text-muted-foreground">회사 목록을 불러오는 중...</span>
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      {companyName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      업체번호: {companyId}
                    </div>
                  </div>
                )}
              </div>
            )}
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
                const itemUrl = companyId ? `/${companyId}${item.url}` : item.url
                const isActive = pathname === itemUrl
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      className={`
                        group relative overflow-hidden transition-all duration-300
                        ${isActive ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50'}
                      `}
                    >
                      <Link href={itemUrl}>
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


        {/* 유틸리티 메뉴 - editor와 admin만 접근 가능 */}
        {(userRole === 'editor' || userRole === 'admin') && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">데이터 관리</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {utilityItems.map((item) => {
                  const itemUrl = companyId ? `/${companyId}${item.url}` : item.url
                  const isActive = pathname === itemUrl
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        className={`
                          group relative overflow-hidden transition-all duration-300
                          ${isActive ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50'}
                        `}
                      >
                        <Link href={itemUrl}>
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
        )}
      </SidebarContent>

      <AuthSection />
    </Sidebar>
  )
}
