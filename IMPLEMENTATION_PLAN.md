# AstroSpecVis Mobile-First UI/UX Implementation Plan

## Research Summary

### Sources Consulted
- [NASA Web Design System](https://nasa.github.io/nasawds-site/) - WCAG 2.0 AA compliance patterns
- [U.S. Web Design System - Data Visualizations](https://designsystem.digital.gov/components/data-visualizations/)
- [Nielsen Norman Group - Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/)
- [Jdaviz Documentation](https://jdaviz.readthedocs.io/) - STScI's spectroscopy tool
- [Smashing Magazine - Accessibility in Charts](https://www.smashingmagazine.com/2024/02/accessibility-standards-empower-better-chart-visual-design/)
- Chart.js, amCharts, MUI X documentation for touch gesture patterns

### Key Design Principles Identified

1. **Progressive Disclosure** - Show high-level overview first, reveal complexity on demand
2. **Touch-First Interaction** - Pinch-zoom, tap-to-activate, swipe navigation
3. **Accessibility First** - WCAG 2.0 AA compliance, screen reader support, contrast ratios
4. **Responsive Charts** - Aspect ratio changes, reduced detail on mobile, larger touch targets
5. **Linked Visualizations** - Changes in one view propagate to others (Jdaviz pattern)

---

## Current State Analysis

### Strengths
- Clean research paper aesthetic with light/dark themes
- Colorblind-safe Okabe-Ito molecular band palette
- Uncertainty bands (1σ, 2σ) visualization
- Export functionality (CSV, JSON, PNG)
- Category-based target filtering

### Weaknesses
- Not mobile-optimized (charts don't resize well)
- No touch gestures (pinch-zoom, pan)
- Dense control layout on small screens
- No accessibility support (aria labels, screen reader data tables)
- Fixed chart heights don't adapt to viewport

---

## Implementation Plan

### Phase 1: Mobile Layout Foundation
**Goal:** Responsive shell that works on all devices

1. **Breakpoint System**
   - Mobile: < 640px (single column, stacked views)
   - Tablet: 640px - 1024px (flexible grid)
   - Desktop: > 1024px (current layout)

2. **Header Redesign**
   - Collapsible header on scroll (mobile)
   - Hamburger menu for controls on mobile
   - Sticky back button for navigation

3. **Target Selector Mobile View**
   - Full-screen overlay on mobile
   - Swipe-enabled category tabs
   - Larger touch targets (48px minimum)
   - Search input with auto-focus

### Phase 2: Responsive Charts
**Goal:** Charts that adapt to viewport and support touch

1. **Dynamic Sizing**
   - Aspect ratio changes: 16:9 desktop → 4:3 tablet → 1:1 mobile
   - useMediaQuery hook for breakpoint detection
   - ResizeObserver for container-aware sizing

2. **Touch Gestures**
   - Pinch-to-zoom on Transmission Spectrum
   - Two-finger pan when zoomed
   - Tap-to-activate pattern (amCharts style)
   - Double-tap to reset zoom

3. **Mobile-Optimized Rendering**
   - Reduced point density on mobile (auto-binning)
   - Larger data point hit areas for selection
   - Simplified axis labels (fewer ticks)
   - Hide uncertainty bands on <640px (too dense)

### Phase 3: Progressive Disclosure
**Goal:** Reduce cognitive load through layered information

1. **Controls Reorganization**
   - Primary: Data source toggle, back button
   - Secondary (collapsible): Binning, molecular bands, export
   - Floating action button (FAB) for mobile controls

2. **Chart Details on Demand**
   - Tap a data point → show tooltip with full details
   - Long-press → show molecular band info
   - Bottom sheet for detailed wavelength analysis

3. **Planet Info Progressive**
   - Show name + type initially
   - Tap to expand → full metadata
   - Link to external resources (NASA archive)

### Phase 4: Accessibility
**Goal:** WCAG 2.0 AA compliance

1. **Screen Reader Support**
   - Hidden data table with `aria-hidden` on charts
   - Chart descriptions via `aria-label`
   - Announce data loading/errors via live regions

2. **Keyboard Navigation**
   - Arrow keys to navigate data points
   - Enter to select/activate
   - Tab through controls
   - Focus indicators on all interactive elements

3. **Visual Accessibility**
   - Minimum 4.5:1 contrast ratio for text
   - 3:1 for UI components
   - Pattern fills as alternative to colors
   - Resizable up to 200% without loss of function

### Phase 5: Performance Optimization
**Goal:** Smooth 60fps on mobile devices

1. **Canvas Optimization**
   - RequestAnimationFrame for smooth rendering
   - Offscreen canvas for complex calculations
   - Debounced resize handlers

2. **Data Management**
   - Client-side caching of fetched spectra
   - Progressive loading for large datasets
   - Web Workers for data processing

3. **Bundle Optimization**
   - Dynamic imports for chart components
   - Preload critical assets
   - Optimize Framer Motion animations

---

## Component Changes

### New Components
```
src/components/
├── layout/
│   ├── MobileHeader.tsx      # Collapsible mobile header
│   ├── ControlSheet.tsx      # Bottom sheet for controls
│   └── FloatingControls.tsx  # FAB for mobile
├── accessibility/
│   ├── DataTable.tsx         # Screen reader data table
│   └── LiveRegion.tsx        # Announcements
└── hooks/
    ├── useMediaQuery.ts      # Breakpoint detection
    ├── usePinchZoom.ts       # Touch gesture handling
    └── useChartDimensions.ts # Responsive sizing
```

### Modified Components
- `TransmissionSpectrum.tsx` - Add touch gestures, responsive sizing
- `Spectrogram.tsx` - Simplify for mobile, add tap interactions
- `Lightcurve.tsx` - Responsive height, touch selection
- `TargetSelector.tsx` - Full-screen mobile overlay
- `MolecularBands.tsx` - Collapsible on mobile
- `ExportMenu.tsx` - Move to bottom sheet on mobile

---

## Visual Design Updates

### Typography Scale (Mobile-First)
```css
--font-size-xs: 0.75rem;    /* 12px - labels */
--font-size-sm: 0.875rem;   /* 14px - body */
--font-size-base: 1rem;     /* 16px - default */
--font-size-lg: 1.125rem;   /* 18px - headings */
--font-size-xl: 1.5rem;     /* 24px - titles */
```

### Spacing Scale
```css
--space-1: 0.25rem;  /* 4px */
--space-2: 0.5rem;   /* 8px */
--space-3: 0.75rem;  /* 12px */
--space-4: 1rem;     /* 16px */
--space-6: 1.5rem;   /* 24px */
--space-8: 2rem;     /* 32px */
```

### Touch Targets
- Minimum 48x48px for all interactive elements
- 8px minimum gap between targets
- Larger hit areas for chart data points

---

## Priority Order

| Priority | Task | Effort | Impact |
|----------|------|--------|--------|
| P0 | Responsive breakpoints + layout | Medium | High |
| P0 | Mobile header + navigation | Low | High |
| P1 | Chart responsive sizing | Medium | High |
| P1 | Target selector mobile view | Medium | High |
| P2 | Pinch-zoom gestures | High | Medium |
| P2 | Progressive disclosure controls | Medium | Medium |
| P3 | Screen reader data tables | Medium | Medium |
| P3 | Keyboard navigation | Medium | Low |
| P4 | Performance optimization | High | Medium |

---

## Success Metrics

1. **Lighthouse Mobile Score** - Target: 90+
2. **Touch Accuracy** - <5% mis-taps on data points
3. **Load Time** - <3s on 3G connection
4. **Accessibility Score** - WCAG 2.0 AA compliant
5. **Chart Render Time** - <100ms on mobile

---

## Not In Scope (Future)

- Native mobile app (React Native)
- Offline support / PWA
- Real-time collaboration
- 3D visualizations
- VR/AR support
