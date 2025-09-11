"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw, Download } from "lucide-react"

interface MonthlyMatrixData {
  products: string[]
  months: string[]
  matrix: {
    [product: string]: {
      [month: string]: number
      total: number
    }
  }
  productSkuMap: {
    [product: string]: {
      seller_sku: string
      sku_id: number
    }
  }
}

// Props 인터페이스에 추가
interface MonthlyMatrixTableProps {
  onExcelDownload?: () => void
  downloadLoading?: boolean
}

export function MonthlyMatrixTable({ onExcelDownload, downloadLoading }: MonthlyMatrixTableProps) {
  const [data, setData] = useState<MonthlyMatrixData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/matrix/monthly-matrix")
      if (!response.ok) {
        throw new Error(`API 요청 실패: ${response.status}`)
      }
      const result = await response.json()
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
          <CardTitle>월별 샘플 발송현황</CardTitle>
          <CardDescription>상품별 월간 샘플 발송 수량 매트릭스 (SKU Unit Original Price = 0)</CardDescription>
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
          <CardTitle>월별 샘플 발송현황</CardTitle>
          <CardDescription>상품별 월간 샘플 발송 수량 매트릭스 (SKU Unit Original Price = 0)</CardDescription>
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
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <CardTitle>월별 샘플 발송현황</CardTitle>
            <CardDescription>상품별 월간 샘플 발송 수량 매트릭스 (총 {data.products.length}개 상품)</CardDescription>
          </div>
          {/* 헤더 부분의 버튼 수정 */}
          <div className="space-x-2 flex-shrink-0">
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
      <CardContent>
        <div className="w-full rounded-lg border relative" style={{maxWidth: "100%", maxHeight: "600px", overflow: "auto"}}>
          <table className="border-collapse" style={{minWidth: "1200px", width: "100%"}}>
            <thead style={{position: "sticky", top: 0, zIndex: 10, backgroundColor: "#9333ea"}}>
              <tr className="bg-purple-600 text-white">
                <th className="border border-purple-500 px-2 py-2 text-center text-xs font-medium text-white" style={{width: "60px"}}>순위</th>
                <th className="border border-purple-500 px-2 py-2 text-left text-xs font-medium text-white" style={{width: "200px"}}>
                  Product Name
                </th>
                <th className="border border-purple-500 px-2 py-2 text-center text-xs font-medium text-white" style={{width: "80px"}}>
                  Seller SKU
                </th>
                <th className="border border-purple-500 px-2 py-2 text-center text-xs font-medium text-white" style={{width: "80px"}}>
                  SKU ID
                </th>
                {data.months.map((month) => (
                  <th key={month} className="border border-purple-500 px-2 py-2 text-center text-xs font-medium text-white" style={{width: "80px"}}>
                    {month}
                  </th>
                ))}
                <th className="border border-purple-500 px-2 py-2 text-center text-xs font-medium text-white" style={{width: "80px"}}>
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
                    <td className="border border-gray-300 px-2 py-1 text-center text-xs font-medium" style={{width: "60px"}}>{index + 1}</td>
                    <td className="border border-gray-300 px-2 py-1 text-xs" style={{width: "200px", maxWidth: "200px"}} title={product}>
                      {product.length > 40 ? `${product.substring(0, 40)}...` : product}
                    </td>
                    <td className="border border-gray-300 px-2 py-1 text-xs text-center" style={{width: "80px"}}>
                      {skuInfo.seller_sku || "-"}
                    </td>
                    <td className="border border-gray-300 px-2 py-1 text-xs text-center" style={{width: "80px"}}>{skuInfo.sku_id || "-"}</td>
                    {data.months.map((month) => {
                      const quantity = productData[month] || 0
                      return (
                        <td
                          key={month}
                          className={`border border-gray-300 px-2 py-1 text-center text-xs ${
                            quantity > 0 ? "font-semibold" : "text-gray-400"
                          }`}
                          style={{width: "80px"}}
                        >
                          {quantity || 0}
                        </td>
                      )
                    })}
                    <td className="border border-gray-300 px-2 py-1 text-center text-xs font-bold bg-purple-50" style={{width: "80px"}}>
                      {productData.total}
                    </td>
                  </tr>
                )
              })}
              <tr className="bg-purple-800 text-white font-bold">
                <td className="border border-purple-600 px-2 py-1 text-center text-xs" style={{width: "60px"}}></td>
                <td className="border border-purple-600 px-2 py-1 text-xs whitespace-nowrap" style={{width: "200px"}}>Monthly 발송 수량</td>
                <td className="border border-purple-600 px-2 py-1 text-xs" style={{width: "80px"}}></td>
                <td className="border border-purple-600 px-2 py-1 text-xs" style={{width: "80px"}}></td>
                {data.months.map((month) => {
                  const monthlyTotal = data.products.reduce((sum, product) => {
                    return sum + (data.matrix[product][month] || 0)
                  }, 0)
                  return (
                    <td key={month} className="border border-purple-600 px-2 py-1 text-center text-xs font-bold" style={{width: "80px"}}>
                      {monthlyTotal}
                    </td>
                  )
                })}
                <td className="border border-purple-600 px-2 py-1 text-center text-xs font-bold bg-purple-900" style={{width: "80px"}}>
                  {data.products.reduce((sum, product) => sum + data.matrix[product].total, 0)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 요약 정보 */}
        <div className="mt-4 mx-4 p-4 bg-muted/50 rounded-lg">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">총 상품 수:</span>
              <span className="ml-2 font-semibold">{data.products.length}개</span>
            </div>
            <div>
              <span className="text-muted-foreground">분석 기간:</span>
              <span className="ml-2 font-semibold">{data.months.length}개월</span>
            </div>
            <div>
              <span className="text-muted-foreground">총 발송량:</span>
              <span className="ml-2 font-semibold">
                {data.products.reduce((sum, product) => sum + data.matrix[product].total, 0).toLocaleString()}개
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">월평균:</span>
              <span className="ml-2 font-semibold">
                {data.months.length > 0
                  ? Math.round(
                      data.products.reduce((sum, product) => sum + data.matrix[product].total, 0) / data.months.length,
                    ).toLocaleString()
                  : 0}
                개
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
