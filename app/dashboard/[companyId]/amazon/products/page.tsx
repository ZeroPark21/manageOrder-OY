'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

interface ProductData {
  asin: string
  product_name: string
  sku_list: string[]
  quantity: number
  revenue: number
  orders: number
  avgOrderValue: number
  promotionOrders: number
  promotionRate: number
  promotionDiscount: number
  topStates: Array<{ state: string; count: number }>
  topCities: Array<{ city: string; count: number }>
  serviceLevelDist: Record<string, number>
  dailySales: Array<{ date: string; quantity: number; revenue: number; orders: number }>
  weeklySales: Array<{ week: string; quantity: number; revenue: number; orders: number }>
  monthlySales: Array<{ month: string; quantity: number; revenue: number; orders: number }>
}

interface ApiResponse {
  asinList: ProductData[]
  summary: {
    totalAsins: number
    totalRevenue: number
    totalQuantity: number
    totalOrders: number
  }
}

type SortField = 'revenue' | 'quantity' | 'orders' | 'avgOrderValue';
type SortDirection = 'asc' | 'desc';

export default function AmazonProductsPage() {
  const params = useParams();
  const companyId = params.companyId as string;
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState('30');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedAsin, setExpandedAsin] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('revenue');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [lastUpload, setLastUpload] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(
          `/api/amazon/products?companyId=${companyId}&dateRange=${dateRange}`
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
          .from('companies')
          .select('channel_settings')
          .eq('id', parseInt(companyId))
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

  // Filter and sort products
  const filteredProducts = data?.asinList.filter(product => {
    const matchesSearch = product.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          product.asin.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          product.sku_list.some(sku => sku.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  }) || [];

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    const multiplier = sortDirection === 'asc' ? 1 : -1;
    return (aValue - bValue) * multiplier;
  });

  // Pagination
  const totalPages = Math.ceil(sortedProducts.length / pageSize);
  const paginatedProducts = sortedProducts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Summary stats for filtered results
  const filteredSummary = {
    totalProducts: filteredProducts.length,
    totalRevenue: filteredProducts.reduce((sum, p) => sum + p.revenue, 0),
    totalQuantity: filteredProducts.reduce((sum, p) => sum + p.quantity, 0),
    totalOrders: filteredProducts.reduce((sum, p) => sum + p.orders, 0)
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setCurrentPage(1); // Reset to first page when sorting
  };

  const toggleExpand = (asin: string) => {
    setExpandedAsin(expandedAsin === asin ? null : asin);
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 inline ml-1" />;
    }
    return sortDirection === 'asc' ?
      <ArrowUp className="h-4 w-4 inline ml-1" /> :
      <ArrowDown className="h-4 w-4 inline ml-1" />;
  };

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
          <h1 className="text-2xl font-bold">ASIN별 판매 분석</h1>
          <div className="flex items-center gap-2">
            <p className="text-muted-foreground">ASIN별 상세 판매 데이터</p>
            {lastUpload && (
              <>
                <span className="text-muted-foreground">·</span>
                <p className="text-sm text-muted-foreground">
                  마지막 업데이트: {new Date(lastUpload).toLocaleString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7일</SelectItem>
              <SelectItem value="14">14일</SelectItem>
              <SelectItem value="30">30일</SelectItem>
              <SelectItem value="60">60일</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-500">
                {data.summary.totalAsins}
              </p>
              <p className="text-sm text-muted-foreground">총 ASIN</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold">
                ${data.summary.totalRevenue.toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">총 매출</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold">
                {data.summary.totalQuantity.toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">총 판매량</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold">
                {data.summary.totalOrders.toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">총 주문 수</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and View Mode */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ASIN, SKU, 제품명 검색..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="pl-8"
              />
            </div>
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
              <TabsList>
                <TabsTrigger value="daily">일별</TabsTrigger>
                <TabsTrigger value="weekly">주별</TabsTrigger>
                <TabsTrigger value="monthly">월별</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-muted-foreground">
              {sortedProducts.length}개 제품 중 {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, sortedProducts.length)} 표시
            </div>
            <Select value={pageSize.toString()} onValueChange={(v) => { setPageSize(parseInt(v)); setCurrentPage(1); }}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10개씩</SelectItem>
                <SelectItem value="25">25개씩</SelectItem>
                <SelectItem value="50">50개씩</SelectItem>
                <SelectItem value="100">100개씩</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]"></TableHead>
                <TableHead>ASIN / 제품명</TableHead>
                <TableHead
                  className="text-right cursor-pointer hover:bg-muted/50 select-none"
                  onClick={() => handleSort('orders')}
                >
                  <div className="flex items-center justify-end">
                    주문 수
                    {renderSortIcon('orders')}
                  </div>
                </TableHead>
                <TableHead
                  className="text-right cursor-pointer hover:bg-muted/50 select-none"
                  onClick={() => handleSort('quantity')}
                >
                  <div className="flex items-center justify-end">
                    판매량
                    {renderSortIcon('quantity')}
                  </div>
                </TableHead>
                <TableHead
                  className="text-right cursor-pointer hover:bg-muted/50 select-none"
                  onClick={() => handleSort('revenue')}
                >
                  <div className="flex items-center justify-end">
                    매출
                    {renderSortIcon('revenue')}
                  </div>
                </TableHead>
                <TableHead
                  className="text-right cursor-pointer hover:bg-muted/50 select-none"
                  onClick={() => handleSort('avgOrderValue')}
                >
                  <div className="flex items-center justify-end">
                    평균 주문액
                    {renderSortIcon('avgOrderValue')}
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedProducts.map((product) => (
                <React.Fragment key={product.asin}>
                  <TableRow
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleExpand(product.asin)}
                  >
                    <TableCell className="py-3">
                      {expandedAsin === product.asin ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{product.product_name || '제품명 없음'}</span>
                          {product.promotionOrders > 0 && (
                            <Badge variant="secondary" className="text-xs">프로모션</Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground font-mono">{product.asin}</span>
                        {product.sku_list.length > 0 && (
                          <span className="text-xs text-muted-foreground">SKU: {product.sku_list.join(', ')}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right py-3">{product.orders.toLocaleString()}</TableCell>
                    <TableCell className="text-right py-3">{product.quantity.toLocaleString()}</TableCell>
                    <TableCell className="text-right py-3">${product.revenue.toLocaleString()}</TableCell>
                    <TableCell className="text-right py-3">${product.avgOrderValue.toLocaleString()}</TableCell>
                  </TableRow>

                  {expandedAsin === product.asin && (
                    <TableRow>
                      <TableCell colSpan={6} className="bg-muted/30 p-0">
                        <div className="p-6 space-y-6">
                          {/* Sales Trends Based on View Mode */}
                          {viewMode === 'daily' && product.dailySales.length > 0 && (
                            <div>
                              <p className="text-sm font-medium mb-3">일별 판매 추이</p>
                              <div className="border rounded-md overflow-hidden">
                                <div className="max-h-64 overflow-y-auto">
                                  <Table>
                                    <TableHeader className="sticky top-0 bg-background">
                                      <TableRow>
                                        <TableHead className="w-[100px]">날짜</TableHead>
                                        <TableHead className="text-right">주문</TableHead>
                                        <TableHead className="text-right">판매량</TableHead>
                                        <TableHead className="text-right">매출</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {product.dailySales.slice().reverse().map((day) => (
                                        <TableRow key={day.date}>
                                          <TableCell className="text-sm">{day.date}</TableCell>
                                          <TableCell className="text-right text-sm">{day.orders}</TableCell>
                                          <TableCell className="text-right text-sm">{day.quantity}</TableCell>
                                          <TableCell className="text-right text-sm">${day.revenue.toLocaleString()}</TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>
                            </div>
                          )}

                          {viewMode === 'weekly' && product.weeklySales.length > 0 && (
                            <div>
                              <p className="text-sm font-medium mb-3">주별 판매 추이</p>
                              <div className="border rounded-md overflow-hidden">
                                <div className="max-h-64 overflow-y-auto">
                                  <Table>
                                    <TableHeader className="sticky top-0 bg-background">
                                      <TableRow>
                                        <TableHead className="w-[100px]">주차</TableHead>
                                        <TableHead className="text-right">주문</TableHead>
                                        <TableHead className="text-right">판매량</TableHead>
                                        <TableHead className="text-right">매출</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {product.weeklySales.slice().reverse().map((week) => (
                                        <TableRow key={week.week}>
                                          <TableCell className="text-sm">{week.week}</TableCell>
                                          <TableCell className="text-right text-sm">{week.orders}</TableCell>
                                          <TableCell className="text-right text-sm">{week.quantity}</TableCell>
                                          <TableCell className="text-right text-sm">${week.revenue.toLocaleString()}</TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>
                            </div>
                          )}

                          {viewMode === 'monthly' && product.monthlySales.length > 0 && (
                            <div>
                              <p className="text-sm font-medium mb-3">월별 판매 추이</p>
                              <div className="border rounded-md overflow-hidden">
                                <div className="max-h-64 overflow-y-auto">
                                  <Table>
                                    <TableHeader className="sticky top-0 bg-background">
                                      <TableRow>
                                        <TableHead className="w-[100px]">월</TableHead>
                                        <TableHead className="text-right">주문</TableHead>
                                        <TableHead className="text-right">판매량</TableHead>
                                        <TableHead className="text-right">매출</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {product.monthlySales.slice().reverse().map((month) => (
                                        <TableRow key={month.month}>
                                          <TableCell className="text-sm">{month.month}</TableCell>
                                          <TableCell className="text-right text-sm">{month.orders}</TableCell>
                                          <TableCell className="text-right text-sm">{month.quantity}</TableCell>
                                          <TableCell className="text-right text-sm">${month.revenue.toLocaleString()}</TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Compact Stats Grid */}
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-4 border-t">
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">프로모션 주문</p>
                              <p className="text-base font-semibold">{product.promotionOrders}건</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">프로모션 사용률</p>
                              <p className="text-base font-semibold">{product.promotionRate}%</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">총 할인액</p>
                              <p className="text-base font-semibold">${product.promotionDiscount.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">주요 지역</p>
                              <p className="text-base font-semibold">{product.topStates[0]?.state || '-'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">배송 레벨</p>
                              <p className="text-base font-semibold">{Object.keys(product.serviceLevelDist)[0] || '-'}</p>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>

          {sortedProducts.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              검색 결과가 없습니다
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                이전
              </Button>

              <div className="flex items-center gap-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(page => {
                    // Show first, last, current, and adjacent pages
                    return page === 1 ||
                           page === totalPages ||
                           Math.abs(page - currentPage) <= 1;
                  })
                  .map((page, index, array) => {
                    // Add ellipsis
                    const prevPage = array[index - 1];
                    const showEllipsis = prevPage && page - prevPage > 1;

                    return (
                      <div key={page} className="flex items-center gap-2">
                        {showEllipsis && <span className="text-muted-foreground">...</span>}
                        <Button
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className="w-8 h-8 p-0"
                        >
                          {page}
                        </Button>
                      </div>
                    );
                  })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                다음
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}