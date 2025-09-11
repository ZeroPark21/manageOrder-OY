import { NextResponse } from "next/server"
import { globalCache } from "@/lib/database/cache"

export const runtime = "edge"

export async function GET() {
  try {
    // Clear all cache
    globalCache.clear()
    
    return NextResponse.json({
      success: true,
      message: "Cache cleared successfully",
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}