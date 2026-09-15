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
 * Root cause: the groom's full-canvas figure contains only absolutely
 * positioned artwork, while its inner 720x1380 canvas was also declared as a
 * size container with width:auto. CSS size containment ignores child content
 * when determining the container's size, so that auto-width canvas can collapse
 * and make the groom artwork disappear. The outer figure gets a definite width
 * from the character stage height, while the inner canvas is forced to fill it
 * and is no longer a size container. cqw/cqh then resolve against the already
 * sized character stage.
 *
 * The presentation CSS below is deliberately explicit rather than relying on
 * generated utility variants: it guarantees the actual puppet canvas cannot
 * collapse back to a one-dimensional dark line on mobile/browser builds.
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
