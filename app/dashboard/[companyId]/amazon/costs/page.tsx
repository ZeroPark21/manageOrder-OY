"use client";

import { use, useState, useEffect } from "react";
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
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DollarSign,
  Package,
  Loader2,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
} from "lucide-react";

interface CostData {
  date: string;
  costPerOrderItem: number;
  costPerShippedOrder: number;
  avgCostPerOrder: number;
  totalOrders: number;
  totalRevenue: number;
  shippedOrders: number;
  shippedRevenue: number;
}

interface CostSummary {
  avgCostPerOrder: number;
  avgCostPerShippedOrder: number;
  totalOrders: number;
  totalRevenue: number;
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
  value: number;
  subtitle?: string;
  icon: any;
  format?: "number" | "currency";
}) => {
  const formatValue = () => {
    if (format === "currency") return `$${value.toLocaleString()}`;
    return value.toLocaleString();
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
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
      </CardContent>
    </Card>
  );
};

export default function AmazonCostsPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = use(params);
  const [periodType, setPeriodType] = useState<"daily" | "weekly" | "monthly">(
    "daily"
  );
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [availableMonths, setAvailableMonths] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    costPerOrderData: CostData[];
    summary: CostSummary;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch available months on mount
  useEffect(() => {
    const fetchAvailableMonths = async () => {
      try {
        const response = await fetch(
          `/api/amazon/costs?companyId=${companyId}&days=all`
        );
        if (response.ok) {
          const result = await response.json();
          const months = new Set<string>();
          if (result.costPerOrderData) {
            result.costPerOrderData.forEach((item: any) => {
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
      // Wait until year and month are set
      if (periodType === "daily" && (selectedYear === null || selectedMonth === null)) {
        return;
      }

      try {
        setLoading(true);
        setError(null);

        let dateFrom: string;
        let dateTo: string;

        if (periodType === "daily") {
          // For daily: specific year and month
          const year = selectedYear!;
          const month = parseInt(selectedMonth!);
          dateFrom = `${year}-${String(month).padStart(2, "0")}-01`;
          const lastDay = new Date(year, month, 0).getDate();
          dateTo = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;
        } else {
          // For weekly and monthly: all available data
          dateFrom = "2020-01-01";
          dateTo = new Date().toISOString().split("T")[0];
        }

        const response = await fetch(
          `/api/amazon/costs?companyId=${companyId}&dateFrom=${dateFrom}&dateTo=${dateTo}`
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

    if (companyId) {
      fetchData();
    }
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
      <div className="flex flex-col gap-6 p-8 bg-gray-50 min-h-screen">
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
                <BreadcrumbPage>주문당 비용</BreadcrumbPage>
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
    );
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
                <BreadcrumbPage>주문당 비용 현황</BreadcrumbPage>
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
          {periodType === "daily" && (
            <>
              <Select
                value={String(selectedYear)}
                onValueChange={(v) => setSelectedYear(parseInt(v))}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from(
                    { length: 5 },
                    (_, i) => new Date().getFullYear() - i
                  ).map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {year}년
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedMonth || undefined} onValueChange={setSelectedMonth}>
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
            </>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="평균 주문당 비용"
          value={data.summary.avgCostPerOrder}
          subtitle="전체 주문 기준"
          icon={DollarSign}
          format="currency"
        />
        <MetricCard
          title="배송 주문당 비용"
          value={data.summary.avgCostPerShippedOrder}
          subtitle="배송 완료 기준"
          icon={Package}
          format="currency"
        />
        <MetricCard
          title="총 주문 수"
          value={data.summary.totalOrders}
          subtitle="기간 내 전체"
          icon={ShoppingCart}
        />
        <MetricCard
          title="총 매출"
          value={data.summary.totalRevenue}
          subtitle="기간 내 전체"
          icon={DollarSign}
          format="currency"
        />
      </div>

      {/* Daily Cost Table */}
      <Card className="border border-gray-200">
        <CardHeader>
          <CardTitle className="text-base font-medium">
            일별 주문당 비용 추이
          </CardTitle>
          <CardDescription className="text-xs">
            날짜별 주문당 평균 비용 및 매출 데이터
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-3 px-3 font-medium text-gray-600">
                    날짜
                  </th>
                  <th className="text-right py-3 px-3 font-medium text-gray-600">
                    주문당 비용
                  </th>
                  <th className="text-right py-3 px-3 font-medium text-gray-600">
                    배송 주문당 비용
                  </th>
                  <th className="text-right py-3 px-3 font-medium text-gray-600">
                    주문 수
                  </th>
                  <th className="text-right py-3 px-3 font-medium text-gray-600">
                    배송 주문 수
                  </th>
                  <th className="text-right py-3 px-3 font-medium text-gray-600">
                    매출
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.costPerOrderData.map((item, index) => (
                  <tr
                    key={index}
                    className="border-b hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-3 px-3 font-medium">{item.date}</td>
                    <td className="text-right py-3 px-3 font-semibold text-green-600">
                      ${item.avgCostPerOrder.toFixed(2)}
                    </td>
                    <td className="text-right py-3 px-3">
                      ${item.costPerShippedOrder.toFixed(2)}
                    </td>
                    <td className="text-right py-3 px-3">{item.totalOrders}</td>
                    <td className="text-right py-3 px-3">
                      {item.shippedOrders}
                    </td>
                    <td className="text-right py-3 px-3 font-medium">
                      ${item.totalRevenue.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
