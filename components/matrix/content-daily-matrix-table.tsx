"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Download, TrendingUp } from "lucide-react"

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
    uniqueCreators?: number
  } }
  totalUniqueCreators: number // 전체 기간의 고유 크리에이터 수
}

interface ContentDailyMatrixTableProps {
  companyId: string
  onExcelDownload?: () => void
  downloadLoading?: boolean
  selectedYear?: number
  selectedMonth?: string
}

export function ContentDailyMatrixTable({ companyId, onExcelDownload, downloadLoading, selectedYear: propYear, selectedMonth: propMonth }: ContentDailyMatrixTableProps) {
  const [matrixData, setMatrixData] = useState<ContentDailyMatrixData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchMatrixData = async (year?: number, month?: string) => {
    setLoading(true)
    try {
      let url = `/api/content/content-all-matrix?t=${Date.now()}&companyId=${companyId}`
      // Use the new content-all-matrix API
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`API 요청 실패: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()

      if (data.daily && data.daily.dates) {
        let filteredDates = data.daily.dates
        let filteredStats: { [date: string]: any } = {}

        // Apply year and month filtering if specified
        if (year && month) {
          const startDate = `${year}-${month}-01`
          const lastDay = new Date(year, parseInt(month), 0).getDate()
          const endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`
          
          filteredDates = data.daily.dates.filter((date: string) => {
            return date >= startDate && date <= endDate
          })
          
          filteredDates.forEach((date: string) => {
            filteredStats[date] = data.daily.dailyStats[date]
          })
        } else if (year && !month) {
          // Filter by year only
          filteredDates = data.daily.dates.filter((date: string) => {
            return date.startsWith(`${year}-`)
          })
          
          filteredDates.forEach((date: string) => {
            filteredStats[date] = data.daily.dailyStats[date]
          })
        } else {
          // No filtering, use all data
          filteredStats = data.daily.dailyStats
        }

        setMatrixData({
          dates: filteredDates,
          dailyStats: filteredStats,
          totalUniqueCreators: data.daily.totalUniqueCreators || 0
        })
      } else {
        // 데이터가 없을 때도 빈 데이터로 설정
        setMatrixData({
          dates: [],
          dailyStats: {},
          totalUniqueCreators: 0
        })
      }
    } catch (error) {
      console.error("컨텐츠 매트릭스 데이터 로딩 실패:", error)
      setMatrixData({
        dates: [],
        dailyStats: {},
        totalUniqueCreators: 0
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // props 값에 따라 데이터 가져오기
    if (propYear && propMonth && propMonth !== 'all') {
      fetchMatrixData(propYear, propMonth)
    } else {
      // "전체"이거나 props가 없으면 전체 데이터 가져오기
      fetchMatrixData()
    }
  }, [propYear, propMonth])

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

  if (!matrixData || !matrixData.dates || matrixData.dates.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>일별 콘텐츠 발행현황</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">데이터 없음</p>
            <p className="text-sm">콘텐츠 발행 데이터를 업로드하여 분석을 시작하세요.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>일별 콘텐츠 발행현황</CardTitle>
          <Button variant="outline" size="sm" onClick={onExcelDownload} disabled={downloadLoading}>
            <Download className="h-4 w-4 mr-2" />
            {downloadLoading ? "다운로드 중..." : "엑셀 다운로드"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="w-full overflow-x-auto" style={{ maxWidth: '100%' }}>
          <Table className="min-w-[800px]">
            <TableHeader>
              <TableRow className="bg-blue-600 text-white">
                <TableHead className="border border-blue-500 px-3 py-2 text-left text-sm font-medium w-[120px] text-white">날짜</TableHead>
                <TableHead className="border border-blue-500 px-3 py-2 text-center text-sm font-medium text-white">
                  콘텐츠
                </TableHead>
                <TableHead className="border border-blue-500 px-3 py-2 text-center text-sm font-medium text-white">
                  크리에이터
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
                  <TableRow key={date} className={isEvenRow ? "bg-gray-50" : ""} style={{ cursor: 'default' }}>
                    <TableCell className="border border-gray-300 px-3 py-2 text-sm font-medium">
                      {new Date(date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                    </TableCell>
                    <TableCell className="border border-gray-300 px-3 py-2 text-center text-sm font-medium">
                      {matrixData.dailyStats[date].totalCount}
                    </TableCell>
                    <TableCell className="border border-gray-300 px-3 py-2 text-center text-sm font-medium">
                      {matrixData.dailyStats[date].uniqueCreators || 0}
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
                  {matrixData.totalUniqueCreators || 0}
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