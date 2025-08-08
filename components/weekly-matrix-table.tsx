"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { Download } from "lucide-react"

interface WeeklyMatrixData {
  products: string[]
  weeks: string[]
  matrix: {
    [product: string]: {
      [week: string]: number
      total: number
    }
  }
  productSkuMap: {
    [product: string]: {
      seller_sku: string
      sku_id: number
    }
  }
  formatWeekDisplay: { [key: string]: string }
  formatWeekRange: { [key: string]: string }
}

// Props 인터페이스에 추가
interface WeeklyMatrixTableProps {
  onExcelDownload?: () => void
  downloadLoading?: boolean
}

export function WeeklyMatrixTable({ onExcelDownload, downloadLoading }: WeeklyMatrixTableProps) {
  const [data, setData] = useState<WeeklyMatrixData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/weekly-matrix")
      const result = await response.json()
      console.log("📊 Weekly matrix data:", result)
      setData(result)
    } catch (error) {
      console.error("데이터 로딩 실패:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // handleExcelDownload 함수 제거하고 onExcelDownload 사용

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>주별 샘플 발송현황</CardTitle>
          <CardDescription>상품별 주간 샘플 발송 수량 매트릭스 (월요일 기준, SKU Unit Original Price = 0)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data || !data.products || data.products.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>주별 샘플 발송현황</CardTitle>
          <CardDescription>상품별 주간 샘플 발송 수량 매트릭스 (월요일 기준, SKU Unit Original Price = 0)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-lg font-medium mb-2">데이터 없음</p>
            <p className="text-sm">해당 기간에는 데이터가 없습니다.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>주별 샘플 발송현황</CardTitle>
            <CardDescription>
              상품별 주간 샘플 발송 수량 매트릭스 (총 {data.products.length}개 상품, {data.weeks.length}주 데이터)
            </CardDescription>
          </div>
          {/* 헤더 부분의 버튼 수정 */}
          <div className="space-x-2">
            <Button variant="outline" size="sm" onClick={onExcelDownload} disabled={downloadLoading}>
              <Download className="h-4 w-4 mr-2" />
              {downloadLoading ? "다운로드 중..." : "엑셀 다운로드"}
            </Button>
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
              <RefreshCw className="h-4 w-4 mr-2" />
              새로고침
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="overflow-hidden border rounded-lg">
          <div className="overflow-x-auto overflow-y-auto max-h-[600px] relative">
            <table className="border-collapse relative" style={{ minWidth: "max-content" }}>
            <thead>
              <tr className="bg-green-600 text-white">
                <th className="sticky top-0 left-0 z-30 bg-green-600 border border-green-500 px-3 py-2 text-center text-sm font-medium whitespace-nowrap" style={{ width: "50px" }}>순위</th>
                <th className="sticky top-0 left-[50px] z-30 bg-green-600 border border-green-500 px-3 py-2 text-left text-sm font-medium whitespace-nowrap" style={{ minWidth: "250px" }}>
                  Product Name
                </th>
                <th className="sticky top-0 z-20 bg-green-600 border border-green-500 px-3 py-2 text-left text-sm font-medium whitespace-nowrap" style={{ minWidth: "120px" }}>
                  Seller SKU
                </th>
                <th className="sticky top-0 z-20 bg-green-600 border border-green-500 px-3 py-2 text-left text-sm font-medium whitespace-nowrap" style={{ minWidth: "100px" }}>
                  SKU ID
                </th>
                {data.weeks.map((week) => (
                  <th key={week} className="sticky top-0 z-20 bg-green-600 border border-green-500 px-3 py-2 text-center text-sm font-medium" style={{ minWidth: "140px" }}>
                    <div className="flex flex-col">
                      <span className="font-bold text-base">{data.formatWeekDisplay[week]}</span>
                      <span className="text-xs opacity-90 font-normal">({data.formatWeekRange[week]})</span>
                    </div>
                  </th>
                ))}
                <th className="sticky top-0 z-20 bg-green-700 border border-green-500 px-3 py-2 text-center text-sm font-medium whitespace-nowrap" style={{ minWidth: "80px" }}>
                  총수량
                </th>
              </tr>
            </thead>
            <tbody>
              {data.products.map((product, index) => {
                const productData = data.matrix[product]
                const skuInfo = data.productSkuMap[product] || { seller_sku: "", sku_id: 0 }
                const isEvenRow = index % 2 === 0

                return (
                  <tr key={product} className={isEvenRow ? "bg-gray-50" : "bg-white"}>
                    <td className={`sticky left-0 z-10 border border-gray-300 px-3 py-2 text-center text-sm font-medium ${isEvenRow ? "bg-gray-50" : "bg-white"}`} style={{ width: "50px" }}>{index + 1}</td>
                    <td className={`sticky left-[50px] z-10 border border-gray-300 px-3 py-2 text-sm ${isEvenRow ? "bg-gray-50" : "bg-white"}`} title={product}>
                      <div className="truncate max-w-[280px]">{product}</div>
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-sm text-center">
                      {skuInfo.seller_sku || "-"}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-sm text-center">{skuInfo.sku_id || "-"}</td>
                    {data.weeks.map((week) => {
                      const quantity = productData[week] || 0
                      return (
                        <td
                          key={week}
                          className={`border border-gray-300 px-3 py-2 text-center text-sm ${
                            quantity > 0 ? "font-semibold" : "text-gray-400"
                          }`}
                        >
                          {quantity || 0}
                        </td>
                      )
                    })}
                    <td className="border border-gray-300 px-3 py-2 text-center text-sm font-bold bg-green-50">
                      {productData.total}
                    </td>
                  </tr>
                )
              })}
              {/* Weekly Totals Row */}
              <tr className="bg-green-800 text-white font-bold">
                <td className="sticky left-0 z-10 bg-green-800 border border-green-600 px-3 py-2 text-center text-sm" style={{ width: "50px" }}></td>
                <td className="sticky left-[50px] z-10 bg-green-800 border border-green-600 px-3 py-2 text-sm whitespace-nowrap">Weekly 발송 수량</td>
                <td className="border border-green-600 px-3 py-2 text-sm"></td>
                <td className="border border-green-600 px-3 py-2 text-sm"></td>
                {data.weeks.map((week) => {
                  const weeklyTotal = data.products.reduce((sum, product) => {
                    return sum + (data.matrix[product][week] || 0)
                  }, 0)
                  return (
                    <td key={week} className="border border-green-600 px-3 py-2 text-center text-sm font-bold">
                      {weeklyTotal}
                    </td>
                  )
                })}
                <td className="border border-green-600 px-3 py-2 text-center text-sm font-bold bg-green-900">
                  {data.products.reduce((sum, product) => sum + data.matrix[product].total, 0)}
                </td>
              </tr>
            </tbody>
          </table>
          </div>
        </div>

        {/* 요약 정보 */}
        <div className="mt-4 p-4 bg-muted/50 rounded-lg">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">총 상품 수:</span>
              <span className="ml-2 font-semibold">{data.products.length}개</span>
            </div>
            <div>
              <span className="text-muted-foreground">분석 기간:</span>
              <span className="ml-2 font-semibold">{data.weeks.length}주</span>
            </div>
            <div>
              <span className="text-muted-foreground">총 발송량:</span>
              <span className="ml-2 font-semibold">
                {data.products.reduce((sum, product) => sum + data.matrix[product].total, 0).toLocaleString()}개
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">주평균:</span>
              <span className="ml-2 font-semibold">
                {data.weeks.length > 0
                  ? Math.round(
                      data.products.reduce((sum, product) => sum + data.matrix[product].total, 0) / data.weeks.length,
                    ).toLocaleString()
                  : 0}
                개
              </span>
            </div>
          </div>
        </div>

        {/* 주별 범위 설명 */}
        <div className="mt-2 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-2">📅 주별 데이터 집계 기준 (월요일~일요일):</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
              {data.weeks.map((week) => (
                <div key={week} className="flex items-center">
                  <span className="font-medium text-green-700">{data.formatWeekDisplay[week]}:</span>
                  <span className="ml-1">{data.formatWeekRange[week]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
