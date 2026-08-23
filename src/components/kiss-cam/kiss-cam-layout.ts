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
 */

/** Reserved band at the top for titles (keeps text above hair). */
export const HEADER_SAFE_PCT = 22;

/** Reserved band at the bottom for couple / event text (keeps text below shoes). */
export const BOTTOM_SAFE_PCT = 14;

/**
 * Character figure box height inside the character safe area.
 * Uses the safe-area container height (not the full viewport) so figures
 * cannot grow into the header or bottom text bands.
 */
export const FIGURE_HEIGHT_CLASS = "h-full max-h-full";

/**
 * Extra uniform shrink so hair/shoes keep breathing room inside the
 * character safe area during the small animation scale pulse (~1.018).
 * Bride scale remains GROOM_VISIBLE_H / BRIDE_VISIBLE_H relative to this.
 */
export const GROOM_BASE_SCALE = 0.92;

/** CSS custom properties applied on `.kiss-cam-stage`. */
export const STAGE_SAFE_AREA_STYLE = {
  ["--kiss-header-safe" as string]: `${HEADER_SAFE_PCT}%`,
  ["--kiss-bottom-safe" as string]: `${BOTTOM_SAFE_PCT}%`,
} as const;
