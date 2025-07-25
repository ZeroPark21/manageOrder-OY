"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { Download } from "lucide-react"

interface DailyMatrixData {
  products: string[]
  dates: string[]
  matrix: {
    [product: string]: {
      [date: string]: number
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
interface DailyMatrixTableProps {
  onExcelDownload?: () => void
  downloadLoading?: boolean
}

export function DailyMatrixTable({ onExcelDownload, downloadLoading }: DailyMatrixTableProps) {
  const [data, setData] = useState<DailyMatrixData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/daily-matrix")
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("ko-KR", {
      month: "2-digit",
      day: "2-digit",
    })
  }

  // handleExcelDownload 함수 제거하고 onExcelDownload 사용

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>일별 상품 발송현황</CardTitle>
          <CardDescription>상품별 일일 발송 수량 매트릭스</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.products.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>일별 상품 발송현황</CardTitle>
                <CardDescription>상품별 일일 발송 수량 매트릭스</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleYearChange(-1)}
                  disabled={loading}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="font-medium">{selectedYear}년</span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleYearChange(1)}
                  disabled={loading}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Select value={selectedMonth || 'all'} onValueChange={handleMonthChange}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="월 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 기간</SelectItem>
                    <SelectItem value="01">1월</SelectItem>
                    <SelectItem value="02">2월</SelectItem>
                    <SelectItem value="03">3월</SelectItem>
                    <SelectItem value="04">4월</SelectItem>
                    <SelectItem value="05">5월</SelectItem>
                    <SelectItem value="06">6월</SelectItem>
                    <SelectItem value="07">7월</SelectItem>
                    <SelectItem value="08">8월</SelectItem>
                    <SelectItem value="09">9월</SelectItem>
                    <SelectItem value="10">10월</SelectItem>
                    <SelectItem value="11">11월</SelectItem>
                    <SelectItem value="12">12월</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>데이터가 없습니다.</p>
            <p className="text-sm">
              {selectedMonth && selectedMonth !== 'all' 
                ? `${selectedYear}년 ${parseInt(selectedMonth)}월에는 발송 데이터가 없습니다.`
                : 'CSV 파일을 업로드하여 데이터를 추가하세요.'}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>일별 상품 발송현황</CardTitle>
              <CardDescription>상품별 일일 발송 수량 매트릭스 (총 {data.products.length}개 상품)</CardDescription>
            </div>
            {/* 날짜 필터 */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleYearChange(-1)}
                disabled={loading}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-medium">{selectedYear}년</span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleYearChange(1)}
                disabled={loading}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Select value={selectedMonth || 'all'} onValueChange={handleMonthChange}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="월 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 기간</SelectItem>
                  <SelectItem value="01">1월</SelectItem>
                  <SelectItem value="02">2월</SelectItem>
                  <SelectItem value="03">3월</SelectItem>
                  <SelectItem value="04">4월</SelectItem>
                  <SelectItem value="05">5월</SelectItem>
                  <SelectItem value="06">6월</SelectItem>
                  <SelectItem value="07">7월</SelectItem>
                  <SelectItem value="08">8월</SelectItem>
                  <SelectItem value="09">9월</SelectItem>
                  <SelectItem value="10">10월</SelectItem>
                  <SelectItem value="11">11월</SelectItem>
                  <SelectItem value="12">12월</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={onExcelDownload} disabled={downloadLoading}>
                <Download className="h-4 w-4 mr-2" />
                {downloadLoading ? "다운로드 중..." : "엑셀 다운로드"}
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-blue-600 text-white">
                <th className="border border-blue-500 px-3 py-2 text-left text-sm font-medium w-12">순위</th>
                <th className="border border-blue-500 px-3 py-2 text-left text-sm font-medium min-w-[250px]">
                  Product Name
                </th>
                <th className="border border-blue-500 px-3 py-2 text-left text-sm font-medium w-32">Seller SKU</th>
                <th className="border border-blue-500 px-3 py-2 text-left text-sm font-medium w-24">SKU ID</th>
                {data.dates.map((date) => (
                  <th key={date} className="border border-blue-500 px-3 py-2 text-center text-sm font-medium w-20">
                    {formatDate(date)}
                  </th>
                ))}
                <th className="border border-blue-500 px-3 py-2 text-center text-sm font-medium w-20 bg-blue-700">
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
                    <td className="border border-gray-300 px-3 py-2 text-center text-sm font-medium">{index + 1}</td>
                    <td className="border border-gray-300 px-3 py-2 text-sm" title={product}>
                      <div className="truncate max-w-[230px]">{product}</div>
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-sm" title={skuInfo.seller_sku}>
                      <div className="truncate max-w-[120px]">{skuInfo.seller_sku || "-"}</div>
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-center text-sm">{skuInfo.sku_id || "-"}</td>
                    {data.dates.map((date) => {
                      const quantity = productData[date] || 0
                      return (
                        <td
                          key={date}
                          className={`border border-gray-300 px-3 py-2 text-center text-sm ${
                            quantity > 0 ? "font-semibold" : "text-gray-400"
                          }`}
                        >
                          {quantity || 0}
                        </td>
                      )
                    })}
                    <td className="border border-gray-300 px-3 py-2 text-center text-sm font-bold bg-blue-50">
                      {productData.total}
                    </td>
                  </tr>
                )
              })}
              {/* Daily Totals Row */}
              <tr className="bg-gray-800 text-white font-bold">
                <td className="border border-gray-600 px-3 py-2 text-center text-sm"></td>
                <td className="border border-gray-600 px-3 py-2 text-sm">Daily 발송 수량</td>
                <td className="border border-gray-600 px-3 py-2 text-sm"></td>
                <td className="border border-gray-600 px-3 py-2 text-sm"></td>
                {data.dates.map((date) => {
                  const dailyTotal = data.products.reduce((sum, product) => {
                    return sum + (data.matrix[product][date] || 0)
                  }, 0)
                  return (
                    <td key={date} className="border border-gray-600 px-3 py-2 text-center text-sm font-bold">
                      {dailyTotal}
                    </td>
                  )
                })}
                <td className="border border-gray-600 px-3 py-2 text-center text-sm font-bold bg-gray-900">
                  {data.products.reduce((sum, product) => sum + data.matrix[product].total, 0)}
                </td>
              </tr>
            </tbody>
          </table>
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
              <span className="ml-2 font-semibold">{data.dates.length}일</span>
            </div>
            <div>
              <span className="text-muted-foreground">총 발송량:</span>
              <span className="ml-2 font-semibold">
                {data.products.reduce((sum, product) => sum + data.matrix[product].total, 0).toLocaleString()}개
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">일평균:</span>
              <span className="ml-2 font-semibold">
                {data.dates.length > 0
                  ? Math.round(
                      data.products.reduce((sum, product) => sum + data.matrix[product].total, 0) / data.dates.length,
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
