"use client";

import { GroomFigure, BrideFigure } from "@/components/kiss-cam/kiss-cam-puppet";

/**
 * Kiss Cam characters — layered PNG puppets only (see kiss-cam-puppet.tsx).
 * Pose animation comes from kiss-cam-pose.ts → kiss-cam-rig.ts.
 * Do not render legacy SVG characters alongside these figures.
 *
 * Keep this module as a thin export layer. Character artwork, rigging and
 * seam handling belong to the puppet implementation itself; adding a CSS
 * overlay here can create visible geometry over the generated artwork.
 */

export { GroomFigure, BrideFigure };
