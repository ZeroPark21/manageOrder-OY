"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  BarChart3,
  Percent,
  Loader2,
  AlertCircle,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Minimal Metric card component
const MetricCard = ({
  title,
  value,
  change,
  icon: Icon,
  format = "number",
}: {
  title: string;
  value: number | string;
  change: number;
  icon: any;
  format?: "number" | "currency" | "percent";
}) => {
  const isPositive = change > 0;

  const formatValue = () => {
    if (format === "currency")
      return `$${typeof value === "number" ? value.toLocaleString() : value}`;
    if (format === "percent") return `${value}%`;
    return typeof value === "number" ? value.toLocaleString() : value;
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
          <div
            className={`flex items-center text-xs ${
              isPositive ? "text-green-600" : "text-red-600"
            }`}
          >
            {isPositive ? (
              <TrendingUp className="h-3 w-3 mr-1" />
            ) : (
              <TrendingDown className="h-3 w-3 mr-1" />
            )}
            <span>
              {isPositive ? "+" : ""}
              {change.toFixed(1)}% from last period
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface DashboardMetrics {
  summary: {
    totalRevenue: { value: number; change: number };
    totalOrders: { value: number; change: number };
    avgOrderValue: { value: number; change: number };
    totalItems: { value: number; change: number };
  };
  platformRevenue: Array<{ name: string; value: number; color: string }>;
  salesTrend: Array<{ date: string; tiktok: number; amazon: number }>;
  weeklySalesTrend: Array<{ date: string; tiktok: number; amazon: number }>;
  monthlySalesTrend: Array<{ date: string; tiktok: number; amazon: number }>;
  ordersTrend: Array<{ date: string; tiktok: number; amazon: number }>;
  weeklyOrdersTrend: Array<{ date: string; tiktok: number; amazon: number }>;
  monthlyOrdersTrend: Array<{ date: string; tiktok: number; amazon: number }>;
  topProducts: Array<{
    id: string;
    name: string;
    platform: string;
    orders: number;
    revenue: number;
    growth: number;
  }>;
  platformPerformance: {
    tiktok: {
      name: string;
      revenue: number;
      orders: number;
      conversionRate: number;
      avgOrderValue: number;
      percentOfTotal: number;
    };
    amazon: {
      name: string;
      revenue: number;
      orders: number;
      conversionRate: number;
      avgOrderValue: number;
      percentOfTotal: number;
    };
  };
}

export default function IntegratedDashboard() {
  const params = useParams();
  const companyId = params.companyId as string;

  const [periodType, setPeriodType] = useState<"daily" | "weekly" | "monthly">(
    "daily"
  );
  const [platform, setPlatform] = useState("all");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(
    String(new Date().getMonth() + 1).padStart(2, "0")
  );
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [availableMonths, setAvailableMonths] = useState<Set<string>>(
    new Set()
  );

  // Fetch available months on mount
  useEffect(() => {
    const fetchAvailableMonths = async () => {
      try {
        const params = new URLSearchParams({
          companyId,
          dateFrom: "2020-01-01",
          dateTo: new Date().toISOString().split("T")[0],
          platform: "all",
        });
        const response = await fetch(`/api/dashboard/metrics?${params}`);
        if (response.ok) {
          const data = await response.json();
          const months = new Set<string>();
          if (data.salesTrend) {
            data.salesTrend.forEach((item: any) => {
              const date = new Date(item.date);
              const yearMonth = `${date.getFullYear()}-${String(
                date.getMonth() + 1
              ).padStart(2, "0")}`;
              months.add(yearMonth);
            });
          }
          setAvailableMonths(months);

          // Set default to the most recent month with data
          if (months.size > 0) {
            const sortedMonths = Array.from(months).sort().reverse();
            const latestMonth = sortedMonths[0];
            const [year, month] = latestMonth.split('-');
            setSelectedYear(parseInt(year));
            setSelectedMonth(month);
          }
        }
      } catch (err) {
        console.error("Failed to fetch available months:", err);
      }
    };
    fetchAvailableMonths();
  }, [companyId]);

  useEffect(() => {
    fetchMetrics();
  }, [companyId, selectedYear, selectedMonth, periodType, platform]);

  const fetchMetrics = async () => {
    setIsLoading(true);
    setError(null);

    try {
      let dateFrom: string;
      let dateTo: string;

      if (periodType === "daily") {
        // For daily: specific year and month
        const year = selectedYear;
        const month = parseInt(selectedMonth);
        dateFrom = `${year}-${String(month).padStart(2, "0")}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        dateTo = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;
      } else {
        // For weekly and monthly: all available data
        dateFrom = "2020-01-01"; // Get all historical data
        dateTo = new Date().toISOString().split("T")[0];
      }

      const params = new URLSearchParams({
        companyId,
        dateFrom,
        dateTo,
        platform,
      });

      const response = await fetch(`/api/dashboard/metrics?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch metrics");
      }

      const data = await response.json();
      setMetrics(data);
    } catch (err) {
      console.error("Error fetching metrics:", err);
      setError("데이터를 불러오는데 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const formatXAxisDate = (value: string) => {
    if (periodType === "monthly") {
      const [year, month] = value.split("-");
      return `${year.slice(2)}년 ${month}월`;
    }
    const date = new Date(value);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    if (periodType === "weekly") {
      return `${month}/${day}~`;
    }
    return `${month}/${day}`;
  };

  const getSalesTrendData = () => {
    if (!metrics) return [];
    if (periodType === "daily") return metrics.salesTrend;
    if (periodType === "weekly") return metrics.weeklySalesTrend;
    return metrics.monthlySalesTrend;
  };

  const getOrdersTrendData = () => {
    if (!metrics) return [];
    if (periodType === "daily") return metrics.ordersTrend;
    if (periodType === "weekly") return metrics.weeklyOrdersTrend;
    return metrics.monthlyOrdersTrend;
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-8 p-8 bg-gray-50 min-h-screen">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div>
            <h1 className="text-2xl font-semibold">통합 대시보드</h1>
            <p className="text-sm text-gray-600">
              TikTok Shop & Amazon 성과 분석
            </p>
          </div>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>오류</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Check if there's no data at all
  const hasNoData =
    !metrics ||
    (metrics.summary.totalRevenue.value === 0 &&
      metrics.summary.totalOrders.value === 0 &&
      metrics.platformRevenue.length === 0 &&
      metrics.salesTrend.length === 0);

  if (!metrics || hasNoData) {
    return (
      <div className="flex flex-col gap-8 p-8 bg-gray-50 min-h-screen">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <div>
              <h1 className="text-2xl font-semibold">통합 대시보드</h1>
              <p className="text-sm text-gray-600">
                TikTok Shop & Amazon 성과 분석
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Tabs
              value={periodType}
              onValueChange={(v) =>
                setPeriodType(v as "daily" | "weekly" | "monthly")
              }
            >
              <TabsList className="bg-gray-100 p-1 rounded-lg">
                <TabsTrigger
                  value="daily"
                  className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm px-6 py-2.5 text-sm font-medium"
                >
                  일별
                </TabsTrigger>
                <TabsTrigger
                  value="weekly"
                  className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm px-6 py-2.5 text-sm font-medium"
                >
                  주별
                </TabsTrigger>
                <TabsTrigger
                  value="monthly"
                  className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm px-6 py-2.5 text-sm font-medium"
                >
                  월별
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
        <Card className="border border-gray-200">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-gray-100 p-4 mb-4">
              <BarChart3 className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">데이터가 없습니다</h3>
            <p className="text-sm text-gray-600 max-w-md mb-4">
              선택한 기간에 데이터가 없습니다. 다른 기간을 선택하거나 데이터를
              업로드해주세요.
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-pink-500" />
                <span>TikTok Shop</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-orange-500" />
                <span>Amazon</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div>
            <h1 className="text-2xl font-semibold">통합 대시보드</h1>
            <p className="text-sm text-gray-600">
              TikTok Shop & Amazon 성과 분석
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Tabs
            value={periodType}
            onValueChange={(v) =>
              setPeriodType(v as "daily" | "weekly" | "monthly")
            }
          >
            <TabsList>
              <TabsTrigger value="daily">일별</TabsTrigger>
              <TabsTrigger value="weekly">주별</TabsTrigger>
              <TabsTrigger value="monthly">월별</TabsTrigger>
            </TabsList>
          </Tabs>
          <Select
            value={String(selectedYear)}
            onValueChange={(v) => setSelectedYear(parseInt(v))}
            disabled={periodType !== "daily"}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from(
                new Set(
                  Array.from(availableMonths).map((ym) =>
                    parseInt(ym.split("-")[0])
                  )
                )
              )
                .sort((a, b) => b - a)
                .map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    {year}년
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Select
            value={selectedMonth}
            onValueChange={setSelectedMonth}
            disabled={periodType !== "daily"}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                const monthValue = String(month).padStart(2, "0");
                const yearMonth = `${selectedYear}-${monthValue}`;
                const isDisabled = !availableMonths.has(yearMonth);
                return (
                  <SelectItem
                    key={month}
                    value={monthValue}
                    disabled={isDisabled}
                  >
                    {month}월
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <Select value={platform} onValueChange={setPlatform}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              <SelectItem value="tiktok">TikTok Shop</SelectItem>
              <SelectItem value="amazon">Amazon</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="총 매출"
          value={metrics.summary.totalRevenue.value}
          change={metrics.summary.totalRevenue.change}
          icon={DollarSign}
          format="currency"
        />
        <MetricCard
          title="총 주문"
          value={metrics.summary.totalOrders.value}
          change={metrics.summary.totalOrders.change}
          icon={ShoppingCart}
        />
        <MetricCard
          title="평균 주문액"
          value={metrics.summary.avgOrderValue.value}
          change={metrics.summary.avgOrderValue.change}
          icon={BarChart3}
          format="currency"
        />
        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-3">
              <span className="text-sm text-gray-600">전환율</span>
              <Percent className="h-5 w-5 text-gray-400" />
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-semibold text-gray-400">-</p>
              <p className="text-xs text-gray-500">페이지뷰 데이터 필요</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Platform Summary Table */}
      <Card className="border border-gray-200">
        <CardHeader>
          <CardTitle className="text-base font-medium">
            플랫폼별 핵심 지표
          </CardTitle>
          <CardDescription className="text-xs">
            채널별 성과 비교
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">
                    플랫폼
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">
                    총 매출
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">
                    총 주문 수
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">
                    평균 주문액
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">
                    비중
                  </th>
                </tr>
              </thead>
              <tbody>
                {(platform === 'all' || platform === 'tiktok') && (
                  <tr className="border-b hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-black" />
                        <span className="font-medium">TikTok Shop</span>
                      </div>
                    </td>
                    <td className="text-right py-3 px-4 font-semibold">
                      $
                      {metrics.platformPerformance.tiktok.revenue.toLocaleString()}
                    </td>
                    <td className="text-right py-3 px-4">
                      {metrics.platformPerformance.tiktok.orders.toLocaleString()}
                    </td>
                    <td className="text-right py-3 px-4">
                      $
                      {metrics.platformPerformance.tiktok.avgOrderValue.toLocaleString()}
                    </td>
                    <td className="text-right py-3 px-4">
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 text-gray-900 font-medium">
                        {metrics.platformPerformance.tiktok.percentOfTotal}%
                      </span>
                    </td>
                  </tr>
                )}
                {(platform === 'all' || platform === 'amazon') && (
                  <tr className="border-b hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-orange-500" />
                        <span className="font-medium">Amazon</span>
                      </div>
                    </td>
                    <td className="text-right py-3 px-4 font-semibold">
                      $
                      {metrics.platformPerformance.amazon.revenue.toLocaleString()}
                  </td>
                  <td className="text-right py-3 px-4">
                    {metrics.platformPerformance.amazon.orders.toLocaleString()}
                  </td>
                  <td className="text-right py-3 px-4">
                    $
                    {metrics.platformPerformance.amazon.avgOrderValue.toLocaleString()}
                  </td>
                  <td className="text-right py-3 px-4">
                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-orange-100 text-orange-900 font-medium">
                      {metrics.platformPerformance.amazon.percentOfTotal}%
                    </span>
                  </td>
                </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Platform Revenue Comparison */}
        <Card className="border border-gray-200">
          <CardHeader>
            <CardTitle className="text-base font-medium">
              플랫폼별 매출 분포
            </CardTitle>
            <CardDescription className="text-xs">
              전체 매출 중 플랫폼별 비중
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={metrics.platformRevenue.filter((item) => {
                      if (platform === 'all') return true;
                      if (platform === 'tiktok') return item.name === 'TikTok Shop';
                      if (platform === 'amazon') return item.name === 'Amazon';
                      return true;
                    })}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {metrics.platformRevenue
                      .filter((item) => {
                        if (platform === 'all') return true;
                        if (platform === 'tiktok') return item.name === 'TikTok Shop';
                        if (platform === 'amazon') return item.name === 'Amazon';
                        return true;
                      })
                      .map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => `$${value.toLocaleString()}`}
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      fontSize: "12px",
                      padding: "8px 12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-8 mt-4">
              {metrics.platformRevenue
                .filter((item) => {
                  if (platform === 'all') return true;
                  if (platform === 'tiktok') return item.name === 'TikTok Shop';
                  if (platform === 'amazon') return item.name === 'Amazon';
                  return true;
                })
                .map((platformData) => (
                <div
                  key={platformData.name}
                  className="flex items-center gap-2"
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: platformData.color }}
                  />
                  <span className="text-sm font-medium">
                    {platformData.name}
                  </span>
                  <span className="text-sm text-gray-600">
                    ${(platformData.value / 1000).toFixed(0)}k
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Sales Trend */}
        <Card className="border border-gray-200">
          <CardHeader>
            <CardTitle className="text-base font-medium">판매 추이</CardTitle>
            <CardDescription className="text-xs">
              {periodType === "daily"
                ? "일별"
                : periodType === "weekly"
                ? "주별 (월-일)"
                : "월별"}{" "}
              매출 변화
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={getSalesTrendData()}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f0f0f0"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  axisLine={{ stroke: "#e5e7eb" }}
                  tickLine={false}
                  tickFormatter={formatXAxisDate}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "12px",
                    padding: "8px 12px",
                  }}
                  formatter={(value: any, name: string) => {
                    const label = name === "tiktok" ? "TikTok Shop" : "Amazon";
                    return [`$${value.toLocaleString()}`, label];
                  }}
                />
                {(platform === 'all' || platform === 'tiktok') && (
                  <Line
                    type="monotone"
                    dataKey="tiktok"
                    stroke="#000000"
                    strokeWidth={2}
                    dot={false}
                    name="tiktok"
                  />
                )}
                {(platform === 'all' || platform === 'amazon') && (
                  <Line
                    type="monotone"
                    dataKey="amazon"
                    stroke="#FF9900"
                    strokeWidth={2}
                    dot={false}
                    name="amazon"
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Orders Trend */}
      <Card className="border border-gray-200">
        <CardHeader>
          <CardTitle className="text-base font-medium">주문 수 추이</CardTitle>
          <CardDescription className="text-xs">
            {periodType === "daily"
              ? "일별"
              : periodType === "weekly"
              ? "주별 (월-일)"
              : "월별"}{" "}
            주문 수 변화
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={getOrdersTrendData()}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#f0f0f0"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                axisLine={{ stroke: "#e5e7eb" }}
                tickLine={false}
                tickFormatter={formatXAxisDate}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "12px",
                  padding: "8px 12px",
                }}
                formatter={(value: any, name: string) => {
                  const label = name === "tiktok" ? "TikTok Shop" : "Amazon";
                  return [value.toLocaleString(), label];
                }}
              />
              {(platform === 'all' || platform === 'tiktok') && (
                <Line
                  type="monotone"
                  dataKey="tiktok"
                  stroke="#000000"
                  strokeWidth={2}
                  dot={false}
                  name="tiktok"
                />
              )}
              {(platform === 'all' || platform === 'amazon') && (
                <Line
                  type="monotone"
                  dataKey="amazon"
                  stroke="#FF9900"
                  strokeWidth={2}
                  dot={false}
                  name="amazon"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Products and Performance Section */}
      <div className="w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Performing Products */}
          <Card className="border border-gray-200">
            <CardHeader>
              <CardTitle className="text-base font-medium">상위 제품</CardTitle>
              <CardDescription className="text-xs">
                전체 플랫폼 베스트셀러
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics.topProducts.length === 0 ? (
                  <p className="text-center text-gray-500 py-8 text-sm">
                    데이터가 없습니다
                  </p>
                ) : (
                  metrics.topProducts
                    .filter((product) => {
                      if (platform === 'all') return true;
                      if (platform === 'tiktok') return product.platform === 'TikTok';
                      if (platform === 'amazon') return product.platform === 'Amazon';
                      return true;
                    })
                    .map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between py-3 border-b last:border-0"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div>
                          <p className="font-medium text-sm truncate">
                            {product.name}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge
                              variant="outline"
                              className={`text-xs px-2 py-0 ${
                                product.platform === "TikTok"
                                  ? "bg-gray-100 text-gray-900 border-gray-200"
                                  : "bg-orange-50 text-orange-700 border-orange-200"
                              }`}
                            >
                              {product.platform}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {product.orders} orders
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <p className="font-semibold text-sm">
                          ${product.revenue.toLocaleString()}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-green-600 mt-1">
                          <TrendingUp className="h-3 w-3" />
                          <span>{product.growth}%</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Platform Performance */}
          <Card className="border border-gray-200">
            <CardHeader>
              <CardTitle className="text-base font-medium">
                플랫폼 성과
              </CardTitle>
              <CardDescription className="text-xs">
                플랫폼별 핵심 지표
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {Object.values(metrics.platformPerformance)
                  .filter((platformData) => {
                    if (platform === 'all') return true;
                    if (platform === 'tiktok') return platformData.name === 'TikTok Shop';
                    if (platform === 'amazon') return platformData.name === 'Amazon';
                    return true;
                  })
                  .map((platformData) => (
                    <div key={platformData.name} className="space-y-3">
                      <div className="flex items-center justify-between pb-3 border-b">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              platformData.name === "TikTok Shop"
                                ? "bg-black"
                                : "bg-orange-500"
                            }`}
                          />
                          <span className="font-medium text-sm">
                            {platformData.name}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold">
                            ${(platformData.revenue / 1000).toFixed(0)}k
                          </p>
                          <p className="text-xs text-gray-500">
                            {platformData.percentOfTotal}% of total
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-xs text-gray-500">주문 수</p>
                          <p className="font-medium">
                            {platformData.orders.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">평균 주문액</p>
                          <p className="font-medium">
                            ${platformData.avgOrderValue}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
