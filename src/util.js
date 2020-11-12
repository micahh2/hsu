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
   * Determine if two GameObjects are equal
   *
   * @param {GameObject} a
   * @param {GameObject} b
   * @depreciated
   */
  eq(a, b) {
    return a.x === b.x
      && a.y === b.y
      && a.size === b.size
      && a.speed === b.speed;
  },
};
