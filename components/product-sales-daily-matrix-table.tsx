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
import { Calendar } from "lucide-react"
import { cn } from "@/lib/utils"

interface ProductStats {
  product_name: string
  seller_sku: string
  sku_id: string
  total_quantity: number
  avg_price: number
  dailyQuantities: { [date: string]: number }
}

export function ProductSalesDailyMatrixTable() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState<string>("")

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/product-sales/all-matrix?groupBy=daily")
      if (!response.ok) throw new Error("Failed to fetch data")
      const result = await response.json()
      
      if (result.dates && result.dates.length > 0) {
        // 현재 월 설정
        const lastDate = result.dates[result.dates.length - 1]
        const [year, month] = lastDate.split("-")
        setCurrentMonth(`${year}년 ${parseInt(month)}월`)
        
        // 현재 월의 날짜만 필터링
        const currentMonthDates = result.dates.filter((date: string) => 
          date.startsWith(`${year}-${month}`)
        )
        
        // 제품별 일별 판매량 계산
        const productStats: ProductStats[] = result.products.map((product: any) => {
          const dailyQuantities: { [date: string]: number } = {}
          
          currentMonthDates.forEach((date: string) => {
            dailyQuantities[date] = result.dailyStats[date]?.productStats[product.product_name]?.quantity || 0
          })
          
          return {
            ...product,
            dailyQuantities
          }
        })
        
        setData({
          dates: currentMonthDates,
          products: productStats,
          dailyTotals: currentMonthDates.map((date: string) => ({
            date,
            total: result.dailyStats[date]?.totalQuantity || 0
          }))
        })
      }
    } catch (error) {
      console.error("데이터 로드 실패:", error)
    } finally {
      setLoading(false)
    }
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

  if (!data || !data.dates || data.dates.length === 0) {
    return (
      <div className="rounded-md border p-8">
        <div className="flex items-center justify-center">
          <div className="text-muted-foreground">표시할 데이터가 없습니다.</div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Calendar className="h-4 w-4" />
        <h3 className="text-lg font-semibold">일별 제품 판매현황 - {currentMonth}</h3>
      </div>
      <div className="rounded-md border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 z-20 bg-background min-w-[50px]">순위</TableHead>
                <TableHead className="sticky left-[50px] z-20 bg-background min-w-[200px]">Product Name</TableHead>
                <TableHead className="sticky left-[250px] z-20 bg-background min-w-[120px]">Seller SKU</TableHead>
                <TableHead className="sticky left-[370px] z-20 bg-background min-w-[100px]">SKU ID</TableHead>
                {data.dates.map((date: string) => {
                  const day = new Date(date).getDate()
                  const isWeekend = new Date(date).getDay() === 0 || new Date(date).getDay() === 6
                  return (
                    <TableHead 
                      key={date} 
                      className={cn(
                        "text-center min-w-[60px]",
                        isWeekend && "bg-muted/50"
                      )}
                    >
                      {day}일
                    </TableHead>
                  )
                })}
                <TableHead className="text-center min-w-[80px] font-semibold">총수량</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.products.map((product: ProductStats, index: number) => {
                const totalQuantity = Object.values(product.dailyQuantities).reduce((a, b) => a + b, 0)
                
                return (
                  <TableRow key={`${product.product_name}-${index}`}>
                    <TableCell className="sticky left-0 z-10 bg-background font-medium">
                      {index + 1}
                    </TableCell>
                    <TableCell className="sticky left-[50px] z-10 bg-background">
                      {product.product_name}
                    </TableCell>
                    <TableCell className="sticky left-[250px] z-10 bg-background">
                      {product.seller_sku}
                    </TableCell>
                    <TableCell className="sticky left-[370px] z-10 bg-background">
                      {product.sku_id}
                    </TableCell>
                    {data.dates.map((date: string) => {
                      const quantity = product.dailyQuantities[date] || 0
                      const isWeekend = new Date(date).getDay() === 0 || new Date(date).getDay() === 6
                      return (
                        <TableCell 
                          key={date} 
                          className={cn(
                            "text-center",
                            quantity > 0 && "font-medium",
                            isWeekend && "bg-muted/50"
                          )}
                        >
                          {quantity > 0 ? quantity : "-"}
                        </TableCell>
                      )
                    })}
                    <TableCell className="text-center font-semibold">
                      {totalQuantity}
                    </TableCell>
                  </TableRow>
                )
              })}
              <TableRow className="font-semibold bg-muted/50">
                <TableCell colSpan={4} className="sticky left-0 z-10 bg-muted/50">
                  Total
                </TableCell>
                {data.dailyTotals.map((day: any) => {
                  const isWeekend = new Date(day.date).getDay() === 0 || new Date(day.date).getDay() === 6
                  return (
                    <TableCell 
                      key={day.date} 
                      className={cn(
                        "text-center",
                        isWeekend && "bg-muted/70"
                      )}
                    >
                      {day.total}
                    </TableCell>
                  )
                })}
                <TableCell className="text-center">
                  {data.dailyTotals.reduce((sum: number, day: any) => sum + day.total, 0)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}