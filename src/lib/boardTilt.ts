/**
 * The board leans back by this much. CSS tilts the DOM board; the 3D layer tilts its board plane
 * by the same angle with a camera at the same distance, so pieces stand exactly on their tiles.
 */
export const BOARD_TILT_DEG = 32;
/** CSS perspective and camera distance, as a multiple of the board width */
export const PERSPECTIVE = 2.4;
/** The 3D canvas reaches this far past each side of the board, so pieces near the near edge are not cut off */
export const CANVAS_EXTEND = 0.15;
