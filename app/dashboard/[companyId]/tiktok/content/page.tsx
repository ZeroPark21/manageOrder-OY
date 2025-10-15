"use client"

import { use } from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LoadingSpinner } from "@/components/loading-spinner"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TrendingUp, Eye, DollarSign, Users, Heart } from "lucide-react"
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
import { ContentDailyMatrixTable } from "@/components/matrix/content-daily-matrix-table"
import { ContentWeeklyMatrixTable } from "@/components/matrix/content-weekly-matrix-table"
import { ContentMonthlyMatrixTable } from "@/components/matrix/content-monthly-matrix-table"
import { downloadMultiSheetExcel, formatDateForExcel } from "@/lib/excel-utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

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

export default function ContentDashboard({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = use(params)
  const [summaryData, setSummaryData] = useState<ContentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [totalGmv, setTotalGmv] = useState(0)
  const [downloadLoading, setDownloadLoading] = useState(false)
  const [viewMode, setViewMode] = useState<"daily" | "weekly" | "monthly">("daily")
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState<string>("all")
  const [availableYears, setAvailableYears] = useState<number[]>([])
  const [availableMonths, setAvailableMonths] = useState<{ [year: number]: number[] }>({})

  const fetchAvailableDates = async () => {
    try {
      const response = await fetch(`/api/content/content-all-matrix?companyId=${companyId}`, {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      })

      if (!response.ok) return

      const data = await response.json()

      if (data.daily?.dates && data.daily.dates.length > 0) {
        const yearsMap: { [year: number]: Set<number> } = {}

        data.daily.dates.forEach((dateStr: string) => {
          const date = new Date(dateStr)
          const year = date.getFullYear()
          const month = date.getMonth() + 1

          if (!yearsMap[year]) yearsMap[year] = new Set()
          yearsMap[year].add(month)
        })

        const years = Object.keys(yearsMap).map(Number).sort((a, b) => b - a)
        const months: { [year: number]: number[] } = {}

        years.forEach(year => {
          months[year] = Array.from(yearsMap[year]).sort((a, b) => a - b)
        })

        setAvailableYears(years)
        setAvailableMonths(months)

        if (years.length > 0) {
          const latestYear = years[0]
          setSelectedYear(latestYear)
          setSelectedMonth("all")
          console.log(`📅 Filter initialized to: ${latestYear}년 전체`)
        }
      }
    } catch (error) {
      console.error("❌ Failed to fetch available dates:", error)
    }
  }

  const fetchSummaryData = async (year?: number, month?: string) => {
    setLoading(true)
    try {
      // URL 구성
      let statsUrl = `/api/content/content-stats?startDate=2025-06-01&t=${Date.now()}&companyId=${companyId}`

      // 년도와 월이 있으면 필터링
      if (year && month && month !== 'all') {
        const startDate = `${year}-${month}-01`
        const lastDay = new Date(year, parseInt(month), 0).getDate()
        const endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`
        statsUrl = `/api/content/content-stats?startDate=${startDate}&endDate=${endDate}&t=${Date.now()}&companyId=${companyId}`
        console.log(`📅 Fetching summary for ${year}-${month}`)
      }

      // 새로운 정확한 stats API 사용
      const statsResponse = await fetch(statsUrl)
      const statsData = await statsResponse.json()
      
      if (statsData.success) {
        setSummaryData({
          data: [],
          totalContents: statsData.data.totalContents,
          totalCount: statsData.data.totalContents,
          uniqueCreators: statsData.data.uniqueCreators,
          totalShoppableImpressions: statsData.data.totalShoppableImpressions,
          totalLikeCount: statsData.data.totalLikeCount,
        })
        
        console.log("📊 Content data loaded:", {
          totalContents: statsData.data.totalContents,
          uniqueCreators: statsData.data.uniqueCreators,
          totalShoppableImpressions: statsData.data.totalShoppableImpressions,
          totalLikeCount: statsData.data.totalLikeCount,
        })
      } else {
        // Fallback to old method if new API fails
        const matrixResponse = await fetch(`/api/content/content-all-matrix?t=${Date.now()}&companyId=${companyId}`)
        const matrixData = await matrixResponse.json()
        
        let totalCount = 0
        let totalShoppableImpressions = 0
        let totalLikeCount = 0
        
        if (matrixData.monthly && matrixData.monthly.monthlyStats) {
          Object.values(matrixData.monthly.monthlyStats).forEach((stats: any) => {
            totalCount += stats.totalCount || 0
            totalShoppableImpressions += stats.totalShoppableImpressions || 0
            totalLikeCount += stats.totalLikeCount || 0
          })
        }
        
        const creatorResponse = await fetch(`/api/content/contents?groupBy=creator&startDate=2025-06-01&companyId=${companyId}`)
        const creatorData = await creatorResponse.json()
        
        setSummaryData({
          data: [],
          totalContents: totalCount,
          totalCount: totalCount,
          uniqueCreators: creatorData.uniqueCreators || 0,
          totalShoppableImpressions: totalShoppableImpressions,
          totalLikeCount: totalLikeCount,
        })
      }


      // GMV 데이터 가져오기 - 콘텐츠 분석 페이지와 동일한 API 사용
      let gmvUrl = `/api/content/contents?groupBy=creator&companyId=${companyId}`

      // 년도와 월이 있으면 필터링
      if (year && month && month !== 'all') {
        const startDate = `${year}-${month}-01`
        const lastDay = new Date(year, parseInt(month), 0).getDate()
        const endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`
        gmvUrl = `/api/content/contents?groupBy=creator&startDate=${startDate}&endDate=${endDate}&companyId=${companyId}`
      }

      const contentsResponse = await fetch(gmvUrl)
      if (contentsResponse.ok) {
        const contentsResult = await contentsResponse.json()
        console.log("📊 Total GMV loaded:", contentsResult.totalGmv)
        setTotalGmv(contentsResult.totalGmv || 0)
      } else {
        setTotalGmv(0)
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
      const response = await fetch("/api/content/content-all-matrix")

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
          "크리에이터",
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
            stats.uniqueCreators || 0,
            stats.totalGmv,
            stats.totalAffiliateItemsSold,
            stats.totalAffiliateOrders,
            stats.totalShoppableImpressions,
            stats.totalCommentCount,
            stats.totalLikeCount
          ]
        })

        // 일별 총계 행
        const uniqueCreatorsDaily = new Set()
        data.daily.dates.forEach((date: string) => {
          const count = data.daily.dailyStats[date].uniqueCreators || 0
          if (count > 0) {
            // Track unique creators across all days (simplified)
            for (let i = 0; i < count; i++) {
              uniqueCreatorsDaily.add(`${date}_${i}`)
            }
          }
        })
        
        dailyRows.push([
          "Total",
          data.daily.dates.reduce((sum: number, date: string) => sum + data.daily.dailyStats[date].totalCount, 0),
          data.daily.dates.reduce((max: number, date: string) => Math.max(max, data.daily.dailyStats[date].uniqueCreators || 0), 0),
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
          "크리에이터",
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
            stats.uniqueCreators || 0,
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
          data.weekly.weeks.reduce((max: number, week: string) => Math.max(max, data.weekly.weeklyStats[week].uniqueCreators || 0), 0),
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
          "크리에이터",
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
            stats.uniqueCreators || 0,
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
          data.monthly.months.reduce((max: number, month: string) => Math.max(max, data.monthly.monthlyStats[month].uniqueCreators || 0), 0),
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
    fetchAvailableDates()
    fetchSummaryData()
  }, [])

  // 필터 변경 시 카드 데이터 재조회 (daily 뷰일 때만)
  useEffect(() => {
    if (viewMode === "daily" && selectedYear && selectedMonth) {
      if (selectedMonth === "all") {
        console.log(`🔄 필터 변경됨: ${selectedYear}년 전체`)
        fetchSummaryData()
      } else {
        console.log(`🔄 필터 변경됨: ${selectedYear}년 ${selectedMonth}월`)
        fetchSummaryData(selectedYear, selectedMonth)
      }
    } else if (viewMode !== "daily") {
      fetchSummaryData()
    }
  }, [viewMode, selectedYear, selectedMonth])

  if (loading) {
    return <LoadingSpinner message="콘텐츠 데이터를 불러오는 중..." />
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
        <div className="ml-auto flex items-center gap-2">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="w-auto">
            <TabsList>
              <TabsTrigger value="daily">일별</TabsTrigger>
              <TabsTrigger value="weekly">주별</TabsTrigger>
              <TabsTrigger value="monthly">월별</TabsTrigger>
            </TabsList>
          </Tabs>
          <Select
            value={String(selectedYear)}
            onValueChange={(v) => {
              const year = parseInt(v)
              setSelectedYear(year)
              setSelectedMonth("")
            }}
            disabled={viewMode !== "daily" || availableYears.length === 0}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}년
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={selectedMonth || undefined}
            onValueChange={(v) => {
              setSelectedMonth(v)
            }}
            disabled={viewMode !== "daily" || !availableMonths[selectedYear]?.length}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="월 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              {(availableMonths[selectedYear] || []).map((month) => {
                const monthValue = String(month).padStart(2, "0")
                return (
                  <SelectItem key={month} value={monthValue}>
                    {month}월
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="space-y-8">
          {/* 페이지 헤더 */}
          <div>
            <h1 className="text-3xl font-bold">콘텐츠 발행 현황</h1>
            <p className="text-muted-foreground">TikTok 시딩 콘텐츠 발행 추이 분석 (2025년 6월 1일부터)</p>
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
                <p className="text-xs text-muted-foreground mt-1">
                  {viewMode === "daily" && selectedMonth && selectedMonth !== "all"
                    ? `${selectedYear}년 ${parseInt(selectedMonth)}월`
                    : "6월 1일부터 누적"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total GMV</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${totalGmv.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {viewMode === "daily" && selectedMonth && selectedMonth !== "all"
                    ? `${selectedYear}년 ${parseInt(selectedMonth)}월`
                    : "6월 1일부터 누적"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">크리에이터 수</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summaryData?.uniqueCreators || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {viewMode === "daily" && selectedMonth && selectedMonth !== "all"
                    ? `${selectedYear}년 ${parseInt(selectedMonth)}월 참여`
                    : "참여 크리에이터"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">총 노출 수</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summaryData?.totalShoppableImpressions?.toLocaleString() || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {viewMode === "daily" && selectedMonth && selectedMonth !== "all"
                    ? `${selectedYear}년 ${parseInt(selectedMonth)}월`
                    : "6월 1일부터 누적"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">총 좋아요 수</CardTitle>
                <Heart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summaryData?.totalLikeCount?.toLocaleString() || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {viewMode === "daily" && selectedMonth && selectedMonth !== "all"
                    ? `${selectedYear}년 ${parseInt(selectedMonth)}월`
                    : "6월 1일부터 누적"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 콘텐츠 매트릭스 테이블 */}
          {viewMode === "daily" && (
            <ContentDailyMatrixTable
              companyId={companyId}
              onExcelDownload={handleAllMatrixDownload}
              downloadLoading={downloadLoading}
              selectedYear={selectedMonth && selectedMonth !== "all" ? selectedYear : undefined}
              selectedMonth={selectedMonth && selectedMonth !== "all" ? selectedMonth : undefined}
            />
          )}

          {viewMode === "weekly" && (
            <ContentWeeklyMatrixTable
              companyId={companyId}
              onExcelDownload={handleAllMatrixDownload}
              downloadLoading={downloadLoading}
            />
          )}

          {viewMode === "monthly" && (
            <ContentMonthlyMatrixTable
              companyId={companyId}
              onExcelDownload={handleAllMatrixDownload}
              downloadLoading={downloadLoading}
            />
          )}
        </div>
      </div>
    </>
  )
}
