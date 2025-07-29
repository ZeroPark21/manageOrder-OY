"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Upload, BarChart3, TrendingUp, Eye, DollarSign, Users, Heart } from "lucide-react"
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
import { ContentDailyMatrixTable } from "@/components/content-daily-matrix-table"
import { ContentWeeklyMatrixTable } from "@/components/content-weekly-matrix-table"
import { ContentMonthlyMatrixTable } from "@/components/content-monthly-matrix-table"
import Link from "next/link"
import { downloadMultiSheetExcel, type MultiSheetExcelData, formatDateForExcel } from "@/lib/excel-utils"

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
  totalShoppableImpressions?: number
  totalLikeCount?: number
}

export default function ContentDashboard() {
  const [summaryData, setSummaryData] = useState<ContentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [totalGmv, setTotalGmv] = useState(0)
  const [downloadLoading, setDownloadLoading] = useState(false)

  const fetchSummaryData = async () => {
    setLoading(true)
    try {
      // 현재 월 데이터 가져오기 (테이블 표시용)
      const response = await fetch(`/api/contents?groupBy=daily`)
      const data = await response.json()
      
      // 전체 기간 통계 가져오기 (요약 카드용)
      const totalResponse = await fetch(`/api/contents?groupBy=daily&startDate=2025-06-01`)
      const totalData = await totalResponse.json()
      
      setSummaryData({
        ...data,
        totalContents: totalData.totalContents,
        totalCount: totalData.totalCount,
        uniqueCreators: totalData.uniqueCreators,
        totalShoppableImpressions: totalData.totalShoppableImpressions,
        totalLikeCount: totalData.totalLikeCount,
      })

      console.log("📊 Content data loaded:", {
        totalContents: totalData.totalContents,
        totalCount: totalData.totalCount,
        uniqueCreators: totalData.uniqueCreators,
        totalShoppableImpressions: totalData.totalShoppableImpressions,
        totalLikeCount: totalData.totalLikeCount,
        dataPoints: data.data?.length,
      })
      
      // GMV 데이터 가져오기
      try {
        const gmvResponse = await fetch('/api/gmv-total')
        if (gmvResponse.ok) {
          const gmvData = await gmvResponse.json()
          setTotalGmv(gmvData.contentTotalGmv || 0)
        }
      } catch (gmvError) {
        console.error('GMV 데이터 로딩 오류:', gmvError)
      }
    } catch (error: any) {
      console.error("콘텐츠 데이터 로딩 실패:", error.message ?? error)
    } finally {
      setLoading(false)
    }
  }

  const handleAllMatrixDownload = async () => {
    setDownloadLoading(true)
    try {
      console.log("📥 Fetching content matrix data...")
      const response = await fetch("/api/content-all-matrix")

      if (!response.ok) {
        throw new Error(`API 요청 실패: ${response.status}`)
      }

      const data = await response.json()
      console.log("📊 Content matrix data loaded successfully")

      if (!data.daily || !data.weekly || !data.monthly) {
        console.error("❌ Missing matrix data:", {
          hasDaily: !!data.daily,
          hasWeekly: !!data.weekly,
          hasMonthly: !!data.monthly,
        })
        throw new Error("매트릭스 데이터를 가져올 수 없습니다.")
      }

      const sheets = []

      // 일별 시트 생성
      if (data.daily.dates && data.daily.dates.length > 0) {
        const dailyHeaders = [
          "날짜",
          "콘텐츠",
          "GMV",
          "Items Sold",
          "Orders",
          "Impressions",
          "댓글",
          "좋아요"
        ]

        const dailyRows = data.daily.dates.map((date: string) => {
          const stats = data.daily.dailyStats[date]
          return [
            formatDateForExcel(date),
            stats.totalCount,
            stats.totalGmv,
            stats.totalAffiliateItemsSold,
            stats.totalAffiliateOrders,
            stats.totalShoppableImpressions,
            stats.totalCommentCount,
            stats.totalLikeCount
          ]
        })

        // 일별 총계 행
        dailyRows.push([
          "Total",
          data.daily.dates.reduce((sum: number, date: string) => sum + data.daily.dailyStats[date].totalCount, 0),
          data.daily.dates.reduce((sum: number, date: string) => sum + data.daily.dailyStats[date].totalGmv, 0),
          data.daily.dates.reduce((sum: number, date: string) => sum + data.daily.dailyStats[date].totalAffiliateItemsSold, 0),
          data.daily.dates.reduce((sum: number, date: string) => sum + data.daily.dailyStats[date].totalAffiliateOrders, 0),
          data.daily.dates.reduce((sum: number, date: string) => sum + data.daily.dailyStats[date].totalShoppableImpressions, 0),
          data.daily.dates.reduce((sum: number, date: string) => sum + data.daily.dailyStats[date].totalCommentCount, 0),
          data.daily.dates.reduce((sum: number, date: string) => sum + data.daily.dailyStats[date].totalLikeCount, 0)
        ])

        sheets.push({
          name: "일별 콘텐츠 발행현황",
          headers: dailyHeaders,
          rows: dailyRows,
        })
      }

      // 주별 시트 생성
      if (data.weekly.weeks && data.weekly.weeks.length > 0) {
        const weeklyHeaders = [
          "주차",
          "콘텐츠",
          "GMV",
          "Items Sold",
          "Orders",
          "Impressions",
          "댓글",
          "좋아요"
        ]

        const weeklyRows = data.weekly.weeks.map((week: string) => {
          const stats = data.weekly.weeklyStats[week]
          return [
            formatDateForExcel(week),
            stats.totalCount,
            stats.totalGmv,
            stats.totalAffiliateItemsSold,
            stats.totalAffiliateOrders,
            stats.totalShoppableImpressions,
            stats.totalCommentCount,
            stats.totalLikeCount
          ]
        })

        // 주별 총계 행
        weeklyRows.push([
          "Total",
          data.weekly.weeks.reduce((sum: number, week: string) => sum + data.weekly.weeklyStats[week].totalCount, 0),
          data.weekly.weeks.reduce((sum: number, week: string) => sum + data.weekly.weeklyStats[week].totalGmv, 0),
          data.weekly.weeks.reduce((sum: number, week: string) => sum + data.weekly.weeklyStats[week].totalAffiliateItemsSold, 0),
          data.weekly.weeks.reduce((sum: number, week: string) => sum + data.weekly.weeklyStats[week].totalAffiliateOrders, 0),
          data.weekly.weeks.reduce((sum: number, week: string) => sum + data.weekly.weeklyStats[week].totalShoppableImpressions, 0),
          data.weekly.weeks.reduce((sum: number, week: string) => sum + data.weekly.weeklyStats[week].totalCommentCount, 0),
          data.weekly.weeks.reduce((sum: number, week: string) => sum + data.weekly.weeklyStats[week].totalLikeCount, 0)
        ])

        sheets.push({
          name: "주별 콘텐츠 발행현황",
          headers: weeklyHeaders,
          rows: weeklyRows,
        })
      }

      // 월별 시트 생성
      if (data.monthly.months && data.monthly.months.length > 0) {
        const monthlyHeaders = [
          "월",
          "콘텐츠",
          "GMV",
          "Items Sold",
          "Orders",
          "Impressions",
          "댓글",
          "좋아요"
        ]

        const monthlyRows = data.monthly.months.map((month: string) => {
          const stats = data.monthly.monthlyStats[month]
          return [
            month,
            stats.totalCount,
            stats.totalGmv,
            stats.totalAffiliateItemsSold,
            stats.totalAffiliateOrders,
            stats.totalShoppableImpressions,
            stats.totalCommentCount,
            stats.totalLikeCount
          ]
        })

        // 월별 총계 행
        monthlyRows.push([
          "Total",
          data.monthly.months.reduce((sum: number, month: string) => sum + data.monthly.monthlyStats[month].totalCount, 0),
          data.monthly.months.reduce((sum: number, month: string) => sum + data.monthly.monthlyStats[month].totalGmv, 0),
          data.monthly.months.reduce((sum: number, month: string) => sum + data.monthly.monthlyStats[month].totalAffiliateItemsSold, 0),
          data.monthly.months.reduce((sum: number, month: string) => sum + data.monthly.monthlyStats[month].totalAffiliateOrders, 0),
          data.monthly.months.reduce((sum: number, month: string) => sum + data.monthly.monthlyStats[month].totalShoppableImpressions, 0),
          data.monthly.months.reduce((sum: number, month: string) => sum + data.monthly.monthlyStats[month].totalCommentCount, 0),
          data.monthly.months.reduce((sum: number, month: string) => sum + data.monthly.monthlyStats[month].totalLikeCount, 0)
        ])

        sheets.push({
          name: "월별 콘텐츠 발행현황",
          headers: monthlyHeaders,
          rows: monthlyRows,
        })
      }

      console.log("📄 Preparing to download Excel with", sheets.length, "sheets")

      downloadMultiSheetExcel({
        sheets: sheets,
        filename: `콘텐츠_발행현황_${new Date().toISOString().split("T")[0]}`,
      })
    } catch (error) {
      console.error("❌ Excel download error:", error)
      alert("엑셀 다운로드 중 오류가 발생했습니다.")
    } finally {
      setDownloadLoading(false)
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
              <p className="text-muted-foreground">TikTok 시딩 콘텐츠 발행 추이 분석 (2025년 6월 1일부터)</p>
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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">총 발행 수</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summaryData?.totalCount?.toLocaleString() || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">6월 1일부터 누적</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total GMV</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₩{totalGmv.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">6월 1일부터 총 GMV</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">크리에이터 수</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summaryData?.uniqueCreators || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">참여 크리에이터</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">총 노출 수</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summaryData?.totalShoppableImpressions?.toLocaleString() || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">6월 1일부터 누적</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">총 좋아요 수</CardTitle>
                <Heart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summaryData?.totalLikeCount?.toLocaleString() || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">6월 1일부터 누적</p>
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
              <ContentDailyMatrixTable onExcelDownload={handleAllMatrixDownload} downloadLoading={downloadLoading} />
            </TabsContent>

            <TabsContent value="weekly" className="space-y-4">
              <ContentWeeklyMatrixTable onExcelDownload={handleAllMatrixDownload} downloadLoading={downloadLoading} />
            </TabsContent>

            <TabsContent value="monthly" className="space-y-4">
              <ContentMonthlyMatrixTable onExcelDownload={handleAllMatrixDownload} downloadLoading={downloadLoading} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  )
}
