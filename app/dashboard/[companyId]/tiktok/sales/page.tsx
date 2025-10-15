"use client";

import { use, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/loading-spinner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp,
  Package,
  DollarSign,
  ArrowUp,
  ArrowDown,
  Download,
  Calendar,
} from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  downloadMultiSheetExcel,
  type MultiSheetExcelData,
  formatDateForExcel,
  formatWeekStartForExcel,
} from "@/lib/excel-utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

interface SalesAnalysisData {
  summary: {
    totalRevenue: number;
    totalQuantity: number;
    activeProducts: number;
  };
  daily: {
    dates: string[];
    products: string[];
    matrix: {
      [product: string]: {
        [date: string]: {
          quantity: number;
          revenue: number;
        };
        total: {
          quantity: number;
          revenue: number;
        };
      };
    };
    productSkuMap: {
      [product: string]: {
        seller_sku: string;
        sku_id: string;
      };
    };
  };
  weekly: {
    weeks: string[];
    products: string[];
    matrix: {
      [product: string]: {
        [week: string]: {
          quantity: number;
          revenue: number;
        };
        total: {
          quantity: number;
          revenue: number;
        };
      };
    };
    productSkuMap: {
      [product: string]: {
        seller_sku: string;
        sku_id: string;
      };
    };
  };
  monthly: {
    months: string[];
    products: string[];
    matrix: {
      [product: string]: {
        [month: string]: {
          quantity: number;
          revenue: number;
        };
        total: {
          quantity: number;
          revenue: number;
        };
      };
    };
    productSkuMap: {
      [product: string]: {
        seller_sku: string;
        sku_id: string;
      };
    };
  };
}

interface MatrixTableProps {
  data: SalesAnalysisData;
  type: "daily" | "weekly" | "monthly";
  selectedYear: number;
  selectedMonth: string;
  onExcelDownload?: () => void;
  downloadLoading?: boolean;
  isLoading?: boolean;
}

interface WeeklyVisualizationProps {
  weeklyData: SalesAnalysisData | null;
}

function WeeklyDataVisualization({ weeklyData }: WeeklyVisualizationProps) {
  const [hoveredWeek, setHoveredWeek] = useState<string | null>(null);

  if (!weeklyData?.weekly?.weeks || weeklyData.weekly.weeks.length === 0) {
    return (
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              주차별 매출 분석
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-lg font-medium mb-2">데이터 없음</p>
              <p className="text-sm">주차별 데이터가 없습니다.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const weeks = weeklyData.weekly.weeks.sort();

  // 최근 10주간의 데이터만 선택
  const recentWeeks = weeks.slice(-10);

  // 주차별 매출액 및 판매량 데이터 준비 (최근 10주)
  const weeklyChartData = recentWeeks.map((week) => {
    let totalRevenue = 0;
    let totalQuantity = 0;

    weeklyData.weekly.products.forEach((product) => {
      const weekData = weeklyData.weekly.matrix[product]?.[week];
      if (weekData) {
        totalRevenue += weekData.revenue;
        totalQuantity += weekData.quantity;
      }
    });

    const weekDate = new Date(week);
    const weekLabel = `${weekDate.getMonth() + 1}/${weekDate.getDate()}`;

    return {
      week,
      weekLabel,
      revenue: totalRevenue,
      quantity: totalQuantity,
      revenueFormatted: `$${totalRevenue.toFixed(0)}`,
      quantityFormatted: `${totalQuantity}개`,
    };
  });

  const CustomQuantityTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
          <p className="font-medium text-gray-900">{`${label}주차`}</p>
          <p className="text-sm text-blue-600">
            quantity: {payload[0].payload.quantity}개
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomRevenueTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
          <p className="font-medium text-gray-900">{`${label}주차`}</p>
          <p className="text-sm text-green-600">
            revenue: ${payload[0].payload.revenue.toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="mt-8 space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Calendar className="h-6 w-6" />
          주차별 매출 분석
        </h2>
        <p className="text-muted-foreground mt-1">
          주차별 매출액, 판매량 및 인기 상품 현황
        </p>
      </div>

      {/* 매출액 & 판매량 차트 (좌우 배치) */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* 주문 수량 차트 */}
        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-blue-700 text-lg">
              <Package className="h-5 w-5" />
              주차별 주문 수량
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 mb-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={weeklyChartData}
                  margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="weekLabel"
                    stroke="#666"
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis stroke="#666" tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomQuantityTooltip />} />
                  <Bar
                    dataKey="quantity"
                    fill="#2563eb"
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-2 bg-blue-50 rounded-lg">
                <div className="text-sm font-bold text-blue-700">
                  {weeklyChartData
                    .reduce((sum, week) => sum + week.quantity, 0)
                    .toLocaleString()}
                  개
                </div>
                <div className="text-xs text-blue-600">총 주문수량</div>
              </div>
              <div className="text-center p-2 bg-green-50 rounded-lg">
                <div className="text-sm font-bold text-green-700">
                  {Math.max(
                    ...weeklyChartData.map((w) => w.quantity)
                  ).toLocaleString()}
                  개
                </div>
                <div className="text-xs text-green-600">최고 주간주문</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 매출액 차트 */}
        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-green-700 text-lg">
              <DollarSign className="h-5 w-5" />
              주차별 매출액
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 mb-3">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={weeklyChartData}
                  margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="weekLabel"
                    stroke="#666"
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    stroke="#666"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                  />
                  <Tooltip content={<CustomRevenueTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#16a34a"
                    strokeWidth={2.5}
                    dot={{ fill: "#16a34a", strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: "#16a34a", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-2 bg-green-50 rounded-lg">
                <div className="text-sm font-bold text-green-700">
                  $
                  {weeklyChartData
                    .reduce((sum, week) => sum + week.revenue, 0)
                    .toLocaleString()}
                </div>
                <div className="text-xs text-green-600">총 매출액</div>
              </div>
              <div className="text-center p-2 bg-blue-50 rounded-lg">
                <div className="text-sm font-bold text-blue-700">
                  $
                  {Math.max(
                    ...weeklyChartData.map((w) => w.revenue)
                  ).toLocaleString()}
                </div>
                <div className="text-xs text-blue-600">최고 주간매출</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SalesMatrixTable({
  data,
  type,
  selectedYear,
  selectedMonth,
  onExcelDownload,
  downloadLoading,
  isLoading,
}: MatrixTableProps) {
  const matrixData = data[type];

  if (isLoading || !matrixData || !matrixData.products.length) {
    return (
      <div className="w-full overflow-hidden">
        <div className="bg-white rounded-lg border shadow-sm w-full px-2 sm:px-4">
          <div className="p-3 sm:p-6">
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold">
                    {type === "daily"
                      ? "일별"
                      : type === "weekly"
                      ? "주별"
                      : "월별"}{" "}
                    매출 현황
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    상품별{" "}
                    {type === "daily"
                      ? "일일"
                      : type === "weekly"
                      ? "주간"
                      : "월간"}{" "}
                    매출 수량 매트릭스 (Order Amount &gt; 0)
                  </p>
                </div>
                {type === "daily" && selectedMonth && (
                  <div className="text-sm text-muted-foreground">
                    {selectedYear}년 {parseInt(selectedMonth)}월
                  </div>
                )}
                {type === "weekly" && (
                  <div className="text-sm text-muted-foreground">
                    전체 기간 주별 데이터 (월요일 기준)
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="p-3 sm:p-6 pt-0">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="inline-flex items-center gap-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-blue-600"></div>
                  <span className="text-muted-foreground">
                    데이터를 불러오는 중...
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-lg font-medium mb-2">데이터 없음</p>
                <p className="text-sm">
                  {selectedMonth && selectedMonth !== "all"
                    ? `${selectedYear}년 ${parseInt(
                        selectedMonth
                      )}월에는 데이터가 없습니다.`
                    : "매출 데이터를 업로드하여 분석을 시작하세요."}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (type === "daily") {
      return date.toLocaleDateString("ko-KR", {
        month: "2-digit",
        day: "2-digit",
      });
    } else if (type === "weekly") {
      // 주별 표시: 시작일자와 기간 표시
      const startDate = new Date(dateString);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);

      const startMonth = String(startDate.getMonth() + 1).padStart(2, "0");
      const startDay = String(startDate.getDate()).padStart(2, "0");
      const endMonth = String(endDate.getMonth() + 1).padStart(2, "0");
      const endDay = String(endDate.getDate()).padStart(2, "0");

      return `${startMonth}.${startDay}`;
    } else {
      return `${date.getMonth() + 1}월`;
    }
  };

  const timeKeys =
    type === "daily"
      ? (matrixData as any).dates
      : type === "weekly"
      ? (matrixData as any).weeks
      : (matrixData as any).months;

  return (
    <div className="w-full overflow-hidden">
      <div className="bg-white rounded-lg border shadow-sm w-full px-2 sm:px-4">
        <div className="p-3 sm:p-6 pb-2 sm:pb-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-semibold">
                  {type === "daily"
                    ? "일별"
                    : type === "weekly"
                    ? "주별"
                    : "월별"}{" "}
                  매출 현황
                </h3>
                <p className="text-sm text-muted-foreground">
                  상품별{" "}
                  {type === "daily"
                    ? "일일"
                    : type === "weekly"
                    ? "주간"
                    : "월간"}{" "}
                  매출 수량 매트릭스 (총 {matrixData.products.length}개 상품)
                </p>
              </div>
              {type === "daily" && selectedMonth && selectedMonth !== "all" && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="text-sm text-muted-foreground">
                    {selectedYear}년 {parseInt(selectedMonth)}월
                  </div>
                  {onExcelDownload && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onExcelDownload}
                      disabled={downloadLoading}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {downloadLoading ? "다운로드 중..." : "엑셀 다운로드"}
                    </Button>
                  )}
                </div>
              )}
              {type === "weekly" && !onExcelDownload && (
                <div className="text-sm text-muted-foreground">
                  전체 기간 주별 데이터 (월요일 기준)
                </div>
              )}
              {type === "weekly" && onExcelDownload && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onExcelDownload}
                    disabled={downloadLoading}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {downloadLoading ? "다운로드 중..." : "엑셀 다운로드"}
                  </Button>
                  <div className="text-sm text-muted-foreground">
                    전체 기간 주별 데이터 (월요일 기준)
                  </div>
                </div>
              )}
              {type === "monthly" && onExcelDownload && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onExcelDownload}
                    disabled={downloadLoading}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {downloadLoading ? "다운로드 중..." : "엑셀 다운로드"}
                  </Button>
                  <div className="text-sm text-muted-foreground">
                    전체 기간 월별 데이터
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="p-3 sm:p-6 pt-0">
          <div
            className="w-full rounded-lg border relative overflow-x-auto overflow-y-hidden"
            style={{ maxWidth: "100%", maxHeight: "600px" }}
          >
            <div className="overflow-y-auto" style={{ maxHeight: "600px" }}>
              <table
                className="border-collapse"
                style={{ minWidth: "1200px", width: "100%" }}
              >
                <thead
                  style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 10,
                    backgroundColor: "#2563eb",
                  }}
                >
                  <tr className="bg-blue-600 text-white">
                    <th
                      className="border border-blue-500 px-2 py-2 text-xs font-medium text-white bg-blue-600"
                      style={{ minWidth: "50px" }}
                    >
                      순위
                    </th>
                    <th
                      className="border border-blue-500 px-2 py-2 text-left text-xs font-medium text-white bg-blue-600"
                      style={{ minWidth: "200px", maxWidth: "200px" }}
                    >
                      Product Name
                    </th>
                    <th
                      className="border border-blue-500 px-2 py-2 text-center text-xs font-medium text-white bg-blue-600"
                      style={{ minWidth: "80px" }}
                    >
                      Seller SKU
                    </th>
                    <th
                      className="border border-blue-500 px-2 py-2 text-center text-xs font-medium text-white bg-blue-600"
                      style={{ minWidth: "80px" }}
                    >
                      SKU ID
                    </th>
                    {timeKeys.map((timeKey: string) => (
                      <th
                        key={timeKey}
                        className="border border-blue-500 px-1 py-2 text-center text-xs font-medium text-white bg-blue-600"
                        style={{
                          minWidth: type === "weekly" ? "70px" : "60px",
                        }}
                      >
                        {formatDate(timeKey)}
                      </th>
                    ))}
                    <th
                      className="border border-blue-500 px-2 py-2 text-center text-xs font-medium text-white bg-blue-600"
                      style={{ minWidth: "80px" }}
                    >
                      총 수량
                    </th>
                    <th
                      className="border border-blue-500 px-2 py-2 text-center text-xs font-medium text-white bg-blue-600"
                      style={{ minWidth: "80px" }}
                    >
                      총 매출
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {matrixData.products.map((product, index) => {
                    const productData = matrixData.matrix[product];
                    const skuInfo = matrixData.productSkuMap[product] || {
                      seller_sku: "",
                      sku_id: 0,
                    };
                    const isEvenRow = index % 2 === 0;

                    return (
                      <tr
                        key={product}
                        className={isEvenRow ? "bg-gray-50" : ""}
                      >
                        <td
                          className="border border-gray-300 px-2 py-2 text-center text-xs"
                          style={{ minWidth: "50px" }}
                        >
                          {index + 1}
                        </td>
                        <td
                          className="border border-gray-300 px-2 py-2 text-xs"
                          style={{
                            minWidth: "200px",
                            maxWidth: "200px",
                            wordBreak: "break-all",
                          }}
                          title={product}
                        >
                          {product.length > 30
                            ? `${product.substring(0, 30)}...`
                            : product}
                        </td>
                        <td
                          className="border border-gray-300 px-2 py-2 text-xs text-center"
                          style={{
                            minWidth: "80px",
                            wordBreak: "break-all",
                            whiteSpace: "normal",
                          }}
                        >
                          {skuInfo.seller_sku || "-"}
                        </td>
                        <td
                          className="border border-gray-300 px-2 py-2 text-xs text-center"
                          style={{
                            minWidth: "80px",
                            wordBreak: "break-all",
                            whiteSpace: "normal",
                          }}
                        >
                          {skuInfo.sku_id || "-"}
                        </td>
                        {timeKeys.map((timeKey: string) => {
                          const timeData = productData[timeKey];
                          return (
                            <td
                              key={timeKey}
                              className="border border-gray-300 px-1 py-2 text-center text-xs"
                              style={{
                                minWidth: type === "weekly" ? "70px" : "60px",
                              }}
                            >
                              {timeData ? (
                                <div>
                                  <div
                                    className={
                                      timeData.quantity > 0
                                        ? "font-semibold"
                                        : "text-gray-400"
                                    }
                                  >
                                    {timeData.quantity || 0}
                                  </div>
                                  <div className="text-blue-700 font-bold text-[10px]">
                                    ${timeData.revenue.toFixed(0)}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-gray-400">-</div>
                              )}
                            </td>
                          );
                        })}
                        <td
                          className={`border border-gray-300 px-2 py-2 text-center text-xs font-bold ${
                            isEvenRow ? "bg-blue-100" : "bg-blue-50"
                          }`}
                          style={{ minWidth: "80px" }}
                        >
                          {productData.total.quantity}
                        </td>
                        <td
                          className={`border border-gray-300 px-2 py-2 text-center text-xs font-bold ${
                            isEvenRow ? "bg-blue-100" : "bg-blue-50"
                          }`}
                          style={{ minWidth: "80px" }}
                        >
                          <span className="text-blue-700 font-bold">
                            ${productData.total.revenue.toFixed(0)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {/* Totals Row */}
                  <tr className="bg-gray-800 text-white font-bold">
                    <td
                      className="border border-gray-600 px-2 py-2 text-center text-xs"
                      style={{ minWidth: "50px" }}
                    ></td>
                    <td
                      className="border border-gray-600 px-2 py-2 text-xs whitespace-nowrap"
                      style={{ minWidth: "200px", maxWidth: "200px" }}
                    >
                      {type === "daily"
                        ? "Daily"
                        : type === "weekly"
                        ? "Weekly"
                        : "Monthly"}{" "}
                      매출 합계
                    </td>
                    <td
                      className="border border-gray-600 px-2 py-2 text-xs"
                      style={{ minWidth: "80px" }}
                    ></td>
                    <td
                      className="border border-gray-600 px-2 py-2 text-xs"
                      style={{ minWidth: "80px" }}
                    ></td>
                    {timeKeys.map((timeKey: string) => {
                      const periodTotal = matrixData.products.reduce(
                        (sum, product) => {
                          const timeData = matrixData.matrix[product][timeKey];
                          return sum + (timeData ? timeData.quantity : 0);
                        },
                        0
                      );
                      const periodRevenue = matrixData.products.reduce(
                        (sum, product) => {
                          const timeData = matrixData.matrix[product][timeKey];
                          return sum + (timeData ? timeData.revenue : 0);
                        },
                        0
                      );
                      return (
                        <td
                          key={timeKey}
                          className="border border-gray-600 px-1 py-2 text-center text-xs font-bold"
                          style={{
                            minWidth: type === "weekly" ? "70px" : "60px",
                          }}
                        >
                          <div>{periodTotal}</div>
                          <div className="text-blue-300 font-bold text-[10px]">
                            ${periodRevenue.toFixed(0)}
                          </div>
                        </td>
                      );
                    })}
                    <td
                      className="border border-gray-600 px-2 py-2 text-center text-xs font-bold bg-gray-900"
                      style={{ minWidth: "80px" }}
                    >
                      {matrixData.products.reduce(
                        (sum, product) =>
                          sum + matrixData.matrix[product].total.quantity,
                        0
                      )}
                    </td>
                    <td
                      className="border border-gray-600 px-2 py-2 text-center text-xs font-bold bg-gray-900"
                      style={{ minWidth: "80px" }}
                    >
                      <span className="text-blue-300 font-bold">
                        $
                        {matrixData.products
                          .reduce(
                            (sum, product) =>
                              sum + matrixData.matrix[product].total.revenue,
                            0
                          )
                          .toFixed(0)}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 요약 정보 */}
          <div className="m-4 p-4 bg-muted/50 rounded-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">총 상품 수:</span>
                <span className="ml-2 font-semibold">
                  {matrixData.products.length}개
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">분석 기간:</span>
                <span className="ml-2 font-semibold">
                  {timeKeys.length}
                  {type === "daily" ? "일" : type === "weekly" ? "주" : "개월"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">총 판매량:</span>
                <span className="ml-2 font-semibold">
                  {matrixData.products
                    .reduce(
                      (sum, product) =>
                        sum + matrixData.matrix[product].total.quantity,
                      0
                    )
                    .toLocaleString()}
                  개
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">총 매출액:</span>
                <span className="ml-2 font-semibold text-blue-700">
                  $
                  {matrixData.products
                    .reduce(
                      (sum, product) =>
                        sum + matrixData.matrix[product].total.revenue,
                      0
                    )
                    .toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SalesAnalysis({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = use(params);
  const [initialLoading, setInitialLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [data, setData] = useState<SalesAnalysisData | null>(null);
  const [allData, setAllData] = useState<SalesAnalysisData | null>(null);
  const [weeklyData, setWeeklyData] = useState<SalesAnalysisData | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear()
  );
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"daily" | "weekly" | "monthly">(
    "daily"
  );
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [availableMonths, setAvailableMonths] = useState<{
    [year: number]: number[];
  }>({});

  const fetchData = async (
    year?: number,
    month?: string,
    forceAll?: boolean,
    isInitial: boolean = false
  ) => {
    try {
      if (!isInitial) {
        setDataLoading(true);
      }
      console.log("🔄 Fetching sales analysis data from API...");

      let url = `/api/sales-analysis?companyId=${companyId}`;
      // forceAll이 true이거나 year와 month가 모두 없으면 전체 데이터
      if (!forceAll && year && month) {
        const startDate = `${year}-${month}-01`;
        const lastDay = new Date(year, parseInt(month), 0).getDate();
        const endDate = `${year}-${month}-${String(lastDay).padStart(2, "0")}`;
        url += `&startDate=${startDate}&endDate=${endDate}`;
        console.log(`📅 Fetching filtered data for ${year}-${month}`);
      } else {
        console.log("📅 Fetching all data (no filter)");
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`API 요청 실패: ${response.status}`);
      }

      const salesData = await response.json();

      if (salesData.error) {
        throw new Error(`API 오류: ${salesData.error}`);
      }

      setData(salesData);

      console.log("✅ Sales analysis data loaded:", {
        totalRevenue: salesData.summary.totalRevenue,
        totalQuantity: salesData.summary.totalQuantity,
        activeProducts: salesData.summary.activeProducts,
      });
    } catch (error) {
      console.error("❌ Failed to fetch sales analysis data:", error);
      setData(null);
    } finally {
      if (!isInitial) {
        setDataLoading(false);
      }
    }
  };

  const fetchAllData = async () => {
    try {
      console.log("🔄 Fetching all sales analysis data for monthly view...");

      const response = await fetch(
        `/api/sales-analysis?companyId=${companyId}`
      );
      if (!response.ok) {
        throw new Error(`API 요청 실패: ${response.status}`);
      }

      const salesData = await response.json();

      if (salesData.error) {
        throw new Error(`API 오류: ${salesData.error}`);
      }

      setAllData(salesData);

      // 사용 가능한 년도와 월 계산 (전체 데이터에서)
      if (salesData.daily?.dates && salesData.daily.dates.length > 0) {
        const yearsMap: { [year: number]: Set<number> } = {};

        salesData.daily.dates.forEach((dateStr: string) => {
          const date = new Date(dateStr);
          const year = date.getFullYear();
          const month = date.getMonth() + 1;

          if (!yearsMap[year]) {
            yearsMap[year] = new Set();
          }
          yearsMap[year].add(month);
        });

        const years = Object.keys(yearsMap)
          .map(Number)
          .sort((a, b) => b - a);
        const months: { [year: number]: number[] } = {};
        years.forEach((year) => {
          months[year] = Array.from(yearsMap[year]).sort((a, b) => a - b);
        });

        setAvailableYears(years);
        setAvailableMonths(months);

        // 가장 최근 년도로 초기화하고, 월은 "전체"로 설정
        if (years.length > 0) {
          const latestYear = years[0];
          setSelectedYear(latestYear);
          setSelectedMonth("all"); // 전체로 설정
          console.log(`📅 Filter initialized to: ${latestYear}년 전체`);
        }

        console.log("✅ Available years and months calculated:", {
          years,
          months,
        });
      }

      console.log("✅ All sales analysis data loaded for monthly view");
    } catch (error) {
      console.error("❌ Failed to fetch all sales analysis data:", error);
      setAllData(null);
    }
  };

  const fetchWeeklyData = async () => {
    try {
      console.log("🔄 Fetching all weekly sales data...");

      // 전체 데이터를 가져오기 (필터 없음)
      const response = await fetch(
        `/api/sales-analysis?companyId=${companyId}`
      );
      if (!response.ok) {
        throw new Error(`API 요청 실패: ${response.status}`);
      }

      const salesData = await response.json();

      if (salesData.error) {
        throw new Error(`API 오류: ${salesData.error}`);
      }

      setWeeklyData(salesData);
      console.log("✅ All weekly sales data loaded");
    } catch (error) {
      console.error("❌ Failed to fetch weekly sales analysis data:", error);
      setWeeklyData(null);
    }
  };

  useEffect(() => {
    const loadInitialData = async () => {
      setInitialLoading(true);

      // 1. 먼저 전체 데이터를 가져와서 필터 활성화
      await fetchAllData();
      await fetchWeeklyData();

      // 2. 전체 데이터를 data에도 설정 (초기 화면용)
      await fetchData(undefined, undefined, false, true);

      setInitialLoading(false);
    };

    loadInitialData();
  }, []);

  // 일별 뷰에서 필터 변경 시 데이터 재조회
  useEffect(() => {
    if (
      !initialLoading &&
      viewMode === "daily" &&
      selectedYear &&
      selectedMonth
    ) {
      if (selectedMonth === "all") {
        // "전체" 선택 시 전체 데이터 표시
        console.log(
          `🔄 Filter changed to ALL in daily view: ${selectedYear}년 전체`
        );
        fetchData(undefined, undefined, false, false);
      } else {
        // 특정 월 선택 시 필터링된 데이터 표시
        console.log(
          `🔄 Filter changed in daily view: ${selectedYear}년 ${selectedMonth}월`
        );
        fetchData(selectedYear, selectedMonth, false, false);
      }
    }
  }, [viewMode, selectedYear, selectedMonth]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  // 주별 비교를 위한 계산 함수
  const calculateWeekOverWeekGrowth = () => {
    console.log("🔍 calculateWeekOverWeekGrowth - data structure:", {
      hasWeeklyData: !!weeklyData,
      hasWeekly: !!weeklyData?.weekly,
      weeklyWeeks: weeklyData?.weekly?.weeks?.length || 0,
      weeklyProducts: weeklyData?.weekly?.products?.length || 0,
    });

    if (!weeklyData?.weekly?.weeks || weeklyData.weekly.weeks.length < 3) {
      console.log(
        "❌ Not enough weekly data for comparison (need at least 3 weeks)"
      );
      return null;
    }

    const weeks = weeklyData.weekly.weeks.sort();
    const currentWeek = weeks[weeks.length - 2]; // 전주 (두번째로 최근 주)
    const previousWeek = weeks[weeks.length - 3]; // 전전주 (세번째로 최근 주)

    console.log("📅 Comparing weeks:", { currentWeek, previousWeek });

    // 전주와 전전주의 총 매출액 및 판매량 계산
    let currentRevenue = 0;
    let currentQuantity = 0;
    let previousRevenue = 0;
    let previousQuantity = 0;

    weeklyData.weekly.products.forEach((product) => {
      const currentWeekData = weeklyData.weekly.matrix[product]?.[currentWeek];
      const previousWeekData =
        weeklyData.weekly.matrix[product]?.[previousWeek];

      if (currentWeekData) {
        currentRevenue += currentWeekData.revenue;
        currentQuantity += currentWeekData.quantity;
      }

      if (previousWeekData) {
        previousRevenue += previousWeekData.revenue;
        previousQuantity += previousWeekData.quantity;
      }
    });

    // 성장률 계산
    const revenueGrowth =
      previousRevenue > 0
        ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
        : 0;
    const quantityGrowth =
      previousQuantity > 0
        ? ((currentQuantity - previousQuantity) / previousQuantity) * 100
        : 0;

    console.log("📊 Week-over-week growth:", {
      currentRevenue,
      previousRevenue,
      revenueGrowth: revenueGrowth.toFixed(1) + "%",
      currentQuantity,
      previousQuantity,
      quantityGrowth: quantityGrowth.toFixed(1) + "%",
    });

    return {
      revenueGrowth,
      quantityGrowth,
      currentRevenue,
      previousRevenue,
      currentQuantity,
      previousQuantity,
      currentWeek,
      previousWeek,
    };
  };

  // 주별 성장률 데이터 계산 (weeklyData를 사용)
  const weeklyGrowth = weeklyData ? calculateWeekOverWeekGrowth() : null;

  // 현재 viewMode에 맞는 데이터 선택
  const currentDisplayData =
    viewMode === "daily" ? data : viewMode === "weekly" ? weeklyData : allData;

  const handleExcelDownload = async () => {
    setDownloadLoading(true);
    try {
      console.log("📥 Creating sales analysis Excel...");

      if (!data && !weeklyData && !allData) {
        throw new Error("다운로드할 데이터가 없습니다.");
      }

      const sheets = [];

      // 일별 시트 생성
      if (data?.daily?.products && data.daily.products.length > 0) {
        const dailyHeaders = [
          "순위",
          "Product Name",
          "Seller SKU",
          "SKU ID",
          ...data.daily.dates.map((date: string) => formatDateForExcel(date)),
          "총수량",
          "총매출",
        ];

        const dailyRows = data.daily.products.map(
          (product: string, index: number) => {
            const productData = data.daily.matrix[product];
            const skuInfo = data.daily.productSkuMap[product] || {
              seller_sku: "",
              sku_id: 0,
            };
            return [
              index + 1,
              product,
              skuInfo.seller_sku || "-",
              skuInfo.sku_id || "-",
              ...data.daily.dates.map(
                (date: string) => productData[date]?.quantity || 0
              ),
              productData.total.quantity,
              productData.total.revenue.toFixed(2),
            ];
          }
        );

        // 일별 총계 행
        dailyRows.push([
          "",
          "Daily 매출 합계",
          "",
          "",
          ...data.daily.dates.map((date: string) =>
            data.daily.products.reduce(
              (sum: number, product: string) =>
                sum + (data.daily.matrix[product][date]?.quantity || 0),
              0
            )
          ),
          data.daily.products.reduce(
            (sum: number, product: string) =>
              sum + data.daily.matrix[product].total.quantity,
            0
          ),
          data.daily.products
            .reduce(
              (sum: number, product: string) =>
                sum + data.daily.matrix[product].total.revenue,
              0
            )
            .toFixed(2),
        ]);

        sheets.push({
          name: "일별 매출분석",
          headers: dailyHeaders,
          rows: dailyRows,
        });
        console.log("✅ Daily sheet prepared");
      }

      // 주별 시트 생성
      if (
        weeklyData?.weekly?.products &&
        weeklyData.weekly.products.length > 0
      ) {
        const weeklyHeaders = [
          "순위",
          "Product Name",
          "Seller SKU",
          "SKU ID",
          ...weeklyData.weekly.weeks.map((week: string) =>
            formatWeekStartForExcel(week)
          ),
          "총수량",
          "총매출",
        ];

        const weeklyRows = weeklyData.weekly.products.map(
          (product: string, index: number) => {
            const productData = weeklyData.weekly.matrix[product];
            const skuInfo = weeklyData.weekly.productSkuMap[product] || {
              seller_sku: "",
              sku_id: 0,
            };
            return [
              index + 1,
              product,
              skuInfo.seller_sku || "-",
              skuInfo.sku_id || "-",
              ...weeklyData.weekly.weeks.map(
                (week: string) => productData[week]?.quantity || 0
              ),
              productData.total.quantity,
              productData.total.revenue.toFixed(2),
            ];
          }
        );

        // 주별 총계 행
        weeklyRows.push([
          "",
          "Weekly 매출 합계",
          "",
          "",
          ...weeklyData.weekly.weeks.map((week: string) =>
            weeklyData.weekly.products.reduce(
              (sum: number, product: string) =>
                sum + (weeklyData.weekly.matrix[product][week]?.quantity || 0),
              0
            )
          ),
          weeklyData.weekly.products.reduce(
            (sum: number, product: string) =>
              sum + weeklyData.weekly.matrix[product].total.quantity,
            0
          ),
          weeklyData.weekly.products
            .reduce(
              (sum: number, product: string) =>
                sum + weeklyData.weekly.matrix[product].total.revenue,
              0
            )
            .toFixed(2),
        ]);

        sheets.push({
          name: "주별 매출분석",
          headers: weeklyHeaders,
          rows: weeklyRows,
        });
        console.log("✅ Weekly sheet prepared");
      }

      // 월별 시트 생성
      if (allData?.monthly?.products && allData.monthly.products.length > 0) {
        const monthlyHeaders = [
          "순위",
          "Product Name",
          "Seller SKU",
          "SKU ID",
          ...allData.monthly.months,
          "총수량",
          "총매출",
        ];

        const monthlyRows = allData.monthly.products.map(
          (product: string, index: number) => {
            const productData = allData.monthly.matrix[product];
            const skuInfo = allData.monthly.productSkuMap[product] || {
              seller_sku: "",
              sku_id: 0,
            };
            return [
              index + 1,
              product,
              skuInfo.seller_sku || "-",
              skuInfo.sku_id || "-",
              ...allData.monthly.months.map(
                (month: string) => productData[month]?.quantity || 0
              ),
              productData.total.quantity,
              productData.total.revenue.toFixed(2),
            ];
          }
        );

        // 월별 총계 행
        monthlyRows.push([
          "",
          "Monthly 매출 합계",
          "",
          "",
          ...allData.monthly.months.map((month: string) =>
            allData.monthly.products.reduce(
              (sum: number, product: string) =>
                sum + (allData.monthly.matrix[product][month]?.quantity || 0),
              0
            )
          ),
          allData.monthly.products.reduce(
            (sum: number, product: string) =>
              sum + allData.monthly.matrix[product].total.quantity,
            0
          ),
          allData.monthly.products
            .reduce(
              (sum: number, product: string) =>
                sum + allData.monthly.matrix[product].total.revenue,
              0
            )
            .toFixed(2),
        ]);

        sheets.push({
          name: "월별 매출분석",
          headers: monthlyHeaders,
          rows: monthlyRows,
        });
        console.log("✅ Monthly sheet prepared");
      }

      if (sheets.length === 0) {
        throw new Error("생성할 시트가 없습니다.");
      }

      console.log(`📁 Creating Excel with ${sheets.length} sheets`);

      const excelData: MultiSheetExcelData = {
        sheets,
        filename: `TTS_매출분석_통합데이터_${
          new Date().toISOString().split("T")[0]
        }`,
      };

      downloadMultiSheetExcel(excelData);
      console.log("🎉 Excel download completed!");
    } catch (error) {
      console.error("❌ Excel download failed:", error);
      alert(
        `Excel 다운로드에 실패했습니다: ${
          error instanceof Error ? error.message : "알 수 없는 오류"
        }`
      );
    } finally {
      setDownloadLoading(false);
    }
  };

  if (initialLoading) {
    return <LoadingSpinner message="매출 데이터를 불러오는 중..." />;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header - Fixed */}
      <div className="flex-shrink-0 bg-gray-50 pt-8 px-8 pb-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/">TTS Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>SKU별 판매량</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="flex items-center gap-3">
            <Tabs
              value={viewMode}
              onValueChange={(v) =>
                setViewMode(v as "daily" | "weekly" | "monthly")
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
              onValueChange={(v) => {
                const year = parseInt(v);
                setSelectedYear(year);
                setSelectedMonth(""); // 년도 변경 시 월 초기화
              }}
              disabled={viewMode !== "daily" || availableYears.length === 0}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    {year}년
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={selectedMonth || undefined}
              onValueChange={(v) => {
                setSelectedMonth(v);
              }}
              disabled={
                viewMode !== "daily" || !availableMonths[selectedYear]?.length
              }
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="월 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                {(availableMonths[selectedYear] || []).map((month) => {
                  const monthValue = String(month).padStart(2, "0");
                  return (
                    <SelectItem key={month} value={monthValue}>
                      {month}월
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Content Area - Scrollable */}
      <div className="flex-1 overflow-y-auto px-8 py-8">
        <div className="flex flex-col gap-8">
          {/* 요약 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="hover:border-blue-500 hover:shadow-md transition-all duration-300 cursor-pointer border-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {viewMode === "daily" &&
                  selectedMonth &&
                  selectedMonth !== "all"
                    ? `${parseInt(selectedMonth)}월 총 매출액`
                    : "누적 매출액"}
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground hover:text-blue-600 transition-colors duration-300" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold hover:text-green-600 transition-colors duration-300">
                  {currentDisplayData?.summary.totalRevenue
                    ? formatCurrency(currentDisplayData.summary.totalRevenue)
                    : "$0"}
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {viewMode === "daily" &&
                    selectedMonth &&
                    selectedMonth !== "all"
                      ? `${selectedYear}년 ${parseInt(selectedMonth)}월`
                      : "전체 기간"}{" "}
                    매출
                  </p>
                  {weeklyGrowth && (
                    <div className="flex flex-col items-end text-xs">
                      <div className="flex items-center">
                        {weeklyGrowth.revenueGrowth >= 0 ? (
                          <ArrowUp className="h-3 w-3 text-green-500 mr-1" />
                        ) : (
                          <ArrowDown className="h-3 w-3 text-red-500 mr-1" />
                        )}
                        <span
                          className={`font-medium ${
                            weeklyGrowth.revenueGrowth >= 0
                              ? "text-green-500"
                              : "text-red-500"
                          }`}
                        >
                          {weeklyGrowth.revenueGrowth.toFixed(1)}%
                        </span>
                      </div>
                      <span className="text-muted-foreground text-[10px]">
                        {weeklyGrowth.previousWeek
                          ? `${
                              new Date(weeklyGrowth.previousWeek).getMonth() + 1
                            }/${new Date(
                              weeklyGrowth.previousWeek
                            ).getDate()}주 대비`
                          : "전전주 대비 전주 성과"}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="hover:border-blue-500 hover:shadow-md transition-all duration-300 cursor-pointer border-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {viewMode === "daily" &&
                  selectedMonth &&
                  selectedMonth !== "all"
                    ? `${parseInt(selectedMonth)}월 총 판매량`
                    : "누적 판매량"}
                </CardTitle>
                <Package className="h-4 w-4 text-muted-foreground hover:text-blue-600 transition-colors duration-300" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold hover:text-blue-600 transition-colors duration-300">
                  {currentDisplayData?.summary.totalQuantity?.toLocaleString() ||
                    0}
                  개
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {viewMode === "daily" &&
                    selectedMonth &&
                    selectedMonth !== "all"
                      ? `${selectedYear}년 ${parseInt(selectedMonth)}월`
                      : "전체 기간"}{" "}
                    판매량
                  </p>
                  {weeklyGrowth && (
                    <div className="flex flex-col items-end text-xs">
                      <div className="flex items-center">
                        {weeklyGrowth.quantityGrowth >= 0 ? (
                          <ArrowUp className="h-3 w-3 text-green-500 mr-1" />
                        ) : (
                          <ArrowDown className="h-3 w-3 text-red-500 mr-1" />
                        )}
                        <span
                          className={`font-medium ${
                            weeklyGrowth.quantityGrowth >= 0
                              ? "text-green-500"
                              : "text-red-500"
                          }`}
                        >
                          {weeklyGrowth.quantityGrowth.toFixed(1)}%
                        </span>
                      </div>
                      <span className="text-muted-foreground text-[10px]">
                        {weeklyGrowth.previousWeek
                          ? `${
                              new Date(weeklyGrowth.previousWeek).getMonth() + 1
                            }/${new Date(
                              weeklyGrowth.previousWeek
                            ).getDate()}주 대비`
                          : "전전주 대비 전주 성과"}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="hover:border-blue-500 hover:shadow-md transition-all duration-300 cursor-pointer border-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {viewMode === "daily" &&
                  selectedMonth &&
                  selectedMonth !== "all"
                    ? `${parseInt(selectedMonth)}월 활성 제품 수`
                    : "누적 활성 제품 수"}
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground hover:text-blue-600 transition-colors duration-300" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold hover:text-purple-600 transition-colors duration-300">
                  {currentDisplayData?.summary.activeProducts?.toLocaleString() ||
                    0}
                  개
                </div>
                <p className="text-xs text-muted-foreground">
                  {viewMode === "daily" &&
                  selectedMonth &&
                  selectedMonth !== "all"
                    ? `${selectedYear}년 ${parseInt(selectedMonth)}월`
                    : "전체 기간"}{" "}
                  활성 제품
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 매출 매트릭스 테이블 */}
          {viewMode === "daily" && (
            <>
              {data ? (
                <SalesMatrixTable
                  data={data}
                  type="daily"
                  selectedYear={selectedYear}
                  selectedMonth={selectedMonth}
                  onExcelDownload={handleExcelDownload}
                  downloadLoading={downloadLoading}
                  isLoading={dataLoading}
                />
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    데이터를 불러올 수 없습니다.
                  </p>
                </div>
              )}
            </>
          )}

          {viewMode === "weekly" && (
            <>
              {weeklyData ? (
                <SalesMatrixTable
                  data={weeklyData}
                  type="weekly"
                  selectedYear={selectedYear}
                  selectedMonth=""
                  onExcelDownload={handleExcelDownload}
                  downloadLoading={downloadLoading}
                />
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    주별 데이터를 불러오는 중...
                  </p>
                </div>
              )}
            </>
          )}

          {viewMode === "monthly" && (
            <>
              {allData ? (
                <SalesMatrixTable
                  data={allData}
                  type="monthly"
                  selectedYear={selectedYear}
                  selectedMonth=""
                  onExcelDownload={handleExcelDownload}
                  downloadLoading={downloadLoading}
                />
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    데이터를 불러올 수 없습니다.
                  </p>
                </div>
              )}
            </>
          )}

          {/* 주차별 데이터 시각화 */}
          <WeeklyDataVisualization weeklyData={weeklyData} />
        </div>
      </div>
    </div>
  );
}
