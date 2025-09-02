"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ShoppingCart, TrendingUp, Package, DollarSign, Calendar } from "lucide-react"
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
import { ProductSalesDailyMatrixTable } from "@/components/product-sales-daily-matrix-table"
import { ProductSalesWeeklyMatrixTable } from "@/components/product-sales-weekly-matrix-table"
import { ProductSalesMonthlyMatrixTable } from "@/components/product-sales-monthly-matrix-table"
import { downloadMultiSheetExcel, type MultiSheetExcelData, formatDateForExcel } from "@/lib/excel-utils"

interface ProductSalesData {
  data: Array<{
    date?: string
    week?: string
    month?: string
    totalQuantity: number
    totalRevenue: number
    uniqueProducts: number
    products: any[]
  }>
  totalQuantity: number
  totalRevenue: number
  uniqueProducts: number
  totalOrders: number
}

export default function ProductSalesDashboard() {
  const [summaryData, setSummaryData] = useState<ProductSalesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloadLoading, setDownloadLoading] = useState(false)

  const fetchSummaryData = async () => {
    setLoading(true)
    try {
      // 현재 월 데이터 가져오기 (테이블 표시용)
      const response = await fetch(`/api/product-sales?groupBy=daily`)
      if (!response.ok) throw new Error("Failed to fetch data")
      const data = await response.json()

      // 전체 요약 데이터 가져오기
      const totalResponse = await fetch(`/api/product-sales?groupBy=all`)
      if (!totalResponse.ok) throw new Error("Failed to fetch total data")
      const totalData = await totalResponse.json()

      setSummaryData({
        data: data.data,
        totalQuantity: totalData.totalQuantity || 0,
        totalRevenue: totalData.totalRevenue || 0,
        uniqueProducts: totalData.uniqueProducts || 0,
        totalOrders: totalData.totalOrders || 0,
      })
    } catch (error) {
      console.error("데이터 로드 실패:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSummaryData()
  }, [])

  const handleDownloadExcel = async () => {
    setDownloadLoading(true)
    try {
      // 모든 기간의 데이터 가져오기
      const [dailyRes, weeklyRes, monthlyRes] = await Promise.all([
        fetch("/api/product-sales/all-matrix?groupBy=daily"),
        fetch("/api/product-sales/all-matrix?groupBy=weekly"), 
        fetch("/api/product-sales/all-matrix?groupBy=monthly")
      ])

      const [dailyData, weeklyData, monthlyData] = await Promise.all([
        dailyRes.json(),
        weeklyRes.json(),
        monthlyRes.json()
      ])

      const sheets: MultiSheetExcelData['sheets'] = []

      // 일별 시트 생성
      if (dailyData?.dates && dailyData.dates.length > 0) {
        const dailyHeaders = [
          "순위",
          "Product Name",
          "Seller SKU",
          "SKU ID",
          ...dailyData.dates.map((date: string) => formatDateForExcel(date)),
          "총수량",
          "총매출"
        ]

        const dailyRows = (dailyData.products || []).map((product: any, index: number) => {
          const quantities = dailyData.dates.map((date: string) => 
            dailyData.dailyStats?.[date]?.productStats?.[product.product_name]?.quantity || 0
          )
          const totalQuantity = quantities.reduce((a: number, b: number) => a + b, 0)
          const avgPrice = product.avg_price || 0
          const totalRevenue = totalQuantity * avgPrice

          return [
            index + 1,
            product.product_name || '',
            product.seller_sku || '',
            product.sku_id || '',
            ...quantities,
            totalQuantity,
            totalRevenue
          ]
        })

        // 총계 행 추가
        dailyRows.push([
          "Total",
          "",
          "",
          "",
          ...dailyData.dates.map((date: string) => dailyData.dailyStats?.[date]?.totalQuantity || 0),
          dailyData.dates.reduce((sum: number, date: string) => sum + (dailyData.dailyStats?.[date]?.totalQuantity || 0), 0),
          dailyData.dates.reduce((sum: number, date: string) => sum + (dailyData.dailyStats?.[date]?.totalRevenue || 0), 0)
        ])

        sheets.push({
          name: "일별 Affiliate 영상 판매",
          headers: dailyHeaders,
          rows: dailyRows,
        })
      }

      // 주별 시트 생성
      if (weeklyData?.weeks && weeklyData.weeks.length > 0) {
        const weeklyHeaders = [
          "주차",
          "판매수량",
          "매출액",
          "제품수",
          "평균단가"
        ]

        const weeklyRows = weeklyData.weeks.map((week: string) => {
          const stats = weeklyData.weeklyStats?.[week] || {}
          return [
            formatDateForExcel(week),
            stats.totalQuantity || 0,
            stats.totalRevenue || 0,
            stats.uniqueProducts || 0,
            stats.totalQuantity > 0 ? Math.round(stats.totalRevenue / stats.totalQuantity) : 0
          ]
        })

        // 주별 총계 행
        weeklyRows.push([
          "Total",
          weeklyData.weeks.reduce((sum: number, week: string) => sum + (weeklyData.weeklyStats?.[week]?.totalQuantity || 0), 0),
          weeklyData.weeks.reduce((sum: number, week: string) => sum + (weeklyData.weeklyStats?.[week]?.totalRevenue || 0), 0),
          "",
          ""
        ])

        sheets.push({
          name: "주별 Affiliate 영상 판매",
          headers: weeklyHeaders,
          rows: weeklyRows,
        })
      }

      // 월별 시트 생성
      if (monthlyData?.months && monthlyData.months.length > 0) {
        const monthlyHeaders = ["순위", "Product Name", "Seller SKU", "SKU ID", ...monthlyData.months, "총수량", "총매출"]

        const monthlyRows = (monthlyData.products || []).map((product: any, index: number) => {
          const quantities = monthlyData.months.map((month: string) => 
            monthlyData.monthlyStats?.[month]?.productStats?.[product.product_name]?.quantity || 0
          )
          const totalQuantity = quantities.reduce((a: number, b: number) => a + b, 0)
          const avgPrice = product.avg_price || 0
          const totalRevenue = totalQuantity * avgPrice

          return [
            index + 1,
            product.product_name || '',
            product.seller_sku || '',
            product.sku_id || '',
            ...quantities,
            totalQuantity,
            totalRevenue
          ]
        })

        // 총계 행 추가
        monthlyRows.push([
          "Total",
          "",
          "",
          "",
          ...monthlyData.months.map((month: string) => monthlyData.monthlyStats?.[month]?.totalQuantity || 0),
          monthlyData.months.reduce((sum: number, month: string) => sum + (monthlyData.monthlyStats?.[month]?.totalQuantity || 0), 0),
          monthlyData.months.reduce((sum: number, month: string) => sum + (monthlyData.monthlyStats?.[month]?.totalRevenue || 0), 0)
        ])

        sheets.push({
          name: "월별 Affiliate 영상 판매",
          headers: monthlyHeaders,
          rows: monthlyRows,
        })
      }

      console.log("📄 Preparing to download Excel with", sheets.length, "sheets")

      const now = new Date()
      const fileName = `Affiliate영상_판매발생_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}.xlsx`

      await downloadMultiSheetExcel({ sheets, filename: fileName })
    } catch (error) {
      console.error("Excel 다운로드 실패:", error)
      alert("Excel 다운로드에 실패했습니다.")
    } finally {
      setDownloadLoading(false)
    }
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
              <BreadcrumbPage>Affiliate 영상 판매 발생</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      {/* 메인 콘텐츠 */}
      <div className="flex flex-1 flex-col gap-4 p-4">
        {/* 헤더 섹션 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Affiliate 영상 판매 발생</h1>
            <p className="text-muted-foreground">Affiliate 영상을 통한 실제 제품 판매 데이터 분석 (가격이 0원이 아닌 실제 판매 데이터만 집계)</p>
          </div>
          <Button onClick={handleDownloadExcel} disabled={downloadLoading}>
            {downloadLoading ? "다운로드 중..." : "Excel 다운로드"}
          </Button>
        </div>

        {/* 요약 카드 */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">총 판매 수량</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? "..." : summaryData?.totalQuantity.toLocaleString() || 0}
              </div>
              <p className="text-xs text-muted-foreground">7월부터 누적</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">총 매출액</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${loading ? "..." : summaryData?.totalRevenue.toLocaleString() || 0}
              </div>
              <p className="text-xs text-muted-foreground">7월부터 누적</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">제품 종류</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? "..." : summaryData?.uniqueProducts || 0}
              </div>
              <p className="text-xs text-muted-foreground">판매된 제품 종류</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">총 주문 수</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? "..." : summaryData?.totalOrders.toLocaleString() || 0}
              </div>
              <p className="text-xs text-muted-foreground">7월부터 누적</p>
            </CardContent>
          </Card>
        </div>

        {/* 탭 컨텐츠 */}
        <Tabs defaultValue="daily" className="space-y-4">
          <TabsList>
            <TabsTrigger value="daily">일별</TabsTrigger>
            <TabsTrigger value="weekly">주별</TabsTrigger>
            <TabsTrigger value="monthly">월별</TabsTrigger>
          </TabsList>

          <TabsContent value="daily" className="space-y-4">
            <ProductSalesDailyMatrixTable />
          </TabsContent>

          <TabsContent value="weekly" className="space-y-4">
            <ProductSalesWeeklyMatrixTable />
          </TabsContent>

          <TabsContent value="monthly" className="space-y-4">
            <ProductSalesMonthlyMatrixTable />
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}