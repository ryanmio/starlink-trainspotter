import { SPACEX_API_BASE, SPACEX_BACKUP_URL } from "./constants"
import type { LaunchLite, StarlinkSat, BoosterInfo } from "./types"

// Get recent Starlink launches from the last 30 days
export async function getRecentStarlinkLaunches(): Promise<LaunchLite[]> {
  const now = new Date()
  const searchDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) // 30 days in milliseconds

  console.log("[v0] Current date:", now.toISOString())
  console.log("[v0] Searching for Starlink launches since:", searchDaysAgo.toISOString())
  console.log("[v0] Search window: 30 days")

  const query = {
    query: {
      name: { $regex: "Starlink", $options: "i" },
      date_utc: { $gte: searchDaysAgo.toISOString() },
      success: true, // Only successful launches
    },
    options: {
      select: ["id", "name", "date_utc", "cores", "launchpad", "success"],
      sort: { date_utc: -1 },
      limit: 15, // Increased limit
    },
  }

  try {
    console.log("[v0] Making SpaceX API request...")
    console.log("[v0] Query:", JSON.stringify(query, null, 2))

    const response = await fetch(`${SPACEX_API_BASE}/v5/launches/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(query),
    })

    console.log("[v0] SpaceX API response status:", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.log("[v0] SpaceX API error response:", errorText)
      throw new Error(`SpaceX API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    console.log("[v0] Found launches:", data.docs?.length || 0)
    console.log("[v0] Full API response:", JSON.stringify(data, null, 2))

    if (data.docs && data.docs.length > 0) {
      console.log(
        "[v0] Recent launches:",
        data.docs.map((l: any) => `${l.name} - ${l.date_utc}`),
      )
    } else {
      console.log("[v0] No launches found in response")
      return await tryBroaderSearch()
    }

    return data.docs || []
  } catch (error) {
    console.error("[v0] Failed to fetch recent launches:", error)
    // Try backup data source
    return await getRecentLaunchesFromBackup()
  }
}

async function tryBroaderSearch(): Promise<LaunchLite[]> {
  console.log("[v0] Trying broader search - last 60 days, any Starlink mission...")

  const now = new Date()
  const searchDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000) // 60 days

  const query = {
    query: {
      name: { $regex: "Starlink", $options: "i" },
      date_utc: { $gte: searchDaysAgo.toISOString() },
      // Remove success filter to include all launches
    },
    options: {
      select: ["id", "name", "date_utc", "cores", "launchpad", "success"],
      sort: { date_utc: -1 },
      limit: 20,
    },
  }

  try {
    const response = await fetch(`${SPACEX_API_BASE}/v5/launches/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(query),
    })

    if (response.ok) {
      const data = await response.json()
      console.log("[v0] Broader search found launches:", data.docs?.length || 0)
      return data.docs || []
    }
  } catch (error) {
    console.error("[v0] Broader search failed:", error)
  }

  return []
}

// Get Starlink satellites for a specific launch
export async function getStarlinkSatellites(launchId: string): Promise<StarlinkSat[]> {
  const query = {
    query: { launch: launchId },
    options: {
      select: ["id", "launch", "spaceTrack.TLE_LINE1", "spaceTrack.TLE_LINE2", "spaceTrack.EPOCH"],
    },
  }

  try {
    const response = await fetch(`${SPACEX_API_BASE}/v4/starlink/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(query),
    })

    if (!response.ok) {
      throw new Error(`SpaceX API error: ${response.status}`)
    }

    const data = await response.json()

    // Transform the response to match our StarlinkSat interface
    return (data.docs || []).map((sat: any) => ({
      id: sat.id,
      launch: sat.launch,
      tle1: sat.spaceTrack?.TLE_LINE1 || "",
      tle2: sat.spaceTrack?.TLE_LINE2 || "",
      epoch: sat.spaceTrack?.EPOCH || "",
    }))
  } catch (error) {
    console.error(`Failed to fetch satellites for launch ${launchId}:`, error)
    return []
  }
}

// Get booster information for a core ID
export async function getBoosterInfo(coreId: string): Promise<BoosterInfo | null> {
  try {
    const response = await fetch(`${SPACEX_API_BASE}/v4/cores/${coreId}`)

    if (!response.ok) {
      return null
    }

    const core = await response.json()

    return {
      coreId: core.id,
      flightNumber: core.reuse_count + 1, // Current flight number
      landingType: core.last_update || "Unknown",
      landingPad: core.landing_pad || undefined,
    }
  } catch (error) {
    console.error(`Failed to fetch booster info for ${coreId}:`, error)
    return null
  }
}

// Get launchpad information
export async function getLaunchpadInfo(launchpadId: string) {
  try {
    const response = await fetch(`${SPACEX_API_BASE}/v4/launchpads/${launchpadId}`)

    if (!response.ok) {
      return null
    }

    return await response.json()
  } catch (error) {
    console.error(`Failed to fetch launchpad info for ${launchpadId}:`, error)
    return null
  }
}

// Fallback to backup data when main API is down
async function getRecentLaunchesFromBackup(): Promise<LaunchLite[]> {
  try {
    console.log("[v0] Trying backup data source...")
    const response = await fetch(`${SPACEX_BACKUP_URL}/launches.json`)
    if (!response.ok) {
      console.log("[v0] Backup source failed:", response.status)
      return []
    }

    const allLaunches = await response.json()
    const now = new Date()
    const searchDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    console.log("[v0] Backup: searching since", searchDaysAgo.toISOString())

    // Filter for recent Starlink launches
    const recentLaunches = allLaunches
      .filter((launch: any) => {
        const launchDate = new Date(launch.date_utc)
        const isRecent = launchDate >= searchDaysAgo
        const isStarlink = launch.name.toLowerCase().includes("starlink")
        const hasCore = launch.cores && launch.cores.length > 0

        console.log(
          `[v0] Backup filter: ${launch.name} - ${launch.date_utc} - Recent: ${isRecent}, Starlink: ${isStarlink}, HasCore: ${hasCore}`,
        )

        return isStarlink && isRecent && hasCore
      })
      .sort((a: any, b: any) => new Date(b.date_utc).getTime() - new Date(a.date_utc).getTime())
      .slice(0, 15)
      .map((launch: any) => ({
        id: launch.id,
        name: launch.name,
        date_utc: launch.date_utc,
        cores: launch.cores,
        launchpad: launch.launchpad,
      }))

    console.log("[v0] Backup found launches:", recentLaunches.length)
    if (recentLaunches.length > 0) {
      console.log(
        "[v0] Backup launches:",
        recentLaunches.map((l) => `${l.name} - ${l.date_utc}`),
      )
    }
    return recentLaunches
  } catch (error) {
    console.error("[v0] Failed to fetch backup launch data:", error)
    return []
  }
}

// Check if TLE data is fresh (within 48 hours)
export function isTleFresh(epoch: string): boolean {
  if (!epoch) return false

  try {
    const epochDate = new Date(epoch)
    const now = new Date()
    const hoursDiff = (now.getTime() - epochDate.getTime()) / (1000 * 60 * 60)
    return hoursDiff <= 48
  } catch (error) {
    return false
  }
}

// Validate TLE format
export function isValidTle(tle1: string, tle2: string): boolean {
  if (!tle1 || !tle2) return false

  // Basic TLE validation - should be 69 characters each
  return tle1.length === 69 && tle2.length === 69 && tle1.startsWith("1 ") && tle2.startsWith("2 ")
}
