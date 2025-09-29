'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  DollarSign,
  ShoppingCart,
  Package,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  BarChart3
} from 'lucide-react';
import {
  amazonOverviewMetrics,
  amazonDailySales,
  amazonWeeklySales,
  amazonMonthlySales,
  amazonProducts
} from '@/lib/mock-data/amazon-mock-data';

// Metric card component
const MetricCard = ({
  title,
  value,
  change,
  icon: Icon,
  format = 'number',
  subtitle
}: {
  title: string;
  value: number | string;
  change?: number;
  icon: any;
  format?: 'number' | 'currency' | 'percent';
  subtitle?: string;
}) => {
  const isPositive = change && change > 0;
  const formatValue = () => {
    if (format === 'currency') return `$${typeof value === 'number' ? value.toLocaleString() : value}`;
    if (format === 'percent') return `${value}%`;
    return typeof value === 'number' ? value.toLocaleString() : value;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
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
            <span className={isPositive ? 'text-green-500' : 'text-red-500'}>
              {isPositive ? '+' : ''}{change}%
            </span>
            <span className="text-muted-foreground ml-1">vs 이전 기간</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default function AmazonOverviewPage() {
  const [dateRange, setDateRange] = useState('30');
  const [viewMode, setViewMode] = useState('daily');

  // Select data based on view mode
  const getSalesData = () => {
    switch (viewMode) {
      case 'weekly':
        return amazonWeeklySales;
      case 'monthly':
        return amazonMonthlySales;
      default:
        return amazonDailySales.slice(-parseInt(dateRange));
    }
  };

  const salesData = getSalesData();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Amazon 전체 판매 성과</h1>
          <p className="text-muted-foreground">총 판매액, 주문 수, 배송 건수 통계</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            API 연동됨
          </Badge>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <MetricCard
          title="총 매출액"
          value={amazonOverviewMetrics.totalRevenue.value}
          change={amazonOverviewMetrics.totalRevenue.change}
          icon={DollarSign}
          format="currency"
        />
        <MetricCard
          title="총 주문 수"
          value={amazonOverviewMetrics.totalOrders.value}
          change={amazonOverviewMetrics.totalOrders.change}
          icon={ShoppingCart}
        />
        <MetricCard
          title="총 배송 건수"
          value={amazonOverviewMetrics.totalShipped.value}
          change={amazonOverviewMetrics.totalShipped.change}
          icon={Package}
        />
        <MetricCard
          title="평균 주문 가격"
          value={amazonOverviewMetrics.avgOrderValue.value}
          change={amazonOverviewMetrics.avgOrderValue.change}
          icon={BarChart3}
          format="currency"
        />
        <MetricCard
          title="반품율"
          value={amazonOverviewMetrics.returnRate.value}
          change={amazonOverviewMetrics.returnRate.change}
          icon={RefreshCw}
          format="percent"
        />
        <MetricCard
          title="전환율"
          value={amazonOverviewMetrics.conversionRate.value}
          change={amazonOverviewMetrics.conversionRate.change}
          icon={TrendingUp}
          format="percent"
        />
      </div>

      {/* Sales Data Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>판매 추이</CardTitle>
          <CardDescription>기간별 판매 데이터</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={viewMode} onValueChange={setViewMode}>
            <TabsList>
              <TabsTrigger value="daily">일별</TabsTrigger>
              <TabsTrigger value="weekly">주별</TabsTrigger>
              <TabsTrigger value="monthly">월별</TabsTrigger>
            </TabsList>

            <TabsContent value="daily" className="mt-4">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-4">날짜</th>
                      <th className="text-right py-2 px-4">주문</th>
                      <th className="text-right py-2 px-4">매출</th>
                      <th className="text-right py-2 px-4">판매 개수</th>
                      <th className="text-right py-2 px-4">반품</th>
                      <th className="text-right py-2 px-4">전환율</th>
                    </tr>
                  </thead>
                  <tbody>
                    {amazonDailySales.slice(-parseInt(dateRange)).map((day, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="py-2 px-4">{day.date}</td>
                        <td className="text-right py-2 px-4">{day.orders}</td>
                        <td className="text-right py-2 px-4">${day.revenue.toLocaleString()}</td>
                        <td className="text-right py-2 px-4">{day.units}</td>
                        <td className="text-right py-2 px-4">{day.returns}</td>
                        <td className="text-right py-2 px-4">{day.conversion.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="weekly" className="mt-4">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-4">주차</th>
                      <th className="text-left py-2 px-4">기간</th>
                      <th className="text-right py-2 px-4">주문</th>
                      <th className="text-right py-2 px-4">매출</th>
                      <th className="text-right py-2 px-4">판매 개수</th>
                      <th className="text-right py-2 px-4">반품</th>
                      <th className="text-right py-2 px-4">전환율</th>
                    </tr>
                  </thead>
                  <tbody>
                    {amazonWeeklySales.map((week, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="py-2 px-4">{week.week}</td>
                        <td className="py-2 px-4 text-sm text-muted-foreground">{week.dateRange}</td>
                        <td className="text-right py-2 px-4">{week.orders}</td>
                        <td className="text-right py-2 px-4">${week.revenue.toLocaleString()}</td>
                        <td className="text-right py-2 px-4">{week.units}</td>
                        <td className="text-right py-2 px-4">{week.returns}</td>
                        <td className="text-right py-2 px-4">{week.conversion.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="monthly" className="mt-4">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-4">월</th>
                      <th className="text-right py-2 px-4">주문</th>
                      <th className="text-right py-2 px-4">매출</th>
                      <th className="text-right py-2 px-4">판매 개수</th>
                      <th className="text-right py-2 px-4">반품</th>
                      <th className="text-right py-2 px-4">전환율</th>
                    </tr>
                  </thead>
                  <tbody>
                    {amazonMonthlySales.map((month, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="py-2 px-4">{month.month}</td>
                        <td className="text-right py-2 px-4">{month.orders}</td>
                        <td className="text-right py-2 px-4">${month.revenue.toLocaleString()}</td>
                        <td className="text-right py-2 px-4">{month.units}</td>
                        <td className="text-right py-2 px-4">{month.returns}</td>
                        <td className="text-right py-2 px-4">{month.conversion.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Top Products */}
      <Card>
        <CardHeader>
          <CardTitle>베스트셀러 제품</CardTitle>
          <CardDescription>최근 30일 기준 상위 제품</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-4">ASIN</th>
                  <th className="text-left py-2 px-4">제품명</th>
                  <th className="text-left py-2 px-4">카테고리</th>
                  <th className="text-right py-2 px-4">가격</th>
                  <th className="text-right py-2 px-4">30일 판매</th>
                  <th className="text-right py-2 px-4">30일 매출</th>
                  <th className="text-right py-2 px-4">재고</th>
                  <th className="text-left py-2 px-4">평점</th>
                </tr>
              </thead>
              <tbody>
                {amazonProducts.slice(0, 5).map((product, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-4 font-mono text-sm">{product.asin}</td>
                    <td className="py-2 px-4 font-medium">{product.name}</td>
                    <td className="py-2 px-4">
                      <Badge variant="outline">{product.category}</Badge>
                    </td>
                    <td className="text-right py-2 px-4">${product.price}</td>
                    <td className="text-right py-2 px-4">{product.sales30d}</td>
                    <td className="text-right py-2 px-4">${product.revenue30d.toLocaleString()}</td>
                    <td className="text-right py-2 px-4">
                      <span className={product.inventory < 100 ? 'text-orange-500' : ''}>
                        {product.inventory}
                      </span>
                    </td>
                    <td className="py-2 px-4">
                      <div className="flex items-center gap-1">
                        <span className="text-yellow-500">★</span>
                        <span>{product.rating}</span>
                        <span className="text-xs text-muted-foreground">({product.reviews.toLocaleString()})</span>
                      </div>
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