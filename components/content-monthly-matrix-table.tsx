"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Download, TrendingUp, RefreshCw } from "lucide-react"

interface ContentMonthlyMatrixData {
  months: string[]
  monthlyStats: { [month: string]: { 
    totalCount: number
    totalGmv: number
    totalAffiliateItemsSold: number
    totalAffiliateOrders: number
    totalShoppableImpressions: number
    totalCommentCount: number
    totalLikeCount: number
  } }
}

interface ContentMonthlyMatrixTableProps {
  onExcelDownload?: () => void
  downloadLoading?: boolean
}

export function ContentMonthlyMatrixTable({ onExcelDownload, downloadLoading }: ContentMonthlyMatrixTableProps) {
  const [matrixData, setMatrixData] = useState<ContentMonthlyMatrixData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchMatrixData = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/contents?groupBy=monthly")
      const data = await response.json()

      if (data.data && data.data.length > 0) {
        // 월별 총계 데이터 구성
        const monthlyStats: { [month: string]: { 
          totalCount: number
          totalGmv: number
          totalAffiliateItemsSold: number
          totalAffiliateOrders: number
          totalShoppableImpressions: number
          totalCommentCount: number
          totalLikeCount: number
        } } = {}

        data.data.forEach((item: any) => {
          monthlyStats[item.month] = {
            totalCount: item.totalCount || 0,
            totalGmv: item.totalGmv || 0,
            totalAffiliateItemsSold: item.totalAffiliateItemsSold || 0,
            totalAffiliateOrders: item.totalAffiliateOrders || 0,
            totalShoppableImpressions: item.totalShoppableImpressions || 0,
            totalCommentCount: item.totalCommentCount || 0,
            totalLikeCount: item.totalLikeCount || 0
          }
        })

        const months = Object.keys(monthlyStats).sort()

        setMatrixData({
          months,
          monthlyStats
        })
      } else {
        // 데이터가 없을 때도 빈 데이터로 설정
        setMatrixData({
          months: [],
          monthlyStats: {}
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
          <CardTitle>월별 콘텐츠 발행현황</CardTitle>
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

  if (!matrixData || !matrixData.months || matrixData.months.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>월별 콘텐츠 발행현황</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">데이터 없음</p>
            <p className="text-sm">해당 기간에는 데이터가 없습니다.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>월별 콘텐츠 발행현황</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchMatrixData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              새로고침
            </Button>
            <Button variant="outline" size="sm" onClick={onExcelDownload} disabled={downloadLoading}>
              <Download className="h-4 w-4 mr-2" />
              {downloadLoading ? "다운로드 중..." : "엑셀 다운로드"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-purple-600 text-white">
                <TableHead className="border border-purple-500 px-3 py-2 text-left text-sm font-medium w-[120px] text-white">월</TableHead>
                <TableHead className="border border-purple-500 px-3 py-2 text-center text-sm font-medium text-white">
                  콘텐츠
                </TableHead>
                <TableHead className="border border-purple-500 px-3 py-2 text-center text-sm font-medium text-white">
                  GMV
                </TableHead>
                <TableHead className="border border-purple-500 px-3 py-2 text-center text-sm font-medium text-white">
                  Items Sold
                </TableHead>
                <TableHead className="border border-purple-500 px-3 py-2 text-center text-sm font-medium text-white">
                  Orders
                </TableHead>
                <TableHead className="border border-purple-500 px-3 py-2 text-center text-sm font-medium text-white">
                  Impressions
                </TableHead>
                <TableHead className="border border-purple-500 px-3 py-2 text-center text-sm font-medium text-white">
                  댓글
                </TableHead>
                <TableHead className="border border-purple-500 px-3 py-2 text-center text-sm font-medium text-white">
                  좋아요
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matrixData.months.map((month, index) => {
                const isEvenRow = index % 2 === 0
                return (
                  <TableRow key={month} className={isEvenRow ? "bg-gray-50" : ""} style={{ cursor: 'default' }}>
                    <TableCell className="border border-gray-300 px-3 py-2 text-sm font-medium">
                      {month}
                    </TableCell>
                    <TableCell className="border border-gray-300 px-3 py-2 text-center text-sm font-medium">
                      {matrixData.monthlyStats[month].totalCount}
                    </TableCell>
                    <TableCell className="border border-gray-300 px-3 py-2 text-center text-sm">
                      {matrixData.monthlyStats[month].totalGmv.toLocaleString()}
                    </TableCell>
                    <TableCell className="border border-gray-300 px-3 py-2 text-center text-sm">
                      {matrixData.monthlyStats[month].totalAffiliateItemsSold.toLocaleString()}
                    </TableCell>
                    <TableCell className="border border-gray-300 px-3 py-2 text-center text-sm">
                      {matrixData.monthlyStats[month].totalAffiliateOrders.toLocaleString()}
                    </TableCell>
                    <TableCell className="border border-gray-300 px-3 py-2 text-center text-sm">
                      {matrixData.monthlyStats[month].totalShoppableImpressions.toLocaleString()}
                    </TableCell>
                    <TableCell className="border border-gray-300 px-3 py-2 text-center text-sm">
                      {matrixData.monthlyStats[month].totalCommentCount.toLocaleString()}
                    </TableCell>
                    <TableCell className="border border-gray-300 px-3 py-2 text-center text-sm">
                      {matrixData.monthlyStats[month].totalLikeCount.toLocaleString()}
                    </TableCell>
                  </TableRow>
                )
              })}
              <TableRow className="bg-purple-800 text-white font-bold">
                <TableCell className="border border-purple-600 px-3 py-2 text-sm">Total</TableCell>
                <TableCell className="border border-purple-600 px-3 py-2 text-center text-sm font-bold">
                  {matrixData.months.reduce((sum, month) => sum + matrixData.monthlyStats[month].totalCount, 0)}
                </TableCell>
                <TableCell className="border border-purple-600 px-3 py-2 text-center text-sm font-bold">
                  {matrixData.months.reduce((sum, month) => sum + matrixData.monthlyStats[month].totalGmv, 0).toLocaleString()}
                </TableCell>
                <TableCell className="border border-purple-600 px-3 py-2 text-center text-sm font-bold">
                  {matrixData.months.reduce((sum, month) => sum + matrixData.monthlyStats[month].totalAffiliateItemsSold, 0).toLocaleString()}
                </TableCell>
                <TableCell className="border border-purple-600 px-3 py-2 text-center text-sm font-bold">
                  {matrixData.months.reduce((sum, month) => sum + matrixData.monthlyStats[month].totalAffiliateOrders, 0).toLocaleString()}
                </TableCell>
                <TableCell className="border border-purple-600 px-3 py-2 text-center text-sm font-bold">
                  {matrixData.months.reduce((sum, month) => sum + matrixData.monthlyStats[month].totalShoppableImpressions, 0).toLocaleString()}
                </TableCell>
                <TableCell className="border border-purple-600 px-3 py-2 text-center text-sm font-bold">
                  {matrixData.months.reduce((sum, month) => sum + matrixData.monthlyStats[month].totalCommentCount, 0).toLocaleString()}
                </TableCell>
                <TableCell className="border border-purple-600 px-3 py-2 text-center text-sm font-bold">
                  {matrixData.months.reduce((sum, month) => sum + matrixData.monthlyStats[month].totalLikeCount, 0).toLocaleString()}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
} 