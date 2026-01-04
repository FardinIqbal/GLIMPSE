"use client";

import { useState, useRef, useEffect } from "react";

interface ExportMenuProps {
  wavelengths: number[];
  transitDepth: number[];
  transitDepthErr?: number[];
  target: string;
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
}

export function ExportMenu({
  wavelengths,
  transitDepth,
  transitDepthErr,
  target,
  canvasRef,
}: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const downloadCSV = () => {
    let csv = "wavelength_um,transit_depth_ppm";
    if (transitDepthErr) csv += ",transit_depth_err_ppm";
    csv += "\n";

    for (let i = 0; i < wavelengths.length; i++) {
      csv += `${wavelengths[i]},${transitDepth[i]}`;
      if (transitDepthErr) csv += `,${transitDepthErr[i]}`;
      csv += "\n";
    }

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${target.replace(/\s+/g, "_")}_spectrum.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setIsOpen(false);
  };

  const downloadJSON = () => {
    const data = {
      target,
      wavelengths,
      transit_depth_ppm: transitDepth,
      ...(transitDepthErr && { transit_depth_err_ppm: transitDepthErr }),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${target.replace(/\s+/g, "_")}_spectrum.json`;
    a.click();
    URL.revokeObjectURL(url);
    setIsOpen(false);
  };

  const downloadPNG = () => {
    // Get the spectrum chart from the DOM
    const spectrumSection = document.querySelector("section.paper canvas") as HTMLCanvasElement;
    if (!spectrumSection) return;

    const link = document.createElement("a");
    link.download = `${target.replace(/\s+/g, "_")}_spectrum.png`;
    link.href = spectrumSection.toDataURL("image/png");
    link.click();
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 text-xs font-sans
                   border border-[var(--border)] rounded-lg
                   hover:border-[var(--border-strong)] transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Export
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-[var(--paper)] border border-[var(--border)]
                        rounded-lg shadow-lg z-50 overflow-hidden">
          <button
            onClick={downloadCSV}
            className="w-full px-4 py-2 text-left text-sm font-sans
                       hover:bg-[var(--background)] transition-colors
                       flex items-center gap-2"
          >
            <span className="text-[var(--muted)]">CSV</span>
            <span>Spectrum Data</span>
          </button>
          <button
            onClick={downloadJSON}
            className="w-full px-4 py-2 text-left text-sm font-sans
                       hover:bg-[var(--background)] transition-colors
                       flex items-center gap-2"
          >
            <span className="text-[var(--muted)]">JSON</span>
            <span>Spectrum Data</span>
          </button>
          <div className="border-t border-[var(--border)]" />
          <button
            onClick={downloadPNG}
            className="w-full px-4 py-2 text-left text-sm font-sans
                       hover:bg-[var(--background)] transition-colors
                       flex items-center gap-2"
          >
            <span className="text-[var(--muted)]">PNG</span>
            <span>Chart Image</span>
          </button>
        </div>
      )}
    </div>
  );
}
