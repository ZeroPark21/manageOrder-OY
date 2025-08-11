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

interface ProductMonthlyStats {
  product_name: string
  seller_sku: string
  sku_id: string
  total_quantity: number
  avg_price: number
  monthlyQuantities: { [month: string]: number }
}

export function ProductSalesMonthlyMatrixTable() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/product-sales/all-matrix?groupBy=monthly")
      if (!response.ok) throw new Error("Failed to fetch data")
      const result = await response.json()
      
      if (result?.months && result.months.length > 0) {
        // 제품별 월별 판매량 계산
        const productStats: ProductMonthlyStats[] = result.products.map((product: any) => {
          const monthlyQuantities: { [month: string]: number } = {}
          
          result.months.forEach((month: string) => {
            monthlyQuantities[month] = result.monthlyStats[month]?.productStats[product.product_name]?.quantity || 0
          })
          
          return {
            ...product,
            monthlyQuantities
          }
        })
        
        setData({
          months: result.months,
          products: productStats,
          monthlyTotals: result.months.map((month: string) => ({
            month,
            total: result.monthlyStats[month]?.totalQuantity || 0,
            revenue: result.monthlyStats[month]?.totalRevenue || 0
          }))
        })
      }
    } catch (error) {
      console.error("데이터 로드 실패:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatMonth = (month: string) => {
    const [year, monthNum] = month.split("-")
    return `${monthNum}월`
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

  if (!data || !data.months || data.months.length === 0) {
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
        <CalendarDays className="h-4 w-4" />
        <h3 className="text-lg font-semibold">월별 Affiliate 영상 판매 발생</h3>
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
                {data.months.map((month: string) => (
                  <TableHead key={month} className="text-center min-w-[80px]">
                    {formatMonth(month)}
                  </TableHead>
                ))}
                <TableHead className="text-center min-w-[80px] font-semibold">총수량</TableHead>
                <TableHead className="text-center min-w-[100px] font-semibold">총매출 ($)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.products.map((product: ProductMonthlyStats, index: number) => {
                const totalQuantity = Object.values(product.monthlyQuantities).reduce((a, b) => a + b, 0)
                const totalRevenue = totalQuantity * (product.avg_price || 0)
                
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
                    {data.months.map((month: string) => {
                      const quantity = product.monthlyQuantities[month] || 0
                      return (
                        <TableCell 
                          key={month} 
                          className={quantity > 0 ? "text-center font-medium" : "text-center"}
                        >
                          {quantity > 0 ? quantity : "-"}
                        </TableCell>
                      )
                    })}
                    <TableCell className="text-center font-semibold">
                      {totalQuantity}
                    </TableCell>
                    <TableCell className="text-center font-semibold">
                      ${Math.round(totalRevenue).toLocaleString()}
                    </TableCell>
                  </TableRow>
                )
              })}
              <TableRow className="font-semibold bg-muted/50">
                <TableCell colSpan={4} className="sticky left-0 z-10 bg-muted/50">
                  Total
                </TableCell>
                {data.monthlyTotals.map((month: any) => (
                  <TableCell key={month.month} className="text-center">
                    {month.total}
                  </TableCell>
                ))}
                <TableCell className="text-center">
                  {data.monthlyTotals.reduce((sum: number, month: any) => sum + month.total, 0)}
                </TableCell>
                <TableCell className="text-center">
                  ${data.monthlyTotals.reduce((sum: number, month: any) => sum + month.revenue, 0).toLocaleString()}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}