import type { UserLocation, Pass, LaunchLite, StarlinkSat, PredictionWeights } from "./types"
import { getRecentStarlinkLaunches, getStarlinkSatellites, isTleFresh, isValidTle } from "./spacex-api"
import { calculatePasses, initializeSatelliteJs } from "./satellite-tracker"

// Cache for prediction results
interface PredictionCache {
  location: UserLocation
  passes: Pass[]
  timestamp: Date
  expiresAt: Date
}

// Cache for launch and satellite data
interface LaunchCache {
  launches: LaunchLite[]
  satellites: Map<string, StarlinkSat[]>
  timestamp: Date
  expiresAt: Date
}

class PredictionEngine {
  private predictionCache = new Map<string, PredictionCache>()
  private launchCache: LaunchCache | null = null
  private readonly CACHE_DURATION_MS = 15 * 60 * 1000 // 15 minutes
  private readonly LAUNCH_CACHE_DURATION_MS = 60 * 60 * 1000 // 1 hour
  private initialized = false

  constructor() {
    this.initialize()
  }

  private async initialize() {
    if (!this.initialized) {
      initializeSatelliteJs()
      this.initialized = true
    }
  }

  // Main prediction method with caching and optimization
  async getPredictions(location: UserLocation, weights?: PredictionWeights): Promise<Pass[]> {
    await this.initialize()

    // Generate cache key based on location (rounded to ~1km precision)
    const cacheKey = this.generateLocationCacheKey(location)

    // Check cache first
    const cached = this.predictionCache.get(cacheKey)
    if (cached && cached.expiresAt > new Date()) {
      console.log("Returning cached predictions")
      return cached.passes
    }

    try {
      // Get fresh predictions
      const passes = await this.calculateFreshPredictions(location, weights)

      // Cache the results
      this.predictionCache.set(cacheKey, {
        location,
        passes,
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + this.CACHE_DURATION_MS),
      })

      // Clean up old cache entries
      this.cleanupCache()

      return passes
    } catch (error) {
      console.error("Failed to calculate predictions:", error)

      // Return cached data if available, even if expired
      if (cached) {
        console.log("Returning expired cached predictions due to error")
        return cached.passes
      }

      throw error
    }
  }

  // Calculate fresh predictions
  private async calculateFreshPredictions(location: UserLocation, weights?: PredictionWeights): Promise<Pass[]> {
    // Get launch and satellite data
    const { launches, satelliteMap } = await this.getLaunchAndSatelliteData()

    if (launches.length === 0) {
      console.warn("No recent Starlink launches found")
      return []
    }

    const allPasses: Pass[] = []
    const processingPromises: Promise<void>[] = []

    // Process launches in parallel with concurrency limit
    const concurrencyLimit = 3
    for (let i = 0; i < launches.length; i += concurrencyLimit) {
      const batch = launches.slice(i, i + concurrencyLimit)

      const batchPromises = batch.map(async (launch) => {
        try {
          const satellites = satelliteMap.get(launch.id) || []
          if (satellites.length === 0) {
            console.warn(`No satellites found for launch ${launch.id}`)
            return
          }

          // Filter for fresh, valid TLEs
          const validSatellites = this.filterValidSatellites(satellites)
          if (validSatellites.length === 0) {
            console.warn(`No valid TLEs for launch ${launch.id}`)
            return
          }

          // Calculate passes for this launch
          const passes = await calculatePasses(validSatellites, location, launch)
          allPasses.push(...passes)
        } catch (error) {
          console.error(`Failed to process launch ${launch.id}:`, error)
        }
      })

      processingPromises.push(...batchPromises)

      // Wait for batch to complete before starting next batch
      await Promise.all(batchPromises)
    }

    // Wait for all processing to complete
    await Promise.all(processingPromises)

    // Sort by score and return top results
    return allPasses.sort((a, b) => b.score - a.score).slice(0, 20) // Return top 20 passes
  }

  // Get launch and satellite data with caching
  private async getLaunchAndSatelliteData(): Promise<{
    launches: LaunchLite[]
    satelliteMap: Map<string, StarlinkSat[]>
  }> {
    // Check launch cache
    if (this.launchCache && this.launchCache.expiresAt > new Date()) {
      console.log("Using cached launch data")
      return {
        launches: this.launchCache.launches,
        satelliteMap: this.launchCache.satellites,
      }
    }

    console.log("Fetching fresh launch and satellite data")

    // Get recent launches
    const launches = await getRecentStarlinkLaunches()
    const satelliteMap = new Map<string, StarlinkSat[]>()

    // Fetch satellites for each launch in parallel
    const satellitePromises = launches.map(async (launch) => {
      try {
        const satellites = await getStarlinkSatellites(launch.id)
        satelliteMap.set(launch.id, satellites)
      } catch (error) {
        console.error(`Failed to fetch satellites for launch ${launch.id}:`, error)
        satelliteMap.set(launch.id, [])
      }
    })

    await Promise.all(satellitePromises)

    // Cache the results
    this.launchCache = {
      launches,
      satellites: satelliteMap,
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + this.LAUNCH_CACHE_DURATION_MS),
    }

    return { launches, satelliteMap }
  }

  // Filter satellites for valid, fresh TLEs
  private filterValidSatellites(satellites: StarlinkSat[]): StarlinkSat[] {
    return satellites.filter((sat) => {
      if (!isValidTle(sat.tle1, sat.tle2)) {
        return false
      }

      if (!isTleFresh(sat.epoch)) {
        console.warn(`Stale TLE for satellite ${sat.id}, epoch: ${sat.epoch}`)
        return false
      }

      return true
    })
  }

  // Generate cache key for location (rounded to ~1km precision)
  private generateLocationCacheKey(location: UserLocation): string {
    const lat = Math.round(location.lat * 100) / 100 // ~1km precision
    const lon = Math.round(location.lon * 100) / 100
    return `${lat},${lon}`
  }

  // Clean up expired cache entries
  private cleanupCache() {
    const now = new Date()

    // Clean prediction cache
    for (const [key, cache] of this.predictionCache.entries()) {
      if (cache.expiresAt <= now) {
        this.predictionCache.delete(key)
      }
    }

    // Clean launch cache
    if (this.launchCache && this.launchCache.expiresAt <= now) {
      this.launchCache = null
    }
  }

  // Get cache statistics for debugging
  getCacheStats() {
    return {
      predictionCacheSize: this.predictionCache.size,
      launchCacheValid: this.launchCache !== null && this.launchCache.expiresAt > new Date(),
      launchCacheExpiry: this.launchCache?.expiresAt,
    }
  }

  // Clear all caches (useful for testing)
  clearCache() {
    this.predictionCache.clear()
    this.launchCache = null
  }

  // Validate location input
  static validateLocation(location: any): location is UserLocation {
    return (
      location &&
      typeof location.lat === "number" &&
      typeof location.lon === "number" &&
      location.lat >= -90 &&
      location.lat <= 90 &&
      location.lon >= -180 &&
      location.lon <= 180
    )
  }

  // Get prediction quality assessment
  async getPredictionQuality(location: UserLocation): Promise<{
    quality: "excellent" | "good" | "fair" | "poor"
    factors: string[]
    recommendations: string[]
  }> {
    const factors: string[] = []
    const recommendations: string[] = []
    let qualityScore = 100

    try {
      const { launches, satelliteMap } = await this.getLaunchAndSatelliteData()

      // Check launch data freshness
      if (launches.length === 0) {
        factors.push("No recent Starlink launches found")
        qualityScore -= 50
        recommendations.push("Check back after the next Starlink launch")
      } else {
        const newestLaunch = new Date(launches[0].date_utc)
        const daysSinceNewest = (Date.now() - newestLaunch.getTime()) / (1000 * 60 * 60 * 24)

        if (daysSinceNewest > 7) {
          factors.push("Most recent launch is over a week old")
          qualityScore -= 20
        } else if (daysSinceNewest < 2) {
          factors.push("Very recent launch available")
          qualityScore += 10
        }
      }

      // Check TLE data quality
      let totalSatellites = 0
      let validSatellites = 0
      let staleTles = 0

      for (const [launchId, satellites] of satelliteMap) {
        totalSatellites += satellites.length
        for (const sat of satellites) {
          if (isValidTle(sat.tle1, sat.tle2)) {
            validSatellites++
            if (!isTleFresh(sat.epoch)) {
              staleTles++
            }
          }
        }
      }

      if (totalSatellites > 0) {
        const validRatio = validSatellites / totalSatellites
        const staleRatio = staleTles / validSatellites

        if (validRatio < 0.5) {
          factors.push("Many satellites have invalid orbital data")
          qualityScore -= 30
          recommendations.push("Predictions may be less accurate due to data quality issues")
        }

        if (staleRatio > 0.3) {
          factors.push("Some orbital data is outdated")
          qualityScore -= 15
          recommendations.push("Predictions accuracy may decrease over time")
        }
      }

      // Location-based factors
      const absLat = Math.abs(location.lat)
      if (absLat > 60) {
        factors.push("High latitude location")
        qualityScore += 5
        recommendations.push("Excellent visibility at high latitudes")
      } else if (absLat < 30) {
        factors.push("Low latitude location")
        qualityScore -= 5
        recommendations.push("Fewer passes visible at low latitudes")
      }

      // Determine quality level
      let quality: "excellent" | "good" | "fair" | "poor"
      if (qualityScore >= 90) quality = "excellent"
      else if (qualityScore >= 70) quality = "good"
      else if (qualityScore >= 50) quality = "fair"
      else quality = "poor"

      return { quality, factors, recommendations }
    } catch (error) {
      return {
        quality: "poor",
        factors: ["Unable to assess prediction quality"],
        recommendations: ["Check your internet connection and try again"],
      }
    }
  }
}

// Export singleton instance
export const predictionEngine = new PredictionEngine()

// Export utility functions
export { PredictionEngine }
