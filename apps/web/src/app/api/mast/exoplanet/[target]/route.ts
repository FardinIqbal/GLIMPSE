import { NextRequest, NextResponse } from "next/server";

const EXOMAST_BASE = "https://exo.mast.stsci.edu/api/v0.1";

// Fallback data for common exoplanets (in case API is slow/unavailable)
const PLANET_DATA: Record<
  string,
  {
    orbital_period: number | null;
    transit_duration: number | null;
    planet_radius: number | null;
    star_radius: number | null;
    equilibrium_temp: number | null;
    distance: number | null;
  }
> = {
  "WASP-39 b": {
    orbital_period: 4.055,
    transit_duration: 2.8,
    planet_radius: 1.27,
    star_radius: 0.895,
    equilibrium_temp: 1166,
    distance: 215,
  },
  "WASP-96 b": {
    orbital_period: 3.425,
    transit_duration: 2.4,
    planet_radius: 1.2,
    star_radius: 1.05,
    equilibrium_temp: 1285,
    distance: 352,
  },
  "WASP-17 b": {
    orbital_period: 3.735,
    transit_duration: 4.35,
    planet_radius: 1.89,
    star_radius: 1.38,
    equilibrium_temp: 1755,
    distance: 403,
  },
  "WASP-69 b": {
    orbital_period: 3.868,
    transit_duration: 2.2,
    planet_radius: 1.06,
    star_radius: 0.813,
    equilibrium_temp: 963,
    distance: 50,
  },
  "WASP-80 b": {
    orbital_period: 3.068,
    transit_duration: 2.2,
    planet_radius: 0.95,
    star_radius: 0.571,
    equilibrium_temp: 825,
    distance: 49,
  },
  "K2-18 b": {
    orbital_period: 32.94,
    transit_duration: 3.5,
    planet_radius: 2.61,
    star_radius: 0.41,
    equilibrium_temp: 284,
    distance: 38,
  },
  "GJ 1214 b": {
    orbital_period: 1.58,
    transit_duration: 0.87,
    planet_radius: 2.68,
    star_radius: 0.215,
    equilibrium_temp: 596,
    distance: 14.6,
  },
  "TOI-270 d": {
    orbital_period: 11.38,
    transit_duration: 2.1,
    planet_radius: 2.42,
    star_radius: 0.38,
    equilibrium_temp: 354,
    distance: 22.5,
  },
  "GJ 9827 d": {
    orbital_period: 6.2,
    transit_duration: 1.4,
    planet_radius: 2.02,
    star_radius: 0.602,
    equilibrium_temp: 680,
    distance: 30,
  },
  "GJ 3470 b": {
    orbital_period: 3.337,
    transit_duration: 1.9,
    planet_radius: 4.2,
    star_radius: 0.539,
    equilibrium_temp: 615,
    distance: 29,
  },
  "LHS 475 b": {
    orbital_period: 2.029,
    transit_duration: 0.7,
    planet_radius: 0.99,
    star_radius: 0.274,
    equilibrium_temp: 586,
    distance: 12.5,
  },
  "TRAPPIST-1 b": {
    orbital_period: 1.51,
    transit_duration: 0.6,
    planet_radius: 1.09,
    star_radius: 0.121,
    equilibrium_temp: 400,
    distance: 12.4,
  },
  "GJ 486 b": {
    orbital_period: 1.467,
    transit_duration: 0.8,
    planet_radius: 1.34,
    star_radius: 0.328,
    equilibrium_temp: 700,
    distance: 8.1,
  },
  "HAT-P-18 b": {
    orbital_period: 5.508,
    transit_duration: 2.7,
    planet_radius: 0.995,
    star_radius: 0.749,
    equilibrium_temp: 852,
    distance: 166,
  },
  "HAT-P-26 b": {
    orbital_period: 4.235,
    transit_duration: 2.5,
    planet_radius: 0.565,
    star_radius: 0.788,
    equilibrium_temp: 990,
    distance: 137,
  },
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ target: string }> }
) {
  const { target } = await params;
  const decodedTarget = decodeURIComponent(target);

  // Check fallback data first
  if (PLANET_DATA[decodedTarget]) {
    return NextResponse.json({
      name: decodedTarget,
      ...PLANET_DATA[decodedTarget],
    });
  }

  // Try fetching from exo.MAST API
  try {
    const cleanName = decodedTarget.replace(/ /g, "%20");
    const url = `${EXOMAST_BASE}/exoplanets/${cleanName}/properties/`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return NextResponse.json(
        { error: "Exoplanet not found" },
        { status: 404 }
      );
    }

    const data = await response.json();

    if (!data || (Array.isArray(data) && data.length === 0)) {
      return NextResponse.json(
        { error: "Exoplanet not found" },
        { status: 404 }
      );
    }

    const props = Array.isArray(data) ? data[0] : data;

    return NextResponse.json({
      name: decodedTarget,
      ra: props.ra || null,
      dec: props.dec || null,
      orbital_period: props.orbital_period || null,
      transit_duration: props.transit_duration || null,
      planet_radius: props.Rp || null,
      star_radius: props.Rs || null,
      equilibrium_temp: props.Tep || null,
      distance: props.distance || null,
    });
  } catch (error) {
    // If API fails, check if we have any fallback data by partial match
    for (const [name, data] of Object.entries(PLANET_DATA)) {
      if (
        name.toLowerCase().includes(decodedTarget.toLowerCase()) ||
        decodedTarget.toLowerCase().includes(name.toLowerCase().split(" ")[0])
      ) {
        return NextResponse.json({
          name,
          ...data,
        });
      }
    }

    return NextResponse.json(
      { error: "Exoplanet not found" },
      { status: 404 }
    );
  }
}
