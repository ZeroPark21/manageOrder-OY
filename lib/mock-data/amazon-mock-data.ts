// Amazon mock data
import { addDays, subDays, format, startOfWeek, startOfMonth } from 'date-fns';

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

// Amazon Overview Metrics
export const amazonOverviewMetrics = {
  totalRevenue: {
    value: 185000,
    change: 15.3,
    previousPeriod: 160000
  },
  totalOrders: {
    value: 2450,
    change: 12.8,
    previousPeriod: 2172
  },
  totalShipped: {
    value: 2380,
    change: 11.5,
    previousPeriod: 2135
  },
  avgOrderValue: {
    value: 75.51,
    change: 2.3,
    previousPeriod: 73.81
  },
  returnRate: {
    value: 3.2,
    change: -0.5,
    previousPeriod: 3.7
  },
  conversionRate: {
    value: 4.8,
    change: 0.6,
    previousPeriod: 4.2
  }
};

// Amazon ASIN Products Data
export const amazonProducts = [
  {
    asin: 'B08N5WRWNW',
    sku: 'ECH-DOT-4TH',
    name: 'Echo Dot (4th Gen)',
    category: 'Smart Home',
    brand: 'Amazon',
    price: 49.99,
    inventory: 450,
    sales30d: 320,
    revenue30d: 15997,
    rating: 4.7,
    reviews: 125430,
    status: 'active'
  },
  {
    asin: 'B07FZ8S74R',
    sku: 'KNDL-OASIS',
    name: 'Kindle Oasis',
    category: 'Electronics',
    brand: 'Amazon',
    price: 249.99,
    inventory: 85,
    sales30d: 45,
    revenue30d: 11250,
    rating: 4.5,
    reviews: 23450,
    status: 'active'
  },
  {
    asin: 'B089DR29T6',
    sku: 'FIRE-TV-4K',
    name: 'Fire TV Stick 4K Max',
    category: 'Electronics',
    brand: 'Amazon',
    price: 54.99,
    inventory: 320,
    sales30d: 280,
    revenue30d: 15397,
    rating: 4.6,
    reviews: 89234,
    status: 'active'
  },
  {
    asin: 'B08MQZXN1X',
    sku: 'RING-DOORBELL',
    name: 'Ring Video Doorbell 4',
    category: 'Security',
    brand: 'Ring',
    price: 199.99,
    inventory: 120,
    sales30d: 95,
    revenue30d: 18999,
    rating: 4.4,
    reviews: 45678,
    status: 'active'
  },
  {
    asin: 'B07PVCVBN7',
    sku: 'ALEXA-SHOW8',
    name: 'Echo Show 8',
    category: 'Smart Home',
    brand: 'Amazon',
    price: 129.99,
    inventory: 200,
    sales30d: 150,
    revenue30d: 19499,
    rating: 4.6,
    reviews: 67890,
    status: 'active'
  }
];

// Daily sales data (30 days)
export const amazonDailySales = generateDateRange(30).map((date) => ({
  date,
  orders: generateValue(80, 0.3),
  revenue: generateValue(6000, 0.25),
  units: generateValue(95, 0.3),
  returns: generateValue(3, 0.5),
  conversion: generateValue(4.8, 0.2)
}));

// Weekly aggregated data
export const amazonWeeklySales = (() => {
  const weeks = [];
  const today = new Date();

  for (let i = 3; i >= 0; i--) {
    const weekStart = startOfWeek(subDays(today, i * 7));
    const weekEnd = addDays(weekStart, 6);

    weeks.push({
      week: `Week ${4 - i}`,
      dateRange: `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d')}`,
      orders: generateValue(560, 0.2),
      revenue: generateValue(42000, 0.2),
      units: generateValue(665, 0.2),
      returns: generateValue(21, 0.3),
      conversion: generateValue(4.8, 0.15)
    });
  }

  return weeks;
})();

// Monthly aggregated data
export const amazonMonthlySales = (() => {
  const months = [];
  const today = new Date();

  for (let i = 2; i >= 0; i--) {
    const monthStart = startOfMonth(subDays(today, i * 30));

    months.push({
      month: format(monthStart, 'MMMM'),
      orders: generateValue(2400, 0.15),
      revenue: generateValue(180000, 0.15),
      units: generateValue(2850, 0.15),
      returns: generateValue(90, 0.2),
      conversion: generateValue(4.8, 0.1)
    });
  }

  return months;
})();

// Cost Analysis Data
export const amazonCostAnalysis = {
  costPerOrder: {
    current: 12.50,
    previous: 13.20,
    change: -5.3
  },
  advertisingCost: {
    current: 8500,
    previous: 7800,
    change: 9.0,
    acos: 15.2  // Advertising Cost of Sales
  },
  fulfillmentCost: {
    current: 15600,
    previous: 14200,
    change: 9.9,
    perUnit: 6.55
  },
  storageFee: {
    current: 2800,
    previous: 2600,
    change: 7.7,
    perUnit: 1.18
  },
  totalCosts: {
    current: 26900,
    previous: 24600,
    change: 9.3
  }
};

// Cost trend data (daily)
export const amazonCostTrend = generateDateRange(30).map((date) => ({
  date: format(new Date(date), 'MMM d'),
  advertising: generateValue(280, 0.3),
  fulfillment: generateValue(520, 0.25),
  storage: generateValue(93, 0.2),
  total: generateValue(893, 0.25)
}));

// Conversion Rate Data
export const amazonConversionMetrics = {
  overallConversion: {
    rate: 4.8,
    sessions: 51042,
    orders: 2450,
    change: 0.6
  },
  byCategory: [
    { category: 'Smart Home', rate: 5.2, sessions: 15000, orders: 780 },
    { category: 'Electronics', rate: 4.5, sessions: 20000, orders: 900 },
    { category: 'Security', rate: 4.8, sessions: 10000, orders: 480 },
    { category: 'Accessories', rate: 4.3, sessions: 6042, orders: 260 }
  ],
  byDevice: [
    { device: 'Desktop', rate: 5.5, percentage: 35 },
    { device: 'Mobile', rate: 4.2, percentage: 55 },
    { device: 'Tablet', rate: 4.8, percentage: 10 }
  ],
  funnel: {
    views: 51042,
    addToCart: 8500,
    checkout: 3200,
    purchase: 2450
  }
};

// Refund/Return metrics
export const amazonReturnMetrics = {
  returnRate: {
    current: 3.2,
    previous: 3.7,
    change: -13.5
  },
  refundAmount: {
    current: 5920,
    previous: 6650,
    change: -11.0
  },
  topReturnReasons: [
    { reason: 'Defective Product', count: 35, percentage: 45 },
    { reason: 'Not as Described', count: 20, percentage: 26 },
    { reason: 'Changed Mind', count: 15, percentage: 19 },
    { reason: 'Damaged in Transit', count: 8, percentage: 10 }
  ],
  returnsByProduct: [
    { asin: 'B08N5WRWNW', product: 'Echo Dot', returns: 10, rate: 3.1 },
    { asin: 'B08MQZXN1X', product: 'Ring Doorbell', returns: 5, rate: 5.3 },
    { asin: 'B089DR29T6', product: 'Fire TV Stick', returns: 8, rate: 2.9 },
  ]
};

// API Status
export const amazonAPIStatus = {
  status: 'Connected',
  lastSync: new Date().toISOString(),
  nextSync: new Date(Date.now() + 3600000).toISOString(), // 1 hour later
  endpoints: [
    { name: 'Orders API', status: 'active', lastCall: '2 min ago' },
    { name: 'Products API', status: 'active', lastCall: '5 min ago' },
    { name: 'Reports API', status: 'active', lastCall: '10 min ago' },
    { name: 'Fulfillment API', status: 'active', lastCall: '15 min ago' }
  ],
  limits: {
    daily: { used: 1250, limit: 10000, percentage: 12.5 },
    hourly: { used: 45, limit: 500, percentage: 9.0 }
  }
};