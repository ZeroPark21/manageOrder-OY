"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/database/supabase";
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
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  Package,
  Video,
  Upload,
  BarChart3,
  FileSearch,
  TrendingUp,
  ChevronDown,
  Building2,
  Home,
  ShoppingCart,
  DollarSign,
  Package2,
  Receipt,
  Target,
  Settings,
  Database,
  Sliders,
  Send,
  type LucideIcon,
} from "lucide-react";
import { AuthSection } from "@/components/auth-section";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// 메뉴 아이템 타입 정의
interface MenuItem {
  title: string;
  url?: string;
  icon?: LucideIcon;
  description?: string;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
}

interface MenuSection {
  id: string;
  title: string;
  icon: LucideIcon;
  badge?: string;
  items: MenuItem[];
  roleRequired?: string[];
}

// 아이콘 매핑
const iconMap: Record<string, LucideIcon> = {
  Home,
  Package,
  ShoppingCart,
  TrendingUp,
  Send,
  Video,
  BarChart3,
  Upload,
  DollarSign,
  Package2,
  Receipt,
  Target,
  Settings,
  Database,
  Sliders,
  FileSearch,
};

interface Company {
  id: number;
  name: string;
  channel_settings?: {
    tiktok?: {
      sync_type: string;
      api_connected: boolean;
      last_sync: string | null;
      auto_sync: boolean;
    };
    amazon?: {
      sync_type: string;
      last_upload: string | null;
      file_name: string | null;
    };
  };
}

export function AppSidebarNew({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const router = useRouter();
  const [companyId, setCompanyId] = useState<string>("");
  const [companyName, setCompanyName] = useState<string>("");
  const [userRole, setUserRole] = useState<string>("viewer");
  const [allCompanies, setAllCompanies] = useState<Company[]>([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);
  const [channelSettings, setChannelSettings] =
    useState<Company["channel_settings"]>(undefined);

  // 메뉴 섹션 정의
  const menuSections: MenuSection[] = [
    {
      id: "dashboard",
      title: "대시보드",
      icon: Home,
      items: [
        {
          title: "통합 대시보드",
          url: "/dashboard",
          icon: BarChart3,
          description: "TikTok & Amazon 통합 분석",
        },
      ],
    },
    {
      id: "tiktok",
      title: "TikTok Shop",
      icon: Package,
      badge: "수동",
      items: [
        {
          title: "SKU별 판매 분석",
          url: "/dashboard/tiktok/sales",
          icon: BarChart3,
          description: "SKU별 판매량, 판매액, 재고",
        },
        {
          title: "샘플 발송 현황",
          url: "/dashboard/tiktok/samples",
          icon: Send,
          description: "샘플 발송 추적 관리",
        },
        {
          title: "콘텐츠 발행 현황",
          url: "/dashboard/tiktok/content",
          icon: Video,
          description: "주간/월간 콘텐츠 발행",
        },
        {
          title: "콘텐츠 성과 분석",
          url: "/dashboard/tiktok/content-analysis",
          icon: TrendingUp,
          description: "콘텐츠 성과 지표",
        },
      ],
    },
    {
      id: "amazon",
      title: "Amazon",
      icon: ShoppingCart,
      badge: "수동",
      items: [
        {
          title: "전체 판매 성과 분석",
          url: "/dashboard/amazon/overview",
          icon: BarChart3,
          description: "총 판매액, 주문 수, 배송 건수",
        },
        // {
        //   title: "ASIN별 판매 성과",
        //   url: "/dashboard/amazon/products",
        //   icon: Package2,
        //   description: "ASIN별 판매량, 판매액",
        //   badge: "예정",
        //   badgeVariant: "outline",
        // },
      ],
    },
  ];

  // Editor/Admin 전용 메뉴
  const dataManagementSection: MenuSection = {
    id: "data",
    title: "데이터 관리",
    icon: Database,
    items: [
      {
        title: "TikTok 데이터 업로드",
        url: "/dashboard/tiktok/data-upload",
        icon: Upload,
        description: "판매/콘텐츠 데이터",
        badge: "CSV",
        badgeVariant: "outline",
      },
      {
        title: "Amazon 데이터 업로드",
        url: "/dashboard/amazon/data-upload",
        icon: ShoppingCart,
        description: "주문/광고/트래픽/반품",
        badge: "CSV",
        badgeVariant: "outline",
      },
      // {
      //   title: "Amazon API 설정",
      //   url: "/dashboard/amazon/settings",
      //   icon: Settings,
      //   badge: "Auto",
      //   badgeVariant: "secondary",
      // },
    ],
    roleRequired: ["editor", "admin"],
  };

  // URL에서 companyId 추출 및 권한 정보 가져오기
  useEffect(() => {
    const match = pathname.match(/^\/dashboard\/(\d+)/);
    if (match) {
      const id = match[1];
      if (id !== companyId) {
        setCompanyId(id);
        setCompanyName("");

        const getCompanyAndRole = async () => {
          const supabase = getSupabaseBrowserClient();
          const {
            data: { user },
          } = await supabase.auth.getUser();

          if (user) {
            // 회사 정보 가져오기
            const { data: company } = await supabase
              .from("companies")
              .select("name, channel_settings")
              .eq("id", parseInt(id))
              .single();

            if (company) {
              setCompanyName((company as any).name);
              setChannelSettings((company as any).channel_settings);
            }

            // 사용자 권한 가져오기
            const { data: userCompanies } = await supabase
              .from("user_companies")
              .select("company_id, role")
              .eq("user_id", user.id);

            const hasAdminRole = userCompanies?.some(
              (uc) => uc.role === "admin"
            );

            if (hasAdminRole) {
              setUserRole("admin");
              // Admin인 경우 모든 회사 목록 가져오기
              setIsLoadingCompanies(true);
              const { data: allCompanyData } = await supabase
                .from("companies")
                .select("id, name")
                .order("name");

              if (allCompanyData) {
                setAllCompanies(allCompanyData as any);
              }
              setIsLoadingCompanies(false);
            } else {
              const userCompany = userCompanies?.find(
                (uc) => uc.company_id === parseInt(id)
              );
              setUserRole((userCompany?.role || "viewer") as string);
            }
          }
        };

        getCompanyAndRole();
      }
    }
  }, [pathname, companyId]);

  // 역할에 따른 메뉴 필터링
  const getVisibleSections = () => {
    const sections = [...menuSections];

    if (userRole === "editor" || userRole === "admin") {
      sections.push(dataManagementSection);
    }

    return sections;
  };

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
                  Multi-Channel Dashboard
                </p>
              </div>
            </div>

            {/* 회사 정보 */}
            {companyName && (
              <div className="pl-2 border-l-2 border-muted-foreground/20 flex-1">
                {userRole === "admin" ? (
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
                      {allCompanies.map((company) => (
                        <DropdownMenuItem
                          key={company.id}
                          onClick={() => {
                            const currentPath = pathname.replace(
                              /^\/dashboard\/\d+/,
                              `/dashboard/${company.id}`
                            );
                            router.push(currentPath);
                          }}
                          className="flex items-center gap-2"
                        >
                          <Building2 className="h-3 w-3" />
                          <span className="flex-1">{company.name}</span>
                          {company.id.toString() === companyId && (
                            <span className="text-xs text-muted-foreground">
                              현재
                            </span>
                          )}
                        </DropdownMenuItem>
                      ))}
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
        {getVisibleSections().map((section) => {
          const SectionIcon = section.icon;

          // 모든 섹션을 항상 펼쳐진 상태로 표시
          return (
            <SidebarGroup key={section.id}>
              <SidebarGroupLabel className="text-xs font-semibold">
                <div className="flex items-center gap-2">
                  <SectionIcon className="h-4 w-4" />
                  {section.title}
                  {section.badge && (
                    <Badge
                      variant="secondary"
                      className="h-4 text-[10px] px-1.5"
                    >
                      {section.badge}
                    </Badge>
                  )}
                </div>
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {section.items.map((item) => {
                    // /dashboard/123/... 형태로 URL 생성
                    const itemUrl =
                      companyId && item.url
                        ? item.url.replace(
                            "/dashboard",
                            `/dashboard/${companyId}`
                          )
                        : "#";
                    const isActive = pathname === itemUrl;
                    const ItemIcon = item.icon;

                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          className={cn(
                            "group relative overflow-hidden transition-all duration-300 pl-4",
                            isActive && "bg-primary/10 text-primary"
                          )}
                        >
                          <Link href={itemUrl}>
                            {ItemIcon && (
                              <ItemIcon className="h-3.5 w-3.5 mr-2" />
                            )}
                            <span className="flex-1 text-sm">{item.title}</span>
                            {item.badge ? (
                              <Badge
                                variant={item.badgeVariant || "outline"}
                                className="h-4 text-[10px] px-1.5"
                              >
                                {item.badge}
                              </Badge>
                            ) : null}
                            {isActive ? (
                              <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary" />
                            ) : null}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <AuthSection />
    </Sidebar>
  );
}
