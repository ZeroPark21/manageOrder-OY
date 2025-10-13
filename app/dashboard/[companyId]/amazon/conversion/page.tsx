"use client"

import { use, useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  TrendingUp,
  ShoppingCart,
  Eye,
  Loader2,
  Award,
  Percent,
} from "lucide-react"

interface ConversionDataItem {
  date: string
  orderItemSessionPercentage: number
  orderItemSessionPercentageB2B: number
  unitSessionPercentage: number
  unitSessionPercentageB2B: number
  buyBoxPercentage: number
  buyBoxPercentageB2B: number
  sessions: number
  orders: number
  units: number
  pageViews: number
}

interface ConversionSummary {
  avgOrderItemSessionPercentage: number
  avgUnitSessionPercentage: number
  totalSessions: number
  totalOrders: number
  totalUnits: number
  totalPageViews: number
}

// Minimal Metric Card
const MetricCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  format = "number",
}: {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: any;
  format?: "number" | "percent";
}) => {
  const formatValue = () => {
    if (format === "percent") return `${value}%`;
    return typeof value === 'number' ? value.toLocaleString() : value;
  };

  return (
    <Card className="border border-gray-200">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-3">
          <span className="text-sm text-gray-600">{title}</span>
          <Icon className="h-5 w-5 text-gray-400" />
        </div>
        <div className="space-y-1">
          <p className="text-3xl font-semibold">{formatValue()}</p>
          {subtitle && (
            <p className="text-xs text-gray-500">{subtitle}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default function AmazonConversionPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = use(params)
  const [periodType, setPeriodType] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
  const [availableMonths, setAvailableMonths] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<{ conversionData: ConversionDataItem[]; summary: ConversionSummary } | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Fetch available months on mount
  useEffect(() => {
    const fetchAvailableMonths = async () => {
      try {
        const response = await fetch(`/api/amazon/conversion?companyId=${companyId}&days=all`)
        if (response.ok) {
          const result = await response.json()
          const months = new Set<string>()
          if (result.conversionData) {
            result.conversionData.forEach((item: any) => {
              const date = new Date(item.date)
              const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
              months.add(yearMonth)
            })
          }
          setAvailableMonths(months)

          if (months.size > 0) {
            const sortedMonths = Array.from(months).sort().reverse()
            const latestMonth = sortedMonths[0]
            const [year, month] = latestMonth.split('-')
            setSelectedYear(parseInt(year))
            setSelectedMonth(month)
          }
        }
      } catch (err) {
        console.error('Failed to fetch available months:', err)
      }
    }
    fetchAvailableMonths()
  }, [companyId])

  useEffect(() => {
    const fetchData = async () => {
      if (periodType === 'daily' && (selectedYear === null || selectedMonth === null)) {
        return
      }

      try {
        setLoading(true)
        setError(null)

        let dateFrom: string
        let dateTo: string

        if (periodType === 'daily') {
          const year = selectedYear!
          const month = parseInt(selectedMonth!)
          dateFrom = `${year}-${String(month).padStart(2, '0')}-01`
          const lastDay = new Date(year, month, 0).getDate()
          dateTo = `${year}-${String(month).padStart(2, '0')}-${lastDay}`
        } else {
          dateFrom = '2020-01-01'
          dateTo = new Date().toISOString().split('T')[0]
        }

        const response = await fetch(`/api/amazon/conversion?companyId=${companyId}&dateFrom=${dateFrom}&dateTo=${dateTo}`)

        if (!response.ok) {
          throw new Error("데이터를 불러오는데 실패했습니다")
        }

        const result = await response.json()
        setData(result)
      } catch (err) {
        console.error("Error fetching data:", err)
        setError(err instanceof Error ? err.message : "오류가 발생했습니다")
      } finally {
        setLoading(false)
      }
    }

    if (companyId) {
      fetchData()
    }
  }, [companyId, selectedYear, selectedMonth, periodType])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex flex-col gap-6 p-8 bg-gray-50 min-h-screen">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href={`/dashboard/${companyId}`}>대시보드</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>구매 전환율</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">오류: {error || "데이터가 없습니다"}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8 p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href={`/dashboard/${companyId}`}>
                  대시보드
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>구매 전환율 현황</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <div className="flex items-center gap-3">
          <Tabs value={periodType} onValueChange={(v) => setPeriodType(v as 'daily' | 'weekly' | 'monthly')}>
            <TabsList>
              <TabsTrigger value="daily">일별</TabsTrigger>
              <TabsTrigger value="weekly">주별</TabsTrigger>
              <TabsTrigger value="monthly">월별</TabsTrigger>
            </TabsList>
          </Tabs>
          <Select
            value={String(selectedYear)}
            onValueChange={(v) => setSelectedYear(parseInt(v))}
            disabled={periodType !== 'daily'}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from(
                new Set(
                  Array.from(availableMonths).map((ym) =>
                    parseInt(ym.split('-')[0])
                  )
                )
              )
                .sort((a, b) => b - a)
                .map((year) => (
                  <SelectItem key={year} value={String(year)}>{year}년</SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Select
            value={selectedMonth || undefined}
            onValueChange={setSelectedMonth}
            disabled={periodType !== 'daily'}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                const monthValue = String(month).padStart(2, '0')
                const yearMonth = `${selectedYear}-${monthValue}`
                const isDisabled = !availableMonths.has(yearMonth)
                return (
                  <SelectItem key={month} value={monthValue} disabled={isDisabled}>
                    {month}월
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="주문 전환율"
          value={data.summary.avgOrderItemSessionPercentage.toFixed(2)}
          subtitle="세션 대비 주문 비율"
          icon={Percent}
          format="percent"
        />
        <MetricCard
          title="유닛 전환율"
          value={data.summary.avgUnitSessionPercentage.toFixed(2)}
          subtitle="세션 대비 판매 수량 비율"
          icon={TrendingUp}
          format="percent"
        />
        <MetricCard
          title="총 세션 수"
          value={data.summary.totalSessions}
          subtitle={`페이지 뷰: ${data.summary.totalPageViews.toLocaleString()}`}
          icon={Eye}
        />
        <MetricCard
          title="총 주문 수"
          value={data.summary.totalOrders}
          subtitle={`판매 수량: ${data.summary.totalUnits.toLocaleString()}`}
          icon={ShoppingCart}
        />
      </div>

      {/* Daily Conversion Table */}
      <Card className="border border-gray-200">
        <CardHeader>
          <CardTitle className="text-base font-medium">일별 전환율 추이</CardTitle>
          <CardDescription className="text-xs">날짜별 전환율 및 트래픽 데이터</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-3 px-3 font-medium text-gray-600">날짜</th>
                  <th className="text-right py-3 px-3 font-medium text-gray-600">주문 전환율</th>
                  <th className="text-right py-3 px-3 font-medium text-gray-600">유닛 전환율</th>
                  <th className="text-right py-3 px-3 font-medium text-gray-600">Buy Box</th>
                  <th className="text-right py-3 px-3 font-medium text-gray-600">세션</th>
                  <th className="text-right py-3 px-3 font-medium text-gray-600">주문</th>
                  <th className="text-right py-3 px-3 font-medium text-gray-600">페이지 뷰</th>
                </tr>
              </thead>
              <tbody>
                {data.conversionData.map((item, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-3 font-medium">{item.date}</td>
                    <td className="text-right py-3 px-3 font-semibold text-green-600">
                      {item.orderItemSessionPercentage.toFixed(2)}%
                    </td>
                    <td className="text-right py-3 px-3">
                      {item.unitSessionPercentage.toFixed(2)}%
                    </td>
                    <td className="text-right py-3 px-3 font-medium text-blue-600">
                      {item.buyBoxPercentage.toFixed(2)}%
                    </td>
                    <td className="text-right py-3 px-3">{item.sessions.toLocaleString()}</td>
                    <td className="text-right py-3 px-3">{item.orders.toLocaleString()}</td>
                    <td className="text-right py-3 px-3">{item.pageViews.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border border-gray-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="text-base font-medium">💡 전환율 지표 설명</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-700">
          <div className="bg-white rounded-lg p-4 space-y-3 border border-gray-200">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5" />
              <div>
                <p className="font-semibold text-gray-900 mb-1">주문 전환율 (Order Item Session Percentage)</p>
                <p className="text-gray-600">세션 수 대비 주문이 발생한 비율입니다. (주문 수 / 세션 수 × 100)</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-orange-500 mt-1.5" />
              <div>
                <p className="font-semibold text-gray-900 mb-1">유닛 전환율 (Unit Session Percentage)</p>
                <p className="text-gray-600">세션 수 대비 실제 판매된 상품 수량의 비율입니다. (판매 수량 / 세션 수 × 100)</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Award className="h-4 w-4 text-blue-600 mt-1" />
              <div>
                <p className="font-semibold text-gray-900 mb-1">Buy Box 비율</p>
                <p className="text-gray-600">
                  Amazon에서 "Buy Box"를 획득한 비율입니다. Buy Box는 상품 페이지에서 "카트에 담기" 버튼을 획득하는 것으로,
                  높을수록 판매 기회가 증가합니다.
                </p>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-600">
            전환율이 높을수록 트래픽 대비 실제 판매로 이어지는 효율성이 높습니다.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
