// Core data types for Trainspotter

export interface LaunchLite {
  id: string
  name: string
  date_utc: string
  cores: { core: string | null; flight?: number }[]
  launchpad: string
}

export interface StarlinkSat {
  id: string
  launch: string
  tle1: string
  tle2: string
  epoch: string
}

export interface Pass {
  satId: string
  launchId: string
  start: Date
  peak: Date
  end: Date
  maxElDeg: number
  phaseAngleDeg: number
  score: number
  azStart: number
  azEnd: number
  launchName?: string
  boosterInfo?: BoosterInfo
}

export interface BoosterInfo {
  coreId: string
  flightNumber: number
  landingType: string
  landingPad?: string
}

export interface UserLocation {
  lat: number
  lon: number
  name?: string
  timezone?: string
}

export interface PredictionWeights {
  w1: number // days since deploy
  w2: number // phase brightness
  w3: number // peak elevation
  w4: number // twilight bonus
}

export interface ApiStatus {
  status: "online" | "offline" | "degraded"
  lastChecked: Date
  message?: string
}

// Satellite.js related types
export interface SatellitePosition {
  position: {
    x: number
    y: number
    z: number
  }
  velocity: {
    x: number
    y: number
    z: number
  }
}

export interface ObserverLookAngles {
  azimuth: number
  elevation: number
  range: number
}
