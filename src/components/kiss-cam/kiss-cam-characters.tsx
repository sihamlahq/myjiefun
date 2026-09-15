"use client";

import type { ComponentProps } from "react";
import { GroomFigure as BaseGroomFigure, BrideFigure } from "@/components/kiss-cam/kiss-cam-puppet";

/**
 * Kiss Cam characters — layered PNG puppets only (see kiss-cam-puppet.tsx).
 * Pose animation comes from kiss-cam-pose.ts → kiss-cam-rig.ts.
 * Do not render legacy SVG characters alongside these figures.
 *
 * The groom artwork is assembled from separate generated torso/trouser PNGs.
 * The seam treatment lives here as a presentation layer so the puppet rig,
 * pose animation, and source artwork remain untouched.
 */

const GROOM_WAIST_BLEND =
  "relative after:pointer-events-none after:absolute after:left-[25%] after:top-[51%] after:h-[9%] after:w-[50%] after:rounded-b-[4%] after:bg-gradient-to-b after:from-black/75 after:via-black/55 after:to-transparent after:content-[''] after:z-[3]";

type GroomFigureProps = ComponentProps<typeof BaseGroomFigure>;

export function GroomFigure({ className, ...props }: GroomFigureProps) {
  return <BaseGroomFigure {...props} className={`${className ?? ""} ${GROOM_WAIST_BLEND}`} />;
}

export { BrideFigure };
