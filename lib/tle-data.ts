export interface TLEData {
  satelliteId: number
  name: string
  line1: string
  line2: string
  epoch: Date
}

export interface StarlinkSatellite {
  id: number
  name: string
  tle: TLEData
  launchDate?: Date
  active: boolean
}

export async function fetchStarlinkTLEs(): Promise<StarlinkSatellite[]> {
  console.log("[v0] Fetching Starlink TLE data from CelesTrak...")

  try {
    // CelesTrak Starlink TLE endpoint
    const response = await fetch("https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=json", {
      headers: {
        "User-Agent": "Trainspotter/1.0",
      },
    })

    if (!response.ok) {
      throw new Error(`CelesTrak API error: ${response.status}`)
    }

    const tleData = await response.json()
    console.log(`[v0] Fetched ${tleData.length} Starlink satellites from CelesTrak`)

    return tleData.map((sat: any) => ({
      id: sat.NORAD_CAT_ID,
      name: sat.OBJECT_NAME,
      tle: {
        satelliteId: sat.NORAD_CAT_ID,
        name: sat.OBJECT_NAME,
        line1: sat.TLE_LINE1,
        line2: sat.TLE_LINE2,
        epoch: new Date(sat.EPOCH),
      },
      active: true,
      launchDate: sat.LAUNCH_DATE ? new Date(sat.LAUNCH_DATE) : undefined,
    }))
  } catch (error) {
    console.error("[v0] Error fetching TLE data:", error)
    throw error
  }
}

export function groupSatellitesIntoTrains(satellites: StarlinkSatellite[]): StarlinkSatellite[][] {
  console.log("[v0] Grouping satellites into trains...")

  // Sort by launch date and orbital parameters
  const sorted = satellites
    .filter((sat) => sat.active && sat.tle)
    .sort((a, b) => {
      // First by launch date if available
      if (a.launchDate && b.launchDate) {
        const dateDiff = a.launchDate.getTime() - b.launchDate.getTime()
        if (Math.abs(dateDiff) > 7 * 24 * 60 * 60 * 1000) {
          // More than 7 days apart
          return dateDiff
        }
      }

      // Then by orbital parameters (simplified grouping)
      return a.id - b.id
    })

  // Group into trains of ~20-60 satellites (typical Starlink launch size)
  const trains: StarlinkSatellite[][] = []
  const trainSize = 50 // Average train size

  for (let i = 0; i < sorted.length; i += trainSize) {
    const train = sorted.slice(i, i + trainSize)
    if (train.length >= 10) {
      // Only include substantial trains
      trains.push(train)
    }
  }

  console.log(`[v0] Created ${trains.length} satellite trains`)
  return trains
}

let tleCache: {
  data: StarlinkSatellite[]
  timestamp: number
} | null = null

const TLE_CACHE_DURATION = 30 * 60 * 1000 // 30 minutes

export async function getCachedStarlinkTLEs(): Promise<StarlinkSatellite[]> {
  const now = Date.now()

  if (tleCache && now - tleCache.timestamp < TLE_CACHE_DURATION) {
    console.log("[v0] Using cached TLE data")
    return tleCache.data
  }

  console.log("[v0] Fetching fresh TLE data")
  const data = await fetchStarlinkTLEs()

  tleCache = {
    data,
    timestamp: now,
  }

  return data
}
