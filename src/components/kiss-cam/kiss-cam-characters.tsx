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
 * The groom puppet is given an explicit aspect-ratio width because its outer
 * absolute figure contains only absolutely-positioned artwork layers. On
 * narrow/mobile layouts, width:auto can otherwise collapse/shrink and make
 * the full-canvas groom layers disappear or stretch.
 *
 * The old artificial groom seam patch is hidden at the presentation boundary;
 * the jacket and trouser layers should meet naturally.
 */
const GROOM_PRESENTATION_FIX =
  "!h-full !w-[calc(100cqh*0.5217391304)] !max-w-none !visible !opacity-100 [&_[aria-hidden=\"true\"][style*='clip-path']]:hidden";

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
