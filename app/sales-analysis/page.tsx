"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TrendingUp, BarChart3, Package, DollarSign, ChevronLeft, ChevronRight } from "lucide-react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  weekly: {
    weeks: string[]
    products: string[]
    matrix: {
      [product: string]: {
        [week: string]: {
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
  monthly: {
    months: string[]
    products: string[]
    matrix: {
      [product: string]: {
        [month: string]: {
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

interface MatrixTableProps {
  data: SalesAnalysisData
  type: 'daily' | 'weekly' | 'monthly'
  selectedYear: number
  selectedMonth: string
  onYearChange: (increment: number) => void
  onMonthChange: (value: string) => void
}

function SalesMatrixTable({ data, type, selectedYear, selectedMonth, onYearChange, onMonthChange }: MatrixTableProps) {
  const matrixData = data[type]
  
  if (!matrixData || !matrixData.products.length) {
    return (
      <div style={{width: "100%", overflow: "hidden"}}>
        <div className="bg-white rounded-lg border shadow-sm" style={{width: "100%"}}>
          <div className="p-6">
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold">
                    {type === 'daily' ? '일별' : type === 'weekly' ? '주별' : '월별'} 매출 현황
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    상품별 {type === 'daily' ? '일일' : type === 'weekly' ? '주간' : '월간'} 매출 수량 매트릭스 (Order Amount &gt; 0)
                  </p>
                </div>
                {type !== 'monthly' && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => onYearChange(-1)}
                      disabled={selectedYear <= 2025}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="font-medium">{selectedYear}년</span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => onYearChange(1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Select value={selectedMonth || 'all'} onValueChange={onMonthChange}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="월 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">전체 기간</SelectItem>
                        {Array.from({length: 12}, (_, i) => i + 1).map(month => {
                          const monthValue = String(month).padStart(2, '0')
                          const isDisabled = selectedYear === 2025 && month < 6
                          return (
                            <SelectItem key={monthValue} value={monthValue} disabled={isDisabled}>
                              {month}월
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="p-6 pt-0">
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-lg font-medium mb-2">데이터 없음</p>
              <p className="text-sm">
                {selectedMonth && selectedMonth !== 'all' 
                  ? `${selectedYear}년 ${parseInt(selectedMonth)}월에는 데이터가 없습니다.`
                  : '매출 데이터를 업로드하여 분석을 시작하세요.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    if (type === 'daily') {
      return date.toLocaleDateString("ko-KR", {
        month: "2-digit",
        day: "2-digit",
      })
    } else if (type === 'weekly') {
      // 주별 표시: 시작일자와 기간 표시
      const startDate = new Date(dateString)
      const endDate = new Date(startDate)
      endDate.setDate(startDate.getDate() + 6)
      
      const startMonth = String(startDate.getMonth() + 1).padStart(2, '0')
      const startDay = String(startDate.getDate()).padStart(2, '0')
      const endMonth = String(endDate.getMonth() + 1).padStart(2, '0')
      const endDay = String(endDate.getDate()).padStart(2, '0')
      
      return (
        <div className="text-center">
          <div className="text-xs font-medium">{startMonth}.{startDay}</div>
          <div className="text-xs text-white">({startMonth}/{startDay}-{endMonth}/{endDay})</div>
        </div>
      )
    } else {
      return `${date.getMonth() + 1}월`
    }
  }

  const timeKeys = type === 'daily' ? (matrixData as any).dates : 
                   type === 'weekly' ? (matrixData as any).weeks : 
                   (matrixData as any).months

  return (
    <div className="w-full overflow-hidden">
      <div className="bg-white rounded-lg border shadow-sm w-full">
        <div className="p-6 pb-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-semibold">
                  {type === 'daily' ? '일별' : type === 'weekly' ? '주별' : '월별'} 매출 현황
                </h3>
                <p className="text-sm text-muted-foreground">
                  상품별 {type === 'daily' ? '일일' : type === 'weekly' ? '주간' : '월간'} 매출 수량 매트릭스 (총 {matrixData.products.length}개 상품)
                </p>
              </div>
              {type !== 'monthly' && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onYearChange(-1)}
                    disabled={selectedYear <= 2025}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="font-medium">{selectedYear}년</span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onYearChange(1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Select value={selectedMonth || 'all'} onValueChange={onMonthChange}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="월 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체 기간</SelectItem>
                      {Array.from({length: 12}, (_, i) => i + 1).map(month => {
                        const monthValue = String(month).padStart(2, '0')
                        const isDisabled = selectedYear === 2025 && month < 6
                        return (
                          <SelectItem key={monthValue} value={monthValue} disabled={isDisabled}>
                            {month}월
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="p-6 pt-0">
          <div className="w-full overflow-x-auto rounded-lg" style={{maxWidth: "100%", maxHeight: "800px", position: "relative"}}>
            <table className="border-collapse" style={{minWidth: "900px", tableLayout: "fixed"}}>
              <thead style={{position: "sticky", top: 0, zIndex: 5}}>
                <tr className="bg-blue-600 text-white">
                  <th className="border border-blue-500 px-1 py-1 text-xs font-medium text-white" style={{width: "40px"}}>순위</th>
                  <th className="border border-blue-500 px-1 py-1 text-left text-xs font-medium text-white" style={{width: "200px"}}>
                    Product Name
                  </th>
                  <th className="border border-blue-500 px-1 py-1 text-center text-xs font-medium text-white" style={{width: "50px", whiteSpace: "normal"}}>Seller<br/>SKU</th>
                  <th className="border border-blue-500 px-1 py-1 text-center text-xs font-medium text-white" style={{width: "50px", whiteSpace: "normal"}}>SKU<br/>ID</th>
                  {timeKeys.map((timeKey: string) => (
                    <th key={timeKey} className="border border-blue-500 px-1 py-1 text-center text-xs font-medium text-white" style={{width: type === 'weekly' ? "80px" : "60px"}}>
                      {formatDate(timeKey)}
                    </th>
                  ))}
                  <th className="border border-blue-500 px-1 py-1 text-center text-xs font-medium text-white" style={{width: "70px"}}>
                    총 수량
                  </th>
                  <th className="border border-blue-500 px-1 py-1 text-center text-xs font-medium text-white" style={{width: "80px"}}>
                    총 매출
                  </th>
                </tr>
              </thead>
              <tbody>
                {matrixData.products.map((product, index) => {
                  const productData = matrixData.matrix[product]
                  const skuInfo = matrixData.productSkuMap[product] || { seller_sku: "", sku_id: 0 }
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
                      {timeKeys.map((timeKey: string) => {
                        const timeData = productData[timeKey]
                        return (
                          <td
                            key={timeKey}
                            className="border border-gray-300 px-1 py-1 text-center text-xs"
                            style={{width: type === 'weekly' ? "80px" : "60px"}}
                          >
                            {timeData ? (
                              <div>
                                <div className={timeData.quantity > 0 ? "font-semibold" : "text-gray-400"}>
                                  {timeData.quantity || 0}
                                </div>
                                <div className="text-blue-700 font-bold">
                                  ${timeData.revenue.toFixed(0)}
                                </div>
                              </div>
                            ) : (
                              <div className="text-gray-400">-</div>
                            )}
                          </td>
                        )
                      })}
                      <td className="border border-gray-300 px-1 py-1 text-center text-xs font-bold bg-blue-50" style={{width: "70px"}}>
                        {productData.total.quantity}
                      </td>
                      <td className="border border-gray-300 px-1 py-1 text-center text-xs font-bold bg-blue-50" style={{width: "80px"}}>
                        <span className="text-blue-700 font-bold">${productData.total.revenue.toFixed(0)}</span>
                      </td>
                    </tr>
                  )
                })}
                {/* Totals Row */}
                <tr className="bg-gray-800 text-white font-bold">
                  <td className="border border-gray-600 px-1 py-1 text-center text-xs" style={{width: "40px"}}></td>
                  <td className="border border-gray-600 px-1 py-1 text-xs whitespace-nowrap" style={{width: "200px"}}>
                    {type === 'daily' ? 'Daily' : type === 'weekly' ? 'Weekly' : 'Monthly'} 매출 합계
                  </td>
                  <td className="border border-gray-600 px-1 py-1 text-xs" style={{width: "50px"}}></td>
                  <td className="border border-gray-600 px-1 py-1 text-xs" style={{width: "50px"}}></td>
                  {timeKeys.map((timeKey: string) => {
                    const periodTotal = matrixData.products.reduce((sum, product) => {
                      const timeData = matrixData.matrix[product][timeKey]
                      return sum + (timeData ? timeData.quantity : 0)
                    }, 0)
                    const periodRevenue = matrixData.products.reduce((sum, product) => {
                      const timeData = matrixData.matrix[product][timeKey]
                      return sum + (timeData ? timeData.revenue : 0)
                    }, 0)
                    return (
                      <td key={timeKey} className="border border-gray-600 px-1 py-1 text-center text-xs font-bold" style={{width: type === 'weekly' ? "80px" : "60px"}}>
                        <div>{periodTotal}</div>
                        <div className="text-blue-300 font-bold">${periodRevenue.toFixed(0)}</div>
                      </td>
                    )
                  })}
                  <td className="border border-gray-600 px-1 py-1 text-center text-xs font-bold bg-gray-900" style={{width: "70px"}}>
                    {matrixData.products.reduce((sum, product) => sum + matrixData.matrix[product].total.quantity, 0)}
                  </td>
                  <td className="border border-gray-600 px-1 py-1 text-center text-xs font-bold bg-gray-900" style={{width: "80px"}}>
                    <span className="text-blue-300 font-bold">${matrixData.products.reduce((sum, product) => sum + matrixData.matrix[product].total.revenue, 0).toFixed(0)}</span>
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
                <span className="ml-2 font-semibold">{matrixData.products.length}개</span>
              </div>
              <div>
                <span className="text-muted-foreground">분석 기간:</span>
                <span className="ml-2 font-semibold">{timeKeys.length}{type === 'daily' ? '일' : type === 'weekly' ? '주' : '개월'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">총 판매량:</span>
                <span className="ml-2 font-semibold">
                  {matrixData.products.reduce((sum, product) => sum + matrixData.matrix[product].total.quantity, 0).toLocaleString()}개
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">총 매출액:</span>
                <span className="ml-2 font-semibold text-blue-700">
                  ${matrixData.products.reduce((sum, product) => sum + matrixData.matrix[product].total.revenue, 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SalesAnalysis() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<SalesAnalysisData | null>(null)
  const [allData, setAllData] = useState<SalesAnalysisData | null>(null)
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState<string>('')

  const fetchData = async (year?: number, month?: string, forceAll?: boolean) => {
    try {
      setLoading(true)
      console.log("🔄 Fetching sales analysis data from API...")
      
      let url = "/api/sales-analysis"
      // forceAll이 true이거나 year와 month가 모두 없으면 전체 데이터
      if (!forceAll && year && month) {
        const startDate = `${year}-${month}-01`
        const lastDay = new Date(year, parseInt(month), 0).getDate()
        const endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`
        url += `?startDate=${startDate}&endDate=${endDate}`
        console.log(`📅 Fetching filtered data for ${year}-${month}`)
      } else {
        console.log("📅 Fetching all data (no filter)")
      }
      
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`API 요청 실패: ${response.status}`)
      }
      
      const salesData = await response.json()
      
      if (salesData.error) {
        throw new Error(`API 오류: ${salesData.error}`)
      }
      
      setData(salesData)
      
      // 초기 로드 시에만 최신 월 자동 설정 (forceAll이 false이고 파라미터가 없을 때)
      if (!forceAll && !year && !month && salesData.daily.dates.length > 0) {
        const latestDate = salesData.daily.dates[salesData.daily.dates.length - 1]
        const latestDateObj = new Date(latestDate)
        const latestYear = latestDateObj.getFullYear()
        const latestMonth = String(latestDateObj.getMonth() + 1).padStart(2, '0')
        
        console.log(`📅 Initial load - setting to latest data: ${latestYear}-${latestMonth}`)
        
        // 가장 최근 월의 데이터로 다시 로드
        setSelectedYear(latestYear)
        setSelectedMonth(latestMonth)
        
        // 재귀 호출로 해당 월 데이터 로드
        setTimeout(() => {
          fetchData(latestYear, latestMonth)
        }, 100)
        return
      }
      
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

  const fetchAllData = async () => {
    try {
      console.log("🔄 Fetching all sales analysis data for monthly view...")
      
      const response = await fetch("/api/sales-analysis")
      if (!response.ok) {
        throw new Error(`API 요청 실패: ${response.status}`)
      }
      
      const salesData = await response.json()
      
      if (salesData.error) {
        throw new Error(`API 오류: ${salesData.error}`)
      }
      
      setAllData(salesData)
      
      console.log("✅ All sales analysis data loaded for monthly view")
      
    } catch (error) {
      console.error("❌ Failed to fetch all sales analysis data:", error)
      setAllData(null)
    }
  }

  useEffect(() => {
    // 전체 데이터 로드 (월별 분석용)
    fetchAllData()
    
    // 전체 데이터를 먼저 불러서 가장 최근 날짜가 있는 월을 찾기
    fetchData()
  }, [])

  const handleYearChange = (increment: number) => {
    const newYear = selectedYear + increment
    // 2025년 이전은 선택 불가
    if (newYear < 2025) return
    setSelectedYear(newYear)
    if (selectedMonth && selectedMonth !== '') {
      // 2025년으로 변경 시 6월 이전 선택되어 있으면 6월로 변경
      if (newYear === 2025 && parseInt(selectedMonth) < 6) {
        setSelectedMonth('06')
        fetchData(newYear, '06')
      } else {
        fetchData(newYear, selectedMonth)
      }
    } else {
      // 전체 기간 선택 시
      console.log("🌍 Year changed with 전체 기간 selected - loading all data")
      fetchData(undefined, undefined, true)
    }
  }

  const handleMonthChange = (value: string) => {
    if (value === 'all') {
      setSelectedMonth('')
      console.log("🌍 User selected 전체 기간 - loading all data")
      fetchData(undefined, undefined, true)  // forceAll = true로 전체 데이터 로드
    } else {
      // 2025년의 경우 6월 이전은 선택 불가
      if (selectedYear === 2025 && parseInt(value) < 6) {
        return
      }
      setSelectedMonth(value)
      fetchData(selectedYear, value)
    }
  }

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
              <p className="text-muted-foreground">실제 매출이 발생한 주문 분석 (SKU Unit Original Price &gt; 0)</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => {
                if (!selectedMonth || selectedMonth === '') {
                  console.log("🔄 Refresh with 전체 기간")
                  fetchData(undefined, undefined, true)
                } else {
                  console.log(`🔄 Refresh with filter: ${selectedYear}-${selectedMonth}`)
                  fetchData(selectedYear, selectedMonth)
                }
              }}>
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
              <TabsTrigger value="weekly">주별 매출 분석</TabsTrigger>
              <TabsTrigger value="monthly">월별 매출 분석</TabsTrigger>
            </TabsList>

            <TabsContent value="daily" className="space-y-4">
              {data ? (
                <SalesMatrixTable 
                  data={data} 
                  type="daily"
                  selectedYear={selectedYear}
                  selectedMonth={selectedMonth}
                  onYearChange={handleYearChange}
                  onMonthChange={handleMonthChange}
                />
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">데이터를 불러올 수 없습니다.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="weekly" className="space-y-4">
              {data ? (
                <SalesMatrixTable 
                  data={data} 
                  type="weekly"
                  selectedYear={selectedYear}
                  selectedMonth={selectedMonth}
                  onYearChange={handleYearChange}
                  onMonthChange={handleMonthChange}
                />
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">데이터를 불러올 수 없습니다.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="monthly" className="space-y-4">
              {allData ? (
                <SalesMatrixTable 
                  data={allData} 
                  type="monthly"
                  selectedYear={selectedYear}
                  selectedMonth=""
                  onYearChange={handleYearChange}
                  onMonthChange={handleMonthChange}
                />
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">데이터를 불러올 수 없습니다.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  )
}