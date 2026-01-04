"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useBreakpoint } from "@/hooks/useMediaQuery";

// Use relative URLs for API routes (Next.js API routes)
const API_URL = "";

interface Target {
  name: string;
  search: string;
  type: string;
  features: string[];
  proposal: string;
  description: string;
}

interface TargetSelectorProps {
  onSelect: (target: string) => void;
}

const TYPE_CATEGORIES = {
  "Gas Giants": ["Hot Saturn", "Hot Jupiter", "Warm Jupiter", "Warm Neptune"],
  "Sub-Neptunes": ["Sub-Neptune", "Super-Earth"],
  "Rocky Planets": ["Earth-sized"],
};

const TYPE_ORDER = ["Gas Giants", "Sub-Neptunes", "Rocky Planets"];

export function TargetSelector({ onSelect }: TargetSelectorProps) {
  const [targets, setTargets] = useState<Target[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { isMobile } = useBreakpoint();

  useEffect(() => {
    fetch(`${API_URL}/api/mast/targets`)
      .then((res) => res.json())
      .then((data) => {
        setTargets(data.targets);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const groupedTargets = useMemo(() => {
    const groups: Record<string, Target[]> = {};

    for (const category of TYPE_ORDER) {
      groups[category] = [];
    }

    for (const target of targets) {
      // Apply search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matches =
          target.name.toLowerCase().includes(query) ||
          target.type.toLowerCase().includes(query) ||
          target.features.some((f) => f.toLowerCase().includes(query));
        if (!matches) continue;
      }

      // Find category
      for (const [category, types] of Object.entries(TYPE_CATEGORIES)) {
        if (types.includes(target.type)) {
          groups[category].push(target);
          break;
        }
      }
    }

    return groups;
  }, [targets, searchQuery]);

  const filteredGroups = useMemo(() => {
    if (!filter) return groupedTargets;
    return { [filter]: groupedTargets[filter] || [] };
  }, [groupedTargets, filter]);

  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  const totalCount = targets.length;
  const filteredCount = Object.values(groupedTargets).flat().length;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="text-center mb-8 sm:mb-12">
        <p className="text-xs sm:text-sm uppercase tracking-widest text-[var(--accent)] font-sans font-medium mb-2">
          JWST Transit Spectroscopy
        </p>
        <h2 className="text-2xl sm:text-4xl font-semibold mb-3 sm:mb-4 tracking-tight">
          Select an Exoplanet
        </h2>
        <p className="text-sm sm:text-base text-[var(--muted)] max-w-xl mx-auto px-4 font-sans">
          Explore atmospheric data from {totalCount} confirmed exoplanets
        </p>
      </div>

      {/* Search and Filters */}
      <div className="space-y-3 sm:space-y-0 sm:flex sm:flex-wrap sm:items-center sm:justify-center sm:gap-4 mb-6 sm:mb-8 overflow-hidden">
        <div role="search" className="px-0">
          <label htmlFor="planet-search" className="sr-only">Search exoplanets</label>
          <input
            id="planet-search"
            type="text"
            placeholder="Search planets, types, molecules..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-64 px-4 py-3 sm:py-2 text-base sm:text-sm font-sans rounded-lg
                       bg-[var(--paper)] border border-[var(--border)]
                       focus:outline-none focus:border-[var(--accent)]
                       placeholder:text-[var(--muted-light)]"
            autoComplete="off"
            autoCapitalize="off"
            aria-describedby="search-results-status"
          />
        </div>
        {/* Horizontal scrollable filters on mobile */}
        <div className="w-full sm:w-auto overflow-hidden">
          <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide" role="group" aria-label="Filter by planet type">
          <button
            onClick={() => setFilter(null)}
            className={`px-3 py-2 sm:py-1.5 text-sm sm:text-xs font-sans rounded-lg transition-colors whitespace-nowrap flex-shrink-0
              ${!filter
                ? "bg-[var(--accent)] text-white"
                : "border border-[var(--border)] hover:border-[var(--accent)]"
              }`}
            aria-pressed={!filter}
          >
            All ({filteredCount})
          </button>
          {TYPE_ORDER.map((category) => (
            <button
              key={category}
              onClick={() => setFilter(filter === category ? null : category)}
              className={`px-3 py-2 sm:py-1.5 text-sm sm:text-xs font-sans rounded-lg transition-colors whitespace-nowrap flex-shrink-0
                ${filter === category
                  ? "bg-[var(--accent)] text-white"
                  : "border border-[var(--border)] hover:border-[var(--accent)]"
                }`}
              aria-pressed={filter === category}
            >
              {isMobile ? category.split(" ")[0] : category} ({groupedTargets[category]?.length || 0})
            </button>
          ))}
          </div>
        </div>
        <div id="search-results-status" className="sr-only" aria-live="polite">
          {searchQuery && `${filteredCount} planets found`}
        </div>
      </div>

      {/* Grouped Targets */}
      {TYPE_ORDER.map((category) => {
        const categoryTargets = filteredGroups[category];
        if (!categoryTargets || categoryTargets.length === 0) return null;

        return (
          <div key={category} className="mb-6 sm:mb-8">
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-[var(--foreground-secondary)]">
              {category}
              <span className="text-sm font-normal text-[var(--muted)] ml-2">
                ({categoryTargets.length})
              </span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {categoryTargets.map((target, i) => (
                <motion.button
                  key={target.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  onClick={() => onSelect(target.name)}
                  className="paper rounded-xl p-4 sm:p-5 text-left
                             hover:border-[var(--accent)] hover:-translate-y-0.5
                             transition-all duration-200 group active:scale-[0.98] touch-target
                             focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
                  aria-label={`${target.name}, ${target.type}. ${target.features.join(", ")}. ${target.description}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="text-base sm:text-lg font-semibold group-hover:text-[var(--accent)] transition-colors truncate">
                        {target.name}
                      </h4>
                      <p className="text-xs text-[var(--muted)] font-sans">
                        {target.type}
                      </p>
                    </div>
                    <span className="text-xs font-mono text-[var(--muted-light)] bg-[var(--background)] px-2 py-0.5 rounded ml-2 flex-shrink-0">
                      {target.proposal}
                    </span>
                  </div>

                  <p className="text-sm text-[var(--muted)] mb-3 line-clamp-2">
                    {target.description}
                  </p>

                  <div className="flex flex-wrap gap-1.5">
                    {target.features.slice(0, isMobile ? 3 : 4).map((feature) => (
                      <span
                        key={feature}
                        className="text-xs font-sans px-2 py-0.5 rounded-full
                                 bg-[var(--accent)]/10 text-[var(--accent)]"
                      >
                        {feature}
                      </span>
                    ))}
                    {target.features.length > (isMobile ? 3 : 4) && (
                      <span className="text-xs text-[var(--muted)]">
                        +{target.features.length - (isMobile ? 3 : 4)}
                      </span>
                    )}
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        );
      })}

      {/* No results */}
      {filteredCount === 0 && (
        <div className="text-center py-12 text-[var(--muted)]">
          No planets found matching "{searchQuery}"
        </div>
      )}

      {/* Data source note */}
      <p className="text-center text-xs text-[var(--muted-light)] mt-8">
        Data from{" "}
        <a
          href="https://mast.stsci.edu"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--accent)] hover:underline"
        >
          MAST Archive
        </a>
        {" "}and{" "}
        <a
          href="https://exoplanetarchive.ipac.caltech.edu"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--accent)] hover:underline"
        >
          NASA Exoplanet Archive
        </a>
      </p>
    </div>
  );
}
