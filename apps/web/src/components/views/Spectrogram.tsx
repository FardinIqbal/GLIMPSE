"use client";

import { useRef, useEffect, useMemo, useState, useCallback } from "react";

interface SpectrogramProps {
  wavelengths: number[];
  phase: number[];
  flux: number[][];
  activeWavelength: number | null;
  onWavelengthSelect: (wl: number) => void;
}

export function Spectrogram({
  wavelengths,
  phase,
  flux,
  activeWavelength,
  onWavelengthSelect,
}: SpectrogramProps) {
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
      top: 15,
      right: isMobile ? 10 : 60,
      bottom: isMobile ? 40 : 50,
      left: isMobile ? 40 : 60,
    };
  }, [dimensions.width]);

  const { minWl, maxWl, minPhase, maxPhase, minFlux, maxFlux } = useMemo(() => {
    const allFlux = flux.flat();
    return {
      minWl: Math.min(...wavelengths),
      maxWl: Math.max(...wavelengths),
      minPhase: Math.min(...phase),
      maxPhase: Math.max(...phase),
      minFlux: Math.min(...allFlux),
      maxFlux: Math.max(...allFlux),
    };
  }, [wavelengths, phase, flux]);

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

    // Color scale function (viridis-like)
    const colorScale = (value: number) => {
      const t = (value - minFlux) / (maxFlux - minFlux);
      // Viridis approximation
      const r = Math.round(68 + t * (253 - 68));
      const g = Math.round(1 + t * (231 - 1));
      const b = Math.round(84 + t * (37 - 84));
      return `rgb(${r}, ${g}, ${b})`;
    };

    // Draw heatmap
    const cellWidth = plotWidth / wavelengths.length;
    const cellHeight = plotHeight / phase.length;

    for (let j = 0; j < phase.length; j++) {
      for (let i = 0; i < wavelengths.length; i++) {
        const x = padding.left + i * cellWidth;
        const y = padding.top + j * cellHeight;
        ctx.fillStyle = colorScale(flux[j][i]);
        ctx.fillRect(x, y, cellWidth + 1, cellHeight + 1);
      }
    }

    // Draw active wavelength indicator
    if (activeWavelength !== null) {
      const wlIndex = wavelengths.findIndex(
        (wl, i) =>
          i === wavelengths.length - 1 ||
          (wl <= activeWavelength && wavelengths[i + 1] > activeWavelength)
      );
      if (wlIndex >= 0) {
        const x = padding.left + wlIndex * cellWidth + cellWidth / 2;
        ctx.beginPath();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.moveTo(x, padding.top);
        ctx.lineTo(x, padding.top + plotHeight);
        ctx.stroke();
      }
    }

    // Draw axes - responsive fonts
    const fontSize = isMobile ? 9 : 11;
    ctx.fillStyle = getComputedStyle(document.documentElement)
      .getPropertyValue("--muted")
      .trim() || "#6b6b6b";
    ctx.font = `${fontSize}px Inter, system-ui, sans-serif`;

    // X axis (wavelength)
    ctx.textAlign = "center";
    const xTicks = isMobile ? 3 : 5;
    for (let i = 0; i <= xTicks; i++) {
      const wl = minWl + (i / xTicks) * (maxWl - minWl);
      const x = padding.left + (i / xTicks) * plotWidth;
      ctx.fillText(wl.toFixed(1), x, height - padding.bottom + (isMobile ? 12 : 15));
    }
    ctx.fillText(isMobile ? "λ (μm)" : "Wavelength (μm)", width / 2, height - (isMobile ? 5 : 8));

    // Y axis (phase)
    ctx.textAlign = "right";
    const yTicks = isMobile ? 3 : 4;
    for (let i = 0; i <= yTicks; i++) {
      const ph = maxPhase - (i / yTicks) * (maxPhase - minPhase);
      const y = padding.top + (i / yTicks) * plotHeight;
      ctx.fillText(ph.toFixed(3), padding.left - (isMobile ? 4 : 8), y + 4);
    }
    ctx.save();
    ctx.translate(isMobile ? 8 : 12, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "center";
    ctx.fillText(isMobile ? "Phase" : "Orbital Phase", 0, 0);
    ctx.restore();

    // Color bar - hide on mobile to save space
    if (!isMobile) {
      const barWidth = 15;
      const barHeight = plotHeight;
      const barX = width - padding.right + 20;
      const barY = padding.top;

      const gradient = ctx.createLinearGradient(0, barY + barHeight, 0, barY);
      gradient.addColorStop(0, colorScale(minFlux));
      gradient.addColorStop(0.5, colorScale((minFlux + maxFlux) / 2));
      gradient.addColorStop(1, colorScale(maxFlux));
      ctx.fillStyle = gradient;
      ctx.fillRect(barX, barY, barWidth, barHeight);

      ctx.strokeStyle = getComputedStyle(document.documentElement)
        .getPropertyValue("--border")
        .trim() || "#e8e4dc";
      ctx.strokeRect(barX, barY, barWidth, barHeight);

      // Color bar labels
      ctx.fillStyle = getComputedStyle(document.documentElement)
        .getPropertyValue("--muted")
        .trim() || "#6b6b6b";
      ctx.textAlign = "left";
      ctx.fillText(maxFlux.toFixed(3), barX + barWidth + 5, barY + 10);
      ctx.fillText(minFlux.toFixed(3), barX + barWidth + 5, barY + barHeight);
    }
  }, [wavelengths, phase, flux, activeWavelength, minWl, maxWl, minPhase, maxPhase, minFlux, maxFlux, theme, dimensions, getPadding]);

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

  const handleClick = (e: React.MouseEvent) => {
    const wl = getWavelengthFromX(e.clientX);
    if (wl !== null) onWavelengthSelect(wl);
  };

  const handleTouch = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const wl = getWavelengthFromX(e.touches[0].clientX);
      if (wl !== null) onWavelengthSelect(wl);
    }
  };

  // Screen reader summary
  const srSummary = useMemo(() => {
    const fluxRange = `Flux ranges from ${minFlux.toFixed(4)} to ${maxFlux.toFixed(4)}`;
    const wlRange = `Wavelength from ${minWl.toFixed(1)} to ${maxWl.toFixed(1)} micrometers`;
    const phaseRange = `Phase from ${minPhase.toFixed(3)} to ${maxPhase.toFixed(3)}`;
    return `Spectrogram heatmap. ${wlRange}. ${phaseRange}. ${fluxRange}.`;
  }, [minFlux, maxFlux, minWl, maxWl, minPhase, maxPhase]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[200px] cursor-crosshair touch-pan-y"
      onClick={handleClick}
      onTouchStart={handleTouch}
      role="figure"
      aria-label="Spectrogram heatmap showing flux variation across wavelength and phase"
    >
      <canvas ref={canvasRef} className="w-full h-full" aria-hidden="true" />
      <div className="sr-only" role="status">
        {srSummary}
        {activeWavelength !== null && (
          <span>Currently viewing wavelength {activeWavelength.toFixed(2)} micrometers.</span>
        )}
      </div>
    </div>
  );
}
