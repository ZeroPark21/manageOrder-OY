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
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { 
  Users, 
  TrendingUp, 
  Eye, 
  MousePointer, 
  DollarSign, 
  ShoppingCart,
  Video,
  BarChart3,
  Search,
  Target,
  Play,
  ExternalLink 
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
  creative_type?: string
  status?: string
  campaign_name?: string
  campaign_id?: string
  product_id?: string
  authorization_type?: string
}

interface CampaignSummary {
  totalVideos: number
  totalGMV: number
  totalOrders: number
  totalImpressions: number
  totalClicks: number
  totalCreators: number
}

export default function CreatorDetailsPage() {
  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  })
  const [selectedCreator, setSelectedCreator] = useState<string>("all")
  const [selectedCampaign, setSelectedCampaign] = useState<string>("all")
  const [creatorSearchQuery, setCreatorSearchQuery] = useState<string>("")
  const [creatorsData, setCreatorsData] = useState<CreatorData[]>([])
  const [selectedCreatorData, setSelectedCreatorData] = useState<CreatorData | null>(null)
  const [campaigns, setCampaigns] = useState<string[]>([])
  const [campaignSummary, setCampaignSummary] = useState<CampaignSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showVideoDialog, setShowVideoDialog] = useState(false)
  const [selectedCreatorVideos, setSelectedCreatorVideos] = useState<{creator: string, videos: VideoData[]}>({creator: '', videos: []})

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
        
        const creators = result.data || []
        
        // 캠페인 목록 추출 (campaign_name 기준)
        const allVideos = creators.flatMap((creator: CreatorData) => creator.videos || [])
        const uniqueCampaigns = [...new Set(allVideos.map((video: VideoData) => video.campaign_name).filter(Boolean))]
        setCampaigns(uniqueCampaigns)
        
        // GMV 기준 내림차순 정렬
        const sortedCreators = creators.sort((a: CreatorData, b: CreatorData) => b.totalRevenue - a.totalRevenue)
        setCreatorsData(sortedCreators)
        
      } catch (error) {
        console.error("크리에이터 데이터 로딩 오류:", error)
        setError(error instanceof Error ? error.message : "데이터를 불러오는 중 오류가 발생했습니다.")
      } finally {
        setLoading(false)
      }
    }

    loadCreatorsData()
  }, [])

  // 캠페인 성과 계산
  useEffect(() => {
    if (creatorsData.length > 0) {
      const allVideos = creatorsData.flatMap(creator => creator.videos || [])
      
      let filteredVideos = allVideos
      if (selectedCampaign !== "all") {
        filteredVideos = allVideos.filter(video => video.campaign_name === selectedCampaign)
      }
      
      const summary: CampaignSummary = {
        totalVideos: filteredVideos.length,
        totalGMV: filteredVideos.reduce((sum, video) => sum + (video.gross_revenue || 0), 0),
        totalOrders: filteredVideos.reduce((sum, video) => sum + (video.orders || 0), 0),
        totalImpressions: filteredVideos.reduce((sum, video) => sum + (video.ad_impressions || 0), 0),
        totalClicks: filteredVideos.reduce((sum, video) => sum + (video.ad_clicks || 0), 0),
        totalCreators: new Set(
          creatorsData
            .filter(creator => 
              selectedCampaign === "all" || 
              creator.videos?.some(video => video.campaign_name === selectedCampaign)
            )
            .map(creator => creator.account)
        ).size
      }
      
      setCampaignSummary(summary)
    }
  }, [selectedCampaign, creatorsData])

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

  // 영상 상세 보기 핸들러
  const handleShowVideos = (creator: CreatorData, event: React.MouseEvent) => {
    event.stopPropagation() // 행 클릭 이벤트와 충돌 방지
    setSelectedCreatorVideos({
      creator: creator.account,
      videos: creator.videos || []
    })
    setShowVideoDialog(true)
  }

  // TikTok 영상 보기 핸들러
  const handleWatchVideo = (videoId: string, creatorName: string, event: React.MouseEvent) => {
    event.stopPropagation()
    // TikTok 영상 URL 형식: https://www.tiktok.com/@username/video/videoId
    const tiktokUrl = `https://www.tiktok.com/@${creatorName}/video/${videoId}`
    window.open(tiktokUrl, '_blank')
  }

  // 크리에이터 검색 필터링
  const filteredCreatorsData = creatorsData.filter(creator => {
    const matchesSearch = creatorSearchQuery === "" || 
      creator.account.toLowerCase().includes(creatorSearchQuery.toLowerCase())
    
    const matchesCampaign = selectedCampaign === "all" || 
      creator.videos?.some(video => video.campaign_name === selectedCampaign)
    
    return matchesSearch && matchesCampaign
  })

  // 차트 색상
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d']

  // 크리에이터별 성과 비교 데이터 (필터링된 데이터 사용)
  const creatorComparisonData = filteredCreatorsData.slice(0, 10).map((creator, index) => ({
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
          
          {/* 캠페인 선택 */}
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
          
          {/* 크리에이터 검색 */}
          <div className="relative w-[250px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="크리에이터 검색..."
              value={creatorSearchQuery}
              onChange={(e) => setCreatorSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={selectedCreator} onValueChange={setSelectedCreator}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="크리에이터 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 크리에이터</SelectItem>
              {filteredCreatorsData
                .filter(creator => creator.account && creator.account.trim() !== "")
                .map((creator) => (
                <SelectItem key={creator.account} value={creator.account}>
                  {creator.account}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button>필터 적용</Button>
        </div>
      </div>

      {/* 캠페인 성과 요약 */}
      {campaignSummary && (
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
            <Target className="h-5 w-5" />
            {selectedCampaign === "all" ? "전체 캠페인" : selectedCampaign} 성과 요약
          </h3>
          <div className="grid gap-4 md:grid-cols-6">
            <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
              <Video className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-900">총 영상 수</p>
                <p className="text-2xl font-bold text-blue-900">{campaignSummary.totalVideos}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-900">총 GMV</p>
                <p className="text-xl font-bold text-green-900">
                  {formatCurrency(campaignSummary.totalGMV)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-orange-50 rounded-lg">
              <ShoppingCart className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-orange-900">총 주문</p>
                <p className="text-2xl font-bold text-orange-900">{campaignSummary.totalOrders}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg">
              <Eye className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-purple-900">총 노출</p>
                <p className="text-xl font-bold text-purple-900">
                  {campaignSummary.totalImpressions.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-cyan-50 rounded-lg">
              <MousePointer className="h-8 w-8 text-cyan-600" />
              <div>
                <p className="text-sm font-medium text-cyan-900">총 클릭</p>
                <p className="text-2xl font-bold text-cyan-900">
                  {campaignSummary.totalClicks.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-pink-50 rounded-lg">
              <Users className="h-8 w-8 text-pink-600" />
              <div>
                <p className="text-sm font-medium text-pink-900">크리에이터 수</p>
                <p className="text-2xl font-bold text-pink-900">{campaignSummary.totalCreators}</p>
              </div>
            </div>
          </div>
        </Card>
      )}

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
                  <TableRow key={`detail-${video.video_id}-${index}`}>
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
                <TableHead className="text-center">영상상세</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCreatorsData
                .filter(creator => creator.account && creator.account.trim() !== "")
                .map((creator, index) => (
                <TableRow 
                  key={`${creator.account}-${index}`} 
                  className={`cursor-pointer hover:bg-muted/50 ${
                    selectedCreator === creator.account ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => setSelectedCreator(creator.account)}
                >
                  <TableCell className="font-medium">{creator.account || '이름 없음'}</TableCell>
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
                  <TableCell className="text-center">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={(e) => handleShowVideos(creator, e)}
                      className="flex items-center gap-1"
                    >
                      <Play className="h-3 w-3" />
                      영상상세
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* 영상 상세 다이얼로그 */}
      <Dialog open={showVideoDialog} onOpenChange={setShowVideoDialog}>
        <DialogContent className="max-w-[90vw] w-full max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              {selectedCreatorVideos.creator} 크리에이터의 영상 목록
            </DialogTitle>
            <DialogDescription>
              총 {selectedCreatorVideos.videos.length}개의 영상
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[75vh]">
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead>영상 ID</TableHead>
                  <TableHead>영상 제목</TableHead>
                  <TableHead>캠페인</TableHead>
                  <TableHead>제품 ID</TableHead>
                  <TableHead>인증 유형</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead className="text-right">주문 수</TableHead>
                  <TableHead className="text-right">매출</TableHead>
                  <TableHead className="text-right">노출수</TableHead>
                  <TableHead className="text-right">클릭수</TableHead>
                  <TableHead className="text-right">클릭률</TableHead>
                  <TableHead className="text-right">전환율</TableHead>
                  <TableHead className="text-center">영상보기</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedCreatorVideos.videos.map((video, index) => (
                  <TableRow key={`${video.video_id}-${index}`}>
                    <TableCell className="font-medium">{video.video_id || '-'}</TableCell>
                    <TableCell className="max-w-[200px] truncate" title={video.video_title}>
                      {video.video_title || '제목 없음'}
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate" title={video.campaign_name}>
                      <Badge variant="outline">{video.campaign_name || '-'}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {video.product_id || '-'}
                    </TableCell>
                    <TableCell className="max-w-[120px] truncate">
                      {video.authorization_type || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={video.status === 'Delivering' ? 'default' : 'secondary'}
                      >
                        {video.status || '-'}
                      </Badge>
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
                    <TableCell className="text-center">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={(e) => handleWatchVideo(video.video_id, selectedCreatorVideos.creator, e)}
                        className="flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        영상보기
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}