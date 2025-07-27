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
import { 
  Users, 
  TrendingUp, 
  Eye, 
  MousePointer, 
  DollarSign, 
  ShoppingCart,
  Video,
  BarChart3 
} from "lucide-react"
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

interface CreatorData {
  account: string
  videoCount: number
  totalOrders: number
  totalRevenue: number
  totalImpressions: number
  totalClicks: number
  avgClickRate: number
  avgConversionRate: number
  videos: VideoData[]
}

interface VideoData {
  video_id: string
  video_title: string
  orders: number
  gross_revenue: number
  ad_impressions: number
  ad_clicks: number
  ad_click_rate: number
  ad_conversion_rate: number
}

export default function CreatorDetailsPage() {
  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  })
  const [selectedCreator, setSelectedCreator] = useState<string>("all")
  const [creatorsData, setCreatorsData] = useState<CreatorData[]>([])
  const [selectedCreatorData, setSelectedCreatorData] = useState<CreatorData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 크리에이터 데이터 로드
  useEffect(() => {
    async function loadCreatorsData() {
      try {
        setLoading(true)
        setError(null)
        
        const response = await fetch('/api/gmv-data?groupBy=account')
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const result = await response.json()
        console.log('크리에이터 데이터 로드:', result)
        
        setCreatorsData(result.data || [])
        
      } catch (error) {
        console.error("크리에이터 데이터 로딩 오류:", error)
        setError(error instanceof Error ? error.message : "데이터를 불러오는 중 오류가 발생했습니다.")
      } finally {
        setLoading(false)
      }
    }

    loadCreatorsData()
  }, [])

  // 선택된 크리에이터 데이터 업데이트
  useEffect(() => {
    if (selectedCreator !== "all" && creatorsData.length > 0) {
      const creatorData = creatorsData.find(creator => creator.account === selectedCreator)
      setSelectedCreatorData(creatorData || null)
    } else {
      setSelectedCreatorData(null)
    }
  }, [selectedCreator, creatorsData])

  const formatCurrency = (value: number) => {
    return `₩${value.toLocaleString()}`
  }

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(2)}%`
  }

  // 차트 색상
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d']

  // 크리에이터별 성과 비교 데이터
  const creatorComparisonData = creatorsData.slice(0, 10).map((creator, index) => ({
    name: creator.account.length > 10 ? creator.account.substring(0, 10) + '...' : creator.account,
    revenue: creator.totalRevenue,
    orders: creator.totalOrders,
    videos: creator.videoCount,
    clickRate: creator.avgClickRate * 100,
  }))

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-6 pt-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">크리에이터 데이터를 불러오는 중...</p>
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
        <div>
          <h2 className="text-3xl font-bold tracking-tight">크리에이터별 GMV 상세</h2>
          <p className="text-muted-foreground">크리에이터별 상세 성과 분석 및 영상 데이터</p>
        </div>
      </div>

      {/* 필터 섹션 */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-4">
          <DatePickerWithRange date={date} setDate={setDate} />
          <Select value={selectedCreator} onValueChange={setSelectedCreator}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="크리에이터 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 크리에이터</SelectItem>
              {creatorsData.map((creator) => (
                <SelectItem key={creator.account} value={creator.account}>
                  {creator.account}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button>필터 적용</Button>
        </div>
      </div>

      {/* 크리에이터별 비교 차트 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">크리에이터별 매출 비교</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={creatorComparisonData}>
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
              <Bar dataKey="revenue" fill="#8884d8" name="매출" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">크리에이터별 주문 수 비교</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={creatorComparisonData}>
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
              <Bar dataKey="orders" fill="#82ca9d" name="주문 수" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* 선택된 크리에이터 상세 정보 */}
      {selectedCreatorData && (
        <>
          <Card className="p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Users className="h-5 w-5" />
              {selectedCreatorData.account} 상세 분석
            </h3>
            
            {/* 크리에이터 통계 카드 */}
            <div className="grid gap-4 md:grid-cols-4 mb-6">
              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
                <Video className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-900">영상 수</p>
                  <p className="text-2xl font-bold text-blue-900">{selectedCreatorData.videoCount}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
                <DollarSign className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-900">총 매출</p>
                  <p className="text-2xl font-bold text-green-900">
                    {formatCurrency(selectedCreatorData.totalRevenue)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-orange-50 rounded-lg">
                <ShoppingCart className="h-8 w-8 text-orange-600" />
                <div>
                  <p className="text-sm font-medium text-orange-900">총 주문</p>
                  <p className="text-2xl font-bold text-orange-900">{selectedCreatorData.totalOrders}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg">
                <MousePointer className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-sm font-medium text-purple-900">평균 클릭률</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {formatPercentage(selectedCreatorData.avgClickRate)}
                  </p>
                </div>
              </div>
            </div>

            {/* 영상별 상세 테이블 */}
            <h4 className="text-lg font-medium mb-4">영상별 성과</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>영상 ID</TableHead>
                  <TableHead>영상 제목</TableHead>
                  <TableHead className="text-right">주문 수</TableHead>
                  <TableHead className="text-right">매출</TableHead>
                  <TableHead className="text-right">노출수</TableHead>
                  <TableHead className="text-right">클릭수</TableHead>
                  <TableHead className="text-right">클릭률</TableHead>
                  <TableHead className="text-right">전환율</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedCreatorData.videos.slice(0, 10).map((video, index) => (
                  <TableRow key={video.video_id || index}>
                    <TableCell className="font-medium">{video.video_id || '-'}</TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {video.video_title || '제목 없음'}
                    </TableCell>
                    <TableCell className="text-right">{video.orders}</TableCell>
                    <TableCell className="text-right">{formatCurrency(video.gross_revenue)}</TableCell>
                    <TableCell className="text-right">{video.ad_impressions.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{video.ad_clicks.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={video.ad_click_rate > 0.02 ? "default" : "secondary"}>
                        {formatPercentage(video.ad_click_rate)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={video.ad_conversion_rate > 0.03 ? "default" : "secondary"}>
                        {formatPercentage(video.ad_conversion_rate)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      {/* 전체 크리에이터 리스트 */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-medium mb-4">전체 크리에이터 성과</h3>
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
              {creatorsData.map((creator, index) => (
                <TableRow 
                  key={creator.account} 
                  className={`cursor-pointer hover:bg-muted/50 ${
                    selectedCreator === creator.account ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => setSelectedCreator(creator.account)}
                >
                  <TableCell className="font-medium">{creator.account}</TableCell>
                  <TableCell className="text-right">{creator.videoCount}</TableCell>
                  <TableCell className="text-right">{creator.totalOrders}</TableCell>
                  <TableCell className="text-right">{formatCurrency(creator.totalRevenue)}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={creator.avgClickRate > 0.02 ? "default" : "secondary"}>
                      {formatPercentage(creator.avgClickRate)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={creator.avgConversionRate > 0.03 ? "default" : "secondary"}>
                      {formatPercentage(creator.avgConversionRate)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{creator.totalImpressions.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{creator.totalClicks.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}