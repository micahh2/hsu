import { expect } from 'chai';
import { PathFinding } from './path-finding.js';

const o = 0; // intermediate points when going without turn (the forward trace)
const u = 0; // turning "u-points"
const s = 0; // start point
const f = 0; // finish point

function toObjectGraph(arrayGraph) {
  const maxNumberOfNeighbors = 9;
  const objectGraph = [];
  arrayGraph.forEach((a, i) => {
    a.forEach((b, j) => {
      if (arrayGraph[i][j] > 0) { return; }
      const area = { x: j, y: i, width: 1, height: 1, neighbors: [] };
      for (let l = 0; l < maxNumberOfNeighbors; l++) {
        const offsetX = 1 - (l % 3);
        const offsetY = 1 - Math.floor(l / 3);
        const newX = j + offsetX;
        const newY = i + offsetY;
        if (offsetX === 0 && offsetY === 0) { continue; }
        if (newY < 0 || newX < 0) { continue; }
        if (newY >= arrayGraph.length || newX >= arrayGraph[0].length) { continue; }
        if (arrayGraph[newY][newX] > 0) { continue; }
        const neighbor = objectGraph.find((t) => t.x === newX && t.y === newY);
        if (!neighbor) { continue; }
        area.neighbors.push(neighbor);
        neighbor.neighbors.push(area);
      }
      objectGraph.push(area);
    });
  });
  return objectGraph;
}

describe('aStar', () => {
  it('should find a valid path', () => {
    const graph = toObjectGraph([
      [0, u, o, o, f],
      [u, 1, 1, 1, 1],
      [0, u, o, u, 0],
      [1, 1, 1, 1, u],
      [s, o, o, u, 0],
    ]);
    const start = { x: 0, y: 4 };
    const finish = { x: 4, y: 0 };
    const path = PathFinding.aStar({ graph, start, finish });
    expect(path).to.eql([
      { x: 3, y: 4 },
      { x: 4, y: 3 },
      { x: 3, y: 2 },
      { x: 1, y: 2 },
      { x: 0, y: 1 },
      { x: 1, y: 0 },
      finish,
    ]);
  });

  it('should generate an optimal path', () => {
    const start = { x: 0, y: 4 };
    const finish = { x: 4, y: 0 };
    const graph = toObjectGraph([
      [0, o, 0, 0, f],
      [o, 1, 1, 1, 1],
      [0, 1, 0, 0, 0],
      [0, 1, 0, 0, 0],
      [s, 1, 0, 0, 0],
    ]);
    const path = PathFinding.aStar({ graph, start, finish });
    expect(path).not.null;
    expect(path).to.eql([{ x: 0, y: 1 }, { x: 1, y: 0 }, finish]);
  });

  it('should generate a diagonal path', () => {
    const graph = toObjectGraph([
      [0, 0, 1, 1, f],
      [0, 1, 1, o, 1],
      [1, 1, o, 1, 1],
      [1, o, 1, 1, 0],
      [s, 1, 1, 0, 0],
    ]);
    const start = { x: 0, y: 4 };
    const finish = { x: 4, y: 0 };
    const path = PathFinding.aStar({ graph, start, finish });
    expect(path).not.null;
    expect(path).to.eql([finish]);
  });

  it('should go straight over a wall, then diagonal to the right', () => {
    const graph = toObjectGraph([
      [0, u, 0, 0, 0],
      [u, 1, o, 0, 0],
      [o, 1, 0, o, 0],
      [o, 1, 0, 0, f],
      [s, 1, 0, 0, 0],
    ]);
    const start = { x: 0, y: 4 };
    const finish = { x: 4, y: 3 };
    const path = PathFinding.aStar({ graph, start, finish });
    expect(path).not.null;
    expect(path).to.eql([{ x: 0, y: 1 }, { x: 1, y: 0 }, finish]);
  });

  it('should go straight up, diagonal over the wall, and straight down', () => {
    const graph = toObjectGraph([
      [0, 0, u, 0, 0],
      [0, o, 1, o, 0],
      [s, 0, 1, 0, f],
      [0, 0, 1, 0, 0],
      [0, 0, 1, 0, 0],
    ]);
    const start = { x: 0, y: 2 };
    const finish = { x: 4, y: 2 };
    const path = PathFinding.aStar({ graph, start, finish });
    expect(path).not.null;
    expect(path).to.eql([{ x: 2, y: 0 }, finish]);
  });

  it('should first go up-right (diagonal), then down a corridor', () => {
    const graph = toObjectGraph([
      [0, 0, 0, u, 0],
      [0, 0, o, 1, u],
      [0, o, 0, 1, o],
      [u, 0, 0, 1, o],
      [s, 0, 0, 1, f],
    ]);
    const start = { x: 0, y: 4 };
    const finish = { x: 4, y: 4 };
    const path = PathFinding.aStar({ graph, start, finish });
    expect(path).to.eql([
      { x: 0, y: 3 },
      { x: 3, y: 0 },
      { x: 4, y: 1 },
      finish,
    ]);
  });
});

describe('areNeighbors', () => {
  it('should return true for two areas are neighbors', () => {
    const a = { x: 0, y: 0, width: 10, height: 10 };
    const b = { x: 10, y: 0, width: 10, height: 10 };

    const result = PathFinding.areNeighbors(a, b, 4);
    expect(result).true;
  });
  it('should return false for two areas which are not neighbors', () => {
    const a = { x: 0, y: 0, width: 10, height: 10 };
    const b = { x: 10, y: 10, width: 10, height: 10 };

    const result = PathFinding.areNeighbors(a, b, 4);
    expect(result).false;
  });
  it('should return true for are beighbor with area below it', () => {
    const a = { x: 0, y: 0, width: 2, height: 2 };
    const b = { x: 0, y: 2, width: 2, height: 2 };

    const result = PathFinding.areNeighbors(a, b, 2);
    expect(result).true;
  });
});

describe('gridToGraph', () => {
  it('should receive a grid and return a graph', () => {
    const grid = [
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
    ];
    const graph = PathFinding.gridToGraph({
      grid,
      width: 5,
      height: 5,
      actorSize: 2,
    });
    expect(graph).to.eql([{ x: 0, y: 0, width: 5, height: 5, neighbors: [] }]);
  });

  it('should receive a blocked grid and return an empty graph', () => {
    const grid = [
      [1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1],
    ];
    const graph = PathFinding.gridToGraph({
      grid,
      width: 5,
      height: 5,
      actorSize: 2,
    });
    expect(graph).to.eql([]);
  });

  it('should receive a mixed grid and return a graph with neighbors', () => {
    const grid = [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 1, 1],
      [0, 0, 1, 1],
    ];
    const graph = PathFinding.gridToGraph({
      grid,
      width: 4,
      height: 4,
      actorSize: 2,
    });
    expect(graph.length).to.eql(3);
    expect(graph[0].neighbors.length).to.eql(2);
  });

  it('grid to graph using A*', () => {
    const grid = [
      [1, 0, 0, 0, f, f],
      [0, 1, 0, 0, f, f],
      [0, 0, 1, 0, 0, 0],
      [0, 0, 0, 0, 0, 0],
      [s, s, 0, 0, 0, 0],
      [s, s, 0, 0, 0, 0],
    ];
    const graph = PathFinding.gridToGraph({
      grid,
      width: 6,
      height: 6,
      actorSize: 2,
    });
    const start = { x: 0, y: 4 };
    const finish = { x: 4, y: 0 };
    const path = PathFinding.aStar({ graph, start, finish });
    expect(graph.length).gt(0);
    expect(path).to.eql([{ x: 3, y: 3 }, { x: 3, y: 0 }, { x: 4, y: 0 }]);
  });
});
describe('hasBlock', () => {
  it('should receive a blocked grid and return true', () => {
    const grid = [
      [1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1],
    ];

    const res = PathFinding.hasBlock({ grid, x: 0, y: 0, width: 5, height: 5 });
    expect(res).true;
  });
  it('should receive a partially blocked grid and return true', () => {
    const grid = [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 1, 1],
      [0, 0, 1, 1],
    ];

    const res = PathFinding.hasBlock({ grid, x: 2, y: 2, width: 2, height: 2 });
    expect(res).true;
  });
});
