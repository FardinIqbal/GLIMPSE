"use client";

import { useState, useEffect } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
import { TargetSelector } from "@/components/controls/TargetSelector";
import { TransmissionSpectrum } from "@/components/views/TransmissionSpectrum";
import { Spectrogram } from "@/components/views/Spectrogram";
import { Lightcurve } from "@/components/views/Lightcurve";
import { MolecularBands } from "@/components/controls/MolecularBands";
import { ThemeToggle } from "@/components/controls/ThemeToggle";
import { BinningSlider } from "@/components/controls/BinningSlider";
import { ExportMenu } from "@/components/controls/ExportMenu";
import { motion, AnimatePresence } from "framer-motion";
import { useBreakpoint } from "@/hooks/useMediaQuery";
import { useLiveRegion } from "@/components/accessibility/LiveRegion";

interface TransitData {
  target: string;
  data_source: "simulated" | "mast";
  wavelengths: number[];
  phase?: number[];
  flux?: number[][];
  transmission_spectrum: {
    wavelengths: number[];
    transit_depth_ppm: number[];
    transit_depth_err_ppm?: number[];
  };
  lightcurve?: {
    phase: number[];
    flux: number[];
  };
  metadata: {
    instrument: string;
    mode?: string;
    wavelength_range?: [number, number];
    n_integrations?: number;
    proposal_id?: string;
    exposure_time?: number;
  };
}

interface MolecularBand {
  color: string;
  ranges: [number, number][];
  name: string;
}

interface PlanetInfo {
  name: string;
  orbital_period: number | null;
  transit_duration: number | null;
  planet_radius: number | null;
  star_radius: number | null;
  equilibrium_temp: number | null;
  distance: number | null;
}

type DataSource = "demo" | "real";

export default function Home() {
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [data, setData] = useState<TransitData | null>(null);
  const [loading, setLoading] = useState(false);
  const [molecularBands, setMolecularBands] = useState<Record<string, MolecularBand>>({});
  const [enabledBands, setEnabledBands] = useState<Set<string>>(new Set(["H2O", "CO2", "CO", "CH4", "SO2"]));
  const [selectedWavelength, setSelectedWavelength] = useState<number | null>(null);
  const [hoveredWavelength, setHoveredWavelength] = useState<number | null>(null);
  const [dataSource, setDataSource] = useState<DataSource>("demo");
  const [planetInfo, setPlanetInfo] = useState<PlanetInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [binSize, setBinSize] = useState(20);
  const [mobileControlsOpen, setMobileControlsOpen] = useState(false);
  const { isMobile, isDesktop } = useBreakpoint();
  const { announce } = useLiveRegion();

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedTarget) {
        setSelectedTarget(null);
        setData(null);
        setPlanetInfo(null);
        setError(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedTarget]);

  useEffect(() => {
    fetch(`${API_URL}/api/mast/molecular-bands`)
      .then((res) => res.json())
      .then((data) => setMolecularBands(data.bands))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedTarget) return;

    setLoading(true);
    setError(null);

    // Fetch planet info
    fetch(`${API_URL}/api/mast/exoplanet/${encodeURIComponent(selectedTarget)}`)
      .then((res) => res.ok ? res.json() : null)
      .then((info) => setPlanetInfo(info))
      .catch(() => setPlanetInfo(null));

    // Fetch data based on source
    const endpoint = dataSource === "demo"
      ? `${API_URL}/api/mast/demo-data/${encodeURIComponent(selectedTarget)}?bin_size=${binSize}`
      : `${API_URL}/api/mast/real-data/${encodeURIComponent(selectedTarget.replace(" b", "").replace(" c", ""))}`;

    fetch(endpoint)
      .then((res) => {
        if (!res.ok) throw new Error("Data not available");
        return res.json();
      })
      .then((data) => {
        setData(data);
        setLoading(false);
        announce(`Loaded data for ${selectedTarget}. Transmission spectrum is now displayed.`);
      })
      .catch((err) => {
        console.error(err);
        setError(dataSource === "real"
          ? "Real data not available. Try demo mode or select a different target."
          : "Failed to load data.");
        setLoading(false);
      });
  }, [selectedTarget, dataSource, binSize]);

  const activeWavelength = hoveredWavelength ?? selectedWavelength;

  const clearSelection = () => {
    setSelectedTarget(null);
    setData(null);
    setPlanetInfo(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header - Premium styling */}
      <header className="border-b border-[var(--border)] bg-[var(--paper)]/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Back + Title */}
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
              {selectedTarget && (
                <button
                  onClick={clearSelection}
                  className="p-2 -ml-2 rounded-xl hover:bg-[var(--background-secondary)]
                             transition-all duration-200 flex-shrink-0 active:scale-95"
                  title="Back to targets"
                  aria-label="Back to target selection"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl font-semibold tracking-tight truncate text-[var(--foreground)]">
                  {selectedTarget || "GLIMPSE"}
                </h1>
                <p className="text-xs sm:text-sm text-[var(--muted)] font-sans hidden sm:block">
                  {selectedTarget ? "JWST Atmospheric Analysis" : "JWST Transit Spectroscopy Explorer"}
                </p>
              </div>
            </div>

            {/* Right: Controls */}
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              {/* Theme Toggle - Always visible */}
              <ThemeToggle />

              {/* Data Source Toggle - Premium segmented control */}
              <div className="flex items-center gap-2 text-sm font-sans" role="group" aria-label="Data source selection">
                <div
                  className="flex p-0.5 rounded-xl bg-[var(--background-secondary)] border border-[var(--border)]"
                  role="radiogroup"
                  aria-label="Data source"
                >
                  <button
                    onClick={() => {
                      setDataSource("demo");
                      announce("Switched to demo data mode");
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 ${
                      dataSource === "demo"
                        ? "bg-[var(--paper)] text-[var(--foreground)] shadow-sm"
                        : "text-[var(--muted)] hover:text-[var(--foreground)]"
                    }`}
                    role="radio"
                    aria-checked={dataSource === "demo"}
                    aria-label="Demo data"
                  >
                    Demo
                  </button>
                  <button
                    onClick={() => {
                      setDataSource("real");
                      announce("Switched to MAST archive data mode");
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 ${
                      dataSource === "real"
                        ? "bg-[var(--paper)] text-[var(--foreground)] shadow-sm"
                        : "text-[var(--muted)] hover:text-[var(--foreground)]"
                    }`}
                    role="radio"
                    aria-checked={dataSource === "real"}
                    aria-label="MAST archive data"
                  >
                    MAST
                  </button>
                </div>
              </div>

              {/* Target info - Desktop only */}
              {data && !isMobile && (
                <div className="text-right font-sans text-sm hidden lg:block">
                  <p className="text-[var(--foreground)]">{data.target}</p>
                  <p className="text-[var(--muted)]">
                    {data.metadata.instrument} {data.metadata.mode || ""}
                    {data.data_source === "mast" && (
                      <span className="ml-2 text-green-600">Live</span>
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8 safe-area-inset focus:outline-none"
      >
        {/* Target Selection */}
        <AnimatePresence mode="wait">
          {!selectedTarget && (
            <motion.div
              key="target-selector"
              id="target-selector"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <TargetSelector onSelect={setSelectedTarget} />
            </motion.div>
          )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-32" role="status" aria-live="polite">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto" aria-hidden="true" />
              <p className="mt-4 text-[var(--muted)] font-sans">
                {dataSource === "real"
                  ? "Fetching data from MAST archive..."
                  : "Loading transit data..."}
              </p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="flex items-center justify-center py-32" role="alert" aria-live="assertive">
            <div className="text-center max-w-md">
              <p className="text-red-500 mb-4">{error}</p>
              <button
                onClick={() => {
                  setDataSource("demo");
                  setError(null);
                  announce("Switched to demo data mode");
                }}
                className="text-sm text-[var(--accent)] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 rounded"
              >
                Switch to demo data
              </button>
            </div>
          </div>
        )}

        {/* Main Visualization */}
        {data && !loading && !error && (
          <motion.div
            key="visualization"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4 sm:space-y-6"
          >
            {/* Mobile: Planet Info Card */}
            {isMobile && planetInfo && (
              <div className="paper rounded-lg p-3 flex items-center justify-between text-xs font-sans">
                <span className="font-medium text-[var(--foreground)]">{data.target}</span>
                <div className="flex gap-3 text-[var(--muted)]">
                  {planetInfo.planet_radius && (
                    <span>{planetInfo.planet_radius.toFixed(1)} R<sub>J</sub></span>
                  )}
                  {planetInfo.orbital_period && (
                    <span>{planetInfo.orbital_period.toFixed(1)} d</span>
                  )}
                </div>
              </div>
            )}

            {/* Desktop Controls Row */}
            <div className="hidden sm:flex items-start justify-between gap-6 flex-wrap">
              <div className="flex items-center gap-6">
                {/* Binning Control */}
                <BinningSlider
                  value={binSize}
                  onChange={setBinSize}
                  disabled={dataSource === "real"}
                />

                {/* Planet Info */}
                {planetInfo && (
                  <div className="flex gap-4 text-xs font-sans text-[var(--muted)]">
                    {planetInfo.planet_radius && (
                      <span>R: {planetInfo.planet_radius.toFixed(2)} R_J</span>
                    )}
                    {planetInfo.orbital_period && (
                      <span>P: {planetInfo.orbital_period.toFixed(2)} d</span>
                    )}
                    {planetInfo.distance && (
                      <span>d: {planetInfo.distance.toFixed(0)} pc</span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4">
                <MolecularBands
                  bands={molecularBands}
                  enabled={enabledBands}
                  onToggle={(band) => {
                    const next = new Set(enabledBands);
                    if (next.has(band)) next.delete(band);
                    else next.add(band);
                    setEnabledBands(next);
                  }}
                />
                <ExportMenu
                  wavelengths={data.transmission_spectrum.wavelengths}
                  transitDepth={data.transmission_spectrum.transit_depth_ppm}
                  transitDepthErr={data.transmission_spectrum.transit_depth_err_ppm}
                  target={data.target}
                />
              </div>
            </div>

            {/* Transmission Spectrum - Main View */}
            <section className="paper rounded-xl p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold mb-1">Transmission Spectrum</h2>
              <p className="text-xs sm:text-sm text-[var(--muted)] font-sans mb-3 sm:mb-4">
                Transit depth reveals atmospheric absorption features
              </p>
              <div className="chart-responsive">
                <TransmissionSpectrum
                  wavelengths={data.transmission_spectrum.wavelengths}
                  transitDepth={data.transmission_spectrum.transit_depth_ppm}
                  transitDepthErr={data.transmission_spectrum.transit_depth_err_ppm}
                  molecularBands={molecularBands}
                  enabledBands={enabledBands}
                  selectedWavelength={selectedWavelength}
                  onWavelengthSelect={setSelectedWavelength}
                  onWavelengthHover={setHoveredWavelength}
                />
              </div>
            </section>

            {/* Two Column Layout - Stack on mobile */}
            {data.phase && data.flux && data.lightcurve && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* Spectrogram */}
                <section className="paper rounded-xl p-4 sm:p-6">
                  <h2 className="text-base sm:text-lg font-semibold mb-1">Spectral Time Series</h2>
                  <p className="text-xs sm:text-sm text-[var(--muted)] font-sans mb-3 sm:mb-4">
                    Flux variation across wavelength and orbital phase
                  </p>
                  <div className="chart-responsive">
                    <Spectrogram
                      wavelengths={data.wavelengths}
                      phase={data.phase}
                      flux={data.flux}
                      activeWavelength={activeWavelength}
                      onWavelengthSelect={setSelectedWavelength}
                    />
                  </div>
                </section>

                {/* Light Curve */}
                <section className="paper rounded-xl p-4 sm:p-6">
                  <h2 className="text-base sm:text-lg font-semibold mb-1">
                    Light Curve
                    {activeWavelength && (
                      <span className="text-[var(--accent)] ml-2 font-normal text-sm">
                        @ {activeWavelength.toFixed(2)} μm
                      </span>
                    )}
                  </h2>
                  <p className="text-xs sm:text-sm text-[var(--muted)] font-sans mb-3 sm:mb-4">
                    {activeWavelength
                      ? "Flux at selected wavelength during transit"
                      : "Tap spectrum to select wavelength"}
                  </p>
                  <div className="chart-responsive">
                    <Lightcurve
                      phase={data.phase}
                      flux={data.lightcurve.flux}
                      wavelengths={data.wavelengths}
                      fluxGrid={data.flux}
                      selectedWavelength={activeWavelength}
                    />
                  </div>
                </section>
              </div>
            )}

            {/* Real data notice */}
            {data.data_source === "mast" && !data.phase && (
              <div className="paper rounded-xl p-6 text-center">
                <p className="text-[var(--muted)] font-sans">
                  Time-series visualization available with demo data.
                  Real MAST data shows the extracted transmission spectrum.
                </p>
              </div>
            )}

            {/* Metadata Footer */}
            <footer className="text-center py-6 sm:py-8 text-xs sm:text-sm text-[var(--muted)] font-sans pb-20 sm:pb-8">
              {data.data_source === "simulated" ? (
                <p>
                  Simulated transit data.{" "}
                  <span className="hidden sm:inline">Switch to MAST mode for real JWST data.</span>
                </p>
              ) : (
                <p>
                  Data from{" "}
                  <a
                    href="https://mast.stsci.edu"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--accent)] hover:underline"
                  >
                    MAST Archive
                  </a>
                  {data.metadata.proposal_id && (
                    <span className="hidden sm:inline"> · Proposal {data.metadata.proposal_id}</span>
                  )}
                </p>
              )}
            </footer>
          </motion.div>
        )}
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Toolbar */}
      {isMobile && data && !loading && (
        <>
          {/* Persistent Bottom Bar */}
          <div className="fixed bottom-0 left-0 right-0 z-30 bg-[var(--paper)] border-t border-[var(--border)] safe-area-bottom">
            <div className="flex items-center justify-between px-4 py-3">
              {/* Planet Quick Info */}
              {planetInfo && (
                <div className="flex items-center gap-3 text-xs text-[var(--muted)] font-sans">
                  {planetInfo.planet_radius && (
                    <span>{planetInfo.planet_radius.toFixed(1)} R<sub>J</sub></span>
                  )}
                  {planetInfo.orbital_period && (
                    <span>{planetInfo.orbital_period.toFixed(1)}d</span>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMobileControlsOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--background-secondary)] text-sm font-medium"
                  aria-label="Open controls"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 3v18M3 12h18" />
                  </svg>
                  Controls
                </button>
                <ExportMenu
                  wavelengths={data.transmission_spectrum.wavelengths}
                  transitDepth={data.transmission_spectrum.transit_depth_ppm}
                  transitDepthErr={data.transmission_spectrum.transit_depth_err_ppm}
                  target={data.target}
                  compact
                />
              </div>
            </div>
          </div>

          {/* Mobile Bottom Sheet */}
          <div
            className={`bottom-sheet ${mobileControlsOpen ? "open" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-label="Chart controls"
          >
            <div className="bottom-sheet-handle" />
            <div className="p-4 space-y-6">
              {/* Close button */}
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-lg">Controls</h3>
                <button
                  onClick={() => setMobileControlsOpen(false)}
                  className="p-2 rounded-lg hover:bg-[var(--background)]"
                  aria-label="Close controls"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Binning Control */}
              <div>
                <h4 className="text-sm font-medium mb-2">Spectral Binning</h4>
                <BinningSlider
                  value={binSize}
                  onChange={setBinSize}
                  disabled={dataSource === "real"}
                />
              </div>

              {/* Molecular Bands */}
              <div>
                <h4 className="text-sm font-medium mb-2">Molecular Features</h4>
                <MolecularBands
                  bands={molecularBands}
                  enabled={enabledBands}
                  onToggle={(band) => {
                    const next = new Set(enabledBands);
                    if (next.has(band)) next.delete(band);
                    else next.add(band);
                    setEnabledBands(next);
                  }}
                />
              </div>

              {/* Planet Info */}
              {planetInfo && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Planet Properties</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {planetInfo.planet_radius && (
                      <div className="p-2 rounded-lg bg-[var(--background-secondary)]">
                        <span className="text-[var(--muted)] text-xs">Radius</span>
                        <p className="font-medium">{planetInfo.planet_radius.toFixed(2)} R<sub>J</sub></p>
                      </div>
                    )}
                    {planetInfo.orbital_period && (
                      <div className="p-2 rounded-lg bg-[var(--background-secondary)]">
                        <span className="text-[var(--muted)] text-xs">Period</span>
                        <p className="font-medium">{planetInfo.orbital_period.toFixed(2)} days</p>
                      </div>
                    )}
                    {planetInfo.distance && (
                      <div className="p-2 rounded-lg bg-[var(--background-secondary)]">
                        <span className="text-[var(--muted)] text-xs">Distance</span>
                        <p className="font-medium">{planetInfo.distance.toFixed(0)} pc</p>
                      </div>
                    )}
                    {planetInfo.equilibrium_temp && (
                      <div className="p-2 rounded-lg bg-[var(--background-secondary)]">
                        <span className="text-[var(--muted)] text-xs">Temperature</span>
                        <p className="font-medium">{planetInfo.equilibrium_temp.toFixed(0)} K</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Backdrop */}
          {mobileControlsOpen && (
            <div
              className="fixed inset-0 bg-black/50 z-30"
              onClick={() => setMobileControlsOpen(false)}
            />
          )}
        </>
      )}
    </div>
  );
}
