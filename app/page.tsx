"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, BarChart3, Package } from "lucide-react"
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


export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [summaryData, setSummaryData] = useState<{
    totalCount: number;
    cancelledCount: number;
    shippedCount: number;
  } | null>(null)

  const fetchSummaryData = async () => {
    try {
      setLoading(true)
      console.log("🔄 Fetching summary data from API...")

      const response = await fetch("/api/sample-summary")
      if (!response.ok) {
        throw new Error(`API 요청 실패: ${response.status}`)
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(`API 오류: ${data.error}`)
      }

      // 실제 API 응답에서 데이터 설정
      setSummaryData({
        totalCount: data.totalCount,
        cancelledCount: data.cancelledCount,
        shippedCount: data.shippedCount
      })

      console.log("✅ Summary data loaded from real API:", {
        totalCount: data.totalCount,
        cancelledCount: data.cancelledCount,
        shippedCount: data.shippedCount,
        stats: data.stats
      })

    } catch (error) {
      console.error("API 요청 중 오류:", error)
      // 에러 시에도 더미 데이터 설정
      setSummaryData({
        totalCount: 0,
        cancelledCount: 0,
        shippedCount: 0
      })
    } finally {
      setLoading(false)
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
          <p className="mt-4 text-lg font-medium text-muted-foreground animate-pulse">실제 데이터를 불러오는 중...</p>
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
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="space-y-8">
          {/* 페이지 헤더 */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">샘플 발송 현황</h1>
              <p className="text-muted-foreground">샘플 발송현황 분석 (실제 데이터 기반, SKU Unit Original Price = 0)</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={fetchSummaryData} className="hover:bg-blue-50 hover:border-blue-500 hover:text-blue-700 transition-all duration-300">
                <BarChart3 className="h-4 w-4 mr-2" />
                새로고침
              </Button>
            </div>
          </div>

          {/* 요약 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="hover:border-blue-500 hover:shadow-md transition-all duration-300 cursor-pointer border-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">총 샘플 발송</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground hover:text-blue-600 transition-colors duration-300" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold hover:text-blue-600 transition-colors duration-300">{summaryData?.totalCount?.toLocaleString() || 0}개</div>
                <p className="text-xs text-muted-foreground">주문 {summaryData?.totalCount?.toLocaleString() || 0}건</p>
              </CardContent>
            </Card>

            <Card className="hover:border-blue-500 hover:shadow-md transition-all duration-300 cursor-pointer border-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">취소된 샘플</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground hover:text-blue-600 transition-colors duration-300" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600 hover:text-red-700 transition-colors duration-300">{summaryData?.cancelledCount?.toLocaleString() || 0}개</div>
                <p className="text-xs text-muted-foreground">취소 {summaryData?.cancelledCount?.toLocaleString() || 0}건</p>
              </CardContent>
            </Card>

            <Card className="hover:border-blue-500 hover:shadow-md transition-all duration-300 cursor-pointer border-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">실제 발송된 샘플</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground hover:text-blue-600 transition-colors duration-300" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600 hover:text-green-700 transition-colors duration-300">{summaryData?.shippedCount?.toLocaleString() || 0}개</div>
                <p className="text-xs text-muted-foreground">발송 {summaryData?.shippedCount?.toLocaleString() || 0}건</p>
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </>
  )
}