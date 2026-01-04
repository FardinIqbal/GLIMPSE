"use client";

interface MolecularBand {
  color: string;
  ranges: [number, number][];
  name: string;
}

interface MolecularBandsProps {
  bands: Record<string, MolecularBand>;
  enabled: Set<string>;
  onToggle: (band: string) => void;
}

export function MolecularBands({ bands, enabled, onToggle }: MolecularBandsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <span className="text-xs font-sans text-[var(--muted)] self-center mr-2">
        Molecular Features:
      </span>
      {Object.entries(bands).map(([key, band]) => (
        <button
          key={key}
          onClick={() => onToggle(key)}
          className={`
            text-xs font-sans px-3 py-1.5 rounded-full border transition-all
            ${enabled.has(key)
              ? "border-transparent text-white"
              : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--muted)]"
            }
          `}
          style={{
            backgroundColor: enabled.has(key) ? band.color : "transparent",
          }}
        >
          {band.name}
        </button>
      ))}
    </div>
  );
}
