import { NextResponse } from "next/server"
import { SPACEX_API_BASE } from "@/lib/constants"

export async function GET() {
  try {
    // Check SpaceX API health by trying a simple endpoint
    const response = await fetch(`${SPACEX_API_BASE}/v4/company`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    })

    if (response.ok) {
      return NextResponse.json({
        status: "online",
        lastChecked: new Date().toISOString(),
        message: "SpaceX API is operational",
      })
    } else {
      return NextResponse.json({
        status: "degraded",
        lastChecked: new Date().toISOString(),
        message: "SpaceX API responding with errors",
      })
    }
  } catch (error) {
    return NextResponse.json({
      status: "offline",
      lastChecked: new Date().toISOString(),
      message: "SpaceX API is unreachable",
    })
  }
}
