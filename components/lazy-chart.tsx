"use client"

import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'

// Lazy load heavy chart components
export const LazyLineChart = dynamic(
  () => import('recharts').then(mod => mod.LineChart),
  {
    loading: () => <Skeleton className="h-[300px] w-full" />,
    ssr: false
  }
)

export const LazyBarChart = dynamic(
  () => import('recharts').then(mod => mod.BarChart),
  {
    loading: () => <Skeleton className="h-[300px] w-full" />,
    ssr: false
  }
)

export const LazyResponsiveContainer = dynamic(
  () => import('recharts').then(mod => mod.ResponsiveContainer),
  {
    loading: () => <Skeleton className="h-[300px] w-full" />,
    ssr: false
  }
)

// Export other chart components
export { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  Line, 
  Bar 
} from 'recharts'