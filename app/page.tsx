"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DailyMatrixTable } from "@/components/daily-matrix-table"
import { WeeklyMatrixTable } from "@/components/weekly-matrix-table"
import { MonthlyMatrixTable } from "@/components/monthly-matrix-table"
import { Upload, BarChart3, Package, Wallet, TrendingUp, ShoppingCart, Ban } from "lucide-react"
import { downloadMultiSheetExcel, type MultiSheetExcelData, formatDateForExcel } from "@/lib/excel-utils"
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

interface DashboardData {
  data: Array<{
    date?: string
    week?: string
    month?: string
    product?: string
    totalQuantity: number
    orders: any[]
  }>
  totalOrders: number
  totalQuantity: number
  uniqueProducts: number
}

interface SalesStats {
  sales: {
    totalOrders: number
    totalAmount: number
    totalQuantity: number
    cancelledOrders: number
    cancelledAmount: number
    cancelledQuantity: number
    activeOrders: number
    activeAmount: number
  }
  samples: {
    totalOrders: number
    totalQuantity: number
    cancelledOrders: number
    cancelledQuantity: number
    activeOrders: number
    activeQuantity: number
  }
  invalid: {
    totalOrders: number
    totalQuantity: number
    cancelledOrders: number
    cancelledQuantity: number
    activeOrders: number
    activeQuantity: number
  }
  total: {
    orders: number
    sales: number
    samples: number
    invalid: number
    cancelled: number
  }
}

export default function Dashboard() {
  const [salesStats, setSalesStats] = useState<SalesStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloadLoading, setDownloadLoading] = useState(false)

  const fetchSummaryData = async () => {
    setLoading(true)
    try {
      const salesResponse = await fetch(`/api/gmv-sales-stats?t=${Date.now()}`)
      const salesData = await salesResponse.json()
      
      setSalesStats(salesData.data || null)

      console.log("📊 Dashboard data loaded:", {
        salesStats: salesData.data
      })
    } catch (error: any) {
      console.error("데이터 로딩 실패:", error.message ?? error)
    } finally {
      setLoading(false)
    }
  }

  const handleAllMatrixDownload = async () => {
    setDownloadLoading(true)
    try {
      console.log("📥 Fetching all matrix data...")
      const response = await fetch("/api/all-matrix")

      if (!response.ok) {
        const errorText = await response.text()
        console.error("API Error Response:", errorText)
        throw new Error(`API 요청 실패: ${response.status}`)
      }

      const data = await response.json()
      
      // API 에러 체크
      if (data.error) {
        console.error("API returned error:", data.error)
        throw new Error(`API 오류: ${data.error}`)
      }
      console.log("📊 Matrix data loaded successfully")
      console.log("API Response:", {
        daily: data.daily ? `${data.daily.products?.length || 0} products, ${data.daily.dates?.length || 0} dates` : 'null',
        weekly: data.weekly ? `${data.weekly.products?.length || 0} products, ${data.weekly.weeks?.length || 0} weeks` : 'null',
        monthly: data.monthly ? `${data.monthly.products?.length || 0} products, ${data.monthly.months?.length || 0} months` : 'null'
      })

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
      if (data.daily.products && data.daily.products.length > 0) {
        const dailyHeaders = [
          "순위",
          "Product Name",
          "Seller SKU",
          "SKU ID",
          ...data.daily.dates.map((date: string) => formatDateForExcel(date)),
          "총수량",
        ]

        const dailyRows = data.daily.products.map((product: string, index: number) => {
          const productData = data.daily.matrix[product]
          const skuInfo = data.daily.productSkuMap[product] || { seller_sku: "", sku_id: 0 }
          return [
            index + 1,
            product,
            skuInfo.seller_sku || "-",
            skuInfo.sku_id || "-",
            ...data.daily.dates.map((date: string) => productData[date] || 0),
            productData.total,
          ]
        })

        // 일별 총계 행
        dailyRows.push([
          "",
          "Daily 발송 수량",
          "",
          "",
          ...data.daily.dates.map((date: string) =>
            data.daily.products.reduce(
              (sum: number, product: string) => sum + (data.daily.matrix[product][date] || 0),
              0,
            ),
          ),
          data.daily.products.reduce((sum: number, product: string) => sum + data.daily.matrix[product].total, 0),
        ])

        sheets.push({
          name: "일별 매트릭스",
          headers: dailyHeaders,
          rows: dailyRows,
        })
        console.log("✅ Daily sheet prepared")
      }

      // 주별 시트 생성
      if (data.weekly.products && data.weekly.products.length > 0) {
        const weeklyHeaders = [
          "순위",
          "Product Name",
          "Seller SKU",
          "SKU ID",
          ...data.weekly.weeks.map(
            (week: string) => `${data.weekly.formatWeekDisplay[week]} (${data.weekly.formatWeekRange[week]})`,
          ),
          "총수량",
        ]

        const weeklyRows = data.weekly.products.map((product: string, index: number) => {
          const productData = data.weekly.matrix[product]
          const skuInfo = data.weekly.productSkuMap[product] || { seller_sku: "", sku_id: 0 }
          return [
            index + 1,
            product,
            skuInfo.seller_sku || "-",
            skuInfo.sku_id || "-",
            ...data.weekly.weeks.map((week: string) => productData[week] || 0),
            productData.total,
          ]
        })

        // 주별 총계 행
        weeklyRows.push([
          "",
          "Weekly 발송 수량",
          "",
          "",
          ...data.weekly.weeks.map((week: string) =>
            data.weekly.products.reduce(
              (sum: number, product: string) => sum + (data.weekly.matrix[product][week] || 0),
              0,
            ),
          ),
          data.weekly.products.reduce((sum: number, product: string) => sum + data.weekly.matrix[product].total, 0),
        ])

        sheets.push({
          name: "주별 매트릭스",
          headers: weeklyHeaders,
          rows: weeklyRows,
        })
        console.log("✅ Weekly sheet prepared")
      }

      // 월별 시트 생성
      if (data.monthly.products && data.monthly.products.length > 0) {
        const monthlyHeaders = ["순위", "Product Name", "Seller SKU", "SKU ID", ...data.monthly.months, "총수량"]

        const monthlyRows = data.monthly.products.map((product: string, index: number) => {
          const productData = data.monthly.matrix[product]
          const skuInfo = data.monthly.productSkuMap[product] || { seller_sku: "", sku_id: 0 }
          return [
            index + 1,
            product,
            skuInfo.seller_sku || "-",
            skuInfo.sku_id || "-",
            ...data.monthly.months.map((month: string) => productData[month] || 0),
            productData.total,
          ]
        })

        // 월별 총계 행
        monthlyRows.push([
          "",
          "Monthly 발송 수량",
          "",
          "",
          ...data.monthly.months.map((month: string) =>
            data.monthly.products.reduce(
              (sum: number, product: string) => sum + (data.monthly.matrix[product][month] || 0),
              0,
            ),
          ),
          data.monthly.products.reduce((sum: number, product: string) => sum + data.monthly.matrix[product].total, 0),
        ])

        sheets.push({
          name: "월별 매트릭스",
          headers: monthlyHeaders,
          rows: monthlyRows,
        })
        console.log("✅ Monthly sheet prepared")
      }

      if (sheets.length === 0) {
        throw new Error("생성할 시트가 없습니다.")
      }

      console.log(`📁 Creating Excel with ${sheets.length} sheets`)

      const excelData: MultiSheetExcelData = {
        sheets,
        filename: `TTS_제품발송현황_통합매트릭스_${new Date().toISOString().split("T")[0]}`,
      }

      downloadMultiSheetExcel(excelData)
      console.log("🎉 Excel download completed!")
    } catch (error) {
      console.error("❌ Excel download failed:", error)
      alert(`Excel 다운로드에 실패했습니다: ${error instanceof Error ? error.message : "알 수 없는 오류"}`)
    } finally {
      setDownloadLoading(false)
    }
  }

  useEffect(() => {
    fetchSummaryData()
  }, [])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="relative inline-flex">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20"></div>
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-t-primary absolute top-0 left-0"></div>
          </div>
          <p className="mt-4 text-lg font-medium text-muted-foreground animate-pulse">데이터를 불러오는 중...</p>
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
              <BreadcrumbLink href="/">TTS Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>샘플 발송 현황</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      {/* 메인 콘텐츠 */}
      <div className="flex flex-1 flex-col gap-4 p-4" style={{maxWidth: '100vw', overflowX: 'hidden', border: '2px solid red'}}>
        <div className="space-y-8">
          {/* 페이지 헤더 */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">샘플 발송 현황</h1>
              <p className="text-muted-foreground">샘플 발송현황 분석 (2025년 6월 1일부터, SKU Unit Original Price = 0)</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={fetchSummaryData}>
                <BarChart3 className="h-4 w-4 mr-2" />
                새로고침
              </Button>
            </div>
          </div>

          {/* 요약 카드 */}
          {salesStats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">총 샘플 발송</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{salesStats.samples.totalQuantity.toLocaleString()}개</div>
                  <p className="text-xs text-muted-foreground">주문 {salesStats.samples.totalOrders.toLocaleString()}건</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">취소된 샘플</CardTitle>
                  <Ban className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{salesStats.samples.cancelledQuantity.toLocaleString()}개</div>
                  <p className="text-xs text-muted-foreground">취소 {salesStats.samples.cancelledOrders.toLocaleString()}건</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">실제 발송된 샘플</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{salesStats.samples.activeQuantity.toLocaleString()}개</div>
                  <p className="text-xs text-muted-foreground">발송 {salesStats.samples.activeOrders.toLocaleString()}건</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 샘플 매트릭스 테이블 탭 */}
          <Tabs defaultValue="daily" className="space-y-4">
            <TabsList>
              <TabsTrigger value="daily">일별 매트릭스</TabsTrigger>
              <TabsTrigger value="weekly">주별 매트릭스</TabsTrigger>
              <TabsTrigger value="monthly">월별 매트릭스</TabsTrigger>
            </TabsList>

            <TabsContent value="daily" className="space-y-4">
              <DailyMatrixTable onExcelDownload={handleAllMatrixDownload} downloadLoading={downloadLoading} />
            </TabsContent>

            <TabsContent value="weekly" className="space-y-4">
              <WeeklyMatrixTable onExcelDownload={handleAllMatrixDownload} downloadLoading={downloadLoading} />
            </TabsContent>

            <TabsContent value="monthly" className="space-y-4">
              <MonthlyMatrixTable onExcelDownload={handleAllMatrixDownload} downloadLoading={downloadLoading} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  )
}
