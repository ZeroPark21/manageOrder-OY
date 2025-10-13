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
  RotateCcw,
  AlertTriangle,
  ThumbsDown,
  Loader2,
  Package,
} from "lucide-react";

interface RefundDataItem {
  date: string;
  refundRate: number;
  refundRateB2B: number;
  unitsRefunded: number;
  unitsRefundedB2B: number;
  unitsOrdered: number;
  unitsOrderedB2B: number;
  calculatedRefundRate: number;
  negativeFeedback: number;
  negativeFeedbackRate: number;
  claimsGranted: number;
  claimsAmount: number;
}

interface RefundSummary {
  avgRefundRate: number;
  totalUnitsOrdered: number;
  totalUnitsRefunded: number;
  totalNegativeFeedback: number;
  totalClaims: number;
  totalClaimsAmount: number;
}

// Minimal Metric Card
const MetricCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  format = "number",
  status,
}: {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: any;
  format?: "number" | "percent" | "currency";
  status?: "normal" | "warning" | "danger";
}) => {
  const formatValue = () => {
    if (format === "percent") return `${value}%`;
    if (format === "currency")
      return `$${typeof value === "number" ? value.toFixed(2) : value}`;
    return typeof value === "number" ? value.toLocaleString() : value;
  };

  const getStatusColor = () => {
    if (status === "danger") return "text-red-600";
    if (status === "warning") return "text-orange-600";
    if (status === "normal") return "text-green-600";
    return "";
  };

  return (
    <Card className="border border-gray-200">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-3">
          <span className="text-sm text-gray-600">{title}</span>
          <Icon className="h-5 w-5 text-gray-400" />
        </div>
        <div className="space-y-1">
          <p className={`text-3xl font-semibold ${getStatusColor()}`}>
            {formatValue()}
          </p>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
      </CardContent>
    </Card>
  );
};

export default function AmazonRefundPage({
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
  const [availableMonths, setAvailableMonths] = useState<Set<string>>(
    new Set()
  );
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    refundData: RefundDataItem[];
    summary: RefundSummary;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch available months on mount
  useEffect(() => {
    const fetchAvailableMonths = async () => {
      try {
        const response = await fetch(
          `/api/amazon/refund?companyId=${companyId}&days=all`
        );
        if (response.ok) {
          const result = await response.json();
          const months = new Set<string>();
          if (result.refundData) {
            result.refundData.forEach((item: any) => {
              const date = new Date(item.date);
              const yearMonth = `${date.getFullYear()}-${String(
                date.getMonth() + 1
              ).padStart(2, "0")}`;
              months.add(yearMonth);
            });
          }
          setAvailableMonths(months);

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
      if (periodType === "daily" && (selectedYear === null || selectedMonth === null)) {
        return;
      }

      try {
        setLoading(true);
        setError(null);

        let dateFrom: string;
        let dateTo: string;

        if (periodType === "daily") {
          const year = selectedYear!;
          const month = parseInt(selectedMonth!);
          dateFrom = `${year}-${String(month).padStart(2, "0")}-01`;
          const lastDay = new Date(year, month, 0).getDate();
          dateTo = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;
        } else {
          dateFrom = "2020-01-01";
          dateTo = new Date().toISOString().split("T")[0];
        }

        const response = await fetch(
          `/api/amazon/refund?companyId=${companyId}&dateFrom=${dateFrom}&dateTo=${dateTo}`
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
                <BreadcrumbPage>환불율</BreadcrumbPage>
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

  const getRefundRateStatus = (
    rate: number
  ): "normal" | "warning" | "danger" => {
    if (rate < 5) return "normal";
    if (rate < 10) return "warning";
    return "danger";
  };

  const status = getRefundRateStatus(data.summary.avgRefundRate);

  const getStatusLabel = (status: "normal" | "warning" | "danger") => {
    if (status === "normal") return "정상 (5% 미만)";
    if (status === "warning") return "주의 (5-10%)";
    return "위험 (10% 이상)";
  };

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
                <BreadcrumbPage>환불율 현황</BreadcrumbPage>
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
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="평균 환불율"
          value={data.summary.avgRefundRate.toFixed(2)}
          subtitle={getStatusLabel(status)}
          icon={RotateCcw}
          format="percent"
          status={status}
        />
        <MetricCard
          title="총 환불 수량"
          value={data.summary.totalUnitsRefunded}
          subtitle={`전체 주문: ${data.summary.totalUnitsOrdered.toLocaleString()}`}
          icon={Package}
        />
        <MetricCard
          title="부정적 피드백"
          value={data.summary.totalNegativeFeedback}
          subtitle="품질 개선 필요"
          icon={ThumbsDown}
        />
        <MetricCard
          title="A-to-Z 클레임"
          value={data.summary.totalClaims}
          subtitle={`클레임 금액: $${data.summary.totalClaimsAmount.toFixed(
            2
          )}`}
          icon={AlertTriangle}
        />
      </div>

      {/* Daily Refund Table */}
      <Card className="border border-gray-200">
        <CardHeader>
          <CardTitle className="text-base font-medium">
            일별 환불율 추이
          </CardTitle>
          <CardDescription className="text-xs">
            날짜별 환불 데이터 및 피드백
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
                    환불율
                  </th>
                  <th className="text-right py-3 px-3 font-medium text-gray-600">
                    환불 수량
                  </th>
                  <th className="text-right py-3 px-3 font-medium text-gray-600">
                    주문 수량
                  </th>
                  <th className="text-right py-3 px-3 font-medium text-gray-600">
                    부정 피드백
                  </th>
                  <th className="text-right py-3 px-3 font-medium text-gray-600">
                    클레임
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.refundData.map((item, index) => {
                  const dayStatus = getRefundRateStatus(item.refundRate);
                  const statusColor =
                    dayStatus === "normal"
                      ? "text-green-600"
                      : dayStatus === "warning"
                      ? "text-orange-600"
                      : "text-red-600";
                  return (
                    <tr
                      key={index}
                      className="border-b hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-3 px-3 font-medium">{item.date}</td>
                      <td
                        className={`text-right py-3 px-3 font-semibold ${statusColor}`}
                      >
                        {item.refundRate.toFixed(2)}%
                      </td>
                      <td className="text-right py-3 px-3">
                        {item.unitsRefunded}
                      </td>
                      <td className="text-right py-3 px-3">
                        {item.unitsOrdered}
                      </td>
                      <td className="text-right py-3 px-3">
                        {item.negativeFeedback > 0 ? (
                          <span className="text-red-600 font-medium">
                            {item.negativeFeedback}
                          </span>
                        ) : (
                          item.negativeFeedback
                        )}
                      </td>
                      <td className="text-right py-3 px-3">
                        {item.claimsGranted > 0 ? (
                          <div>
                            <span className="text-red-600 font-medium">
                              {item.claimsGranted}
                            </span>
                            <span className="text-xs text-gray-500 ml-1">
                              (${item.claimsAmount.toFixed(2)})
                            </span>
                          </div>
                        ) : (
                          item.claimsGranted
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
