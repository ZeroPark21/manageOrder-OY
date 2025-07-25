"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Download, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface ContentDailyMatrixData {
  dates: string[]
  dailyStats: { [date: string]: { 
    totalCount: number
    totalGmv: number
    totalAffiliateItemsSold: number
    totalAffiliateOrders: number
    totalShoppableImpressions: number
    totalCommentCount: number
    totalLikeCount: number
  } }
}

export function ContentDailyMatrixTable() {
  const [matrixData, setMatrixData] = useState<ContentDailyMatrixData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState<string>('')
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())

  const fetchMatrixData = async (year?: number, month?: string) => {
    setLoading(true)
    try {
      let url = "/api/contents?groupBy=daily"
      if (year && month) {
        const startDate = `${year}-${month}-01`
        const lastDay = new Date(year, parseInt(month), 0).getDate()
        const endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`
        url += `&startDate=${startDate}&endDate=${endDate}`
      }
      const response = await fetch(url)
      const data = await response.json()

      if (data.data && data.data.length > 0) {
        // 날짜별 총계 데이터 구성
        const dailyStats: { [date: string]: { 
          totalCount: number
          totalGmv: number
          totalAffiliateItemsSold: number
          totalAffiliateOrders: number
          totalShoppableImpressions: number
          totalCommentCount: number
          totalLikeCount: number
        } } = {}

        data.data.forEach((item: any) => {
          dailyStats[item.date] = {
            totalCount: item.totalCount || 0,
            totalGmv: item.totalGmv || 0,
            totalAffiliateItemsSold: item.totalAffiliateItemsSold || 0,
            totalAffiliateOrders: item.totalAffiliateOrders || 0,
            totalShoppableImpressions: item.totalShoppableImpressions || 0,
            totalCommentCount: item.totalCommentCount || 0,
            totalLikeCount: item.totalLikeCount || 0
          }
        })

        const dates = Object.keys(dailyStats).sort()

        setMatrixData({
          dates,
          dailyStats
        })
      }
    } catch (error) {
      console.error("콘텐츠 매트릭스 데이터 로딩 실패:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // 현재 월로 초기화
    const now = new Date()
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0')
    setSelectedMonth(currentMonth)
    fetchMatrixData(now.getFullYear(), currentMonth)
  }, [])
  
  const handleMonthChange = (value: string) => {
    if (value === 'all') {
      setSelectedMonth('')
      fetchMatrixData()
    } else {
      setSelectedMonth(value)
      fetchMatrixData(selectedYear, value)
    }
  }
  
  const handleYearChange = (increment: number) => {
    const newYear = selectedYear + increment
    setSelectedYear(newYear)
    if (selectedMonth) {
      fetchMatrixData(newYear, selectedMonth)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>일별 콘텐츠 발행현황</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p>데이터를 불러오는 중...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!matrixData || matrixData.dates.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>일별 콘텐츠 발행현황</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">콘텐츠 데이터가 없습니다</p>
            <p className="text-sm">콘텐츠 발행 데이터를 업로드하여 분석을 시작하세요.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <CardTitle>일별 콘텐츠 발행현황</CardTitle>
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
              <Button variant="outline" size="sm" onClick={() => fetchMatrixData(selectedYear, selectedMonth)}>
                <Download className="h-4 w-4 mr-2" />
                새로고침
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-blue-600 text-white">
                <TableHead className="border border-blue-500 px-3 py-2 text-left text-sm font-medium w-[120px] text-white">날짜</TableHead>
                <TableHead className="border border-blue-500 px-3 py-2 text-center text-sm font-medium text-white">
                  콘텐츠
                </TableHead>
                <TableHead className="border border-blue-500 px-3 py-2 text-center text-sm font-medium text-white">
                  GMV
                </TableHead>
                <TableHead className="border border-blue-500 px-3 py-2 text-center text-sm font-medium text-white">
                  Items Sold
                </TableHead>
                <TableHead className="border border-blue-500 px-3 py-2 text-center text-sm font-medium text-white">
                  Orders
                </TableHead>
                <TableHead className="border border-blue-500 px-3 py-2 text-center text-sm font-medium text-white">
                  Impressions
                </TableHead>
                <TableHead className="border border-blue-500 px-3 py-2 text-center text-sm font-medium text-white">
                  댓글
                </TableHead>
                <TableHead className="border border-blue-500 px-3 py-2 text-center text-sm font-medium text-white">
                  좋아요
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matrixData.dates.map((date, index) => {
                const isEvenRow = index % 2 === 0
                return (
                  <TableRow key={date} className={isEvenRow ? "bg-gray-50" : ""}>
                    <TableCell className="border border-gray-300 px-3 py-2 text-sm font-medium">
                      {new Date(date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                    </TableCell>
                    <TableCell className="border border-gray-300 px-3 py-2 text-center text-sm font-medium">
                      {matrixData.dailyStats[date].totalCount}
                    </TableCell>
                    <TableCell className="border border-gray-300 px-3 py-2 text-center text-sm">
                      {matrixData.dailyStats[date].totalGmv.toLocaleString()}
                    </TableCell>
                    <TableCell className="border border-gray-300 px-3 py-2 text-center text-sm">
                      {matrixData.dailyStats[date].totalAffiliateItemsSold.toLocaleString()}
                    </TableCell>
                    <TableCell className="border border-gray-300 px-3 py-2 text-center text-sm">
                      {matrixData.dailyStats[date].totalAffiliateOrders.toLocaleString()}
                    </TableCell>
                    <TableCell className="border border-gray-300 px-3 py-2 text-center text-sm">
                      {matrixData.dailyStats[date].totalShoppableImpressions.toLocaleString()}
                    </TableCell>
                    <TableCell className="border border-gray-300 px-3 py-2 text-center text-sm">
                      {matrixData.dailyStats[date].totalCommentCount.toLocaleString()}
                    </TableCell>
                    <TableCell className="border border-gray-300 px-3 py-2 text-center text-sm">
                      {matrixData.dailyStats[date].totalLikeCount.toLocaleString()}
                    </TableCell>
                  </TableRow>
                )
              })}
              <TableRow className="bg-blue-800 text-white font-bold">
                <TableCell className="border border-blue-600 px-3 py-2 text-sm">Total</TableCell>
                <TableCell className="border border-blue-600 px-3 py-2 text-center text-sm font-bold">
                  {matrixData.dates.reduce((sum, date) => sum + matrixData.dailyStats[date].totalCount, 0)}
                </TableCell>
                <TableCell className="border border-blue-600 px-3 py-2 text-center text-sm font-bold">
                  {matrixData.dates.reduce((sum, date) => sum + matrixData.dailyStats[date].totalGmv, 0).toLocaleString()}
                </TableCell>
                <TableCell className="border border-blue-600 px-3 py-2 text-center text-sm font-bold">
                  {matrixData.dates.reduce((sum, date) => sum + matrixData.dailyStats[date].totalAffiliateItemsSold, 0).toLocaleString()}
                </TableCell>
                <TableCell className="border border-blue-600 px-3 py-2 text-center text-sm font-bold">
                  {matrixData.dates.reduce((sum, date) => sum + matrixData.dailyStats[date].totalAffiliateOrders, 0).toLocaleString()}
                </TableCell>
                <TableCell className="border border-blue-600 px-3 py-2 text-center text-sm font-bold">
                  {matrixData.dates.reduce((sum, date) => sum + matrixData.dailyStats[date].totalShoppableImpressions, 0).toLocaleString()}
                </TableCell>
                <TableCell className="border border-blue-600 px-3 py-2 text-center text-sm font-bold">
                  {matrixData.dates.reduce((sum, date) => sum + matrixData.dailyStats[date].totalCommentCount, 0).toLocaleString()}
                </TableCell>
                <TableCell className="border border-blue-600 px-3 py-2 text-center text-sm font-bold">
                  {matrixData.dates.reduce((sum, date) => sum + matrixData.dailyStats[date].totalLikeCount, 0).toLocaleString()}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
} 