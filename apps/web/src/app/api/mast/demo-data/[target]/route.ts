import { NextRequest, NextResponse } from "next/server";

// Simple seeded random number generator for reproducibility
function seededRandom(seed: number) {
  return function () {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

// Box-Muller transform for normal distribution
function gaussianRandom(rand: () => number, mean = 0, stdDev = 1) {
  const u1 = rand();
  const u2 = rand();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return z * stdDev + mean;
}

// Generate a simple hash from string for seeding
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ target: string }> }
) {
  const { target } = await params;
  const { searchParams } = new URL(request.url);
  const binSize = Math.min(
    100,
    Math.max(5, parseInt(searchParams.get("bin_size") || "20"))
  );

  // Use target name to seed random generator for consistent results
  const seed = hashString(target);
  const rand = seededRandom(seed);

  // Generate realistic wavelength grid (NIRSpec range)
  const nWavelengths = 200;
  const wavelengths: number[] = [];
  for (let i = 0; i < nWavelengths; i++) {
    wavelengths.push(0.6 + (i * (5.3 - 0.6)) / (nWavelengths - 1));
  }

  // Generate time/phase grid
  const nTimes = 100;
  const phase: number[] = [];
  for (let i = 0; i < nTimes; i++) {
    phase.push(-0.05 + (i * 0.1) / (nTimes - 1));
  }

  // Base transit model
  const transitDuration = 0.03;
  const ingress = 0.005;

  function transitModel(t: number, depth: number): number {
    const halfDuration = transitDuration / 2;
    const absT = Math.abs(t);

    if (absT >= halfDuration) {
      return 1;
    }

    const inIngressEgress = absT > halfDuration - ingress;
    if (inIngressEgress) {
      const progress = (absT - halfDuration + ingress) / ingress;
      return 1 - depth * (1 - progress);
    }

    return 1 - depth;
  }

  // Molecular absorption features
  const molecularEffects: Record<string, [number, number, number][]> = {
    H2O: [
      [1.35, 1.45, 0.003],
      [1.8, 2.0, 0.004],
      [2.7, 3.0, 0.005],
    ],
    CO2: [[4.2, 4.4, 0.006]],
    CO: [[4.5, 5.0, 0.004]],
    CH4: [
      [2.2, 2.4, 0.002],
      [3.3, 3.5, 0.003],
    ],
  };

  const baseDepth = 0.012;

  // Generate 2D flux array
  const flux: number[][] = [];
  const transitDepthRaw: number[] = [];

  for (let i = 0; i < nTimes; i++) {
    flux.push([]);
  }

  for (let j = 0; j < nWavelengths; j++) {
    const wl = wavelengths[j];
    let depth = baseDepth;

    // Add molecular features
    for (const [, features] of Object.entries(molecularEffects)) {
      for (const [wlMin, wlMax, extraDepth] of features) {
        if (wl >= wlMin && wl <= wlMax) {
          const center = (wlMin + wlMax) / 2;
          const width = (wlMax - wlMin) / 2;
          depth +=
            extraDepth *
            Math.exp(-Math.pow(wl - center, 2) / (2 * Math.pow(width / 2, 2)));
        }
      }
    }

    for (let i = 0; i < nTimes; i++) {
      const baseFlux = transitModel(phase[i], depth);
      // Add noise
      flux[i][j] = baseFlux + gaussianRandom(rand, 0, 0.0005);
    }

    transitDepthRaw.push(depth * 1e6); // Convert to ppm
  }

  // Calculate transmission spectrum
  const inTransitMask = phase.map((p) => Math.abs(p) < transitDuration / 2);
  const outTransitMask = phase.map(
    (p) => Math.abs(p) > transitDuration / 2 + 0.01
  );

  const transitDepth: number[] = [];
  const transitDepthErr: number[] = [];

  for (let j = 0; j < nWavelengths; j++) {
    let inSum = 0,
      inCount = 0,
      inSqSum = 0;
    let outSum = 0,
      outCount = 0,
      outSqSum = 0;

    for (let i = 0; i < nTimes; i++) {
      if (inTransitMask[i]) {
        inSum += flux[i][j];
        inSqSum += flux[i][j] * flux[i][j];
        inCount++;
      }
      if (outTransitMask[i]) {
        outSum += flux[i][j];
        outSqSum += flux[i][j] * flux[i][j];
        outCount++;
      }
    }

    const inMean = inSum / inCount;
    const outMean = outSum / outCount;
    const inStd = Math.sqrt(inSqSum / inCount - inMean * inMean);
    const outStd = Math.sqrt(outSqSum / outCount - outMean * outMean);

    transitDepth.push((1 - inMean / outMean) * 1e6);
    transitDepthErr.push((Math.sqrt(inStd * inStd + outStd * outStd) / outMean) * 1e6);
  }

  // Bin data
  const nBins = Math.floor(nWavelengths / binSize);
  const wavelengthsBinned: number[] = [];
  const transitDepthBinned: number[] = [];
  const transitDepthErrBinned: number[] = [];
  const fluxBinned: number[][] = [];

  for (let i = 0; i < nTimes; i++) {
    fluxBinned.push([]);
  }

  for (let b = 0; b < nBins; b++) {
    let wlSum = 0,
      depthSum = 0,
      errSum = 0;

    for (let k = 0; k < binSize; k++) {
      const idx = b * binSize + k;
      wlSum += wavelengths[idx];
      depthSum += transitDepth[idx];
      errSum += transitDepthErr[idx];
    }

    wavelengthsBinned.push(wlSum / binSize);
    transitDepthBinned.push(depthSum / binSize);
    transitDepthErrBinned.push(errSum / binSize / Math.sqrt(binSize));

    for (let i = 0; i < nTimes; i++) {
      let fluxSum = 0;
      for (let k = 0; k < binSize; k++) {
        fluxSum += flux[i][b * binSize + k];
      }
      fluxBinned[i].push(fluxSum / binSize);
    }
  }

  // Calculate lightcurve (mean flux across wavelength)
  const lightcurveFlux: number[] = [];
  for (let i = 0; i < nTimes; i++) {
    let sum = 0;
    for (let j = 0; j < nBins; j++) {
      sum += fluxBinned[i][j];
    }
    lightcurveFlux.push(sum / nBins);
  }

  return NextResponse.json({
    target,
    data_source: "simulated",
    wavelengths: wavelengthsBinned,
    phase,
    flux: fluxBinned,
    transmission_spectrum: {
      wavelengths: wavelengthsBinned,
      transit_depth_ppm: transitDepthBinned,
      transit_depth_err_ppm: transitDepthErrBinned,
    },
    lightcurve: {
      phase,
      flux: lightcurveFlux,
    },
    metadata: {
      instrument: "NIRSpec (simulated)",
      mode: "G395H",
      wavelength_range: [wavelengths[0], wavelengths[wavelengths.length - 1]],
      n_integrations: nTimes,
    },
  });
}
