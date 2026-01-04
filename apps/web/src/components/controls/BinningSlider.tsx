"use client";

interface BinningSliderProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export function BinningSlider({ value, onChange, disabled }: BinningSliderProps) {
  const binOptions = [5, 10, 20, 40, 50, 100];

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-sans text-[var(--muted)]">Binning:</span>
      <div className="flex items-center gap-1">
        {binOptions.map((bin) => (
          <button
            key={bin}
            onClick={() => onChange(bin)}
            disabled={disabled}
            className={`
              px-2 py-1 text-xs font-mono rounded transition-colors
              ${disabled
                ? "opacity-50 cursor-not-allowed"
                : value === bin
                  ? "bg-[var(--accent)] text-white"
                  : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--background)]"
              }
            `}
          >
            {bin}
          </button>
        ))}
      </div>
      {disabled && (
        <span className="text-xs text-[var(--muted-light)] italic">
          (not available for MAST data)
        </span>
      )}
    </div>
  );
}
