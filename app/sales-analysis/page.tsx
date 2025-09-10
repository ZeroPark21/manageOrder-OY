"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TrendingUp, BarChart3, Package, DollarSign } from "lucide-react"
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

interface SalesAnalysisData {
  summary: {
    totalRevenue: number
    totalQuantity: number
    activeProducts: number
  }
  daily: {
    dates: string[]
    products: string[]
    matrix: {
      [product: string]: {
        [date: string]: {
          quantity: number
          revenue: number
        }
        total: {
          quantity: number
          revenue: number
        }
      }
    }
    productSkuMap: {
      [product: string]: {
        seller_sku: string
        sku_id: number
      }
    }
  }
}

function SalesMatrixTable({ data }: { data: SalesAnalysisData }) {
  if (!data || !data.daily.products.length) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">표시할 매출 데이터가 없습니다.</p>
      </div>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return `${date.getMonth() + 1}/${date.getDate()}`
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse border border-gray-200">
        <thead>
          <tr className="bg-gray-50">
            <th className="border border-gray-200 px-4 py-2 text-left">순위</th>
            <th className="border border-gray-200 px-4 py-2 text-left">Product Name</th>
            <th className="border border-gray-200 px-4 py-2 text-left">Seller SKU</th>
            <th className="border border-gray-200 px-4 py-2 text-left">SKU ID</th>
            {data.daily.dates.map(date => (
              <th key={date} className="border border-gray-200 px-2 py-2 text-center min-w-[100px]">
                {formatDate(date)}
              </th>
            ))}
            <th className="border border-gray-200 px-4 py-2 text-center">총 판매량</th>
            <th className="border border-gray-200 px-4 py-2 text-center">총 매출액</th>
          </tr>
        </thead>
        <tbody>
          {data.daily.products.map((product, index) => {
            const productData = data.daily.matrix[product]
            const skuInfo = data.daily.productSkuMap[product] || { seller_sku: "", sku_id: 0 }
            
            return (
              <tr key={product} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="border border-gray-200 px-4 py-2">{index + 1}</td>
                <td className="border border-gray-200 px-4 py-2 font-medium">{product}</td>
                <td className="border border-gray-200 px-4 py-2">{skuInfo.seller_sku || "-"}</td>
                <td className="border border-gray-200 px-4 py-2">{skuInfo.sku_id || "-"}</td>
                {data.daily.dates.map(date => {
                  const dayData = productData[date]
                  return (
                    <td key={date} className="border border-gray-200 px-2 py-2 text-center">
                      {dayData ? (
                        <div className="text-xs">
                          <div className="font-medium">{dayData.quantity}개</div>
                          <div className="text-muted-foreground">{formatCurrency(dayData.revenue)}</div>
                        </div>
                      ) : (
                        <div className="text-gray-400">-</div>
                      )}
                    </td>
                  )
                })}
                <td className="border border-gray-200 px-4 py-2 text-center font-medium">
                  {productData.total.quantity}개
                </td>
                <td className="border border-gray-200 px-4 py-2 text-center font-medium">
                  {formatCurrency(productData.total.revenue)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default function SalesAnalysis() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<SalesAnalysisData | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      console.log("🔄 Fetching sales analysis data from API...")
      
      const response = await fetch("/api/sales-analysis")
      if (!response.ok) {
        throw new Error(`API 요청 실패: ${response.status}`)
      }
      
      const salesData = await response.json()
      
      if (salesData.error) {
        throw new Error(`API 오류: ${salesData.error}`)
      }
      
      setData(salesData)
      
      console.log("✅ Sales analysis data loaded:", {
        totalRevenue: salesData.summary.totalRevenue,
        totalQuantity: salesData.summary.totalQuantity,
        activeProducts: salesData.summary.activeProducts
      })
      
    } catch (error) {
      console.error("❌ Failed to fetch sales analysis data:", error)
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="relative inline-flex">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20"></div>
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-t-primary absolute top-0 left-0"></div>
          </div>
          <p className="mt-4 text-lg font-medium text-muted-foreground animate-pulse">매출 데이터를 불러오는 중...</p>
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
              <BreadcrumbPage>매출 데이터 분석</BreadcrumbPage>
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
              <h1 className="text-3xl font-bold">매출 데이터 분석</h1>
              <p className="text-muted-foreground">실제 매출이 발생한 주문 분석 (SKU Unit Original Price > 0)</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={fetchData}>
                <BarChart3 className="h-4 w-4 mr-2" />
                새로고침
              </Button>
            </div>
          </div>

          {/* 요약 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">총 매출액</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data?.summary.totalRevenue ? formatCurrency(data.summary.totalRevenue) : "₩0"}
                </div>
                <p className="text-xs text-muted-foreground">전체 기간 매출</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">총 판매량</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data?.summary.totalQuantity?.toLocaleString() || 0}개
                </div>
                <p className="text-xs text-muted-foreground">전체 판매 수량</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">활성 제품 수</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data?.summary.activeProducts?.toLocaleString() || 0}개
                </div>
                <p className="text-xs text-muted-foreground">매출 발생 제품</p>
              </CardContent>
            </Card>
          </div>

          {/* 매출 매트릭스 테이블 */}
          <Tabs defaultValue="daily" className="space-y-4">
            <TabsList>
              <TabsTrigger value="daily">일별 매출 분석</TabsTrigger>
            </TabsList>

            <TabsContent value="daily" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>일별 제품 매출 매트릭스</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    각 제품의 일자별 판매량과 매출액을 표시합니다.
                  </p>
                </CardHeader>
                <CardContent>
                  {data ? (
                    <SalesMatrixTable data={data} />
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">데이터를 불러올 수 없습니다.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  )
}