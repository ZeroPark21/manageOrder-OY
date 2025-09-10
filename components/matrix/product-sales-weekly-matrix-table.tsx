"use client"

import { useState, useEffect } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { CalendarDays } from "lucide-react"

interface WeeklyData {
  week: string
  totalQuantity: number
  totalRevenue: number
  uniqueProducts: number
  avgPrice: number
}

export function ProductSalesWeeklyMatrixTable() {
  const [data, setData] = useState<WeeklyData[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/product-sales/all-matrix?groupBy=weekly")
      if (!response.ok) throw new Error("Failed to fetch data")
      const result = await response.json()
      
      if (result?.weeks && result?.weeklyStats) {
        const weeklyData: WeeklyData[] = result.weeks.map((week: string) => {
          const stats = result.weeklyStats[week]
          return {
            week,
            totalQuantity: stats.totalQuantity || 0,
            totalRevenue: stats.totalRevenue || 0,
            uniqueProducts: stats.uniqueProducts || 0,
            avgPrice: stats.totalQuantity > 0 ? Math.round(stats.totalRevenue / stats.totalQuantity) : 0
          }
        })
        
        setData(weeklyData)
        
        // 마지막 업데이트 주차 설정
        if (weeklyData.length > 0) {
          const lastWeek = weeklyData[weeklyData.length - 1].week
          setLastUpdate(lastWeek)
        }
      }
    } catch (error) {
      console.error("데이터 로드 실패:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatWeek = (weekStart: string) => {
    const date = new Date(weekStart)
    const endDate = new Date(date)
    endDate.setDate(date.getDate() + 6)
    
    return `${date.getMonth() + 1}/${date.getDate()} - ${endDate.getMonth() + 1}/${endDate.getDate()}`
  }

  if (loading) {
    return (
      <div className="rounded-md border p-8">
        <div className="flex items-center justify-center">
          <div className="text-muted-foreground">데이터를 불러오는 중...</div>
        </div>
      </div>
    )
  }

  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="rounded-md border p-8">
        <div className="flex items-center justify-center">
          <div className="text-muted-foreground">표시할 데이터가 없습니다.</div>
        </div>
      </div>
    )
  }

  const totals = data.reduce((acc, week) => ({
    totalQuantity: acc.totalQuantity + week.totalQuantity,
    totalRevenue: acc.totalRevenue + week.totalRevenue,
    uniqueProducts: Math.max(acc.uniqueProducts, week.uniqueProducts),
  }), { totalQuantity: 0, totalRevenue: 0, uniqueProducts: 0 })

  return (
    <div>
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <CalendarDays className="h-4 w-4" />
          <h3 className="text-lg font-semibold">주별 Affiliate 영상 판매 발생</h3>
        </div>
        {lastUpdate && (
          <p className="text-sm text-muted-foreground">
            마지막 데이터: {formatWeek(lastUpdate)} 주차
          </p>
        )}
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>주차</TableHead>
              <TableHead className="text-right">판매수량</TableHead>
              <TableHead className="text-right">매출액 ($)</TableHead>
              <TableHead className="text-right">제품 종류</TableHead>
              <TableHead className="text-right">평균 단가 ($)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((week) => (
              <TableRow key={week.week}>
                <TableCell className="font-medium">
                  {formatWeek(week.week)}
                </TableCell>
                <TableCell className="text-right">
                  {week.totalQuantity.toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  ${week.totalRevenue.toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  {week.uniqueProducts}
                </TableCell>
                <TableCell className="text-right">
                  ${week.avgPrice.toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="font-semibold bg-muted/50">
              <TableCell>Total</TableCell>
              <TableCell className="text-right">
                {totals.totalQuantity.toLocaleString()}
              </TableCell>
              <TableCell className="text-right">
                ${totals.totalRevenue.toLocaleString()}
              </TableCell>
              <TableCell className="text-right">
                {totals.uniqueProducts}
              </TableCell>
              <TableCell className="text-right">
                ${totals.totalQuantity > 0 ? Math.round(totals.totalRevenue / totals.totalQuantity).toLocaleString() : 0}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  )
}