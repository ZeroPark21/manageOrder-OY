// Mock data for dashboard testing
import { addDays, subDays, format } from 'date-fns';

// Generate date range data
const generateDateRange = (days: number) => {
  const dates = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    dates.push(format(subDays(today, i), 'yyyy-MM-dd'));
  }
  return dates;
};

// Generate random value with variation
const generateValue = (base: number, variance: number = 0.2) => {
  const variation = base * variance;
  return Math.floor(base + (Math.random() - 0.5) * 2 * variation);
};

// Mock Amazon Orders
export const mockAmazonOrders = generateDateRange(30).map((date, index) => ({
  date,
  orders: generateValue(40 + index * 2, 0.3),
  revenue: generateValue(5000 + index * 100, 0.25),
  avgOrderValue: generateValue(125, 0.15),
}));

// Mock TikTok Orders (from existing data pattern)
export const mockTikTokOrders = generateDateRange(30).map((date, index) => ({
  date,
  orders: generateValue(60 + index * 1.5, 0.35),
  revenue: generateValue(7500 + index * 150, 0.3),
  avgOrderValue: generateValue(125, 0.2),
}));

// Summary metrics
export const mockSummaryMetrics = {
  totalRevenue: {
    value: 125000,
    change: 12.5,
    period: 'vs last period'
  },
  totalOrders: {
    value: 1250,
    change: 8.3,
    period: 'vs last period'
  },
  avgOrderValue: {
    value: 100,
    change: -2.1,
    period: 'vs last period'
  },
  conversionRate: {
    value: 3.2,
    change: 5.7,
    period: 'vs last period'
  }
};

// Platform revenue breakdown for donut chart
export const mockPlatformRevenue = [
  { name: 'TikTok Shop', value: 75000, percentage: 60, color: '#FF6B6B' },
  { name: 'Amazon', value: 50000, percentage: 40, color: '#FF9500' }
];

// Sales trend data for line chart
export const mockSalesTrend = generateDateRange(7).map((date) => ({
  date: format(new Date(date), 'MMM d'),
  tiktok: generateValue(10000 + Math.random() * 5000, 0.2),
  amazon: generateValue(7000 + Math.random() * 3000, 0.2),
}));

// Top performing products
export const mockTopProducts = [
  {
    id: 1,
    name: 'Wireless Earbuds Pro',
    platform: 'TikTok',
    revenue: 15000,
    orders: 150,
    growth: 25,
    badge: 'tiktok'
  },
  {
    id: 2,
    name: 'Smart Watch Series X',
    platform: 'Amazon',
    revenue: 12000,
    orders: 120,
    growth: 18,
    badge: 'amazon'
  },
  {
    id: 3,
    name: 'Portable Charger 20000mAh',
    platform: 'TikTok',
    revenue: 10500,
    orders: 210,
    growth: -5,
    badge: 'tiktok'
  },
  {
    id: 4,
    name: 'Bluetooth Speaker Mini',
    platform: 'Amazon',
    revenue: 9800,
    orders: 98,
    growth: 12,
    badge: 'amazon'
  },
  {
    id: 5,
    name: 'Phone Case Premium',
    platform: 'TikTok',
    revenue: 8500,
    orders: 340,
    growth: 8,
    badge: 'tiktok'
  }
];

// Platform performance metrics
export const mockPlatformPerformance = {
  tiktok: {
    name: 'TikTok Shop',
    revenue: 75000,
    orders: 750,
    conversionRate: 3.8,
    avgOrderValue: 100,
    percentOfTotal: 60
  },
  amazon: {
    name: 'Amazon',
    revenue: 50000,
    orders: 500,
    conversionRate: 2.5,
    avgOrderValue: 100,
    percentOfTotal: 40
  }
};

// Date presets for filter
export const datePresets = [
  { label: '7 Days', value: 7 },
  { label: '30 Days', value: 30 },
  { label: '90 Days', value: 90 },
  { label: 'Custom', value: 'custom' }
];

// Platform filter options
export const platformOptions = [
  { label: 'All Platforms', value: 'all' },
  { label: 'TikTok Shop', value: 'tiktok' },
  { label: 'Amazon', value: 'amazon' }
];

// Period filter options
export const periodOptions = [
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' }
];