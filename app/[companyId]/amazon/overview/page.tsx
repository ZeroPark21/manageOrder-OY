"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  ShoppingCart,
  Package,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  BarChart3,
  Loader2,
} from "lucide-react";

// Metric card component
const MetricCard = ({
  title,
  value,
  change,
  icon: Icon,
  format = "number",
  subtitle,
}: {
  title: string;
  value: number | string;
  change?: number;
  icon: any;
  format?: "number" | "currency" | "percent";
  subtitle?: string;
}) => {
  const isPositive = change && change > 0;
  const formatValue = () => {
    if (format === "currency")
      return `$${typeof value === "number" ? value.toLocaleString() : value}`;
    if (format === "percent") return `${value}%`;
    return typeof value === "number" ? value.toLocaleString() : value;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-orange-500" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatValue()}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
        {change !== undefined && (
          <div className="flex items-center text-xs mt-2">
            {isPositive ? (
              <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
            )}
            <span className={isPositive ? "text-green-500" : "text-red-500"}>
              {isPositive ? "+" : ""}
              {change}%
            </span>
            <span className="text-muted-foreground ml-1">vs 이전 기간</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

interface OverviewData {
  metrics: {
    totalRevenue: { value: number; change: number };
    totalOrders: { value: number; change: number };
    totalShipped: { value: number; change: number };
    avgOrderValue: { value: number; change: number };
  };
  topAsins: Array<{
    asin: string;
    product_name: string;
    quantity: number;
    revenue: number;
    orders: number;
  }>;
  dailySales: Array<{
    date: string;
    orders: number;
    revenue: number;
    units: number;
  }>;
  weeklySales: Array<{
    week: string;
    orders: number;
    revenue: number;
    units: number;
    dateRange: string;
  }>;
  monthlySales: Array<{
    month: string;
    orders: number;
    revenue: number;
    units: number;
  }>;
  statusDistribution: Record<string, number>;
  serviceLevel: Record<string, number>;
}

export default function AmazonOverviewPage() {
  const params = useParams();
  const companyId = params.companyId as string;
  const [dateRange, setDateRange] = useState("30");
  const [salesViewMode, setSalesViewMode] = useState("daily");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<OverviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpload, setLastUpload] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(
          `/api/amazon/overview?companyId=${companyId}&dateRange=${dateRange}`
        );

        if (!response.ok) {
          throw new Error("데이터를 불러오는데 실패했습니다");
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err instanceof Error ? err.message : "오류가 발생했습니다");
      } finally {
        setLoading(false);
      }
    };

    const fetchChannelSettings = async () => {
      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const { data: company } = await supabase
          .from("companies")
          .select("channel_settings")
          .eq("id", parseInt(companyId))
          .single();

        if (company && (company as any).channel_settings?.amazon?.last_upload) {
          setLastUpload((company as any).channel_settings.amazon.last_upload);
        }
      } catch (err) {
        console.error("Error fetching channel settings:", err);
      }
    };

    if (companyId) {
      fetchData();
      fetchChannelSettings();
    }
  }, [companyId, dateRange]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>데이터를 불러오는 중...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">오류: {error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">데이터가 없습니다</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Amazon 전체 판매 성과 분석</h1>
          <div className="flex items-center gap-2">
            <p className="text-muted-foreground">
              총 판매액, 주문 수, 배송 건수 통계
            </p>
            {lastUpload && (
              <>
                <span className="text-muted-foreground">·</span>
                <p className="text-sm text-muted-foreground">
                  마지막 업데이트:{" "}
                  {new Date(lastUpload).toLocaleString("ko-KR", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            실시간 데이터
          </Badge>
          <Tabs value={salesViewMode} onValueChange={setSalesViewMode}>
            <TabsList>
              <TabsTrigger value="daily">일별</TabsTrigger>
              <TabsTrigger value="weekly">주별</TabsTrigger>
              <TabsTrigger value="monthly">월별</TabsTrigger>
            </TabsList>
          </Tabs>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7일</SelectItem>
              <SelectItem value="14">14일</SelectItem>
              <SelectItem value="30">30일</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="총 매출액"
          value={data.metrics.totalRevenue.value}
          change={data.metrics.totalRevenue.change}
          icon={DollarSign}
          format="currency"
        />
        <MetricCard
          title="총 주문 수"
          value={data.metrics.totalOrders.value}
          change={data.metrics.totalOrders.change}
          icon={ShoppingCart}
        />
        <MetricCard
          title="총 배송 건수"
          value={data.metrics.totalShipped.value}
          change={data.metrics.totalShipped.change}
          icon={Package}
        />
        <MetricCard
          title="평균 주문 가격"
          value={data.metrics.avgOrderValue.value}
          change={data.metrics.avgOrderValue.change}
          icon={BarChart3}
          format="currency"
        />
      </div>

      {/* Sales Data */}
      <Card>
        <CardHeader>
          <CardTitle>판매 추이</CardTitle>
          <CardDescription>Daily 기준으로 취합된 데이터</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            {salesViewMode === "daily" && (
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-4">날짜</th>
                    <th className="text-right py-2 px-4">주문 수</th>
                    <th className="text-right py-2 px-4">매출</th>
                    <th className="text-right py-2 px-4">판매량</th>
                  </tr>
                </thead>
                <tbody>
                  {data.dailySales.map((day, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-4">{day.date}</td>
                      <td className="text-right py-2 px-4">{day.orders}</td>
                      <td className="text-right py-2 px-4">
                        ${day.revenue.toLocaleString()}
                      </td>
                      <td className="text-right py-2 px-4">{day.units}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {salesViewMode === "weekly" && (
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-4">주차</th>
                    <th className="text-right py-2 px-4">주문 수</th>
                    <th className="text-right py-2 px-4">매출</th>
                    <th className="text-right py-2 px-4">판매량</th>
                  </tr>
                </thead>
                <tbody>
                  {data.weeklySales.map((week, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-4">{week.week}</td>
                      <td className="text-right py-2 px-4">{week.orders}</td>
                      <td className="text-right py-2 px-4">
                        ${week.revenue.toLocaleString()}
                      </td>
                      <td className="text-right py-2 px-4">{week.units}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {salesViewMode === "monthly" && (
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-4">월</th>
                    <th className="text-right py-2 px-4">주문 수</th>
                    <th className="text-right py-2 px-4">매출</th>
                    <th className="text-right py-2 px-4">판매량</th>
                  </tr>
                </thead>
                <tbody>
                  {data.monthlySales.map((month, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-4">{month.month}</td>
                      <td className="text-right py-2 px-4">{month.orders}</td>
                      <td className="text-right py-2 px-4">
                        ${month.revenue.toLocaleString()}
                      </td>
                      <td className="text-right py-2 px-4">{month.units}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Top Products by ASIN */}
      <Card>
        <CardHeader>
          <CardTitle>베스트셀러 제품 (ASIN별)</CardTitle>
          <CardDescription>매출 기준 상위 제품</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-4">ASIN</th>
                  <th className="text-left py-2 px-4">제품명</th>
                  <th className="text-right py-2 px-4">판매량</th>
                  <th className="text-right py-2 px-4">주문 수</th>
                  <th className="text-right py-2 px-4">매출</th>
                </tr>
              </thead>
              <tbody>
                {data.topAsins.map((product, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-4 font-mono text-sm">
                      {product.asin}
                    </td>
                    <td className="py-2 px-4 font-medium max-w-md truncate">
                      {product.product_name}
                    </td>
                    <td className="text-right py-2 px-4">{product.quantity}</td>
                    <td className="text-right py-2 px-4">{product.orders}</td>
                    <td className="text-right py-2 px-4">
                      ${product.revenue.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Distribution Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>주문 상태 분포</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(data.statusDistribution).map(
                ([status, count]) => (
                  <div
                    key={status}
                    className="flex justify-between items-center"
                  >
                    <span className="text-sm">{status}</span>
                    <Badge variant="outline">{count}</Badge>
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>배송 서비스 레벨</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(data.serviceLevel).map(([level, count]) => (
                <div key={level} className="flex justify-between items-center">
                  <span className="text-sm">{level}</span>
                  <Badge variant="outline">{count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
