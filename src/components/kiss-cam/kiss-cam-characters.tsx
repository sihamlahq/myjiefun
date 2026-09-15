"use client";

import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import {
  GroomFigure as BaseGroomFigure,
  BrideFigure,
} from "@/components/kiss-cam/kiss-cam-puppet";

/**
 * Presentation guard for the groom puppet.
 *
 * The puppet artwork uses cqw/cqh inside its 720x1380 canvas, so that canvas
 * MUST remain a size container. We give both levels definite dimensions here
 * instead of disabling the container. We also suppress the old generated-PNG
 * seam patch and the temporary trouser clip; the base artwork already has the
 * correct full-body composition.
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
          max-width: none !important;
          aspect-ratio: 720 / 1380 !important;
          contain: none !important;
        }

        #kiss-cam-root .kiss-cam-figure[data-kiss-figure="groom"] > div:first-child {
          width: 100% !important;
          height: 100% !important;
          min-width: 100% !important;
          min-height: 100% !important;
          max-width: none !important;
          aspect-ratio: 720 / 1380 !important;
          container-type: size !important;
          contain: none !important;
        }

        /* Remove the old artificial torso-over-waist patch. It was being
           transformed with the groom body and became the huge black wedge. */
        #kiss-cam-root .kiss-cam-figure[data-kiss-figure="groom"] [aria-hidden="true"][style*="clip-path"] {
          display: none !important;
        }

        /* Restore the original full legs layer; no CSS seam mask is needed. */
        #kiss-cam-root .kiss-cam-figure[data-kiss-figure="groom"] .kiss-cam-legs img[src$="/legs.png"] {
          clip-path: none !important;
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
