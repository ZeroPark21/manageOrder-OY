"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { Download, ChevronLeft, ChevronRight } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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
  const [selectedMonth, setSelectedMonth] = useState<string>('')
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())

  const fetchData = async (year?: number, month?: string) => {
    setLoading(true)
    try {
      let url = "/api/matrix/daily-matrix"
      if (year && month) {
        const startDate = `${year}-${month}-01`
        const lastDay = new Date(year, parseInt(month), 0).getDate()
        const endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`
        url += `?startDate=${startDate}&endDate=${endDate}`
      }
      const response = await fetch(url)
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
    // 현재 월로 초기화
    const now = new Date()
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0')
    const currentYear = now.getFullYear()
    
    // 2025년 6월 이전이면 6월로 설정
    if (currentYear === 2025 && parseInt(currentMonth) < 6) {
      setSelectedMonth('06')
      fetchData(currentYear, '06')
    } else {
      setSelectedMonth(currentMonth)
      fetchData(currentYear, currentMonth)
    }
  }, [])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("ko-KR", {
      month: "2-digit",
      day: "2-digit",
    })
  }
  
  const handleMonthChange = (value: string) => {
    if (value === 'all') {
      setSelectedMonth('')
      fetchData()
    } else {
      // 2025년의 경우 6월 이전은 선택 불가
      if (selectedYear === 2025 && parseInt(value) < 6) {
        return
      }
      setSelectedMonth(value)
      fetchData(selectedYear, value)
    }
  }
  
  const handleYearChange = (increment: number) => {
    const newYear = selectedYear + increment
    // 2024년 이전은 선택 불가
    if (newYear < 2025) return
    setSelectedYear(newYear)
    if (selectedMonth && selectedMonth !== 'all') {
      // 2025년으로 변경 시 6월 이전 선택되어 있으면 6월로 변경
      if (newYear === 2025 && parseInt(selectedMonth) < 6) {
        setSelectedMonth('06')
        fetchData(newYear, '06')
      } else {
        fetchData(newYear, selectedMonth)
      }
    } else {
      // 전체 기간 선택 시
      fetchData()
    }
  }
  
  // 월 옵션 렌더링 함수
  const renderMonthOptions = () => {
    const months = [
      { value: '01', label: '1월' },
      { value: '02', label: '2월' },
      { value: '03', label: '3월' },
      { value: '04', label: '4월' },
      { value: '05', label: '5월' },
      { value: '06', label: '6월' },
      { value: '07', label: '7월' },
      { value: '08', label: '8월' },
      { value: '09', label: '9월' },
      { value: '10', label: '10월' },
      { value: '11', label: '11월' },
      { value: '12', label: '12월' },
    ]
    
    return months.map(month => {
      // 2025년의 경우 6월 이전은 비활성화
      const isDisabled = selectedYear === 2025 && parseInt(month.value) < 6
      return (
        <SelectItem 
          key={month.value} 
          value={month.value} 
          disabled={isDisabled}
        >
          {month.label}
        </SelectItem>
      )
    })
  }

  // handleExcelDownload 함수 제거하고 onExcelDownload 사용

  if (loading) {
    return (
      <div style={{width: "100%", overflow: "hidden"}}>
        <div className="bg-white rounded-lg border shadow-sm" style={{width: "100%"}}>
          <div className="p-6">
            <h3 className="text-lg font-semibold">일별 샘플 발송현황</h3>
            <p className="text-sm text-muted-foreground">상품별 일일 샘플 발송 수량 매트릭스 (SKU Unit Original Price = 0)</p>
          </div>
          <div className="p-6 pt-0">
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!data || !data.products || data.products.length === 0) {
    return (
      <div style={{width: "100%", overflow: "hidden"}}>
        <div className="bg-white rounded-lg border shadow-sm" style={{width: "100%"}}>
          <div className="p-6">
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold">일별 샘플 발송현황</h3>
                  <p className="text-sm text-muted-foreground">상품별 일일 샘플 발송 수량 매트릭스 (SKU Unit Original Price = 0)</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleYearChange(-1)}
                    disabled={loading || selectedYear <= 2025}
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
                      {renderMonthOptions()}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
          <div className="p-6 pt-0">
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-lg font-medium mb-2">데이터 없음</p>
              <p className="text-sm">
                {selectedMonth && selectedMonth !== 'all' 
                  ? `${selectedYear}년 ${parseInt(selectedMonth)}월에는 데이터가 없습니다.`
                  : '상품 발송 데이터를 업로드하여 분석을 시작하세요.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full overflow-hidden">
      <div className="bg-white rounded-lg border shadow-sm w-full">
        <div className="p-6 pb-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-semibold">일별 샘플 발송현황</h3>
                <p className="text-sm text-muted-foreground">상품별 일일 샘플 발송 수량 매트릭스 (총 {data.products.length}개 상품)</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleYearChange(-1)}
                  disabled={loading || selectedYear <= 2025}
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
                    {renderMonthOptions()}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={onExcelDownload} disabled={downloadLoading}>
                  <Download className="h-4 w-4 mr-2" />
                  {downloadLoading ? "다운로드 중..." : "엑셀 다운로드"}
                </Button>
              </div>
            </div>
          </div>
        </div>
        <div className="p-6 pt-0">
          <div className="w-full rounded-lg border relative" style={{maxWidth: "100%", maxHeight: "600px", overflow: "auto"}}>
            <table className="border-collapse" style={{minWidth: "1200px", width: "100%"}}>
            <thead style={{position: "sticky", top: 0, zIndex: 10, backgroundColor: "#2563eb"}}>
              <tr className="bg-blue-600 text-white">
                <th className="border border-blue-500 px-1 py-1 text-xs font-medium text-white" style={{width: "40px"}}>순위</th>
                <th className="border border-blue-500 px-1 py-1 text-left text-xs font-medium text-white" style={{width: "200px"}}>
                  Product Name
                </th>
                <th className="border border-blue-500 px-1 py-1 text-center text-xs font-medium text-white" style={{width: "50px"}}>Seller SKU</th>
                <th className="border border-blue-500 px-1 py-1 text-center text-xs font-medium text-white" style={{width: "50px"}}>SKU ID</th>
                {data.dates.map((date) => (
                  <th key={date} className="border border-blue-500 px-1 py-1 text-center text-xs font-medium text-white" style={{width: "45px"}}>
                    {formatDate(date)}
                  </th>
                ))}
                <th className="border border-blue-500 px-1 py-1 text-center text-xs font-medium text-white" style={{width: "60px"}}>
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
                    {data.dates.map((date) => {
                      const quantity = productData[date] || 0
                      return (
                        <td
                          key={date}
                          className={`border border-gray-300 px-1 py-1 text-center text-xs ${
                            quantity > 0 ? "font-semibold" : "text-gray-400"
                          }`}
                          style={{width: "45px"}}
                        >
                          {quantity || 0}
                        </td>
                      )
                    })}
                    <td className="border border-gray-300 px-1 py-1 text-center text-xs font-bold bg-blue-50" style={{width: "60px"}}>
                      {productData.total}
                    </td>
                  </tr>
                )
              })}
              {/* Daily Totals Row */}
              <tr className="bg-gray-800 text-white font-bold">
                <td className="border border-gray-600 px-1 py-1 text-center text-xs" style={{width: "40px"}}></td>
                <td className="border border-gray-600 px-1 py-1 text-xs whitespace-nowrap" style={{width: "200px"}}>Daily 발송 수량</td>
                <td className="border border-gray-600 px-1 py-1 text-xs" style={{width: "50px"}}></td>
                <td className="border border-gray-600 px-1 py-1 text-xs" style={{width: "50px"}}></td>
                {data.dates.map((date) => {
                  const dailyTotal = data.products.reduce((sum, product) => {
                    return sum + (data.matrix[product][date] || 0)
                  }, 0)
                  return (
                    <td key={date} className="border border-gray-600 px-1 py-1 text-center text-xs font-bold" style={{width: "45px"}}>
                      {dailyTotal}
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
        </div>
      </div>
    </div>
  )
}
