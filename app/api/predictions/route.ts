import { type NextRequest, NextResponse } from "next/server"
import { predictionEngine } from "@/lib/prediction-engine"
import { LocationManager } from "@/lib/location-manager"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { location, weights } = body

    // Validate location
    if (!LocationManager.isValidLocation(location)) {
      return NextResponse.json(
        { error: "Invalid location. Please provide valid latitude and longitude." },
        { status: 400 },
      )
    }

    console.log(`Calculating predictions for location: ${LocationManager.formatLocation(location)}`)

    // Get predictions using the prediction engine
    const passes = await predictionEngine.getPredictions(location, weights)

    // Get prediction quality assessment
    const quality = await predictionEngine.getPredictionQuality(location)

    // Get cache statistics for debugging
    const cacheStats = predictionEngine.getCacheStats()

    return NextResponse.json({
      passes,
      quality,
      location: LocationManager.formatLocation(location),
      cacheStats: process.env.NODE_ENV === "development" ? cacheStats : undefined,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Prediction error:", error)

    // Return appropriate error response
    if (error instanceof Error) {
      if (error.message.includes("API")) {
        return NextResponse.json({ error: "Unable to fetch satellite data. Please try again later." }, { status: 503 })
      }

      if (error.message.includes("timeout")) {
        return NextResponse.json({ error: "Request timed out. Please try again." }, { status: 408 })
      }
    }

    return NextResponse.json({ error: "Failed to calculate predictions. Please try again later." }, { status: 500 })
  }
}

// Health check endpoint
export async function GET() {
  try {
    const cacheStats = predictionEngine.getCacheStats()

    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      cacheStats,
    })
  } catch (error) {
    return NextResponse.json({ status: "unhealthy", error: "Prediction engine not responding" }, { status: 503 })
  }
}
