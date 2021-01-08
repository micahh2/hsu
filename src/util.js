/**
 * Util.
 */
export const Util = {
  /**
   * Get the distance between a and b,
   * assuming a: { x, y, width, height } and b: { x, y, width, height }
   *
   * @param {} a
   * @param {} b
   */
  dist(a, b) {
    const ax = a.x + (a.width || 0) / 2; // Get the centers
    const ay = a.y + (a.height || 0) / 2;
    const bx = b.x + (b.width || 0) / 2;
    const by = b.y + (b.height || 0) / 2;
    return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
  },

  /**
   * isWithinArea.
   *
   * @param {}
   */
  isWithinArea({ area, actor }) {
    const diffx = actor.x - area.x;
    const diffy = actor.y - area.y;
    return diffx >= 0 && diffx <= area.width && diffy >= 0 && diffy <= area.height;
  },
};
