"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface ChartDimensions {
  width: number;
  height: number;
  aspectRatio: number;
}

interface UseChartDimensionsOptions {
  minHeight?: number;
  maxHeight?: number;
  mobileAspectRatio?: number;
  tabletAspectRatio?: number;
  desktopAspectRatio?: number;
}

export function useChartDimensions(
  options: UseChartDimensionsOptions = {}
): [React.RefObject<HTMLDivElement | null>, ChartDimensions] {
  const {
    minHeight = 200,
    maxHeight = 500,
    mobileAspectRatio = 1,
    tabletAspectRatio = 4 / 3,
    desktopAspectRatio = 16 / 9,
  } = options;

  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<ChartDimensions>({
    width: 800,
    height: 400,
    aspectRatio: desktopAspectRatio,
  });

  const calculateDimensions = useCallback(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const viewportWidth = window.innerWidth;

    let aspectRatio: number;
    if (viewportWidth < 640) {
      aspectRatio = mobileAspectRatio;
    } else if (viewportWidth < 1024) {
      aspectRatio = tabletAspectRatio;
    } else {
      aspectRatio = desktopAspectRatio;
    }

    let height = width / aspectRatio;
    height = Math.max(minHeight, Math.min(maxHeight, height));

    setDimensions({ width, height, aspectRatio });
  }, [minHeight, maxHeight, mobileAspectRatio, tabletAspectRatio, desktopAspectRatio]);

  useEffect(() => {
    calculateDimensions();

    const resizeObserver = new ResizeObserver(() => {
      calculateDimensions();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    window.addEventListener("resize", calculateDimensions);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", calculateDimensions);
    };
  }, [calculateDimensions]);

  return [containerRef, dimensions];
}
