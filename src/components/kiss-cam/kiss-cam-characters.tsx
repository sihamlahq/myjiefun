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
 * The groom is assembled from separate generated PNG layers. The artwork is
 * correctly sized as a 720x1380 cqw/cqh container, while this presentation
 * layer handles the small jacket/trouser overlap at the waist.
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

        /*
         * The jacket/trouser masters have a tiny transparent-edge mismatch at
         * the waist. The bridge must move with every transform applied to the
         * actual groom artwork.
         *
         * The torso and arms live inside .kiss-cam-breathe. The old bridge was
         * attached to .kiss-cam-body, so the 2px breathing translation could
         * separate the bridge from the real jacket/waist pixels during motion,
         * making the upper waist visibly pinch/shrink for part of the cycle.
         * Attach the bridge to the same animated wrapper so its position is
         * identical to the torso on every frame.
         *
         * Keep this bridge narrow and use the real torso pixels — never a black
         * gradient — so it only closes the generated-PNG seam.
         */
        #kiss-cam-root .kiss-cam-figure[data-kiss-figure="groom"] .kiss-cam-breathe::after {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 10;
          background: url("/assets/kiss-cam/groom/torso.png") center / 100% 100% no-repeat;
          clip-path: inset(42.5% 22% 51.5% 22%);
          transform-origin: 50% 44.4%;
          transform: translateY(0.7%) scaleY(1.02);
        }

        /* No legacy seam mask or trouser clip. */
        #kiss-cam-root .kiss-cam-figure[data-kiss-figure="groom"] [aria-hidden="true"][style*="clip-path"] {
          display: none !important;
        }
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
