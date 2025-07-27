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
import { Eye, Heart, MessageCircle, Share2, TrendingUp } from "lucide-react"

export default function ContentAnalysisPage() {
  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  })
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [selectedStatus, setSelectedStatus] = useState<string>("all")

  // 샘플 데이터
  const contentData = [
    {
      id: 1,
      contentId: "CNT2024001",
      creator: "@fashionista",
      product: "립스틱 A",
      publishDate: "2024-12-15",
      views: 125000,
      likes: 8500,
      comments: 342,
      shares: 125,
      engagementRate: 7.2,
      status: "active",
      category: "beauty",
    },
    {
      id: 2,
      contentId: "CNT2024002",
      creator: "@beautyexpert",
      product: "스킨케어 세트",
      publishDate: "2024-12-14",
      views: 89000,
      likes: 6200,
      comments: 289,
      shares: 98,
      engagementRate: 7.8,
      status: "active",
      category: "skincare",
    },
    {
      id: 3,
      contentId: "CNT2024003",
      creator: "@lifestyle_guru",
      product: "향수 B",
      publishDate: "2024-12-13",
      views: 56000,
      likes: 3200,
      comments: 156,
      shares: 45,
      engagementRate: 6.1,
      status: "completed",
      category: "fragrance",
    },
  ]

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">활성</span>
      case "completed":
        return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">완료</span>
      default:
        return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700">대기</span>
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-6 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">콘텐츠 분석</h2>
      </div>

      {/* 필터 섹션 */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-4">
          <DatePickerWithRange date={date} setDate={setDate} />
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="카테고리 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 카테고리</SelectItem>
              <SelectItem value="beauty">뷰티</SelectItem>
              <SelectItem value="skincare">스킨케어</SelectItem>
              <SelectItem value="fragrance">향수</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="상태 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 상태</SelectItem>
              <SelectItem value="active">활성</SelectItem>
              <SelectItem value="completed">완료</SelectItem>
              <SelectItem value="pending">대기</SelectItem>
            </SelectContent>
          </Select>
          <Button>필터 적용</Button>
        </div>
      </div>

      {/* 요약 카드 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">총 콘텐츠</p>
              <p className="text-2xl font-bold">152</p>
            </div>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">전월 대비 +12%</p>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">총 조회수</p>
              <p className="text-2xl font-bold">2.3M</p>
            </div>
            <Eye className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">평균 15.1K/콘텐츠</p>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">평균 참여율</p>
              <p className="text-2xl font-bold">6.8%</p>
            </div>
            <Heart className="h-4 w-4 text-red-600" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">업계 평균 5.2%</p>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">활성 크리에이터</p>
              <p className="text-2xl font-bold">48</p>
            </div>
            <MessageCircle className="h-4 w-4 text-purple-600" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">신규 크리에이터 +5</p>
        </Card>
      </div>

      {/* 콘텐츠 테이블 */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-medium mb-4">콘텐츠 상세 분석</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>콘텐츠 ID</TableHead>
                <TableHead>크리에이터</TableHead>
                <TableHead>제품</TableHead>
                <TableHead>발행일</TableHead>
                <TableHead className="text-right">조회수</TableHead>
                <TableHead className="text-right">좋아요</TableHead>
                <TableHead className="text-right">댓글</TableHead>
                <TableHead className="text-right">공유</TableHead>
                <TableHead className="text-right">참여율</TableHead>
                <TableHead>상태</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contentData.map((content) => (
                <TableRow key={content.id}>
                  <TableCell className="font-medium">{content.contentId}</TableCell>
                  <TableCell>{content.creator}</TableCell>
                  <TableCell>{content.product}</TableCell>
                  <TableCell>{content.publishDate}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Eye className="h-3 w-3 text-muted-foreground" />
                      {formatNumber(content.views)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Heart className="h-3 w-3 text-muted-foreground" />
                      {formatNumber(content.likes)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <MessageCircle className="h-3 w-3 text-muted-foreground" />
                      {formatNumber(content.comments)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Share2 className="h-3 w-3 text-muted-foreground" />
                      {formatNumber(content.shares)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Progress value={content.engagementRate * 10} className="w-16" />
                      <span className="text-sm">{content.engagementRate}%</span>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(content.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}