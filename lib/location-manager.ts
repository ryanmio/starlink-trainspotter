import type { UserLocation } from "./types"

export class LocationManager {
  private static readonly GEOLOCATION_TIMEOUT = 10000 // 10 seconds
  private static readonly GEOLOCATION_MAX_AGE = 300000 // 5 minutes

  // Get user's current location using browser geolocation
  static async getCurrentLocation(): Promise<UserLocation> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by this browser"))
        return
      }

      const options: PositionOptions = {
        enableHighAccuracy: true,
        timeout: this.GEOLOCATION_TIMEOUT,
        maximumAge: this.GEOLOCATION_MAX_AGE,
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude, accuracy } = position.coords

          try {
            // Get timezone from browser
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

            // Try to get a human-readable name for the location
            const name = await this.reverseGeocode(latitude, longitude)

            resolve({
              lat: latitude,
              lon: longitude,
              name: name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
              timezone,
            })
          } catch (error) {
            // Still return location even if reverse geocoding fails
            resolve({
              lat: latitude,
              lon: longitude,
              name: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            })
          }
        },
        (error) => {
          let message = "Unable to get your location"

          switch (error.code) {
            case error.PERMISSION_DENIED:
              message = "Location access denied by user"
              break
            case error.POSITION_UNAVAILABLE:
              message = "Location information unavailable"
              break
            case error.TIMEOUT:
              message = "Location request timed out"
              break
          }

          reject(new Error(message))
        },
        options,
      )
    })
  }

  // Reverse geocode coordinates to get location name
  private static async reverseGeocode(lat: number, lon: number): Promise<string | null> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`,
        {
          headers: {
            "User-Agent": "Trainspotter/1.0",
          },
        },
      )

      if (response.ok) {
        const data = await response.json()

        // Extract meaningful location name
        const address = data.address || {}
        const parts = [
          address.city || address.town || address.village,
          address.state || address.region,
          address.country,
        ].filter(Boolean)

        return parts.length > 0 ? parts.join(", ") : data.display_name
      }
    } catch (error) {
      console.warn("Reverse geocoding failed:", error)
    }

    return null
  }

  // Forward geocode location name to coordinates
  static async geocodeLocation(query: string): Promise<UserLocation | null> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&addressdetails=1`,
        {
          headers: {
            "User-Agent": "Trainspotter/1.0",
          },
        },
      )

      if (response.ok) {
        const data = await response.json()
        if (data.length > 0) {
          const result = data[0]
          const address = result.address || {}

          // Create a clean location name
          const parts = [
            address.city || address.town || address.village,
            address.state || address.region,
            address.country,
          ].filter(Boolean)

          return {
            lat: Number.parseFloat(result.lat),
            lon: Number.parseFloat(result.lon),
            name: parts.length > 0 ? parts.join(", ") : result.display_name,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          }
        }
      }
    } catch (error) {
      console.error("Geocoding failed:", error)
    }

    return null
  }

  // Validate location coordinates
  static isValidLocation(location: any): location is UserLocation {
    return (
      location &&
      typeof location.lat === "number" &&
      typeof location.lon === "number" &&
      location.lat >= -90 &&
      location.lat <= 90 &&
      location.lon >= -180 &&
      location.lon <= 180 &&
      !Number.isNaN(location.lat) &&
      !Number.isNaN(location.lon)
    )
  }

  // Calculate distance between two locations (in km)
  static calculateDistance(loc1: UserLocation, loc2: UserLocation): number {
    const R = 6371 // Earth's radius in km
    const dLat = this.toRadians(loc2.lat - loc1.lat)
    const dLon = this.toRadians(loc2.lon - loc1.lon)

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(loc1.lat)) * Math.cos(this.toRadians(loc2.lat)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180)
  }

  // Get timezone for coordinates (fallback to browser timezone)
  static async getTimezone(lat: number, lon: number): Promise<string> {
    // In a production app, you might use a timezone API service
    // For now, we'll use the browser's timezone as fallback
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  }

  // Format location for display
  static formatLocation(location: UserLocation): string {
    if (location.name) {
      return location.name
    }

    return `${location.lat.toFixed(4)}, ${location.lon.toFixed(4)}`
  }
}
