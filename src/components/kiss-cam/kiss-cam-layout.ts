/**
 * Kiss Cam stage layout — text safe areas + character base placement.
 *
 * Artwork is frozen. This module only controls where characters sit on the
 * stage relative to header / bottom text. Animation offsets from poseForPhase()
 * remain additive on top of CHARACTER_BASE (see kiss-cam-rig.ts).
 *
 * Vertical regions (percent of stage height):
 *
 *   ┌─────────────────────────────┐ 0%
 *   │      HEADER SAFE AREA       │  ← TableWedding / Kiss Cam / couple names
 *   ├─────────────────────────────┤ HEADER_SAFE_PCT
 *   │                             │
 *   │     CHARACTER SAFE AREA     │  ← full-body groom + bride only
 *   │                             │
 *   ├─────────────────────────────┤ 100% − BOTTOM_SAFE_PCT
 *   │      BOTTOM SAFE AREA       │  ← couple names / wedding title
 *   └─────────────────────────────┘ 100%
 *
 * CRITICAL: figure height must resolve to a real pixel height. Using
 * `h-full` on a child of a height-less absolute wrapper collapses to 0
 * and makes both characters invisible. The character stage provides an
 * `absolute inset-0` containing block so `h-full` works.
 */

/** Reserved band at the top for titles (keeps text above hair). */
export const HEADER_SAFE_PCT = 20;

/** Reserved band at the bottom for couple / event text (keeps text below shoes). */
export const BOTTOM_SAFE_PCT = 12;

/**
 * Character figure box height inside the character safe area.
 * Parent must be a sized box (see character stage `absolute inset-0`).
 * Do NOT use viewport `vh` here — that ignored the safe-area bands.
 */
export const FIGURE_HEIGHT_CLASS = "h-full max-h-full";

/**
 * Uniform shrink so hair/shoes keep breathing room inside the character
 * band (covers footAlign nudge + small animation scale pulse).
 * Bride scale remains GROOM_VISIBLE_H / BRIDE_VISIBLE_H relative to this.
 */
export const GROOM_BASE_SCALE = 0.88;

/** CSS custom properties applied on `.kiss-cam-stage`. */
export const STAGE_SAFE_AREA_STYLE = {
  ["--kiss-header-safe" as string]: `${HEADER_SAFE_PCT}%`,
  ["--kiss-bottom-safe" as string]: `${BOTTOM_SAFE_PCT}%`,
} as const;
