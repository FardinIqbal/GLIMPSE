import { NextResponse } from "next/server";

// Molecular absorption bands (microns) - Colorblind-safe palette (Okabe-Ito)
const MOLECULAR_BANDS = {
  H2O: {
    color: "#0077BB",
    ranges: [
      [1.35, 1.45],
      [1.8, 2.0],
      [2.6, 3.0],
      [5.5, 7.5],
    ],
    name: "Water",
  },
  CO2: {
    color: "#EE7733",
    ranges: [
      [4.2, 4.4],
      [15.0, 16.0],
    ],
    name: "Carbon Dioxide",
  },
  CO: {
    color: "#CC3311",
    ranges: [[4.5, 5.0]],
    name: "Carbon Monoxide",
  },
  CH4: {
    color: "#009988",
    ranges: [
      [2.2, 2.4],
      [3.2, 3.5],
      [7.5, 8.0],
    ],
    name: "Methane",
  },
  SO2: {
    color: "#EE3377",
    ranges: [
      [7.3, 7.5],
      [8.5, 9.0],
    ],
    name: "Sulfur Dioxide",
  },
  NH3: {
    color: "#44BB99",
    ranges: [[10.0, 11.0]],
    name: "Ammonia",
  },
  Na: {
    color: "#BBBBBB",
    ranges: [[0.589, 0.59]],
    name: "Sodium",
  },
  K: {
    color: "#AA4499",
    ranges: [[0.766, 0.77]],
    name: "Potassium",
  },
};

export async function GET() {
  return NextResponse.json({ bands: MOLECULAR_BANDS });
}
