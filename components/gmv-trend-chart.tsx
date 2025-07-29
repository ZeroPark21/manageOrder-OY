"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { TrendingUp, TrendingDown, Calendar, RefreshCw, AlertCircle } from "lucide-react"
import { format } from "date-fns"
import { ko } from "date-fns/locale"

interface GMVTrendData {
  date: string
  total_gmv: number
  total_orders: number
  total_ad_spend: number
  roi: number
  avg_click_rate: number
  avg_conversion_rate: number
}

interface CollectionStatus {
  lastSuccessfulCollection: string | null
  missingDates: string[]
  isCollecting: boolean
}

export function GMVTrendChart() {
  const [view, setView] = useState<"daily" | "weekly" | "monthly">("daily")
  const [data, setData] = useState<GMVTrendData[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState("last30days")
  const [stats, setStats] = useState<any>(null)
  const [collectionStatus, setCollectionStatus] = useState<CollectionStatus>({
    lastSuccessfulCollection: null,
    missingDates: [],
    isCollecting: false
  })

  // 날짜 범위 계산
  const getDateRange = () => {
    const endDate = new Date()
    let startDate = new Date()

    switch (dateRange) {
      case "last7days":
        startDate.setDate(endDate.getDate() - 7)
        break
      case "last30days":
        startDate.setDate(endDate.getDate() - 30)
        break
      case "last90days":
        startDate.setDate(endDate.getDate() - 90)
        break
      case "thisMonth":
        startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1)
        break
      case "lastMonth":
        startDate = new Date(endDate.getFullYear(), endDate.getMonth() - 1, 1)
        endDate.setDate(0) // 이전 달의 마지막 날
        break
    }

    return {
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0]
    }
  }

  // 데이터 가져오기
  const fetchData = async () => {
    setLoading(true)
    try {
      const { startDate, endDate } = getDateRange()
      
      const response = await fetch(
        `/api/gmv-trends?view=${view}&startDate=${startDate}&endDate=${endDate}`
      )
      const result = await response.json()

      if (result.data) {
        // 날짜 필드명 통일
        const formattedData = result.data.map((item: any) => ({
          ...item,
          date: item.gmv_date || item.week_start || item.month_start,
          roi: parseFloat(item.roi) || 0
        }))
        setData(formattedData)
        setStats(result.stats)
      }
    } catch (error) {
      console.error("데이터 로딩 실패:", error)
    } finally {
      setLoading(false)
    }
  }

  // 수집 상태 확인
  const checkCollectionStatus = async () => {
    try {
      const response = await fetch("/api/gmv-trends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get-collection-status" })
      })
      const result = await response.json()
      
      setCollectionStatus({
        lastSuccessfulCollection: result.lastSuccessfulCollection,
        missingDates: result.missingDates || [],
        isCollecting: false
      })
    } catch (error) {
      console.error("수집 상태 확인 실패:", error)
    }
  }

  useEffect(() => {
    fetchData()
    checkCollectionStatus()
  }, [view, dateRange])

  // 차트 데이터 포맷
  const formatValue = (value: number, type: string) => {
    switch (type) {
      case "currency":
        return `₩${value.toLocaleString()}`
      case "percent":
        return `${value.toFixed(2)}%`
      case "number":
        return value.toLocaleString()
      default:
        return value
    }
  }

  // 차트 툴팁 커스터마이징
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded shadow-lg border">
          <p className="font-semibold">{format(new Date(label), "yyyy년 MM월 dd일", { locale: ko })}</p>
          <div className="mt-2 space-y-1">
            {payload.map((entry: any, index: number) => (
              <p key={index} className="text-sm" style={{ color: entry.color }}>
                <span className="font-medium">{entry.name}:</span>{" "}
                {formatValue(entry.value, entry.dataKey.includes("rate") || entry.dataKey === "roi" ? "percent" : entry.dataKey.includes("gmv") || entry.dataKey.includes("spend") ? "currency" : "number")}
              </p>
            ))}
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      {/* 수집 상태 알림 */}
      {collectionStatus.missingDates.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
          <CardContent className="flex items-center gap-2 pt-6">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              {collectionStatus.missingDates.length}개 날짜의 데이터가 누락되었습니다.
              마지막 수집: {collectionStatus.lastSuccessfulCollection || "없음"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* 컨트롤 패널 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Tabs value={view} onValueChange={(v) => setView(v as any)}>
          <TabsList>
            <TabsTrigger value="daily">일별</TabsTrigger>
            <TabsTrigger value="weekly">주별</TabsTrigger>
            <TabsTrigger value="monthly">월별</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last7days">최근 7일</SelectItem>
              <SelectItem value="last30days">최근 30일</SelectItem>
              <SelectItem value="last90days">최근 90일</SelectItem>
              <SelectItem value="thisMonth">이번 달</SelectItem>
              <SelectItem value="lastMonth">지난 달</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* 요약 통계 */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">총 GMV</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">₩{stats.totalGMV?.toLocaleString() || 0}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">총 주문수</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.totalOrders?.toLocaleString() || 0}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">총 광고비</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">₩{stats.totalAdSpend?.toLocaleString() || 0}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">평균 ROI</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold flex items-center">
                {stats.avgROI?.toFixed(2) || 0}
                {stats.avgROI > 1 ? (
                  <TrendingUp className="h-4 w-4 ml-1 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 ml-1 text-red-500" />
                )}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">평균 전환율</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.avgCVR?.toFixed(2) || 0}%</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* GMV & ROI 차트 */}
      <Card>
        <CardHeader>
          <CardTitle>GMV & ROI 추이</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(date) => format(new Date(date), view === "daily" ? "MM/dd" : "yyyy/MM", { locale: ko })}
                />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="total_gmv"
                  stroke="#3b82f6"
                  name="GMV"
                  strokeWidth={2}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="roi"
                  stroke="#10b981"
                  name="ROI"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 주문 & 광고비 차트 */}
      <Card>
        <CardHeader>
          <CardTitle>주문수 & 광고비 추이</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(date) => format(new Date(date), view === "daily" ? "MM/dd" : "yyyy/MM", { locale: ko })}
                />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="total_orders"
                  stroke="#8b5cf6"
                  fill="#8b5cf6"
                  fillOpacity={0.3}
                  name="주문수"
                />
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="total_ad_spend"
                  stroke="#f59e0b"
                  fill="#f59e0b"
                  fillOpacity={0.3}
                  name="광고비"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}