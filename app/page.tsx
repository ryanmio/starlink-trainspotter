import type { Metadata } from "next"
import { TrainspotterApp } from "@/components/trainspotter-app"

export const metadata: Metadata = {
  title: "Trainspotter - Starlink Train Predictions",
  description: "Predict when fresh Starlink satellite trains will be visible from your location",
}

export default function HomePage() {
  return <TrainspotterApp />
}
