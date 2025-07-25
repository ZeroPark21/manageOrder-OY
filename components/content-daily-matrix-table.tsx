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
  } }
}

export function ContentDailyMatrixTable() {
  const [matrixData, setMatrixData] = useState<ContentDailyMatrixData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchMatrixData = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/contents?groupBy=daily")
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
    fetchMatrixData()
  }, [])

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
        <div className="flex justify-between items-center">
          <CardTitle>일별 콘텐츠 발행현황</CardTitle>
          <Button variant="outline" size="sm" onClick={fetchMatrixData}>
            <Download className="h-4 w-4 mr-2" />
            새로고침
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">날짜</TableHead>
                <TableHead className="text-center">
                  <span className="text-xs">콘텐츠</span>
                </TableHead>
                <TableHead className="text-center">
                  <span className="text-xs">GMV</span>
                </TableHead>
                <TableHead className="text-center">
                  <span className="text-xs">Items Sold</span>
                </TableHead>
                <TableHead className="text-center">
                  <span className="text-xs">Orders</span>
                </TableHead>
                <TableHead className="text-center">
                  <span className="text-xs">Impressions</span>
                </TableHead>
                <TableHead className="text-center">
                  <span className="text-xs">댓글</span>
                </TableHead>
                <TableHead className="text-center">
                  <span className="text-xs">좋아요</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matrixData.dates.map((date, index) => {
                const isEvenRow = index % 2 === 0
                return (
                  <TableRow key={date} className={isEvenRow ? "bg-gray-50" : ""}>
                    <TableCell className="font-medium">
                      {new Date(date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {matrixData.dailyStats[date].totalCount}
                    </TableCell>
                    <TableCell className="text-center">
                      {matrixData.dailyStats[date].totalGmv.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center">
                      {matrixData.dailyStats[date].totalAffiliateItemsSold.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center">
                      {matrixData.dailyStats[date].totalAffiliateOrders.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center">
                      {matrixData.dailyStats[date].totalShoppableImpressions.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center">
                      {matrixData.dailyStats[date].totalCommentCount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center">
                      {matrixData.dailyStats[date].totalLikeCount.toLocaleString()}
                    </TableCell>
                  </TableRow>
                )
              })}
              <TableRow className="font-bold bg-gray-100">
                <TableCell>Total</TableCell>
                <TableCell className="text-center">
                  {matrixData.dates.reduce((sum, date) => sum + matrixData.dailyStats[date].totalCount, 0)}
                </TableCell>
                <TableCell className="text-center">
                  {matrixData.dates.reduce((sum, date) => sum + matrixData.dailyStats[date].totalGmv, 0).toLocaleString()}
                </TableCell>
                <TableCell className="text-center">
                  {matrixData.dates.reduce((sum, date) => sum + matrixData.dailyStats[date].totalAffiliateItemsSold, 0).toLocaleString()}
                </TableCell>
                <TableCell className="text-center">
                  {matrixData.dates.reduce((sum, date) => sum + matrixData.dailyStats[date].totalAffiliateOrders, 0).toLocaleString()}
                </TableCell>
                <TableCell className="text-center">
                  {matrixData.dates.reduce((sum, date) => sum + matrixData.dailyStats[date].totalShoppableImpressions, 0).toLocaleString()}
                </TableCell>
                <TableCell className="text-center">
                  {matrixData.dates.reduce((sum, date) => sum + matrixData.dailyStats[date].totalCommentCount, 0).toLocaleString()}
                </TableCell>
                <TableCell className="text-center">
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