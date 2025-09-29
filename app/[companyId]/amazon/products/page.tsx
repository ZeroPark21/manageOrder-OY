'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  Filter,
  Download,
  Package2,
  TrendingUp,
  TrendingDown,
  AlertCircle
} from 'lucide-react';
import { amazonProducts, amazonDailySales } from '@/lib/mock-data/amazon-mock-data';

export default function AmazonProductsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [viewMode, setViewMode] = useState('daily');

  // Filter products based on search and category
  const filteredProducts = amazonProducts.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          product.asin.includes(searchTerm) ||
                          product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || product.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  // Get unique categories
  const categories = ['all', ...new Set(amazonProducts.map(p => p.category))];

  // Generate ASIN performance data
  const generateASINPerformance = (asin: string, period: string) => {
    const base = amazonProducts.find(p => p.asin === asin);
    if (!base) return [];

    const days = period === 'daily' ? 7 : period === 'weekly' ? 4 : 3;
    const data = [];

    for (let i = 0; i < days; i++) {
      const variance = 0.2;
      const salesBase = base.sales30d / 30;
      const sales = Math.floor(salesBase + (Math.random() - 0.5) * 2 * salesBase * variance);
      const revenue = sales * base.price;

      data.push({
        period: period === 'daily' ? `Day ${i + 1}` :
                period === 'weekly' ? `Week ${i + 1}` :
                `Month ${i + 1}`,
        sales,
        revenue,
        inventory: base.inventory - (sales * i),
        conversion: (3 + Math.random() * 3).toFixed(1)
      });
    }

    return data;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">ASIN별 판매 분석</h1>
          <p className="text-muted-foreground">ASIN별 상세 판매 데이터</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">필터</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ASIN, SKU, 제품명 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="카테고리 선택" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category === 'all' ? '모든 카테고리' : category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Products Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredProducts.map((product) => (
          <Card key={product.asin}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{product.name}</CardTitle>
                  <CardDescription className="mt-1">
                    <span className="font-mono">{product.asin}</span> · SKU: {product.sku}
                  </CardDescription>
                </div>
                <Badge variant={product.status === 'active' ? 'default' : 'secondary'}>
                  {product.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Product Metrics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground">가격</p>
                    <p className="text-lg font-semibold">${product.price}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">30일 판매</p>
                    <p className="text-lg font-semibold">{product.sales30d} 개</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">평점</p>
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-500">★</span>
                      <span className="font-semibold">{product.rating}</span>
                      <span className="text-xs text-muted-foreground">
                        ({product.reviews.toLocaleString()})
                      </span>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground">30일 매출</p>
                    <p className="text-lg font-semibold">${product.revenue30d.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">재고</p>
                    <div className="flex items-center gap-2">
                      <p className={`text-lg font-semibold ${
                        product.inventory < 100 ? 'text-orange-500' : ''
                      }`}>
                        {product.inventory}
                      </p>
                      {product.inventory < 100 && (
                        <AlertCircle className="h-4 w-4 text-orange-500" />
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">카테고리</p>
                    <Badge variant="outline" className="mt-1">
                      {product.category}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Performance Table */}
              <div>
                <Tabs defaultValue="daily" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="daily">일별</TabsTrigger>
                    <TabsTrigger value="weekly">주별</TabsTrigger>
                    <TabsTrigger value="monthly">월별</TabsTrigger>
                  </TabsList>
                  {['daily', 'weekly', 'monthly'].map((period) => (
                    <TabsContent key={period} value={period}>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2">기간</th>
                              <th className="text-right py-2">판매</th>
                              <th className="text-right py-2">매출</th>
                              <th className="text-right py-2">재고</th>
                              <th className="text-right py-2">전환율</th>
                            </tr>
                          </thead>
                          <tbody>
                            {generateASINPerformance(product.asin, period).map((row, idx) => (
                              <tr key={idx} className="border-b">
                                <td className="py-2">{row.period}</td>
                                <td className="text-right py-2">{row.sales}</td>
                                <td className="text-right py-2">${row.revenue.toFixed(0)}</td>
                                <td className="text-right py-2">{row.inventory}</td>
                                <td className="text-right py-2">{row.conversion}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary Stats */}
      <Card>
        <CardHeader>
          <CardTitle>전체 ASIN 요약</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-500">
                {amazonProducts.length}
              </p>
              <p className="text-sm text-muted-foreground">총 ASIN</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">
                ${amazonProducts.reduce((sum, p) => sum + p.revenue30d, 0).toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">30일 총 매출</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">
                {amazonProducts.reduce((sum, p) => sum + p.sales30d, 0).toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">30일 총 판매</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">
                {amazonProducts.reduce((sum, p) => sum + p.inventory, 0).toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">총 재고</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}