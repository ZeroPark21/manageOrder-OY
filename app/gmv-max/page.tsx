"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import { DateRange } from "react-day-picker"
import { addDays } from "date-fns"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, ShoppingCart, DollarSign, Users, Package, BarChart3 } from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts"

export default function GmvMaxPage() {
  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  })
  const [selectedProduct, setSelectedProduct] = useState<string>("all")
  const [selectedCreator, setSelectedCreator] = useState<string>("all")

  // GMV 트렌드 데이터
  const gmvTrendData = [
    { date: "12/01", gmv: 45000, orders: 120 },
    { date: "12/05", gmv: 52000, orders: 145 },
    { date: "12/10", gmv: 48000, orders: 132 },
    { date: "12/15", gmv: 61000, orders: 168 },
    { date: "12/20", gmv: 58000, orders: 155 },
    { date: "12/25", gmv: 72000, orders: 189 },
  ]

  // 제품별 GMV 데이터
  const productGmvData = [
    {
      id: 1,
      product: "립스틱 A",
      creator: "@fashionista",
      orders: 245,
      gmv: 125000,
      avgOrderValue: 510.2,
      conversionRate: 3.2,
      returnRate: 2.1,
      profit: 38000,
      profitMargin: 30.4,
    },
    {
      id: 2,
      product: "스킨케어 세트",
      creator: "@beautyexpert",
      orders: 189,
      gmv: 98000,
      avgOrderValue: 518.5,
      conversionRate: 2.8,
      returnRate: 1.8,
      profit: 32000,
      profitMargin: 32.7,
    },
    {
      id: 3,
      product: "향수 B",
      creator: "@lifestyle_guru",
      orders: 156,
      gmv: 78000,
      avgOrderValue: 500.0,
      conversionRate: 2.5,
      returnRate: 2.3,
      profit: 22000,
      profitMargin: 28.2,
    },
  ]

  // 카테고리별 GMV 분포
  const categoryData = [
    { name: "뷰티", value: 45, color: "#FF6B6B" },
    { name: "스킨케어", value: 30, color: "#4ECDC4" },
    { name: "향수", value: 15, color: "#45B7D1" },
    { name: "기타", value: 10, color: "#96CEB4" },
  ]

  const formatCurrency = (value: number) => {
    return `₩${value.toLocaleString()}`
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-6 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">GMV MAX 분석</h2>
      </div>

      {/* 필터 섹션 */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-4">
          <DatePickerWithRange date={date} setDate={setDate} />
          <Select value={selectedProduct} onValueChange={setSelectedProduct}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="제품 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 제품</SelectItem>
              <SelectItem value="lipstick">립스틱 A</SelectItem>
              <SelectItem value="skincare">스킨케어 세트</SelectItem>
              <SelectItem value="perfume">향수 B</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedCreator} onValueChange={setSelectedCreator}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="크리에이터 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 크리에이터</SelectItem>
              <SelectItem value="fashionista">@fashionista</SelectItem>
              <SelectItem value="beautyexpert">@beautyexpert</SelectItem>
              <SelectItem value="lifestyle_guru">@lifestyle_guru</SelectItem>
            </SelectContent>
          </Select>
          <Button>필터 적용</Button>
        </div>
      </div>

      {/* 핵심 지표 카드 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">총 GMV</p>
              <p className="text-2xl font-bold">{formatCurrency(301000)}</p>
            </div>
            <DollarSign className="h-4 w-4 text-green-600" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">전월 대비 +18.5%</p>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">총 주문수</p>
              <p className="text-2xl font-bold">590</p>
            </div>
            <ShoppingCart className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">평균 주문가 ₩509,322</p>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">평균 전환율</p>
              <p className="text-2xl font-bold">2.8%</p>
            </div>
            <Users className="h-4 w-4 text-purple-600" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">업계 평균 2.1%</p>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">순이익</p>
              <p className="text-2xl font-bold">{formatCurrency(92000)}</p>
            </div>
            <TrendingUp className="h-4 w-4 text-orange-600" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">마진율 30.6%</p>
        </Card>
      </div>

      {/* GMV 트렌드 차트 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">GMV 추이</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={gmvTrendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="gmv" 
                stroke="#8884d8" 
                name="GMV"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">카테고리별 GMV 분포</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name} ${value}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* 상세 테이블 */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-medium mb-4">제품별 GMV 상세</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>제품</TableHead>
                <TableHead>크리에이터</TableHead>
                <TableHead className="text-right">주문수</TableHead>
                <TableHead className="text-right">GMV</TableHead>
                <TableHead className="text-right">평균 주문가</TableHead>
                <TableHead className="text-right">전환율</TableHead>
                <TableHead className="text-right">반품율</TableHead>
                <TableHead className="text-right">순이익</TableHead>
                <TableHead className="text-right">마진율</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productGmvData.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.product}</TableCell>
                  <TableCell>{item.creator}</TableCell>
                  <TableCell className="text-right">{item.orders}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.gmv)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.avgOrderValue)}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={item.conversionRate > 3 ? "default" : "secondary"}>
                      {item.conversionRate}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={item.returnRate < 2 ? "default" : "destructive"}>
                      {item.returnRate}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(item.profit)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Progress value={item.profitMargin} className="w-16" />
                      <span className="text-sm">{item.profitMargin}%</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}