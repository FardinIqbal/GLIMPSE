"use client";

interface ScreenReaderTableProps {
  wavelengths: number[];
  transitDepth: number[];
  transitDepthErr?: number[];
  caption: string;
  sampleSize?: number;
}

/**
 * Hidden data table for screen readers
 * Provides accessible alternative to canvas-based charts
 * Following USWDS guidance on accessible data visualizations
 */
export function ScreenReaderTable({
  wavelengths,
  transitDepth,
  transitDepthErr,
  caption,
  sampleSize = 10,
}: ScreenReaderTableProps) {
  // Sample data points for manageable screen reader output
  const step = Math.max(1, Math.floor(wavelengths.length / sampleSize));
  const sampledIndices = Array.from(
    { length: Math.min(sampleSize, wavelengths.length) },
    (_, i) => Math.min(i * step, wavelengths.length - 1)
  );

  return (
    <table className="sr-only" role="table" aria-label={caption}>
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th scope="col">Wavelength (μm)</th>
          <th scope="col">Transit Depth (ppm)</th>
          {transitDepthErr && <th scope="col">Uncertainty (±ppm)</th>}
        </tr>
      </thead>
      <tbody>
        {sampledIndices.map((idx) => (
          <tr key={idx}>
            <td>{wavelengths[idx].toFixed(2)}</td>
            <td>{transitDepth[idx].toFixed(0)}</td>
            {transitDepthErr && <td>±{transitDepthErr[idx].toFixed(0)}</td>}
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <td colSpan={transitDepthErr ? 3 : 2}>
            Showing {sampledIndices.length} of {wavelengths.length} data points.
            Full data available via export.
          </td>
        </tr>
      </tfoot>
    </table>
  );
}
