/** Shared arena constants — used by both the simulation and the rendering. */

/**
 * Distance from the canvas edge treated as "wall". The wall-avoidance
 * behaviour steers away from it and the scene draws the boundary at it, so the
 * two must agree — keep this the single source of truth.
 */
export const WALL_MARGIN = 40;
