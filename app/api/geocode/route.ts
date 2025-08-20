import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get("lat")
  const lon = searchParams.get("lon")
  const query = searchParams.get("q")

  try {
    if (lat && lon) {
      // Reverse geocoding - convert coordinates to place name
      // Using a simple mock implementation since we don't have a geocoding API key
      // In production, you'd use a service like OpenStreetMap Nominatim or Google Geocoding
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
        return NextResponse.json({
          lat: Number.parseFloat(lat),
          lon: Number.parseFloat(lon),
          name: data.display_name || `${lat}, ${lon}`,
        })
      }
    } else if (query) {
      // Forward geocoding - convert place name to coordinates
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
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
          return NextResponse.json({
            lat: Number.parseFloat(result.lat),
            lon: Number.parseFloat(result.lon),
            name: result.display_name,
          })
        }
      }
    }

    return NextResponse.json({ error: "Location not found" }, { status: 404 })
  } catch (error) {
    return NextResponse.json({ error: "Geocoding failed" }, { status: 500 })
  }
}
