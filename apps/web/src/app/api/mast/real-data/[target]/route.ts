import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ target: string }> }
) {
  const { target } = await params;

  // Real MAST data integration requires Python libraries (astroquery, astropy)
  // which cannot run in Next.js Edge/Node runtime.
  // For real JWST data, a separate Python API backend is needed.
  return NextResponse.json(
    {
      error: "Real MAST data integration requires a Python backend. Please use Demo mode for simulated transit spectroscopy data.",
      target: decodeURIComponent(target),
      suggestion: "Switch to Demo mode to explore transit spectra with simulated data based on real planetary parameters.",
    },
    { status: 503 }
  );
}
