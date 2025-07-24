"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Upload, BarChart3, TrendingUp, Video, Calendar } from "lucide-react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import Link from "next/link"

interface ContentData {
  data: Array<{
    date?: string
    week?: string
    month?: string
    content?: string
    totalCount: number
    contents: any[]
  }>
  totalContents: number
  totalCount: number
  uniqueCreators: number
}

export default function ContentDashboard() {
  const [summaryData, setSummaryData] = useState<ContentData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchSummaryData = async () => {
    setLoading(true)
    try {
      // TODO: 콘텐츠 API 엔드포인트 구현 후 연결
      // const response = await fetch(`/api/contents?groupBy=daily`)
      // const data = await response.json()
      // setSummaryData(data)

      // 임시 데이터
      setSummaryData({
        data: [],
        totalContents: 0,
        totalCount: 0,
        uniqueCreators: 0,
      })

      console.log("📊 Content data loaded")
    } catch (error: any) {
      console.error("콘텐츠 데이터 로딩 실패:", error.message ?? error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSummaryData()
  }, [])

  if (loading) {
    return (
      <div className="flex h-16 shrink-0 items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <div className="flex items-center justify-center flex-1 h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p>콘텐츠 데이터를 불러오는 중...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* 헤더 */}
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink href="/">TTS 대시보드</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>콘텐츠 발행 현황</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      {/* 메인 콘텐츠 */}
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="space-y-8">
          {/* 페이지 헤더 */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">콘텐츠 발행 현황</h1>
              <p className="text-muted-foreground">TikTok 시딩 콘텐츠 발행 추이 분석 (2025년 7월 1일부터)</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={fetchSummaryData}>
                <BarChart3 className="h-4 w-4 mr-2" />
                새로고침
              </Button>
              <Link href="/upload-content">
                <Button>
                  <Upload className="h-4 w-4 mr-2" />
                  콘텐츠 데이터 업로드
                </Button>
              </Link>
            </div>
          </div>

          {/* 요약 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">총 콘텐츠 수</CardTitle>
                <Video className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summaryData?.totalContents?.toLocaleString() || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">7월 1일부터 누적</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">총 발행 수</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summaryData?.totalCount?.toLocaleString() || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">전체 콘텐츠 발행량</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">크리에이터 수</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summaryData?.uniqueCreators || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">참여 크리에이터</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">분석 기간</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summaryData?.data.length || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">일별 데이터 포인트</p>
              </CardContent>
            </Card>
          </div>

          {/* 콘텐츠 매트릭스 테이블 탭 */}
          <Tabs defaultValue="daily" className="space-y-4">
            <TabsList>
              <TabsTrigger value="daily">일별 매트릭스</TabsTrigger>
              <TabsTrigger value="weekly">주별 매트릭스</TabsTrigger>
              <TabsTrigger value="monthly">월별 매트릭스</TabsTrigger>
            </TabsList>

            <TabsContent value="daily" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>일별 콘텐츠 발행현황</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">콘텐츠 데이터가 없습니다</p>
                    <p className="text-sm">콘텐츠 발행 데이터를 업로드하여 분석을 시작하세요.</p>
                    <Link href="/upload-content">
                      <Button className="mt-4">
                        <Upload className="h-4 w-4 mr-2" />
                        콘텐츠 데이터 업로드
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="weekly" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>주별 콘텐츠 발행현황</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">콘텐츠 데이터가 없습니다</p>
                    <p className="text-sm">콘텐츠 발행 데이터를 업로드하여 분석을 시작하세요.</p>
                    <Link href="/upload-content">
                      <Button className="mt-4">
                        <Upload className="h-4 w-4 mr-2" />
                        콘텐츠 데이터 업로드
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="monthly" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>월별 콘텐츠 발행현황</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">콘텐츠 데이터가 없습니다</p>
                    <p className="text-sm">콘텐츠 발행 데이터를 업로드하여 분석을 시작하세요.</p>
                    <Link href="/upload-content">
                      <Button className="mt-4">
                        <Upload className="h-4 w-4 mr-2" />
                        콘텐츠 데이터 업로드
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  )
}
