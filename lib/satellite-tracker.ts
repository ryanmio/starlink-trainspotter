import * as satellite from "satellite.js"
import type { StarlinkSat, Pass, UserLocation, LaunchLite } from "./types"
import {
  DEFAULT_WEIGHTS,
  PREDICTION_DAYS,
  PREDICTION_STEP_SECONDS,
  MIN_ELEVATION_DEG,
  CIVIL_TWILIGHT_ANGLE,
} from "./constants"
import { isValidTle, isTleFresh, getBoosterInfo } from "./spacex-api"

// Calculate satellite passes using real orbital mechanics
export async function calculatePasses(
  satellites: StarlinkSat[],
  location: UserLocation,
  launch: LaunchLite,
): Promise<Pass[]> {
  const passes: Pass[] = []

  // Filter for valid, fresh TLEs
  const validSatellites = satellites.filter((sat) => {
    return isValidTle(sat.tle1, sat.tle2) && isTleFresh(sat.epoch)
  })

  if (validSatellites.length === 0) {
    console.warn(`No valid TLEs found for launch ${launch.id}`)
    return []
  }

  // For performance, use a subset of satellites for initial calculation
  const sampleSatellites = validSatellites.filter((_, index) => index % 3 === 0)

  // Get booster info for scoring
  let boosterInfo = null
  if (launch.cores && launch.cores[0]?.core) {
    try {
      boosterInfo = await getBoosterInfo(launch.cores[0].core)
    } catch (error) {
      console.warn("Failed to get booster info:", error)
    }
  }

  // Calculate passes for each satellite
  for (const sat of sampleSatellites.slice(0, 10)) {
    try {
      const satPasses = await calculateSatellitePasses(sat, location, launch, boosterInfo)
      passes.push(...satPasses)
    } catch (error) {
      console.error(`Failed to calculate passes for satellite ${sat.id}:`, error)
    }
  }

  // Score and sort passes
  const scoredPasses = passes.map((pass) => ({
    ...pass,
    score: calculateTrainScore(pass, launch),
  }))

  return scoredPasses.sort((a, b) => b.score - a.score)
}

// Calculate passes for a single satellite
async function calculateSatellitePasses(
  sat: StarlinkSat,
  location: UserLocation,
  launch: LaunchLite,
  boosterInfo: any,
): Promise<Pass[]> {
  const passes: Pass[] = []

  // Initialize satellite record from TLE
  const satrec = satellite.twoline2satrec(sat.tle1, sat.tle2)

  if (!satrec) {
    throw new Error(`Failed to parse TLE for satellite ${sat.id}`)
  }

  // Observer position in radians
  const observerGd = {
    longitude: satellite.degreesToRadians(location.lon),
    latitude: satellite.degreesToRadians(location.lat),
    height: 0.1, // Assume sea level + 100m
  }

  const now = new Date()
  const endTime = new Date(now.getTime() + PREDICTION_DAYS * 24 * 60 * 60 * 1000)

  let currentTime = new Date(now)
  let inPass = false
  let passStart: Date | null = null
  let passPoints: Array<{ time: Date; elevation: number; azimuth: number; range: number }> = []

  // Step through time to find passes
  while (currentTime <= endTime) {
    const positionAndVelocity = satellite.propagate(satrec, currentTime)

    if (positionAndVelocity.position && typeof positionAndVelocity.position !== "boolean") {
      // Convert to observer look angles
      const gmst = satellite.gstime(currentTime)
      const positionEci = positionAndVelocity.position
      const lookAngles = satellite.ecfToLookAngles(observerGd, positionEci, gmst)

      const elevation = satellite.radiansToDegrees(lookAngles.elevation)
      const azimuth = satellite.radiansToDegrees(lookAngles.azimuth)
      const range = lookAngles.rangeSat

      // Check if satellite is visible
      const isVisible = await isSatelliteVisible(positionEci, observerGd, currentTime, elevation)

      if (isVisible && elevation > MIN_ELEVATION_DEG) {
        if (!inPass) {
          // Start of a new pass
          inPass = true
          passStart = new Date(currentTime)
          passPoints = []
        }

        passPoints.push({
          time: new Date(currentTime),
          elevation,
          azimuth,
          range,
        })
      } else if (inPass) {
        // End of pass
        if (passStart && passPoints.length > 0) {
          const pass = createPassFromPoints(sat, launch, passStart, passPoints, boosterInfo)
          if (pass) {
            passes.push(pass)
          }
        }
        inPass = false
        passStart = null
        passPoints = []
      }
    }

    // Advance time by step interval
    currentTime = new Date(currentTime.getTime() + PREDICTION_STEP_SECONDS * 1000)
  }

  // Handle pass that might still be in progress at end time
  if (inPass && passStart && passPoints.length > 0) {
    const pass = createPassFromPoints(sat, launch, passStart, passPoints, boosterInfo)
    if (pass) {
      passes.push(pass)
    }
  }

  return passes
}

// Create a Pass object from collected points
function createPassFromPoints(
  sat: StarlinkSat,
  launch: LaunchLite,
  passStart: Date,
  points: Array<{ time: Date; elevation: number; azimuth: number; range: number }>,
  boosterInfo: any,
): Pass | null {
  if (points.length < 2) return null

  // Find peak elevation point
  const peakPoint = points.reduce((max, point) => (point.elevation > max.elevation ? point : max))

  const lastPoint = points[points.length - 1]
  const firstPoint = points[0]

  // Calculate phase angle (simplified - would need sun position for accuracy)
  const phaseAngle = Math.random() * 60 + 30 // Mock for now, would calculate sun-satellite-observer angle

  return {
    satId: sat.id,
    launchId: sat.launch,
    start: passStart,
    peak: peakPoint.time,
    end: lastPoint.time,
    maxElDeg: peakPoint.elevation,
    phaseAngleDeg: phaseAngle,
    score: 0, // Will be calculated later
    azStart: firstPoint.azimuth,
    azEnd: lastPoint.azimuth,
    launchName: launch.name,
    boosterInfo: boosterInfo || undefined,
  }
}

// Check if satellite is visible (sunlit and observer in twilight/darkness)
async function isSatelliteVisible(
  satelliteEci: satellite.EciVec3<number>,
  observerGd: satellite.GeodeticLocation,
  time: Date,
  elevation: number,
): Promise<boolean> {
  // Basic visibility check - satellite above minimum elevation
  if (elevation <= MIN_ELEVATION_DEG) {
    return false
  }

  // Check if satellite is in sunlight
  const isSunlit = isSatelliteInSunlight(satelliteEci, time)
  if (!isSunlit) {
    return false
  }

  // Check if observer is in twilight or darkness
  const sunElevation = calculateSunElevation(observerGd, time)
  const isObserverInDarkness = sunElevation <= CIVIL_TWILIGHT_ANGLE

  return isObserverInDarkness
}

// Check if satellite is illuminated by the sun
function isSatelliteInSunlight(satelliteEci: satellite.EciVec3<number>, time: Date): boolean {
  // Get sun position in ECI coordinates
  const sunEci = calculateSunPositionEci(time)

  // Vector from Earth center to satellite
  const satVector = [satelliteEci.x, satelliteEci.y, satelliteEci.z]

  // Vector from Earth center to sun (normalized)
  const sunVector = [sunEci.x, sunEci.y, sunEci.z]
  const sunMagnitude = Math.sqrt(sunVector[0] ** 2 + sunVector[1] ** 2 + sunVector[2] ** 2)
  const sunUnit = sunVector.map((component) => component / sunMagnitude)

  // Check if satellite is in Earth's shadow
  // Simplified shadow calculation - satellite is in shadow if angle between
  // satellite vector and sun vector is > 90 degrees
  const dotProduct = satVector[0] * sunUnit[0] + satVector[1] * sunUnit[1] + satVector[2] * sunUnit[2]
  const satMagnitude = Math.sqrt(satVector[0] ** 2 + satVector[1] ** 2 + satVector[2] ** 2)
  const cosAngle = dotProduct / satMagnitude

  // If cosAngle > 0, satellite is on the sunlit side of Earth
  return cosAngle > 0
}

// Calculate sun position in ECI coordinates (simplified)
function calculateSunPositionEci(time: Date): satellite.EciVec3<number> {
  // Simplified sun position calculation
  // In a real implementation, you'd use more accurate solar position algorithms
  const dayOfYear = getDayOfYear(time)
  const hour = time.getUTCHours() + time.getUTCMinutes() / 60

  // Approximate solar longitude
  const solarLongitude = (dayOfYear - 81) * (360 / 365.25) * (Math.PI / 180)

  // Approximate sun position (very simplified)
  const distance = 149597870.7 // AU in km
  const x = distance * Math.cos(solarLongitude)
  const y = distance * Math.sin(solarLongitude)
  const z = 0 // Simplified - ignoring ecliptic inclination

  return { x, y, z }
}

// Calculate sun elevation for observer
function calculateSunElevation(observerGd: satellite.GeodeticLocation, time: Date): number {
  // Simplified sun elevation calculation
  // This is a basic approximation - real implementation would use more accurate solar position
  const hour = time.getUTCHours() + time.getUTCMinutes() / 60
  const dayOfYear = getDayOfYear(time)

  // Solar declination (simplified)
  const declination = 23.45 * Math.sin((((360 * (284 + dayOfYear)) / 365) * Math.PI) / 180)

  // Hour angle
  const hourAngle = 15 * (hour - 12) // degrees from solar noon

  // Solar elevation (simplified)
  const lat = satellite.radiansToDegrees(observerGd.latitude)
  const elevation =
    (Math.asin(
      Math.sin((declination * Math.PI) / 180) * Math.sin((lat * Math.PI) / 180) +
        Math.cos((declination * Math.PI) / 180) *
          Math.cos((lat * Math.PI) / 180) *
          Math.cos((hourAngle * Math.PI) / 180),
    ) *
      180) /
    Math.PI

  return elevation
}

// Get day of year
function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0)
  const diff = date.getTime() - start.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

// Calculate train score based on the specification
function calculateTrainScore(pass: Pass, launch: LaunchLite): number {
  const launchDate = new Date(launch.date_utc)
  const passDate = pass.peak

  // Days since deployment
  const daysSinceDeploy = (passDate.getTime() - launchDate.getTime()) / (1000 * 60 * 60 * 24)

  // Component scores
  const deployScore = 1 / (1 + daysSinceDeploy)
  const phaseBrightness = 1 - pass.phaseAngleDeg / 180 // Inverse of phase angle
  const elevationScore = pass.maxElDeg / 90
  const twilightBonus = calculateTwilightBonus(passDate)

  // Apply weights
  const { w1, w2, w3, w4 } = DEFAULT_WEIGHTS
  return w1 * deployScore + w2 * phaseBrightness + w3 * elevationScore + w4 * twilightBonus
}

// Calculate twilight bonus based on time of day
export function calculateTwilightBonus(time: Date): number {
  const hour = time.getHours()

  // Peak bonus during civil twilight hours (roughly 6-7 AM and 7-8 PM)
  if ((hour >= 6 && hour <= 7) || (hour >= 19 && hour <= 20)) {
    return 1.0
  }

  // Good bonus during extended twilight (5-8 AM and 6-9 PM)
  if ((hour >= 5 && hour <= 8) || (hour >= 18 && hour <= 21)) {
    return 0.7
  }

  // Some bonus during early morning/evening (4-9 AM and 5-10 PM)
  if ((hour >= 4 && hour <= 9) || (hour >= 17 && hour <= 22)) {
    return 0.4
  }

  // Minimal bonus during full night/day
  return 0.1
}

// Initialize satellite.js (no special initialization needed)
export function initializeSatelliteJs() {
  console.log("Satellite.js initialized for real orbital calculations")
}
