// Configuration constants for Trainspotter

export const SPACEX_API_BASE = "https://api.spacexdata.com"
export const SPACEX_STATUS_URL = "https://status.spacexdata.com"
export const SPACEX_BACKUP_URL = "https://backups.spacexdata.com"

// Prediction parameters
export const PREDICTION_DAYS = 7
export const PREDICTION_STEP_SECONDS = 30
export const MIN_ELEVATION_DEG = 10
export const CIVIL_TWILIGHT_ANGLE = -6
export const MAX_TLE_AGE_HOURS = 48
export const RECENT_LAUNCH_DAYS = 30 // Increased from 10 to 30 days

// Default scoring weights
export const DEFAULT_WEIGHTS: PredictionWeights = {
  w1: 0.45, // days since deploy
  w2: 0.3, // phase brightness
  w3: 0.2, // peak elevation
  w4: 0.05, // twilight bonus
}

// UI constants
export const MAX_PASSES_DISPLAY = 3
export const MAP_DEFAULT_ZOOM = 10

import type { PredictionWeights } from "./types"
