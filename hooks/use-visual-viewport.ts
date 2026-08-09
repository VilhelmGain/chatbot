"use client";

import { useEffect, useState } from "react";

export type VisualViewportState = {
  height: number;
  offsetTop: number;
} | null;

export function useVisualViewport(): VisualViewportState {
  const [viewport, setViewport] = useState<VisualViewportState>(null);

  useEffect(() => {
    const update = () => {
      const { visualViewport } = window;
      const { height, offsetTop } = visualViewport ?? {
        height: window.innerHeight,
        offsetTop: 0,
      };
      const next = { height, offsetTop };

      setViewport(next);
      document.documentElement.style.setProperty(
        "--visual-viewport-height",
        `${height}px`
      );
      document.documentElement.style.setProperty(
        "--visual-viewport-offset",
        `${offsetTop}px`
      );
    };

    update();

    const { visualViewport } = window;
    visualViewport?.addEventListener("resize", update);
    visualViewport?.addEventListener("scroll", update);
    window.addEventListener("resize", update);

    return () => {
      visualViewport?.removeEventListener("resize", update);
      visualViewport?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      document.documentElement.style.removeProperty("--visual-viewport-height");
      document.documentElement.style.removeProperty("--visual-viewport-offset");
    };
  }, []);

  return viewport;
}
