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
  DollarSign,
  ShoppingCart,
  Package,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Loader2,
  RefreshCcw,
  Truck,
  AlertCircle,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from "recharts";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Minimal Metric card component matching integrated dashboard
const MetricCard = ({
  title,
  value,
  change,
  icon: Icon,
  format = "number",
}: {
  title: string;
  value: number | string;
  change?: number;
  icon: any;
  format?: "number" | "currency" | "percent";
}) => {
  const isPositive = change !== undefined && change > 0;

  const formatValue = () => {
    if (format === "currency")
      return `$${typeof value === "number" ? value.toLocaleString() : value}`;
    if (format === "percent") return `${value}%`;
    if (typeof value === "number") return value.toLocaleString();
    return value;
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
          {change !== undefined && (
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
          )}
        </div>
      </CardContent>
    </Card>
  );
};

interface SalesData {
  orderedProductSales: number;
  unitsOrdered: number;
  totalOrderItems: number;
  avgSalesPerOrderItem: number;
  avgSellingPrice: number;
  pageViewsMobile: number;
  pageViewsBrowser: number;
  pageViewsTotal: number;
  unitsRefunded: number;
  refundRate: number;
  unitsShipped: number;
  ordersShipped: number;
}

interface OverviewData {
  metrics: {
    orderedProductSales: { value: number; change: number };
    unitsOrdered: { value: number; change: number };
    totalOrderItems: { value: number; change: number };
    avgSalesPerOrderItem: { value: number; change: number };
    avgSellingPrice: { value: number; change: number };
    pageViewsTotal: { value: number; change: number };
    pageViewsMobile: { value: number; change: number };
    pageViewsBrowser: { value: number; change: number };
    unitsRefunded: { value: number; change: number };
    refundRate: { value: number; change: number };
    unitsShipped: { value: number; change: number };
    ordersShipped: { value: number; change: number };
  };
  dailySales: Array<SalesData & { date: string }>;
  weeklySales: Array<
    SalesData & { week: string; dateRange: string; days: number }
  >;
  monthlySales: Array<
    SalesData & { month: string; monthName: string; days: number }
  >;
}

export default function AmazonOverviewPage() {
  const params = useParams();
  const companyId = params.companyId as string;
  const [periodType, setPeriodType] = useState<"daily" | "weekly" | "monthly">(
    "daily"
  );
  const [platform, setPlatform] = useState("amazon");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(
    String(new Date().getMonth() + 1).padStart(2, "0")
  );
  const [availableMonths, setAvailableMonths] = useState<Set<string>>(
    new Set()
  );
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<OverviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpload, setLastUpload] = useState<string | null>(null);

  // Fetch available months on mount
  useEffect(() => {
    const fetchAvailableMonths = async () => {
      try {
        const response = await fetch(
          `/api/amazon/overview?companyId=${companyId}&days=all`
        );
        if (response.ok) {
          const result = await response.json();
          const months = new Set<string>();
          if (result.dailySales) {
            result.dailySales.forEach((item: any) => {
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
            const [year, month] = latestMonth.split("-");
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
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

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
          dateFrom = "2020-01-01";
          dateTo = new Date().toISOString().split("T")[0];
        }

        const response = await fetch(
          `/api/amazon/overview?companyId=${companyId}&dateFrom=${dateFrom}&dateTo=${dateTo}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch data");
        }

        const result = await response.json();
        setData(result);

        if (result.dailySales && result.dailySales.length > 0) {
          const lastDate = result.dailySales[result.dailySales.length - 1].date;
          setLastUpload(lastDate);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [companyId, selectedYear, selectedMonth, periodType]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>오류</AlertTitle>
          <AlertDescription>
            {error || "데이터를 불러올 수 없습니다."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // 기간에 따라 데이터 선택
  const getChartData = () => {
    if (periodType === "daily") return data.dailySales;
    if (periodType === "weekly") return data.weeklySales;
    return data.monthlySales;
  };

  // X축 날짜 포맷
  const formatXAxis = (value: string) => {
    if (periodType === "monthly") {
      // "2024-09" -> "24년 9월"
      const [year, month] = value.split("-");
      return `${year.slice(2)}년 ${month}월`;
    }
    if (periodType === "weekly") {
      // 주별 데이터는 dateRange 사용 (예: "9/16 - 9/22")
      return value;
    }
    // 일별
    const date = new Date(value);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  // X축 dataKey 선택
  const getXAxisKey = () => {
    if (periodType === "monthly") return "month";
    if (periodType === "weekly") return "dateRange";
    return "date";
  };

  const chartData = getChartData();
  const xAxisKey = getXAxisKey();

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
                <BreadcrumbPage>Amazon 전체 판매 성과 분석</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
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
            value={selectedMonth || undefined}
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
          {lastUpload && (
            <Badge variant="outline" className="gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              {lastUpload}
            </Badge>
          )}
        </div>
      </div>

      {/* Key Performance Metrics - Top Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="주문 상품 판매량"
          value={data.metrics.orderedProductSales.value}
          change={data.metrics.orderedProductSales.change}
          icon={DollarSign}
          format="currency"
        />
        <MetricCard
          title="주문 수량"
          value={data.metrics.unitsOrdered.value}
          change={data.metrics.unitsOrdered.change}
          icon={ShoppingCart}
        />
        <MetricCard
          title="총 주문 아이템"
          value={data.metrics.totalOrderItems.value}
          change={data.metrics.totalOrderItems.change}
          icon={Package}
        />
        <MetricCard
          title="평균 판매 가격"
          value={data.metrics.avgSellingPrice.value}
          change={data.metrics.avgSellingPrice.change}
          icon={DollarSign}
          format="currency"
        />
      </div>

      {/* Sales Trend Chart */}
      <Card className="border border-gray-200">
        <CardHeader>
          <CardTitle className="text-base font-medium">
            판매 추이 분석
          </CardTitle>
          <CardDescription className="text-xs">
            {periodType === "daily"
              ? "일별"
              : periodType === "weekly"
              ? "주별 (월-일)"
              : "월별"}{" "}
            판매량 및 주문 수량 추이
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey={xAxisKey}
                tick={{ fontSize: 12 }}
                tickFormatter={formatXAxis}
              />
              <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "6px",
                  fontSize: "12px",
                }}
                formatter={(value: any, name: string) => {
                  if (name === "orderedProductSales")
                    return [`$${value.toLocaleString()}`, "판매액"];
                  if (name === "unitsOrdered") return [value, "주문 수량"];
                  return [value, name];
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: "12px" }}
                formatter={(value) => {
                  if (value === "orderedProductSales") return "판매액";
                  if (value === "unitsOrdered") return "주문 수량";
                  return value;
                }}
              />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="orderedProductSales"
                fill="#10b981"
                stroke="#059669"
                fillOpacity={0.2}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="unitsOrdered"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Traffic & Conversion Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Page Views Chart */}
        <Card className="border border-gray-200">
          <CardHeader>
            <CardTitle className="text-base font-medium">
              페이지 조회수 분석
            </CardTitle>
            <CardDescription className="text-xs">
              앱 vs 브라우저 트래픽
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">전체</p>
                <p className="text-2xl font-bold">
                  {data.metrics.pageViewsTotal.value.toLocaleString()}
                </p>
                <div className="flex items-center justify-center gap-1 text-xs text-green-600 mt-1">
                  <TrendingUp className="h-3 w-3" />
                  {data.metrics.pageViewsTotal.change.toFixed(1)}%
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">앱</p>
                <p className="text-2xl font-bold">
                  {data.metrics.pageViewsMobile.value.toLocaleString()}
                </p>
                <div className="flex items-center justify-center gap-1 text-xs text-blue-600 mt-1">
                  <TrendingUp className="h-3 w-3" />
                  {data.metrics.pageViewsMobile.change.toFixed(1)}%
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">브라우저</p>
                <p className="text-2xl font-bold">
                  {data.metrics.pageViewsBrowser.value.toLocaleString()}
                </p>
                <div className="flex items-center justify-center gap-1 text-xs text-purple-600 mt-1">
                  <TrendingUp className="h-3 w-3" />
                  {data.metrics.pageViewsBrowser.change.toFixed(1)}%
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey={xAxisKey}
                  tick={{ fontSize: 11 }}
                  tickFormatter={formatXAxis}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "6px",
                    fontSize: "11px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="pageViewsMobile"
                  stackId="1"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  name="앱"
                />
                <Area
                  type="monotone"
                  dataKey="pageViewsBrowser"
                  stackId="1"
                  stroke="#8b5cf6"
                  fill="#8b5cf6"
                  name="브라우저"
                />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Shipping & Refund Chart */}
        <Card className="border border-gray-200">
          <CardHeader>
            <CardTitle className="text-base font-medium">
              배송 및 환불 분석
            </CardTitle>
            <CardDescription className="text-xs">
              배송 수량 vs 환불 수량
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">배송 수량</p>
                <p className="text-2xl font-bold">
                  {data.metrics.unitsShipped.value.toLocaleString()}
                </p>
                <div className="flex items-center justify-center gap-1 text-xs text-green-600 mt-1">
                  <TrendingUp className="h-3 w-3" />
                  {data.metrics.unitsShipped.change.toFixed(1)}%
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">환불 수량</p>
                <p className="text-2xl font-bold">
                  {data.metrics.unitsRefunded.value.toLocaleString()}
                </p>
                <div className="flex items-center justify-center gap-1 text-xs text-red-600 mt-1">
                  <RefreshCcw className="h-3 w-3" />
                  {data.metrics.unitsRefunded.change.toFixed(1)}%
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">환불률</p>
                <p className="text-2xl font-bold">
                  {data.metrics.refundRate.value.toFixed(2)}%
                </p>
                <div
                  className={`flex items-center justify-center gap-1 text-xs mt-1 ${
                    data.metrics.refundRate.change < 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {data.metrics.refundRate.change < 0 ? (
                    <TrendingDown className="h-3 w-3" />
                  ) : (
                    <TrendingUp className="h-3 w-3" />
                  )}
                  {Math.abs(data.metrics.refundRate.change).toFixed(1)}%
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey={xAxisKey}
                  tick={{ fontSize: 11 }}
                  tickFormatter={formatXAxis}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "6px",
                    fontSize: "11px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Bar dataKey="unitsShipped" fill="#10b981" name="배송 수량" />
                <Bar dataKey="unitsRefunded" fill="#ef4444" name="환불 수량" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="주문 아이템당 평균 판매량"
          value={data.metrics.avgSalesPerOrderItem.value}
          change={data.metrics.avgSalesPerOrderItem.change}
          icon={BarChart3}
          format="currency"
        />
        <MetricCard
          title="배송 주문"
          value={data.metrics.ordersShipped.value}
          change={data.metrics.ordersShipped.change}
          icon={Truck}
        />
        <MetricCard
          title="환불된 수량"
          value={data.metrics.unitsRefunded.value}
          change={data.metrics.unitsRefunded.change}
          icon={RefreshCcw}
        />
        <MetricCard
          title="환불률"
          value={data.metrics.refundRate.value.toFixed(2)}
          change={data.metrics.refundRate.change}
          icon={TrendingDown}
          format="percent"
        />
      </div>

      {/* Detailed Data Table */}
      <Card className="border border-gray-200">
        <CardHeader>
          <div>
            <CardTitle className="text-base font-medium">
              상세 데이터 분석
            </CardTitle>
            <CardDescription className="text-xs">
              {periodType === "daily"
                ? "일별"
                : periodType === "weekly"
                ? "주별 (월-일)"
                : "월별"}{" "}
              집계 데이터
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {periodType === "daily" && (
            <div className="overflow-x-auto">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left py-3 px-3 font-medium">날짜</th>
                      <th className="text-right py-3 px-3 font-medium">
                        판매량
                      </th>
                      <th className="text-right py-3 px-3 font-medium">
                        주문 수량
                      </th>
                      <th className="text-right py-3 px-3 font-medium">
                        주문 아이템
                      </th>
                      <th className="text-right py-3 px-3 font-medium">
                        평균 판매가
                      </th>
                      <th className="text-right py-3 px-3 font-medium">
                        페이지뷰
                      </th>
                      <th className="text-right py-3 px-3 font-medium">
                        환불 수량
                      </th>
                      <th className="text-right py-3 px-3 font-medium">
                        환불률
                      </th>
                      <th className="text-right py-3 px-3 font-medium">배송</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.dailySales.map((day, index) => (
                      <tr
                        key={index}
                        className="border-b hover:bg-muted/30 transition-colors"
                      >
                        <td className="py-3 px-3 font-medium">{day.date}</td>
                        <td className="text-right py-3 px-3 text-green-600 font-semibold">
                          ${day.orderedProductSales.toLocaleString()}
                        </td>
                        <td className="text-right py-3 px-3">
                          {day.unitsOrdered}
                        </td>
                        <td className="text-right py-3 px-3">
                          {day.totalOrderItems}
                        </td>
                        <td className="text-right py-3 px-3">
                          ${day.avgSellingPrice.toFixed(2)}
                        </td>
                        <td className="text-right py-3 px-3">
                          <div>{day.pageViewsTotal.toLocaleString()}</div>
                          <div className="text-xs text-muted-foreground">
                            {day.pageViewsMobile}M / {day.pageViewsBrowser}B
                          </div>
                        </td>
                        <td className="text-right py-3 px-3 text-red-600">
                          {day.unitsRefunded}
                        </td>
                        <td className="text-right py-3 px-3">
                          <Badge
                            variant={
                              day.refundRate > 5 ? "destructive" : "outline"
                            }
                          >
                            {day.refundRate.toFixed(2)}%
                          </Badge>
                        </td>
                        <td className="text-right py-3 px-3">
                          <div>{day.unitsShipped}</div>
                          <div className="text-xs text-muted-foreground">
                            {day.ordersShipped} 주문
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {periodType === "weekly" && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left py-3 px-3 font-medium">
                      주간 (기간)
                    </th>
                    <th className="text-right py-3 px-3 font-medium">판매량</th>
                    <th className="text-right py-3 px-3 font-medium">
                      주문 수량
                    </th>
                    <th className="text-right py-3 px-3 font-medium">
                      주문 아이템
                    </th>
                    <th className="text-right py-3 px-3 font-medium">
                      평균 판매가
                    </th>
                    <th className="text-right py-3 px-3 font-medium">
                      페이지뷰
                    </th>
                    <th className="text-right py-3 px-3 font-medium">
                      환불 수량
                    </th>
                    <th className="text-right py-3 px-3 font-medium">환불률</th>
                    <th className="text-right py-3 px-3 font-medium">배송</th>
                  </tr>
                </thead>
                <tbody>
                  {data.weeklySales.map((week, index) => (
                    <tr
                      key={index}
                      className="border-b hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-3 px-3">
                        <div className="font-medium">{week.dateRange}</div>
                        <div className="text-xs text-muted-foreground">
                          {week.days}일 집계
                        </div>
                      </td>
                      <td className="text-right py-3 px-3 text-green-600 font-semibold">
                        ${week.orderedProductSales.toLocaleString()}
                      </td>
                      <td className="text-right py-3 px-3">
                        {week.unitsOrdered}
                      </td>
                      <td className="text-right py-3 px-3">
                        {week.totalOrderItems}
                      </td>
                      <td className="text-right py-3 px-3">
                        ${week.avgSellingPrice.toFixed(2)}
                      </td>
                      <td className="text-right py-3 px-3">
                        <div>{week.pageViewsTotal.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">
                          {week.pageViewsMobile}M / {week.pageViewsBrowser}B
                        </div>
                      </td>
                      <td className="text-right py-3 px-3 text-red-600">
                        {week.unitsRefunded}
                      </td>
                      <td className="text-right py-3 px-3">
                        <Badge
                          variant={
                            week.refundRate > 5 ? "destructive" : "outline"
                          }
                        >
                          {week.refundRate.toFixed(2)}%
                        </Badge>
                      </td>
                      <td className="text-right py-3 px-3">
                        <div>{week.unitsShipped}</div>
                        <div className="text-xs text-muted-foreground">
                          {week.ordersShipped} 주문
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {periodType === "monthly" && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left py-3 px-3 font-medium">월</th>
                    <th className="text-right py-3 px-3 font-medium">판매량</th>
                    <th className="text-right py-3 px-3 font-medium">
                      주문 수량
                    </th>
                    <th className="text-right py-3 px-3 font-medium">
                      주문 아이템
                    </th>
                    <th className="text-right py-3 px-3 font-medium">
                      평균 판매가
                    </th>
                    <th className="text-right py-3 px-3 font-medium">
                      페이지뷰
                    </th>
                    <th className="text-right py-3 px-3 font-medium">
                      환불 수량
                    </th>
                    <th className="text-right py-3 px-3 font-medium">환불률</th>
                    <th className="text-right py-3 px-3 font-medium">배송</th>
                  </tr>
                </thead>
                <tbody>
                  {data.monthlySales.map((month, index) => (
                    <tr
                      key={index}
                      className="border-b hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-3 px-3">
                        <div className="font-medium">{month.monthName}</div>
                        <div className="text-xs text-muted-foreground">
                          {month.days}일 집계
                        </div>
                      </td>
                      <td className="text-right py-3 px-3 text-green-600 font-semibold">
                        ${month.orderedProductSales.toLocaleString()}
                      </td>
                      <td className="text-right py-3 px-3">
                        {month.unitsOrdered}
                      </td>
                      <td className="text-right py-3 px-3">
                        {month.totalOrderItems}
                      </td>
                      <td className="text-right py-3 px-3">
                        ${month.avgSellingPrice.toFixed(2)}
                      </td>
                      <td className="text-right py-3 px-3">
                        <div>{month.pageViewsTotal.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">
                          {month.pageViewsMobile}M / {month.pageViewsBrowser}B
                        </div>
                      </td>
                      <td className="text-right py-3 px-3 text-red-600">
                        {month.unitsRefunded}
                      </td>
                      <td className="text-right py-3 px-3">
                        <Badge
                          variant={
                            month.refundRate > 5 ? "destructive" : "outline"
                          }
                        >
                          {month.refundRate.toFixed(2)}%
                        </Badge>
                      </td>
                      <td className="text-right py-3 px-3">
                        <div>{month.unitsShipped}</div>
                        <div className="text-xs text-muted-foreground">
                          {month.ordersShipped} 주문
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
