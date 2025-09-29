'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar, TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, BarChart3, Package } from 'lucide-react';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import {
  mockSummaryMetrics,
  mockPlatformRevenue,
  mockSalesTrend,
  mockTopProducts,
  mockPlatformPerformance,
  datePresets,
  platformOptions,
  periodOptions
} from '@/lib/mock-data/dashboard-mock-data';

// Custom tooltip for charts
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border rounded-lg shadow-lg">
        <p className="font-semibold">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }}>
            {entry.name}: ${entry.value.toLocaleString()}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Metric card component
const MetricCard = ({
  title,
  value,
  change,
  icon: Icon,
  format = 'number'
}: {
  title: string;
  value: number | string;
  change: number;
  icon: any;
  format?: 'number' | 'currency' | 'percent';
}) => {
  const isPositive = change > 0;
  const formatValue = () => {
    if (format === 'currency') return `$${value.toLocaleString()}`;
    if (format === 'percent') return `${value}%`;
    return value.toLocaleString();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatValue()}</div>
        <div className="flex items-center text-xs">
          {isPositive ? (
            <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
          ) : (
            <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
          )}
          <span className={isPositive ? 'text-green-500' : 'text-red-500'}>
            {isPositive ? '+' : ''}{change}%
          </span>
          <span className="text-muted-foreground ml-1">from last period</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default function TestDashboard() {
  const [dateRange, setDateRange] = useState('7');
  const [platform, setPlatform] = useState('all');
  const [period, setPeriod] = useState('daily');

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Sales Dashboard</h1>
            <p className="text-muted-foreground">TikTok Shop & Amazon Performance Analytics</p>
          </div>
          <Button variant="outline" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Export Report
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[150px] bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {datePresets.map(preset => (
                <SelectItem key={preset.value} value={preset.value.toString()}>
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={platform} onValueChange={setPlatform}>
            <SelectTrigger className="w-[180px] bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {platformOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[150px] bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {periodOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Revenue"
          value={mockSummaryMetrics.totalRevenue.value}
          change={mockSummaryMetrics.totalRevenue.change}
          icon={DollarSign}
          format="currency"
        />
        <MetricCard
          title="Total Orders"
          value={mockSummaryMetrics.totalOrders.value}
          change={mockSummaryMetrics.totalOrders.change}
          icon={ShoppingCart}
        />
        <MetricCard
          title="Avg Order Value"
          value={mockSummaryMetrics.avgOrderValue.value}
          change={mockSummaryMetrics.avgOrderValue.change}
          icon={BarChart3}
          format="currency"
        />
        <MetricCard
          title="Conversion Rate"
          value={mockSummaryMetrics.conversionRate.value}
          change={mockSummaryMetrics.conversionRate.change}
          icon={Users}
          format="percent"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Platform Revenue Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Platform Revenue Comparison</CardTitle>
            <CardDescription>Revenue breakdown by platform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={mockPlatformRevenue}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {mockPlatformRevenue.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => `$${value.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-4">
              {mockPlatformRevenue.map((platform) => (
                <div key={platform.name} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: platform.color }}
                  />
                  <span className="text-sm font-medium">{platform.name}</span>
                  <span className="text-sm text-muted-foreground">
                    ${(platform.value / 1000).toFixed(0)}k
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Sales Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Sales Trend</CardTitle>
            <CardDescription>Revenue over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={mockSalesTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="tiktok"
                  stroke="#FF6B6B"
                  strokeWidth={2}
                  name="TikTok Shop"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="amazon"
                  stroke="#FF9500"
                  strokeWidth={2}
                  name="Amazon"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Performing Products */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Products</CardTitle>
            <CardDescription>Best sellers across all platforms</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockTopProducts.map((product) => (
                <div key={product.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                      product.platform === 'TikTok'
                        ? 'bg-pink-100 text-pink-700'
                        : 'bg-orange-100 text-orange-700'
                    }`}>
                      {product.platform}
                    </div>
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground">{product.orders} orders</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">${product.revenue.toLocaleString()}</p>
                    <p className={`text-xs flex items-center justify-end ${
                      product.growth > 0 ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {product.growth > 0 ? '+' : ''}{product.growth}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Platform Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Platform Performance</CardTitle>
            <CardDescription>Key metrics by platform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {Object.values(mockPlatformPerformance).map((platform) => (
                <div key={platform.name} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${
                        platform.name === 'TikTok Shop' ? 'bg-pink-500' : 'bg-orange-500'
                      }`} />
                      <span className="font-medium">{platform.name}</span>
                    </div>
                    <span className="text-xl font-bold">
                      ${(platform.revenue / 1000).toFixed(0)}k
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Orders</p>
                      <p className="font-medium">{platform.orders.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Conversion</p>
                      <p className="font-medium">{platform.conversionRate}%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">AOV</p>
                      <p className="font-medium">${platform.avgOrderValue}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">% of Total</p>
                      <p className="font-medium">{platform.percentOfTotal}%</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}