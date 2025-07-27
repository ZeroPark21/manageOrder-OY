"use client"

import { useState, useEffect } from "react"
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
import { Badge } from "@/components/ui/badge"
import { TrendingUp, ShoppingCart, DollarSign, Users, Eye, MousePointer, Video } from "lucide-react"
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

interface CreatorData {
  account: string
  videoCount: number
  totalOrders: number
  totalRevenue: number
  totalImpressions: number
  totalClicks: number
  avgClickRate: number
  avgConversionRate: number
}

export default function GmvMaxPage() {
  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  })
  const [selectedCampaign, setSelectedCampaign] = useState<string>("all")
  const [gmvData, setGmvData] = useState<CreatorData[]>([])
  const [campaigns, setCampaigns] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 실제 GMV 데이터 로드
  useEffect(() => {
    async function loadGmvData() {
      try {
        setLoading(true)
        setError(null)
        
        const response = await fetch('/api/gmv-data?groupBy=account')
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const result = await response.json()
        console.log('GMV API 응답:', result)
        
        const data = result.data || []
        setGmvData(data)
        
        // 캠페인 목록 추출
        const allVideos = data.flatMap((creator: any) => creator.videos || [])
        const uniqueCampaigns = [...new Set(allVideos.map((video: any) => video.campaign_name).filter(Boolean))]
        setCampaigns(uniqueCampaigns)
        
      } catch (error) {
        console.error("GMV 데이터 로딩 오류:", error)
        setError(error instanceof Error ? error.message : "데이터를 불러오는 중 오류가 발생했습니다.")
      } finally {
        setLoading(false)
      }
    }

    loadGmvData()
  }, [])

  const formatCurrency = (value: number) => {
    return `₩${value.toLocaleString()}`
  }

  // 실제 데이터에서 계산된 통계
  const calculateStats = () => {
    const totalRevenue = gmvData.reduce((sum, account) => sum + (account.totalRevenue || 0), 0)
    const totalOrders = gmvData.reduce((sum, account) => sum + (account.totalOrders || 0), 0)
    const totalImpressions = gmvData.reduce((sum, account) => sum + (account.totalImpressions || 0), 0)
    const totalClicks = gmvData.reduce((sum, account) => sum + (account.totalClicks || 0), 0)
    const totalVideos = gmvData.reduce((sum, account) => sum + (account.videoCount || 0), 0)
    const avgClickRate = totalImpressions > 0 ? totalClicks / totalImpressions : 0
    const avgConversionRate = totalClicks > 0 ? totalOrders / totalClicks : 0

    return {
      totalRevenue,
      totalOrders,
      totalImpressions,
      totalClicks,
      totalVideos,
      totalCreators: gmvData.length,
      avgClickRate,
      avgConversionRate
    }
  }

  const stats = calculateStats()

  // 상위 크리에이터 차트 데이터
  const topCreatorsData = gmvData
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 10)
    .map(creator => ({
      name: creator.account.length > 15 ? creator.account.substring(0, 15) + '...' : creator.account,
      revenue: creator.totalRevenue,
      orders: creator.totalOrders
    }))

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-6 pt-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">GMV 데이터를 불러오는 중...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-6 pt-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="text-red-600 text-xl mb-4">⚠️ 오류 발생</div>
            <p className="text-gray-600 mb-4">{error}</p>
            <p className="text-sm text-gray-500">GMV 데이터를 업로드해주세요.</p>
          </div>
        </div>
      </div>
    )
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
          <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="캠페인 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 캠페인</SelectItem>
              {campaigns.map((campaign) => (
                <SelectItem key={campaign} value={campaign}>
                  {campaign}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button>필터 적용</Button>
        </div>
      </div>

      {/* 핵심 지표 카드 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">총 매출</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</p>
            </div>
            <DollarSign className="h-4 w-4 text-green-600" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">전체 GMV</p>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">총 주문수</p>
              <p className="text-2xl font-bold">{stats.totalOrders.toLocaleString()}</p>
            </div>
            <ShoppingCart className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">전체 주문</p>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">총 노출수</p>
              <p className="text-2xl font-bold">{stats.totalImpressions.toLocaleString()}</p>
            </div>
            <Eye className="h-4 w-4 text-purple-600" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">광고 노출</p>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">총 클릭수</p>
              <p className="text-2xl font-bold">{stats.totalClicks.toLocaleString()}</p>
            </div>
            <MousePointer className="h-4 w-4 text-orange-600" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">광고 클릭</p>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">총 영상수</p>
              <p className="text-2xl font-bold">{stats.totalVideos}</p>
            </div>
            <Video className="h-4 w-4 text-cyan-600" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">활성 영상</p>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">크리에이터</p>
              <p className="text-2xl font-bold">{stats.totalCreators}</p>
            </div>
            <Users className="h-4 w-4 text-pink-600" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">참여 크리에이터</p>
        </Card>
      </div>

      {/* 성과 차트 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">상위 크리에이터 매출</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topCreatorsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={100}
                fontSize={12}
              />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Legend />
              <Bar 
                dataKey="revenue" 
                fill="#8884d8" 
                name="매출"
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">상위 크리에이터 주문수</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topCreatorsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={100}
                fontSize={12}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar 
                dataKey="orders" 
                fill="#82ca9d" 
                name="주문수"
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* 전체 성과 요약 */}
      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4">전체 성과 요약</h3>
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">평균 클릭률</p>
            <div className="text-2xl font-bold">
              <Badge variant={stats.avgClickRate > 0.02 ? "default" : "secondary"}>
                {(stats.avgClickRate * 100).toFixed(2)}%
              </Badge>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">평균 전환율</p>
            <div className="text-2xl font-bold">
              <Badge variant={stats.avgConversionRate > 0.03 ? "default" : "secondary"}>
                {(stats.avgConversionRate * 100).toFixed(2)}%
              </Badge>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">영상당 평균 매출</p>
            <p className="text-2xl font-bold">
              {formatCurrency(stats.totalVideos > 0 ? stats.totalRevenue / stats.totalVideos : 0)}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">크리에이터당 평균 매출</p>
            <p className="text-2xl font-bold">
              {formatCurrency(stats.totalCreators > 0 ? stats.totalRevenue / stats.totalCreators : 0)}
            </p>
          </div>
        </div>
      </Card>

      {/* 상세 테이블 */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-medium mb-4">크리에이터별 GMV 상세</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>크리에이터</TableHead>
                <TableHead className="text-right">영상 수</TableHead>
                <TableHead className="text-right">총 주문수</TableHead>
                <TableHead className="text-right">총 매출</TableHead>
                <TableHead className="text-right">평균 클릭률</TableHead>
                <TableHead className="text-right">평균 전환율</TableHead>
                <TableHead className="text-right">총 노출수</TableHead>
                <TableHead className="text-right">총 클릭수</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gmvData.length > 0 ? gmvData.slice(0, 10).map((account, index) => (
                <TableRow key={`${account.account}-${index}`}>
                  <TableCell className="font-medium">{account.account}</TableCell>
                  <TableCell className="text-right">{account.videoCount}</TableCell>
                  <TableCell className="text-right">{account.totalOrders}</TableCell>
                  <TableCell className="text-right">{formatCurrency(account.totalRevenue)}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={account.avgClickRate > 0.02 ? "default" : "secondary"}>
                      {(account.avgClickRate * 100).toFixed(2)}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={account.avgConversionRate > 0.03 ? "default" : "secondary"}>
                      {(account.avgConversionRate * 100).toFixed(2)}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{account.totalImpressions.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{account.totalClicks.toLocaleString()}</TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    GMV 데이터를 업로드해주세요.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}