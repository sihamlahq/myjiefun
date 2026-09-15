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
 * The old artificial groom seam patch is hidden at the presentation boundary;
 * the jacket and trouser layers should meet naturally.
 */
const GROOM_PRESENTATION_FIX =
  "!h-full !w-[calc(100cqh*0.5217391304)] !max-w-none !visible !opacity-100 [&>div:first-child]:w-full! [&>div:first-child]:h-full! [&>div:first-child]:[container-type:normal]! [&_[aria-hidden=\"true\"][style*='clip-path']]:hidden";

type GroomFigureProps = ComponentProps<typeof BaseGroomFigure>;

export function GroomFigure({ className, ...props }: GroomFigureProps) {
  return (
    <BaseGroomFigure
      {...props}
      className={cn(className, GROOM_PRESENTATION_FIX)}
    />
  );
}

export { BrideFigure };
