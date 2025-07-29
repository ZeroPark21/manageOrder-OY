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
import { TrendingUp, DollarSign, Wallet, Target, BarChart3 } from "lucide-react"
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
import { GMVTrendChart } from "@/components/gmv-trend-chart"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface CreatorData {
  account: string
  videoCount: number
  totalOrders: number
  totalRevenue: number
  totalImpressions: number
  totalClicks: number
  avgClickRate: number
  avgConversionRate: number
  videos?: any[]
}

interface BudgetPlan {
  id: number
  year: number
  month: number
  budget: number
  ratio: number
}

export default function GmvMaxPage() {
  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  })
  const [selectedCampaign, setSelectedCampaign] = useState<string>("all")
  const [gmvData, setGmvData] = useState<CreatorData[]>([])
  const [campaigns, setCampaigns] = useState<string[]>([])
  const [budgetPlan, setBudgetPlan] = useState<BudgetPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 실제 GMV 데이터 및 예산 계획 데이터 로드
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        setError(null)
        
        // GMV 데이터와 예산 계획 데이터를 병렬로 로드
        const [gmvResponse, budgetResponse] = await Promise.all([
          fetch('/api/gmv-data?groupBy=account'),
          fetch('/api/budget-plan?year=2025')
        ])
        
        if (!gmvResponse.ok) {
          throw new Error(`GMV API error! status: ${gmvResponse.status}`)
        }
        
        if (!budgetResponse.ok) {
          throw new Error(`Budget API error! status: ${budgetResponse.status}`)
        }
        
        const gmvResult = await gmvResponse.json()
        const budgetResult = await budgetResponse.json()
        
        console.log('GMV API 응답:', gmvResult)
        console.log('Budget API 응답:', budgetResult)
        
        const data = gmvResult.data || []
        setGmvData(data)
        setBudgetPlan(budgetResult.data || [])
        
        // 캠페인 목록 추출
        const allVideos = data.flatMap((creator: any) => creator.videos || [])
        const uniqueCampaigns = [...new Set(allVideos.map((video: any) => video.campaign_name).filter(Boolean))] as string[]
        setCampaigns(uniqueCampaigns)
        
      } catch (error) {
        console.error("데이터 로딩 오류:", error)
        setError(error instanceof Error ? error.message : "데이터를 불러오는 중 오류가 발생했습니다.")
      } finally {
        setLoading(false)
      }
    }

    loadData()
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
    
    // 예산 및 광고비 설정
    const totalBudget = 100000000 // 1억원 고정
    const estimatedAdSpend = Math.max(totalRevenue * 0.25, 85000)
    const avgROI = estimatedAdSpend > 0 ? ((totalRevenue - estimatedAdSpend) / estimatedAdSpend * 100) : 0

    return {
      totalRevenue,
      totalOrders,
      totalImpressions,
      totalClicks,
      totalVideos,
      totalCreators: gmvData.length,
      totalBudget: totalBudget,
      totalAdSpend: estimatedAdSpend,
      avgROI: Math.round(avgROI),
      activeCampaigns: campaigns.length
    }
  }

  const stats = calculateStats()

  // GMV 추이 데이터 생성
  const generateGmvTrendData = () => {
    if (!gmvData.length) return []
    
    // 실제 데이터를 기반으로 월별 트렌드 생성 (간단한 시뮬레이션)
    const months = ['1월', '2월', '3월', '4월', '5월', '6월', '7월']
    const baseRevenue = stats.totalRevenue / 7
    
    return months.map((month, index) => ({
      date: month,
      gmv: Math.round(baseRevenue * (0.7 + Math.random() * 0.6) * (index + 1) / 4),
      orders: Math.round((stats.totalOrders / 7) * (0.7 + Math.random() * 0.6) * (index + 1) / 4)
    }))
  }

  const gmvTrendData = generateGmvTrendData()

  // 예산 사용 추이 데이터 (실제 데이터 기반)
  const generateBudgetTrendData = () => {
    const currentAdSpend = stats.totalAdSpend
    
    // 현재까지의 누적 사용 비율을 기반으로 월별 추이 생성
    let cumulativeAllocated = 0
    let cumulativeSpend = 0
    
    return budgetPlan.map((plan) => {
      cumulativeAllocated += plan.budget
      
      // 실제 광고비를 월별 계획 비중에 따라 분배
      const monthlySpend = currentAdSpend * (plan.ratio / 100)
      cumulativeSpend += monthlySpend
      
      return {
        date: `${plan.month}월`,
        allocated: cumulativeAllocated,
        used: Math.round(cumulativeSpend),
        remaining: Math.round(cumulativeAllocated - cumulativeSpend),
        usageRate: cumulativeAllocated > 0 ? Math.round((cumulativeSpend / cumulativeAllocated) * 100) : 0
      }
    })
  }

  const budgetTrendData = generateBudgetTrendData()

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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">총 매출</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</p>
            </div>
            <DollarSign className="h-4 w-4 text-green-600" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">실제 GMV</p>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">총 예산</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.totalBudget)}</p>
            </div>
            <Wallet className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">할당 예산</p>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">총 광고비</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.totalAdSpend)}</p>
            </div>
            <Target className="h-4 w-4 text-purple-600" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">사용 광고비</p>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">평균 ROI</p>
              <p className="text-2xl font-bold">{stats.avgROI}%</p>
            </div>
            <TrendingUp className="h-4 w-4 text-orange-600" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">투자 대비 수익률</p>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">활성 캠페인</p>
              <p className="text-2xl font-bold">{stats.activeCampaigns}</p>
            </div>
            <BarChart3 className="h-4 w-4 text-cyan-600" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">진행중인 캠페인</p>
        </Card>
      </div>

      {/* 월별 예산 계획 테이블 */}
      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4">월별 예산 계획</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>구분</TableHead>
              <TableHead className="text-right">25년 7월</TableHead>
              <TableHead className="text-right">25년 8월</TableHead>
              <TableHead className="text-right">25년 9월</TableHead>
              <TableHead className="text-right">25년 10월</TableHead>
              <TableHead className="text-right">25년 11월</TableHead>
              <TableHead className="text-right">25년 12월</TableHead>
              <TableHead className="text-right font-bold">총계</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">계획</TableCell>
              {budgetPlan.map((plan) => (
                <TableCell key={`budget-${plan.month}`} className="text-right">
                  {formatCurrency(plan.budget)}
                </TableCell>
              ))}
              <TableCell className="text-right font-bold">
                {formatCurrency(budgetPlan.reduce((sum, plan) => sum + plan.budget, 0))}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">비중</TableCell>
              {budgetPlan.map((plan) => (
                <TableCell key={`ratio-${plan.month}`} className="text-right">
                  {plan.ratio}%
                </TableCell>
              ))}
              <TableCell className="text-right font-bold">
                {budgetPlan.reduce((sum, plan) => sum + plan.ratio, 0)}%
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Card>

      {/* GMV 추이 & 예산 사용 추이 차트 */}
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
                fill="#3B82F6" 
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

      {/* 시계열 분석 차트 섹션 */}
      <Card>
        <div className="p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold">시계열 분석</h2>
            <p className="text-sm text-muted-foreground mt-1">
              일별/주별/월별 GMV 추이 및 성과 지표를 확인하세요
            </p>
          </div>
          
          <Tabs defaultValue="trends" className="space-y-4">
            <TabsList>
              <TabsTrigger value="trends">트렌드 분석</TabsTrigger>
              <TabsTrigger value="existing">기존 차트</TabsTrigger>
            </TabsList>
            
            <TabsContent value="trends" className="space-y-4">
              <GMVTrendChart />
            </TabsContent>
            
            <TabsContent value="existing" className="space-y-4">
              {/* 기존 차트들 이동 */}
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <div className="p-6">
                    <h3 className="text-lg font-semibold mb-4">GMV 추이</h3>
                    <div className="h-[350px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={gmvTrendData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip formatter={(value: any) => formatCurrency(value)} />
                          <Legend />
                          <Line type="monotone" dataKey="gmv" stroke="#8884d8" name="GMV" />
                          <Line type="monotone" dataKey="orders" stroke="#82ca9d" name="주문수" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </Card>

                <Card>
                  <div className="p-6">
                    <h3 className="text-lg font-semibold mb-4">예산 사용 현황</h3>
                    <div className="h-[350px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={budgetTrendData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip formatter={(value: any) => formatCurrency(value)} />
                          <Legend />
                          <Bar dataKey="allocated" fill="#8884d8" name="할당 예산" />
                          <Bar dataKey="used" fill="#82ca9d" name="사용 예산" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </Card>
    </div>
  )
}