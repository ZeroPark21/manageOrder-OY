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
import { TrendingUp, ShoppingCart, DollarSign, Users, Package, BarChart3, Wallet, Target } from "lucide-react"
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

  // 예산 사용 추이 데이터
  const budgetTrendData = [
    { date: "12/01", allocated: 100000, used: 15000, remaining: 85000 },
    { date: "12/05", allocated: 100000, used: 28000, remaining: 72000 },
    { date: "12/10", allocated: 100000, used: 42000, remaining: 58000 },
    { date: "12/15", allocated: 100000, used: 58000, remaining: 42000 },
    { date: "12/20", allocated: 100000, used: 72000, remaining: 28000 },
    { date: "12/25", allocated: 100000, used: 85000, remaining: 15000 },
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">총매출</p>
              <p className="text-2xl font-bold">{formatCurrency(301000)}</p>
            </div>
            <DollarSign className="h-4 w-4 text-green-600" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">전월 대비 +18.5%</p>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">총 예산</p>
              <p className="text-2xl font-bold">{formatCurrency(500000)}</p>
            </div>
            <Wallet className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">할당된 예산</p>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">총 광고비</p>
              <p className="text-2xl font-bold">{formatCurrency(85000)}</p>
            </div>
            <Target className="h-4 w-4 text-purple-600" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">집행률 17%</p>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">평균 ROI</p>
              <p className="text-2xl font-bold">354%</p>
            </div>
            <TrendingUp className="h-4 w-4 text-orange-600" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">투자 대비 수익률</p>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">활성 캠페인</p>
              <p className="text-2xl font-bold">12</p>
            </div>
            <BarChart3 className="h-4 w-4 text-cyan-600" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">진행 중인 캠페인</p>
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
          <h3 className="text-lg font-medium mb-4">예산 사용 추이</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={budgetTrendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Legend />
              <Bar 
                dataKey="used" 
                stackId="budget"
                fill="#FF6B6B" 
                name="사용 예산"
              />
              <Bar 
                dataKey="remaining" 
                stackId="budget"
                fill="#E5E7EB" 
                name="잔여 예산"
              />
            </BarChart>
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