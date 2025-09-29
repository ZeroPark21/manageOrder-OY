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
  companyId: string
  onExcelDownload?: () => void
  downloadLoading?: boolean
}

export function WeeklyMatrixTable({ companyId, onExcelDownload, downloadLoading }: WeeklyMatrixTableProps) {
  const [data, setData] = useState<WeeklyMatrixData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/matrix/weekly-matrix?companyId=${companyId}`)
      if (!response.ok) {
        throw new Error(`API 요청 실패: ${response.status}`)
      }
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
      <Card className="w-full overflow-hidden">
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
      <Card className="w-full overflow-hidden">
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
    <div className="w-full overflow-hidden">
      <div className="bg-white rounded-lg border shadow-sm w-full">
        <div className="p-6 pb-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-semibold">주별 샘플 발송현황</h3>
                <p className="text-sm text-muted-foreground">상품별 주간 샘플 발송 수량 매트릭스 (총 {data.products.length}개 상품, {data.weeks.length}주 데이터)</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
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
          </div>
        </div>
        <div className="p-6 pt-0">
          <div className="w-full rounded-lg border relative" style={{maxWidth: "100%", maxHeight: "600px", overflow: "auto"}}>
            <table className="border-collapse" style={{minWidth: "1200px", width: "100%"}}>
            <thead style={{position: "sticky", top: 0, zIndex: 10, backgroundColor: "#16a34a"}}>
              <tr className="bg-green-600 text-white">
                <th className="border border-green-500 px-1 py-1 text-xs font-medium text-white" style={{width: "40px"}}>순위</th>
                <th className="border border-green-500 px-1 py-1 text-left text-xs font-medium text-white" style={{width: "200px"}}>
                  Product Name
                </th>
                <th className="border border-green-500 px-1 py-1 text-center text-xs font-medium text-white" style={{width: "50px", whiteSpace: "normal"}}>Seller<br/>SKU</th>
                <th className="border border-green-500 px-1 py-1 text-center text-xs font-medium text-white" style={{width: "50px", whiteSpace: "normal"}}>SKU<br/>ID</th>
                {data.weeks.map((week) => (
                  <th key={week} className="border border-green-500 px-1 py-1 text-center text-xs font-medium text-white" style={{width: "80px"}}>
                    <div className="flex flex-col">
                      <span className="font-bold text-xs">{data.formatWeekDisplay[week]}</span>
                      <span className="text-xs opacity-90 font-normal">({data.formatWeekRange[week]})</span>
                    </div>
                  </th>
                ))}
                <th className="border border-green-500 px-1 py-1 text-center text-xs font-medium text-white" style={{width: "60px"}}>
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
                  <tr key={product} className={isEvenRow ? "bg-gray-50" : ""}>
                    <td className="border border-gray-300 px-1 py-1 text-center text-xs" style={{width: "40px"}}>{index + 1}</td>
                    <td className="border border-gray-300 px-1 py-1 text-xs" style={{width: "200px", maxWidth: "200px"}} title={product}>
                      {product.length > 40 ? `${product.substring(0, 40)}...` : product}
                    </td>
                    <td className="border border-gray-300 px-1 py-1 text-xs text-center" style={{width: "50px", wordBreak: "break-all", whiteSpace: "normal"}}>
                      {skuInfo.seller_sku || "-"}
                    </td>
                    <td className="border border-gray-300 px-1 py-1 text-xs text-center" style={{width: "50px", wordBreak: "break-all", whiteSpace: "normal"}}>{skuInfo.sku_id || "-"}</td>
                    {data.weeks.map((week) => {
                      const quantity = productData[week] || 0
                      return (
                        <td
                          key={week}
                          className={`border border-gray-300 px-1 py-1 text-center text-xs ${
                            quantity > 0 ? "font-semibold" : "text-gray-400"
                          }`}
                          style={{width: "80px"}}
                        >
                          {quantity || 0}
                        </td>
                      )
                    })}
                    <td className="border border-gray-300 px-1 py-1 text-center text-xs font-bold bg-green-50" style={{width: "60px"}}>
                      {productData.total}
                    </td>
                  </tr>
                )
              })}
              {/* Weekly Totals Row */}
              <tr className="bg-gray-800 text-white font-bold">
                <td className="border border-gray-600 px-1 py-1 text-center text-xs" style={{width: "40px"}}></td>
                <td className="border border-gray-600 px-1 py-1 text-xs whitespace-nowrap" style={{width: "200px"}}>Weekly 발송 수량</td>
                <td className="border border-gray-600 px-1 py-1 text-xs" style={{width: "50px"}}></td>
                <td className="border border-gray-600 px-1 py-1 text-xs" style={{width: "50px"}}></td>
                {data.weeks.map((week) => {
                  const weeklyTotal = data.products.reduce((sum, product) => {
                    return sum + (data.matrix[product][week] || 0)
                  }, 0)
                  return (
                    <td key={week} className="border border-gray-600 px-1 py-1 text-center text-xs font-bold" style={{width: "80px"}}>
                      {weeklyTotal}
                    </td>
                  )
                })}
                <td className="border border-gray-600 px-1 py-1 text-center text-xs font-bold bg-gray-900" style={{width: "60px"}}>
                  {data.products.reduce((sum, product) => sum + data.matrix[product].total, 0)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 요약 정보 */}
        <div className="m-4 p-4 bg-muted/50 rounded-lg">
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
        <div className="m-4 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
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
        </div>
      </div>
    </div>
  )
}
