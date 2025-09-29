'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Package,
  Megaphone,
  Warehouse,
  Calculator,
  AlertTriangle
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { amazonCostAnalysis, amazonCostTrend } from '@/lib/mock-data/amazon-mock-data';

// Colors for charts
const COLORS = ['#FF6B35', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFA07A'];

export default function AmazonCostsPage() {
  const [dateRange, setDateRange] = useState('30');
  const [viewMode, setViewMode] = useState('trend');

  // Cost breakdown data for pie chart
  const costBreakdown = [
    { name: '광고비', value: amazonCostAnalysis.advertisingCost.current, color: COLORS[0] },
    { name: '처리비', value: amazonCostAnalysis.fulfillmentCost.current, color: COLORS[1] },
    { name: '보관비', value: amazonCostAnalysis.storageFee.current, color: COLORS[2] },
    { name: '기타', value: 500, color: COLORS[3] }
  ];

  // Cost efficiency metrics
  const costEfficiencyMetrics = [
    {
      title: 'ACoS (광고비용 대비 매출)',
      value: amazonCostAnalysis.advertisingCost.acos,
      target: 15,
      status: amazonCostAnalysis.advertisingCost.acos > 15 ? 'warning' : 'good'
    },
    {
      title: '주문당 비용',
      value: amazonCostAnalysis.costPerOrder.current,
      target: 10,
      status: amazonCostAnalysis.costPerOrder.current > 10 ? 'warning' : 'good'
    },
    {
      title: '단위당 처리비',
      value: amazonCostAnalysis.fulfillmentCost.perUnit,
      target: 7,
      status: amazonCostAnalysis.fulfillmentCost.perUnit < 7 ? 'good' : 'warning'
    }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">비용 분석</h1>
          <p className="text-muted-foreground">광고비, 처리비, 보관비 상세 분석</p>
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

      {/* Cost Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 비용</CardTitle>
            <DollarSign className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${amazonCostAnalysis.totalCosts.current.toLocaleString()}</div>
            <div className="flex items-center text-xs mt-2">
              {amazonCostAnalysis.totalCosts.change > 0 ? (
                <TrendingUp className="h-3 w-3 text-red-500 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 text-green-500 mr-1" />
              )}
              <span className={amazonCostAnalysis.totalCosts.change > 0 ? 'text-red-500' : 'text-green-500'}>
                {amazonCostAnalysis.totalCosts.change > 0 ? '+' : ''}{amazonCostAnalysis.totalCosts.change}%
              </span>
              <span className="text-muted-foreground ml-1">vs 이전 기간</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">광고비</CardTitle>
            <Megaphone className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${amazonCostAnalysis.advertisingCost.current.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-1">
              ACoS: {amazonCostAnalysis.advertisingCost.acos}%
            </div>
            <div className="flex items-center text-xs mt-2">
              <TrendingUp className="h-3 w-3 text-red-500 mr-1" />
              <span className="text-red-500">+{amazonCostAnalysis.advertisingCost.change}%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">처리비</CardTitle>
            <Package className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${amazonCostAnalysis.fulfillmentCost.current.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-1">
              단위당: ${amazonCostAnalysis.fulfillmentCost.perUnit}
            </div>
            <div className="flex items-center text-xs mt-2">
              <TrendingUp className="h-3 w-3 text-red-500 mr-1" />
              <span className="text-red-500">+{amazonCostAnalysis.fulfillmentCost.change}%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">보관비</CardTitle>
            <Warehouse className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${amazonCostAnalysis.storageFee.current.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-1">
              단위당: ${amazonCostAnalysis.storageFee.perUnit}
            </div>
            <div className="flex items-center text-xs mt-2">
              <TrendingUp className="h-3 w-3 text-red-500 mr-1" />
              <span className="text-red-500">+{amazonCostAnalysis.storageFee.change}%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cost Analysis Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>비용 상세 분석</CardTitle>
          <CardDescription>기간별 비용 추이 및 구성</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={viewMode} onValueChange={setViewMode}>
            <TabsList>
              <TabsTrigger value="trend">추이</TabsTrigger>
              <TabsTrigger value="breakdown">구성</TabsTrigger>
              <TabsTrigger value="efficiency">효율성</TabsTrigger>
            </TabsList>

            <TabsContent value="trend" className="mt-4">
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={amazonCostTrend.slice(-parseInt(dateRange))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="advertising" stroke="#FF6B35" name="광고비" strokeWidth={2} />
                  <Line type="monotone" dataKey="fulfillment" stroke="#4ECDC4" name="처리비" strokeWidth={2} />
                  <Line type="monotone" dataKey="storage" stroke="#45B7D1" name="보관비" strokeWidth={2} />
                  <Line type="monotone" dataKey="total" stroke="#2D3748" name="총 비용" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </TabsContent>

            <TabsContent value="breakdown" className="mt-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium mb-4">비용 구성</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={costBreakdown}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {costBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <h3 className="text-sm font-medium mb-4">비용 비중</h3>
                  <div className="space-y-4">
                    {costBreakdown.map((item, index) => (
                      <div key={index}>
                        <div className="flex justify-between text-sm mb-1">
                          <span>{item.name}</span>
                          <span className="font-medium">${item.value.toLocaleString()}</span>
                        </div>
                        <Progress
                          value={(item.value / amazonCostAnalysis.totalCosts.current) * 100}
                          className="h-2"
                          style={{ backgroundColor: '#e5e5e5' }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="efficiency" className="mt-4">
              <div className="space-y-4">
                {costEfficiencyMetrics.map((metric, index) => (
                  <Card key={index}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium">{metric.title}</h3>
                        <Badge variant={metric.status === 'good' ? 'default' : 'destructive'}>
                          {metric.status === 'good' ? '정상' : '주의'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="flex justify-between text-sm mb-1">
                            <span>현재</span>
                            <span className="font-medium">
                              {metric.title.includes('ACoS') ? `${metric.value}%` : `$${metric.value}`}
                            </span>
                          </div>
                          <Progress
                            value={(metric.value / metric.target) * 100}
                            className="h-2"
                          />
                          <div className="flex justify-between text-xs text-muted-foreground mt-1">
                            <span>0</span>
                            <span>목표: {metric.title.includes('ACoS') ? `${metric.target}%` : `$${metric.target}`}</span>
                          </div>
                        </div>
                        {metric.status === 'warning' && (
                          <AlertTriangle className="h-5 w-5 text-orange-500" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Cost Optimization Suggestions */}
      <Card>
        <CardHeader>
          <CardTitle>비용 최적화 제안</CardTitle>
          <CardDescription>비용 절감을 위한 권장사항</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-orange-500 mt-2" />
              <div>
                <p className="font-medium">광고 효율성 개선</p>
                <p className="text-sm text-muted-foreground">
                  ACoS가 목표치를 초과했습니다. 키워드 최적화와 타겟팅 조정을 고려하세요.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-green-500 mt-2" />
              <div>
                <p className="font-medium">재고 회전율 향상</p>
                <p className="text-sm text-muted-foreground">
                  보관비 절감을 위해 재고 회전율을 높이는 것을 권장합니다.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
              <div>
                <p className="font-medium">배송 방법 최적화</p>
                <p className="text-sm text-muted-foreground">
                  FBA Small and Light 프로그램 활용을 통해 처리비를 절감할 수 있습니다.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}