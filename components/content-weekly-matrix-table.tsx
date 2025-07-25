"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Download, TrendingUp } from "lucide-react"

interface ContentWeeklyMatrixData {
  weeks: string[]
  weeklyStats: { [week: string]: { 
    totalCount: number
    totalGmv: number
    totalAffiliateItemsSold: number
    totalAffiliateOrders: number
    totalShoppableImpressions: number
    totalCommentCount: number
    totalLikeCount: number
  } }
}

export function ContentWeeklyMatrixTable() {
  const [matrixData, setMatrixData] = useState<ContentWeeklyMatrixData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchMatrixData = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/contents?groupBy=weekly")
      const data = await response.json()

      if (data.data && data.data.length > 0) {
        // 주별 총계 데이터 구성
        const weeklyStats: { [week: string]: { 
          totalCount: number
          totalGmv: number
          totalAffiliateItemsSold: number
          totalAffiliateOrders: number
          totalShoppableImpressions: number
          totalCommentCount: number
          totalLikeCount: number
        } } = {}

        data.data.forEach((item: any) => {
          weeklyStats[item.week] = {
            totalCount: item.totalCount || 0,
            totalGmv: item.totalGmv || 0,
            totalAffiliateItemsSold: item.totalAffiliateItemsSold || 0,
            totalAffiliateOrders: item.totalAffiliateOrders || 0,
            totalShoppableImpressions: item.totalShoppableImpressions || 0,
            totalCommentCount: item.totalCommentCount || 0,
            totalLikeCount: item.totalLikeCount || 0
          }
        })

        const weeks = Object.keys(weeklyStats).sort()

        setMatrixData({
          weeks,
          weeklyStats
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
          <CardTitle>주별 콘텐츠 발행현황</CardTitle>
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

  if (!matrixData || matrixData.weeks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>주별 콘텐츠 발행현황</CardTitle>
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
          <CardTitle>주별 콘텐츠 발행현황</CardTitle>
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
                <TableHead className="w-[120px]">주차</TableHead>
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
              {matrixData.weeks.map((week, index) => {
                const isEvenRow = index % 2 === 0
                return (
                  <TableRow key={week} className={isEvenRow ? "bg-gray-50" : ""}>
                    <TableCell className="font-medium">
                      {new Date(week).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {matrixData.weeklyStats[week].totalCount}
                    </TableCell>
                    <TableCell className="text-center">
                      {matrixData.weeklyStats[week].totalGmv.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center">
                      {matrixData.weeklyStats[week].totalAffiliateItemsSold.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center">
                      {matrixData.weeklyStats[week].totalAffiliateOrders.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center">
                      {matrixData.weeklyStats[week].totalShoppableImpressions.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center">
                      {matrixData.weeklyStats[week].totalCommentCount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center">
                      {matrixData.weeklyStats[week].totalLikeCount.toLocaleString()}
                    </TableCell>
                  </TableRow>
                )
              })}
              <TableRow className="font-bold bg-gray-100">
                <TableCell>Total</TableCell>
                <TableCell className="text-center">
                  {matrixData.weeks.reduce((sum, week) => sum + matrixData.weeklyStats[week].totalCount, 0)}
                </TableCell>
                <TableCell className="text-center">
                  {matrixData.weeks.reduce((sum, week) => sum + matrixData.weeklyStats[week].totalGmv, 0).toLocaleString()}
                </TableCell>
                <TableCell className="text-center">
                  {matrixData.weeks.reduce((sum, week) => sum + matrixData.weeklyStats[week].totalAffiliateItemsSold, 0).toLocaleString()}
                </TableCell>
                <TableCell className="text-center">
                  {matrixData.weeks.reduce((sum, week) => sum + matrixData.weeklyStats[week].totalAffiliateOrders, 0).toLocaleString()}
                </TableCell>
                <TableCell className="text-center">
                  {matrixData.weeks.reduce((sum, week) => sum + matrixData.weeklyStats[week].totalShoppableImpressions, 0).toLocaleString()}
                </TableCell>
                <TableCell className="text-center">
                  {matrixData.weeks.reduce((sum, week) => sum + matrixData.weeklyStats[week].totalCommentCount, 0).toLocaleString()}
                </TableCell>
                <TableCell className="text-center">
                  {matrixData.weeks.reduce((sum, week) => sum + matrixData.weeklyStats[week].totalLikeCount, 0).toLocaleString()}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
} 