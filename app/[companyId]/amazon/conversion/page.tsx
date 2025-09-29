'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  MousePointer,
  CreditCard,
  Monitor,
  Smartphone,
  Tablet,
  ArrowRight
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Funnel,
  FunnelChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList
} from 'recharts';
import { amazonConversionMetrics } from '@/lib/mock-data/amazon-mock-data';

// Colors for charts
const DEVICE_COLORS = {
  Desktop: '#FF6B35',
  Mobile: '#4ECDC4',
  Tablet: '#45B7D1'
};

const CATEGORY_COLORS = ['#FF6B35', '#4ECDC4', '#45B7D1', '#96CEB4'];

export default function AmazonConversionPage() {
  const [dateRange, setDateRange] = useState('30');
  const [viewMode, setViewMode] = useState('overview');

  // Prepare funnel data for visualization
  const funnelData = [
    { name: '페이지뷰', value: amazonConversionMetrics.funnel.views, fill: '#FF6B35' },
    { name: '장바구니', value: amazonConversionMetrics.funnel.addToCart, fill: '#4ECDC4' },
    { name: '결제시작', value: amazonConversionMetrics.funnel.checkout, fill: '#45B7D1' },
    { name: '구매완료', value: amazonConversionMetrics.funnel.purchase, fill: '#96CEB4' }
  ];

  // Calculate conversion rates between funnel steps
  const funnelConversions = [
    {
      step: '페이지뷰 → 장바구니',
      rate: ((amazonConversionMetrics.funnel.addToCart / amazonConversionMetrics.funnel.views) * 100).toFixed(1),
      count: amazonConversionMetrics.funnel.addToCart
    },
    {
      step: '장바구니 → 결제',
      rate: ((amazonConversionMetrics.funnel.checkout / amazonConversionMetrics.funnel.addToCart) * 100).toFixed(1),
      count: amazonConversionMetrics.funnel.checkout
    },
    {
      step: '결제 → 구매',
      rate: ((amazonConversionMetrics.funnel.purchase / amazonConversionMetrics.funnel.checkout) * 100).toFixed(1),
      count: amazonConversionMetrics.funnel.purchase
    }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">전환율 분석</h1>
          <p className="text-muted-foreground">방문자 전환 퍼널 및 성과 분석</p>
        </div>
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

      {/* Conversion Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전체 전환율</CardTitle>
            <MousePointer className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{amazonConversionMetrics.overallConversion.rate}%</div>
            <div className="flex items-center text-xs mt-2">
              {amazonConversionMetrics.overallConversion.change > 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
              )}
              <span className={amazonConversionMetrics.overallConversion.change > 0 ? 'text-green-500' : 'text-red-500'}>
                {amazonConversionMetrics.overallConversion.change > 0 ? '+' : ''}{amazonConversionMetrics.overallConversion.change}%p
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">세션</CardTitle>
            <Monitor className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{amazonConversionMetrics.overallConversion.sessions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">총 방문 세션</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">주문</CardTitle>
            <ShoppingCart className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{amazonConversionMetrics.overallConversion.orders.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">전환된 주문</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">장바구니 전환</CardTitle>
            <CreditCard className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((amazonConversionMetrics.funnel.addToCart / amazonConversionMetrics.funnel.views) * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">장바구니 추가율</p>
          </CardContent>
        </Card>
      </div>

      {/* Conversion Analysis Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>전환 분석</CardTitle>
          <CardDescription>전환 퍼널 및 세부 분석</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={viewMode} onValueChange={setViewMode}>
            <TabsList>
              <TabsTrigger value="overview">개요</TabsTrigger>
              <TabsTrigger value="funnel">퍼널</TabsTrigger>
              <TabsTrigger value="category">카테고리별</TabsTrigger>
              <TabsTrigger value="device">기기별</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4">
              <div className="space-y-6">
                {/* Funnel Steps */}
                <div>
                  <h3 className="text-sm font-medium mb-4">전환 단계별 분석</h3>
                  <div className="space-y-4">
                    {funnelConversions.map((step, index) => (
                      <div key={index} className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium">{step.step}</span>
                            <span className="text-sm font-bold">{step.rate}%</span>
                          </div>
                          <Progress value={parseFloat(step.rate)} className="h-2" />
                          <p className="text-xs text-muted-foreground mt-1">
                            {step.count.toLocaleString()}명 진행
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Conversion Funnel Chart */}
                <div>
                  <h3 className="text-sm font-medium mb-4">전환 퍼널 시각화</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={funnelData} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="value" />
                      <YAxis dataKey="name" type="category" />
                      <Tooltip />
                      <Bar dataKey="value" fill="#FF6B35">
                        <LabelList dataKey="value" position="right" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="funnel" className="mt-4">
              <div className="space-y-6">
                <ResponsiveContainer width="100%" height={400}>
                  <FunnelChart>
                    <Tooltip />
                    <Funnel
                      dataKey="value"
                      data={funnelData}
                      isAnimationActive
                      label
                    >
                      <LabelList position="center" fill="#fff" />
                    </Funnel>
                  </FunnelChart>
                </ResponsiveContainer>

                {/* Funnel Statistics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {funnelData.map((item, index) => (
                    <Card key={index}>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <div className="w-3 h-3 rounded-full mx-auto mb-2" style={{ backgroundColor: item.fill }} />
                          <p className="text-sm font-medium">{item.name}</p>
                          <p className="text-2xl font-bold mt-2">{item.value.toLocaleString()}</p>
                          {index > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              전환율: {((item.value / funnelData[index - 1].value) * 100).toFixed(1)}%
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="category" className="mt-4">
              <div className="space-y-6">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={amazonConversionMetrics.byCategory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="rate" fill="#FF6B35" name="전환율 (%)">
                      <LabelList dataKey="rate" position="top" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>

                {/* Category Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">카테고리</th>
                        <th className="text-right py-2">세션</th>
                        <th className="text-right py-2">주문</th>
                        <th className="text-right py-2">전환율</th>
                        <th className="text-right py-2">성과</th>
                      </tr>
                    </thead>
                    <tbody>
                      {amazonConversionMetrics.byCategory.map((cat, index) => (
                        <tr key={index} className="border-b">
                          <td className="py-2">
                            <Badge variant="outline" style={{ backgroundColor: CATEGORY_COLORS[index] + '20' }}>
                              {cat.category}
                            </Badge>
                          </td>
                          <td className="text-right py-2">{cat.sessions.toLocaleString()}</td>
                          <td className="text-right py-2">{cat.orders.toLocaleString()}</td>
                          <td className="text-right py-2 font-medium">{cat.rate}%</td>
                          <td className="text-right py-2">
                            {cat.rate > 4.8 ? (
                              <Badge variant="default">우수</Badge>
                            ) : cat.rate > 4.5 ? (
                              <Badge variant="secondary">양호</Badge>
                            ) : (
                              <Badge variant="outline">개선필요</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="device" className="mt-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Device Distribution Pie Chart */}
                <div>
                  <h3 className="text-sm font-medium mb-4">기기별 트래픽 분포</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={amazonConversionMetrics.byDevice}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ device, percentage }) => `${device} ${percentage}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="percentage"
                      >
                        {amazonConversionMetrics.byDevice.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={DEVICE_COLORS[entry.device as keyof typeof DEVICE_COLORS]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Device Conversion Rates */}
                <div>
                  <h3 className="text-sm font-medium mb-4">기기별 전환율</h3>
                  <div className="space-y-4">
                    {amazonConversionMetrics.byDevice.map((device, index) => (
                      <Card key={index}>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {device.device === 'Desktop' && <Monitor className="h-4 w-4" />}
                              {device.device === 'Mobile' && <Smartphone className="h-4 w-4" />}
                              {device.device === 'Tablet' && <Tablet className="h-4 w-4" />}
                              <span className="font-medium">{device.device}</span>
                            </div>
                            <span className="text-sm text-muted-foreground">{device.percentage}% 트래픽</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Progress value={(device.rate / 6) * 100} className="flex-1" />
                            <span className="font-bold text-lg">{device.rate}%</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Conversion Optimization Tips */}
      <Card>
        <CardHeader>
          <CardTitle>전환율 최적화 제안</CardTitle>
          <CardDescription>전환율 향상을 위한 권장사항</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h3 className="font-medium text-sm">개선 필요 영역</h3>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5" />
                  <div>
                    <p className="text-sm font-medium">모바일 전환율 개선</p>
                    <p className="text-xs text-muted-foreground">
                      데스크톱 대비 1.3%p 낮음
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-orange-500 mt-1.5" />
                  <div>
                    <p className="text-sm font-medium">장바구니 이탈률 감소</p>
                    <p className="text-xs text-muted-foreground">
                      62.4% 장바구니 이탈
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="font-medium text-sm">우수 성과</h3>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5" />
                  <div>
                    <p className="text-sm font-medium">Smart Home 카테고리</p>
                    <p className="text-xs text-muted-foreground">
                      5.2% 전환율 달성
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5" />
                  <div>
                    <p className="text-sm font-medium">데스크톱 전환율</p>
                    <p className="text-xs text-muted-foreground">
                      목표 대비 +0.5%p 초과
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}