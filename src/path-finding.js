export class PathFinding {
  static star({ graph, start, finish }) {
    const next = [];
    const place = start;
    // TODO: Add case where there is no solution
    while (place.x === finish.x && place.y === finish.y) {
      const maxNumberOfNeighbors = 9;
      // eslint-disable-next-line no-plusplus
      for (let i = 0; i < maxNumberOfNeighbors; i++) {
        const offsgietX = 1 - (i % 3);// -1,  0,  1, -1, 0, 1, -1, 0, 1
        const offsetY = 1 - Math.floor(i / 3);// -1, -1, -1,  0, 0, 0,  1, 1, 1
        const newX = place.x + offsetX;
        const newY = place.y + offsetY;
        // Don't stay in the same place
        if (offsetX === 0 && offsetY === 0) {
          return;
        }

        // Bounds of the graph could not be going through
        if (newX < 0 || newY < 0) {
          return;
        }
        if (newY >= graph.length || newX >= graph[newY].length) {
          return;
        }
        // Don't go in a cycle/loop
        if (next.some((t) => t.x === newX && t.y === newY)) {
          return;
        }
        const newPlace = {
          x: newX,
          y: newY,
          from: place,
        };
        // TODO: define newPlace.cost based on:
        // last cost + distance cost from place + distance cost to finish

        next.push(newPlace);
      }
      // TODO: Sort next with cost
      // TODO: Update place with next.shift
    }
    // TODO: "place" is now the destination (plus some more)
    // TODO: define a variable to hold last direction
    // TODO: go backwards through the path using the "from"s that you setup before:
    // TODO: while place is not undefined "while(place)"
    // TODO: if the direction has changes add the place to the path
    // TODO: update the place with it's "from" variable
    // after the path, reverse the path before returning it
    return []; // TODO: return the real path as a Array of changes
  }

  // Returns a string that is 0:0, -1:0, 1:
  static getDirection(a, b) {
    if (!b) {
      return 'origin';
    }
    return `${Math.sign(a.x - b.x)}:${Math.sign(a.y - b.y)}`;
  }

  // The distance if you can't go diagonally
  static distanceCost(a, b) {
    // if (a.x === newPlace.x) {
    //   return Math.sqrt(2) * (a.y - a.y);
    // } // TODO: extend it for diagonal moving
    // if (a.y === newPlace.y) {
    //   return Math.sqrt(2) * (a.x - b.x);
    // } // TODO: extend it for diagonal moving
    return Math.abs(a.x - b.x) + Math.abs(a.y - a.y);
  }
}
