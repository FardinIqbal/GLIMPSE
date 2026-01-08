import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.PYTHON_API_URL || "https://astrospecvis.onrender.com";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ target: string }> }
) {
  const { target } = await params;

  try {
    const response = await fetch(
      `${API_URL}/api/mast/real-data/${encodeURIComponent(target)}`,
      {
        headers: { "Content-Type": "application/json" },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Backend error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching from Python backend:", error);
    return NextResponse.json(
      { error: "Failed to fetch from MAST backend. The backend may be starting up (cold start)." },
      { status: 503 }
    );
  }
}
