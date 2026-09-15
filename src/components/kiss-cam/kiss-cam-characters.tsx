"use client";

import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import {
  GroomFigure as BaseGroomFigure,
  BrideFigure,
} from "@/components/kiss-cam/kiss-cam-puppet";

/**
 * Kiss Cam characters — layered PNG puppets only.
 *
 * The production build previously added a pseudo-element waist gradient to the
 * groom. That gradient is the dark horizontal bar visible when the groom
 * canvas collapses. It is not part of the artwork and must never be rendered.
 *
 * The groom puppet also contains full-canvas absolutely-positioned PNGs. Its
 * canvas therefore needs explicit dimensions and must not use CSS size
 * containment, otherwise the browser can resolve the canvas as a collapsed
 * box and only a stray seam/pseudo layer remains visible.
 */
const GROOM_PRESENTATION_FIX =
  "!h-full !w-[calc(100cqh*0.5217391304)] !max-w-none !visible !opacity-100";

type GroomFigureProps = ComponentProps<typeof BaseGroomFigure>;

export function GroomFigure({ className, ...props }: GroomFigureProps) {
  return (
    <>
      <style>{`
        #kiss-cam-root .kiss-cam-figure[data-kiss-figure="groom"] {
          width: calc(100cqh * 0.5217391304) !important;
          height: 100% !important;
          min-width: calc(100cqh * 0.5217391304) !important;
          min-height: 100% !important;
          aspect-ratio: 720 / 1380 !important;
          contain: none !important;
        }

        #kiss-cam-root .kiss-cam-figure[data-kiss-figure="groom"] > div:first-child {
          width: 100% !important;
          height: 100% !important;
          min-width: 100% !important;
          min-height: 100% !important;
          aspect-ratio: 720 / 1380 !important;
          container-type: normal !important;
          contain: none !important;
        }
      `}</style>
      <BaseGroomFigure
        {...props}
        className={cn(className, GROOM_PRESENTATION_FIX)}
      />
    </>
  );
}

export { BrideFigure };
