
// Distance between a and b assuming a: { x, y } and b: { x, y }
function dist(a, b) {
  return Math.sqrt(Math.pow(a.x-b.x, 2) + Math.pow(a.y-b.y, 2));
}

// Determine if two actors are equal
function eq(a, b) {
  return a.x === b.x && a.y === b.y && a.size === b.size && a.speed === b.speed;
}
