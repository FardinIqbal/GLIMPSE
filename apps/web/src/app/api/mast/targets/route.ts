import { NextResponse } from "next/server";

const FEATURED_TARGETS = [
  // Hot Jupiters & Saturns (easiest to observe)
  {
    name: "WASP-39 b",
    search: "WASP-39",
    proposal: "1366",
    type: "Hot Saturn",
    description: "First CO2 detection - ERS program",
    features: ["H2O", "CO2", "SO2", "Na", "K"],
  },
  {
    name: "WASP-96 b",
    search: "WASP-96",
    proposal: "2734",
    type: "Hot Saturn",
    description: "Clear atmosphere with water features",
    features: ["H2O", "clouds"],
  },
  {
    name: "WASP-17 b",
    search: "WASP-17",
    proposal: "1353",
    type: "Hot Jupiter",
    description: "Puffy planet with quartz clouds",
    features: ["H2O", "SiO2"],
  },
  {
    name: "WASP-69 b",
    search: "WASP-69",
    proposal: "2159",
    type: "Hot Saturn",
    description: "Water, CO2, and aerosols detected",
    features: ["H2O", "CO2", "aerosols"],
  },
  {
    name: "WASP-80 b",
    search: "WASP-80",
    proposal: "2639",
    type: "Warm Jupiter",
    description: "Methane-rich atmosphere",
    features: ["CH4", "H2O"],
  },
  {
    name: "HAT-P-18 b",
    search: "HAT-P-18",
    proposal: "2698",
    type: "Hot Saturn",
    description: "Warm Saturn with potential clouds",
    features: ["H2O", "CH4"],
  },
  {
    name: "HAT-P-26 b",
    search: "HAT-P-26",
    proposal: "2585",
    type: "Warm Neptune",
    description: "Low metallicity Neptune-mass planet",
    features: ["H2O"],
  },

  // Sub-Neptunes (intermediate size)
  {
    name: "K2-18 b",
    search: "K2-18",
    proposal: "2722",
    type: "Sub-Neptune",
    description: "Possible ocean world - CH4, CO2 detected",
    features: ["CH4", "CO2", "H2O"],
  },
  {
    name: "GJ 1214 b",
    search: "GJ-1214",
    proposal: "1803",
    type: "Sub-Neptune",
    description: "Archetype mini-Neptune with haze",
    features: ["haze", "clouds"],
  },
  {
    name: "TOI-270 d",
    search: "TOI-270",
    proposal: "2759",
    type: "Sub-Neptune",
    description: "Temperate sub-Neptune in multi-planet system",
    features: ["H2O", "CH4"],
  },
  {
    name: "GJ 9827 d",
    search: "GJ-9827",
    proposal: "2065",
    type: "Super-Earth",
    description: "Dense super-Earth with water vapor",
    features: ["H2O"],
  },
  {
    name: "GJ 3470 b",
    search: "GJ-3470",
    proposal: "1981",
    type: "Sub-Neptune",
    description: "Warm Neptune with escaping atmosphere",
    features: ["H2O", "CH4"],
  },

  // Rocky planets (hardest to observe)
  {
    name: "LHS 475 b",
    search: "LHS-475",
    proposal: "2512",
    type: "Earth-sized",
    description: "Nearby Earth-sized planet",
    features: ["rocky"],
  },
  {
    name: "TRAPPIST-1 b",
    search: "TRAPPIST-1",
    proposal: "1981",
    type: "Earth-sized",
    description: "Innermost TRAPPIST-1 planet",
    features: ["rocky"],
  },
  {
    name: "GJ 486 b",
    search: "GJ-486",
    proposal: "1743",
    type: "Super-Earth",
    description: "Hot rocky super-Earth",
    features: ["rocky", "H2O?"],
  },
];

export async function GET() {
  return NextResponse.json({ targets: FEATURED_TARGETS });
}
