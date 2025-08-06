"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  ArrowLeft,
  TrendingUp,
  Users,
  Video,
  Search,
  Eye,
  MousePointer,
  ShoppingCart,
  Calendar,
  ExternalLink,
} from "lucide-react"

// 크리에이터 분석용 인터페이스
interface VideoData {
  videoName: string
  videoLink: string
  videoId: string
  videoPostDate: string
  creatorUsername: string
  gmv: number
  affiliateItemsSold: number
  affiliateShoppableVideoGmv: number
  shoppableVideoAvgOrderValue: string
  estCommission: number
  affiliateOrders: number
  shoppableVideoImpressions: number
  affiliateCtr: string
  shoppableVideoGpm: number
  affiliateItemsRefunded: number
  affiliateRefundedGmv: number
  shoppableVideoComments: number
  shoppableVideoLikes: number
}

interface CreatorStats {
  username: string
  videoCount: number
  totalGmv: number
  totalCommission: number
  totalOrders: number
  totalImpressions: number
  totalLikes: number
  totalComments: number
  avgCtr: number
  videos: VideoData[]
}

export default function ContentAnalysisPage() {
  const [videoData, setVideoData] = useState<VideoData[]>([])
  const [selectedCreator, setSelectedCreator] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<{ start: string | null; end: string | null }>({ start: null, end: null })

  // Video ID 추출 함수
  const extractVideoId = (url: string): string => {
    const match = url.match(/\/video\/(\d+)/)
    return match ? match[1] : ""
  }



  useEffect(() => {
    async function loadAllData() {
      try {
        setLoading(true)
        setError(null)
        
        // Supabase contents 테이블에서 실제 데이터 로드
        const response = await fetch('/api/contents?groupBy=creator')
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const result = await response.json()
        console.log('API 응답:', result)
        
        // API 응답에서 개별 콘텐츠들을 추출하여 VideoData 형식으로 변환
        const allContents: VideoData[] = []
        
        if (result.data && Array.isArray(result.data)) {
          result.data.forEach((creatorGroup: any) => {
            if (creatorGroup.contents && Array.isArray(creatorGroup.contents)) {
              creatorGroup.contents.forEach((content: any) => {
                const videoData: VideoData = {
                  videoName: content.content_title || '',
                  videoLink: content.video_link || '',
                  videoId: extractVideoId(content.video_link || ''),
                  videoPostDate: content.publish_date || '',
                  creatorUsername: content.creator_name || '',
                  gmv: Number(content.gmv) || 0,
                  affiliateItemsSold: Number(content.affiliate_items_sold) || 0,
                  affiliateShoppableVideoGmv: Number(content.affiliate_gmv) || 0,
                  shoppableVideoAvgOrderValue: content.shoppable_avg_order_value?.toString() || '--',
                  estCommission: Number(content.est_commission) || 0,
                  affiliateOrders: Number(content.affiliate_orders) || 0,
                  shoppableVideoImpressions: Number(content.shoppable_impressions) || 0,
                  affiliateCtr: content.affiliate_ctr ? `${content.affiliate_ctr}%` : '0%',
                  shoppableVideoGpm: Number(content.shoppable_gpm) || 0,
                  affiliateItemsRefunded: Number(content.affiliate_items_refunded) || 0,
                  affiliateRefundedGmv: Number(content.affiliate_refunded_gmv) || 0,
                  shoppableVideoComments: Number(content.comment_count) || 0,
                  shoppableVideoLikes: Number(content.like_count) || 0,
                }
                allContents.push(videoData)
              })
            }
          })
        }
        
        console.log('실제 데이터 로드 완료:', allContents.length, '개 비디오')
        setVideoData(allContents)
        
        // 데이터의 날짜 범위 계산
        if (allContents.length > 0) {
          const dates = allContents.map(v => v.videoPostDate).filter(d => d).sort()
          if (dates.length > 0) {
            setDateRange({
              start: dates[0],
              end: dates[dates.length - 1]
            })
          }
        }
        
      } catch (error) {
        console.error("데이터 로딩 오류:", error)
        setError(error instanceof Error ? error.message : "데이터를 불러오는 중 오류가 발생했습니다.")
      } finally {
        setLoading(false)
      }
    }

    loadAllData()
  }, [])

  // 크리에이터별 통계 계산
  const creatorStats = useMemo(() => {
    if (!videoData.length) return []

    const stats = videoData.reduce(
      (acc, video) => {
        const username = video.creatorUsername
        if (!username) return acc

        if (!acc[username]) {
          acc[username] = {
            username,
            videoCount: 0,
            totalGmv: 0,
            totalCommission: 0,
            totalOrders: 0,
            totalImpressions: 0,
            totalLikes: 0,
            totalComments: 0,
            avgCtr: 0,
            videos: [],
          }
        }

        acc[username].videoCount++
        acc[username].totalGmv += video.gmv
        acc[username].totalCommission += video.estCommission
        acc[username].totalOrders += video.affiliateOrders
        acc[username].totalImpressions += video.shoppableVideoImpressions
        acc[username].totalLikes += video.shoppableVideoLikes
        acc[username].totalComments += video.shoppableVideoComments
        acc[username].videos.push(video)

        return acc
      },
      {} as Record<string, CreatorStats>,
    )

    Object.values(stats).forEach((creator) => {
      creator.videos.sort((a, b) => b.gmv - a.gmv)

      const validCtrs = creator.videos
        .map((v) => Number.parseFloat(v.affiliateCtr.replace("%", "")))
        .filter((ctr) => !isNaN(ctr) && ctr > 0)

      creator.avgCtr = validCtrs && validCtrs.length > 0 ? validCtrs.reduce((sum, ctr) => sum + ctr, 0) / validCtrs.length : 0
    })

    return Object.values(stats)
      .filter((creator) => creator.username.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => b.totalGmv - a.totalGmv)
  }, [videoData, searchTerm])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("ko-KR").format(num)
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("ko-KR")
    } catch {
      return dateString
    }
  }

  // Excel 추출 함수
  const exportToExcel = (data: any[], filename: string) => {
    const headers = Object.keys(data[0] || {})
    const csvContent = [
      headers.join(","),
      ...data.map((row) =>
        headers
          .map((header) => {
            const value = row[header]
            if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`
            }
            return value
          })
          .join(","),
      ),
    ].join("\n")

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `${filename}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportCreatorData = () => {
    const exportData = creatorStats.map((creator, index) => ({
      순위: index + 1,
      크리에이터: creator.username,
      "영상 수": creator.videoCount,
      "총 GMV (USD)": creator.totalGmv,
      "총 수수료 (USD)": creator.totalCommission,
      "총 주문": creator.totalOrders,
      "총 노출": creator.totalImpressions,
      "총 좋아요": creator.totalLikes,
      "총 댓글": creator.totalComments,
      "평균 CTR (%)": creator.avgCtr.toFixed(2),
    }))

    exportToExcel(exportData, `크리에이터_분석_${new Date().toISOString().split("T")[0]}`)
  }

  const exportCreatorVideos = () => {
    if (!selectedCreator) return

    const creatorInfo = creatorStats.find((creator) => creator.username === selectedCreator)
    if (!creatorInfo) return

    const exportData = creatorInfo.videos.map((video, index) => ({
      순위: index + 1,
      "영상 제목": video.videoName,
      "Video ID": video.videoId,
      "게시 날짜": video.videoPostDate,
      "GMV (USD)": video.gmv,
      "수수료 (USD)": video.estCommission,
      "주문 수": video.affiliateOrders,
      "판매 상품": video.affiliateItemsSold,
      "노출 수": video.shoppableVideoImpressions,
      CTR: video.affiliateCtr,
      좋아요: video.shoppableVideoLikes,
      댓글: video.shoppableVideoComments,
      "영상 링크": video.videoLink,
    }))

    exportToExcel(exportData, `크리에이터_${selectedCreator}_영상분석_${new Date().toISOString().split("T")[0]}`)
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-6 pt-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">TikTok 데이터를 불러오는 중...</p>
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
            <Button onClick={() => window.location.reload()}>다시 시도</Button>
          </div>
        </div>
      </div>
    )
  }

  const totalStats = {
    totalVideos: videoData.length,
    totalGmv: videoData.reduce((sum, video) => sum + video.gmv, 0),
    totalCommission: videoData.reduce((sum, video) => sum + video.estCommission, 0),
    totalOrders: videoData.reduce((sum, video) => sum + video.affiliateOrders, 0),
    totalCreators: creatorStats.length,
  }

  if (selectedCreator) {
    const creatorInfo = creatorStats.find((creator) => creator.username === selectedCreator)
    const selectedCreatorVideos = creatorInfo?.videos || []

    return (
      <div className="flex-1 space-y-4 p-4 md:p-6 pt-6">
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <Button variant="outline" onClick={() => setSelectedCreator(null)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              크리에이터 목록으로 돌아가기
            </Button>
            <Button onClick={exportCreatorVideos} variant="outline" size="sm">
              <TrendingUp className="w-4 h-4 mr-2" />
              영상 데이터 Excel 추출
            </Button>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">@{selectedCreator}</h1>
          <p className="text-gray-600 mt-2">GMV 순위별 영상 목록 ({selectedCreatorVideos.length}개 영상)</p>
        </div>

        {/* 크리에이터 요약 통계 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{formatCurrency(creatorInfo?.totalGmv || 0)}</div>
              <p className="text-sm text-gray-500">총 GMV</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{formatCurrency(creatorInfo?.totalCommission || 0)}</div>
              <p className="text-sm text-gray-500">총 수수료</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{formatNumber(creatorInfo?.totalOrders || 0)}</div>
              <p className="text-sm text-gray-500">총 주문</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{creatorInfo?.avgCtr.toFixed(2) || 0}%</div>
              <p className="text-sm text-gray-500">평균 CTR</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6">
          {selectedCreatorVideos.map((video, index) => (
            <Card key={video.videoId} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="text-lg font-semibold">
                      #{index + 1}
                    </Badge>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Video ID</p>
                      <p className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">{video.videoId}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{formatDate(video.videoPostDate)}</span>
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-4">{video.videoName}</h3>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      GMV
                    </p>
                    <p className="text-lg font-bold text-green-600">{formatCurrency(video.gmv)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <ShoppingCart className="w-3 h-3" />
                      주문
                    </p>
                    <p className="text-lg font-semibold">{formatNumber(video.affiliateOrders)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      노출
                    </p>
                    <p className="text-lg font-semibold">{formatNumber(video.shoppableVideoImpressions)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <MousePointer className="w-3 h-3" />
                      CTR
                    </p>
                    <p className="text-lg font-semibold">{video.affiliateCtr}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-4 border-t">
                  <ExternalLink className="w-4 h-4 text-blue-500" />
                  <a
                    href={video.videoLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm"
                  >
                    TikTok에서 영상 보기
                  </a>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-6 pt-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">발행된 콘텐츠 분석</h1>
        <p className="text-gray-600">TikTok Shop 크리에이터 성과 분석</p>
        {dateRange.start && dateRange.end && (
          <p className="text-sm text-gray-500 mt-2">
            <Calendar className="w-4 h-4 inline mr-1" />
            분석 기간: {formatDate(dateRange.start)} ~ {formatDate(dateRange.end)}
          </p>
        )}
      </div>

      {/* 전체 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 영상 수</CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.totalVideos}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 GMV</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalStats.totalGmv)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 수수료</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(totalStats.totalCommission)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 주문</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalStats.totalOrders)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">크리에이터 수</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.totalCreators}</div>
          </CardContent>
        </Card>
      </div>

      {/* 검색 */}
      <Card>
        <CardHeader>
          <CardTitle>크리에이터 검색</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="크리에이터 사용자명으로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* 크리에이터 목록 */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>크리에이터 목록 (GMV 순)</CardTitle>
              <CardDescription>
                크리에이터를 클릭하면 해당 크리에이터의 영상을 GMV 순으로 볼 수 있습니다.
              </CardDescription>
            </div>
            <Button onClick={exportCreatorData} variant="outline" size="sm">
              <TrendingUp className="w-4 h-4 mr-2" />
              Excel 추출
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {creatorStats.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                {searchTerm ? "검색 결과가 없습니다." : "데이터를 불러오는 중..."}
              </p>
            ) : (
              creatorStats.map((creator, index) => (
                <div
                  key={creator.username}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => setSelectedCreator(creator.username)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge variant="outline">#{index + 1}</Badge>
                      <h3 className="font-semibold text-lg">@{creator.username}</h3>
                      <Badge variant="secondary">{creator.videoCount}개 영상</Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">총 GMV</p>
                        <p className="font-semibold text-green-600">{formatCurrency(creator.totalGmv)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">총 수수료</p>
                        <p className="font-semibold text-blue-600">{formatCurrency(creator.totalCommission)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">총 주문</p>
                        <p className="font-semibold">{formatNumber(creator.totalOrders)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">평균 CTR</p>
                        <p className="font-semibold">{creator.avgCtr.toFixed(2)}%</p>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    영상 보기
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}