"use client";

import { useRef, useEffect, useMemo, useState, useCallback } from "react";
import { ScreenReaderTable } from "@/components/accessibility/ScreenReaderTable";

interface MolecularBand {
  color: string;
  ranges: [number, number][];
  name: string;
}

interface TransmissionSpectrumProps {
  wavelengths: number[];
  transitDepth: number[];
  transitDepthErr?: number[];
  molecularBands: Record<string, MolecularBand>;
  enabledBands: Set<string>;
  selectedWavelength: number | null;
  onWavelengthSelect: (wl: number | null) => void;
  onWavelengthHover: (wl: number | null) => void;
}

export function TransmissionSpectrum({
  wavelengths,
  transitDepth,
  transitDepthErr,
  molecularBands,
  enabledBands,
  selectedWavelength,
  onWavelengthSelect,
  onWavelengthHover,
}: TransmissionSpectrumProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 300 });

  // Listen for theme changes
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.attributeName === "data-theme") {
          setTheme(document.documentElement.getAttribute("data-theme"));
        }
      }
    });
    observer.observe(document.documentElement, { attributes: true });
    setTheme(document.documentElement.getAttribute("data-theme"));
    return () => observer.disconnect();
  }, []);

  // Responsive sizing with ResizeObserver
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateDimensions = () => {
      const rect = container.getBoundingClientRect();
      setDimensions({ width: rect.width, height: rect.height });
    };

    updateDimensions();
    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, []);

  // Responsive padding based on viewport
  const getPadding = useCallback(() => {
    const isMobile = dimensions.width < 400;
    const isTablet = dimensions.width < 640;
    return {
      top: isMobile ? 15 : 20,
      right: isMobile ? 15 : isTablet ? 25 : 40,
      bottom: isMobile ? 40 : 50,
      left: isMobile ? 45 : isTablet ? 55 : 70,
    };
  }, [dimensions.width]);

  const { minWl, maxWl, minDepth, maxDepth } = useMemo(() => {
    return {
      minWl: Math.min(...wavelengths),
      maxWl: Math.max(...wavelengths),
      minDepth: Math.min(...transitDepth),
      maxDepth: Math.max(...transitDepth),
    };
  }, [wavelengths, transitDepth]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size with device pixel ratio
    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    ctx.scale(dpr, dpr);

    const width = dimensions.width;
    const height = dimensions.height;
    const padding = getPadding();
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;
    const isMobile = width < 400;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Helper functions
    const xScale = (wl: number) =>
      padding.left + ((wl - minWl) / (maxWl - minWl)) * plotWidth;
    const yScale = (depth: number) =>
      padding.top + plotHeight - ((depth - minDepth) / (maxDepth - minDepth)) * plotHeight;

    // Draw molecular bands
    ctx.globalAlpha = 0.15;
    for (const [key, band] of Object.entries(molecularBands)) {
      if (!enabledBands.has(key)) continue;
      ctx.fillStyle = band.color;
      for (const [wlMin, wlMax] of band.ranges) {
        if (wlMax < minWl || wlMin > maxWl) continue;
        const x1 = xScale(Math.max(wlMin, minWl));
        const x2 = xScale(Math.min(wlMax, maxWl));
        ctx.fillRect(x1, padding.top, x2 - x1, plotHeight);
      }
    }
    ctx.globalAlpha = 1;

    // Draw grid
    ctx.strokeStyle = getComputedStyle(document.documentElement)
      .getPropertyValue("--border")
      .trim() || "#e8e4dc";
    ctx.lineWidth = 1;

    // Responsive tick counts
    const xTicks = isMobile ? 4 : 6;
    const yTicks = isMobile ? 4 : 5;

    // X grid
    for (let i = 0; i <= xTicks; i++) {
      const x = padding.left + (i / xTicks) * plotWidth;
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, padding.top + plotHeight);
      ctx.stroke();
    }

    // Y grid
    for (let i = 0; i <= yTicks; i++) {
      const y = padding.top + (i / yTicks) * plotHeight;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + plotWidth, y);
      ctx.stroke();
    }

    // Draw uncertainty bands (2σ then 1σ)
    if (transitDepthErr && transitDepthErr.length === wavelengths.length) {
      const accentColor = getComputedStyle(document.documentElement)
        .getPropertyValue("--accent")
        .trim() || "#2563eb";

      // Helper to draw filled band
      const drawBand = (sigma: number, opacity: number) => {
        ctx.beginPath();
        ctx.fillStyle = accentColor;
        ctx.globalAlpha = opacity;

        // Upper bound
        for (let i = 0; i < wavelengths.length; i++) {
          const x = xScale(wavelengths[i]);
          const y = yScale(transitDepth[i] + transitDepthErr[i] * sigma);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }

        // Lower bound (reverse)
        for (let i = wavelengths.length - 1; i >= 0; i--) {
          const x = xScale(wavelengths[i]);
          const y = yScale(transitDepth[i] - transitDepthErr[i] * sigma);
          ctx.lineTo(x, y);
        }

        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
      };

      // 2σ band (lighter)
      drawBand(2, 0.1);
      // 1σ band (darker)
      drawBand(1, 0.2);
    }

    // Draw spectrum line
    ctx.beginPath();
    ctx.strokeStyle = getComputedStyle(document.documentElement)
      .getPropertyValue("--accent")
      .trim() || "#2563eb";
    ctx.lineWidth = 2;

    for (let i = 0; i < wavelengths.length; i++) {
      const x = xScale(wavelengths[i]);
      const y = yScale(transitDepth[i]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Draw selected wavelength indicator
    if (selectedWavelength !== null) {
      const x = xScale(selectedWavelength);
      ctx.beginPath();
      ctx.strokeStyle = getComputedStyle(document.documentElement)
        .getPropertyValue("--foreground")
        .trim() || "#1a1a1a";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, padding.top + plotHeight);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Axes labels - responsive font sizes
    const fontSize = isMobile ? 10 : 12;
    const labelFontSize = isMobile ? 9 : 12;
    ctx.fillStyle = getComputedStyle(document.documentElement)
      .getPropertyValue("--muted")
      .trim() || "#6b6b6b";
    ctx.font = `${fontSize}px Inter, system-ui, sans-serif`;
    ctx.textAlign = "center";

    // X axis labels
    for (let i = 0; i <= xTicks; i++) {
      const wl = minWl + (i / xTicks) * (maxWl - minWl);
      const x = padding.left + (i / xTicks) * plotWidth;
      ctx.fillText(wl.toFixed(1), x, height - padding.bottom + (isMobile ? 15 : 20));
    }
    ctx.font = `${labelFontSize}px Inter, system-ui, sans-serif`;
    ctx.fillText(isMobile ? "λ (μm)" : "Wavelength (μm)", width / 2, height - (isMobile ? 5 : 10));

    // Y axis labels
    ctx.font = `${fontSize}px Inter, system-ui, sans-serif`;
    ctx.textAlign = "right";
    for (let i = 0; i <= yTicks; i++) {
      const depth = maxDepth - (i / yTicks) * (maxDepth - minDepth);
      const y = padding.top + (i / yTicks) * plotHeight;
      ctx.fillText(depth.toFixed(0), padding.left - (isMobile ? 5 : 10), y + 4);
    }

    ctx.save();
    ctx.translate(isMobile ? 10 : 15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "center";
    ctx.font = `${labelFontSize}px Inter, system-ui, sans-serif`;
    ctx.fillText(isMobile ? "Depth (ppm)" : "Transit Depth (ppm)", 0, 0);
    ctx.restore();
  }, [wavelengths, transitDepth, transitDepthErr, molecularBands, enabledBands, selectedWavelength, minWl, maxWl, minDepth, maxDepth, theme, dimensions, getPadding]);

  // Get wavelength from x position
  const getWavelengthFromX = useCallback((clientX: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const padding = getPadding();
    const plotWidth = rect.width - padding.left - padding.right;

    if (x < padding.left || x > rect.width - padding.right) return null;

    return minWl + ((x - padding.left) / plotWidth) * (maxWl - minWl);
  }, [getPadding, minWl, maxWl]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const wl = getWavelengthFromX(e.clientX);
    onWavelengthHover(wl);
  };

  const handleClick = (e: React.MouseEvent) => {
    const wl = getWavelengthFromX(e.clientX);
    if (wl !== null) onWavelengthSelect(wl);
  };

  // Touch handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const wl = getWavelengthFromX(e.touches[0].clientX);
      if (wl !== null) onWavelengthSelect(wl);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const wl = getWavelengthFromX(e.touches[0].clientX);
      onWavelengthHover(wl);
    }
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[250px] cursor-crosshair touch-pan-y"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => onWavelengthHover(null)}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={() => onWavelengthHover(null)}
      role="figure"
      aria-label="Transmission spectrum chart showing transit depth vs wavelength"
    >
      <canvas ref={canvasRef} className="w-full h-full" aria-hidden="true" />
      <ScreenReaderTable
        wavelengths={wavelengths}
        transitDepth={transitDepth}
        transitDepthErr={transitDepthErr}
        caption="Transmission spectrum data: wavelength in micrometers and transit depth in parts per million"
      />
    </div>
  );
}
