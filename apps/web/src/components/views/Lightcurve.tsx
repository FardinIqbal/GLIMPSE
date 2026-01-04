"use client";

import { useRef, useEffect, useMemo, useState, useCallback } from "react";

interface LightcurveProps {
  phase: number[];
  flux: number[];
  wavelengths: number[];
  fluxGrid: number[][];
  selectedWavelength: number | null;
}

export function Lightcurve({
  phase,
  flux,
  wavelengths,
  fluxGrid,
  selectedWavelength,
}: LightcurveProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 400, height: 250 });

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

  // Responsive sizing
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

  const getPadding = useCallback(() => {
    const isMobile = dimensions.width < 350;
    return {
      top: 20,
      right: isMobile ? 10 : 20,
      bottom: isMobile ? 40 : 50,
      left: isMobile ? 45 : 60,
    };
  }, [dimensions.width]);

  // Get flux at selected wavelength
  const selectedFlux = useMemo(() => {
    if (selectedWavelength === null) return flux;

    // Find closest wavelength index
    let closestIdx = 0;
    let minDiff = Math.abs(wavelengths[0] - selectedWavelength);

    for (let i = 1; i < wavelengths.length; i++) {
      const diff = Math.abs(wavelengths[i] - selectedWavelength);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = i;
      }
    }

    return fluxGrid.map((row) => row[closestIdx]);
  }, [flux, wavelengths, fluxGrid, selectedWavelength]);

  const { minPhase, maxPhase, minFlux, maxFlux } = useMemo(() => {
    return {
      minPhase: Math.min(...phase),
      maxPhase: Math.max(...phase),
      minFlux: Math.min(...selectedFlux) - 0.001,
      maxFlux: Math.max(...selectedFlux) + 0.001,
    };
  }, [phase, selectedFlux]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    ctx.scale(dpr, dpr);

    const width = dimensions.width;
    const height = dimensions.height;
    const padding = getPadding();
    const isMobile = width < 350;
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;

    ctx.clearRect(0, 0, width, height);

    const xScale = (p: number) =>
      padding.left + ((p - minPhase) / (maxPhase - minPhase)) * plotWidth;
    const yScale = (f: number) =>
      padding.top + plotHeight - ((f - minFlux) / (maxFlux - minFlux)) * plotHeight;

    // Grid
    ctx.strokeStyle = getComputedStyle(document.documentElement)
      .getPropertyValue("--border")
      .trim() || "#e8e4dc";
    ctx.lineWidth = 1;

    const xTicks = isMobile ? 4 : 5;
    for (let i = 0; i <= xTicks; i++) {
      const x = padding.left + (i / xTicks) * plotWidth;
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, padding.top + plotHeight);
      ctx.stroke();
    }

    const yTicks = isMobile ? 3 : 4;
    for (let i = 0; i <= yTicks; i++) {
      const y = padding.top + (i / yTicks) * plotHeight;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + plotWidth, y);
      ctx.stroke();
    }

    // Transit region shading
    const transitStart = xScale(-0.015);
    const transitEnd = xScale(0.015);
    ctx.fillStyle = getComputedStyle(document.documentElement)
      .getPropertyValue("--accent")
      .trim() || "#2563eb";
    ctx.globalAlpha = 0.1;
    ctx.fillRect(transitStart, padding.top, transitEnd - transitStart, plotHeight);
    ctx.globalAlpha = 1;

    // Draw data points - smaller on mobile
    ctx.fillStyle = getComputedStyle(document.documentElement)
      .getPropertyValue("--accent")
      .trim() || "#2563eb";

    const pointRadius = isMobile ? 2 : 3;
    for (let i = 0; i < phase.length; i++) {
      const x = xScale(phase[i]);
      const y = yScale(selectedFlux[i]);
      ctx.beginPath();
      ctx.arc(x, y, pointRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw connecting line
    ctx.beginPath();
    ctx.strokeStyle = getComputedStyle(document.documentElement)
      .getPropertyValue("--accent")
      .trim() || "#2563eb";
    ctx.lineWidth = isMobile ? 1 : 1.5;
    ctx.globalAlpha = 0.5;

    for (let i = 0; i < phase.length; i++) {
      const x = xScale(phase[i]);
      const y = yScale(selectedFlux[i]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Labels - responsive font sizes
    const fontSize = isMobile ? 9 : 11;
    ctx.fillStyle = getComputedStyle(document.documentElement)
      .getPropertyValue("--muted")
      .trim() || "#6b6b6b";
    ctx.font = `${fontSize}px Inter, system-ui, sans-serif`;

    // X axis
    ctx.textAlign = "center";
    for (let i = 0; i <= xTicks; i++) {
      const p = minPhase + (i / xTicks) * (maxPhase - minPhase);
      const x = padding.left + (i / xTicks) * plotWidth;
      ctx.fillText(p.toFixed(3), x, height - padding.bottom + (isMobile ? 12 : 15));
    }
    ctx.fillText(isMobile ? "Phase" : "Orbital Phase", width / 2, height - (isMobile ? 5 : 8));

    // Y axis
    ctx.textAlign = "right";
    for (let i = 0; i <= yTicks; i++) {
      const f = maxFlux - (i / yTicks) * (maxFlux - minFlux);
      const y = padding.top + (i / yTicks) * plotHeight;
      ctx.fillText(f.toFixed(4), padding.left - (isMobile ? 4 : 8), y + 4);
    }
    ctx.save();
    ctx.translate(isMobile ? 8 : 12, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "center";
    ctx.fillText(isMobile ? "Flux" : "Relative Flux", 0, 0);
    ctx.restore();

    // Transit label
    ctx.fillStyle = getComputedStyle(document.documentElement)
      .getPropertyValue("--accent")
      .trim() || "#2563eb";
    ctx.textAlign = "center";
    ctx.fillText("Transit", (transitStart + transitEnd) / 2, padding.top + 15);
  }, [phase, selectedFlux, minPhase, maxPhase, minFlux, maxFlux, theme, dimensions, getPadding]);

  // Screen reader summary
  const srSummary = useMemo(() => {
    const depthEstimate = ((1 - Math.min(...selectedFlux)) * 100).toFixed(2);
    const wlInfo = selectedWavelength !== null
      ? `at wavelength ${selectedWavelength.toFixed(2)} micrometers`
      : "averaged across all wavelengths";
    return `Light curve ${wlInfo}. Transit depth approximately ${depthEstimate}%. Phase ranges from ${minPhase.toFixed(3)} to ${maxPhase.toFixed(3)}. Flux ranges from ${minFlux.toFixed(4)} to ${maxFlux.toFixed(4)}.`;
  }, [selectedFlux, selectedWavelength, minPhase, maxPhase, minFlux, maxFlux]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[200px]"
      role="figure"
      aria-label="Light curve showing flux variation during transit"
    >
      <canvas ref={canvasRef} className="w-full h-full" aria-hidden="true" />
      <div className="sr-only" role="status">
        {srSummary}
      </div>
    </div>
  );
}
