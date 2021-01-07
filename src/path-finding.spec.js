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
        const offsetX = 1 - (l % 3); // 1  0 -1  1  0 -1  1  0 -1
        const offsetY = 1 - Math.floor(l / 3); // 1  1  1  0  0  0 -1 -1 -1
        const newX = j + offsetX;
        const newY = i + offsetY;
        if (offsetX === 0 && offsetY === 0) { continue; } // no moving: no reason
        if (newX < 0 || newY < 0) { continue; } // out of the borders: not allowed
        // out of the borders: not allowed
        if (newX >= arrayGraph[0].length || newY >= arrayGraph.length) { continue; }
        // no need to change anything in the objectGraph
        if (arrayGraph[newY][newX] > 0) { continue; }
        const neighbor = objectGraph.find((t) => t.x === newX && t.y === newY);
        if (!neighbor) { continue; }
        area.neighbors.push(neighbor);
        neighbor.neighbors.push(area);
      }
      objectGraph.push(area);
    });
  });
  return PathFinding.splitGraphIntoPoints(objectGraph, 1);
}

describe('dijikstras', () => {
  it('should generate no path', () => {
    const graph = toObjectGraph([
      [0, 0, 1, 1, f],
      [0, 1, 1, 1, 1],
      [1, 1, 0, 1, 1],
      [1, 0, 1, 1, 0],
      [s, 1, 1, 0, 0],
    ]);
    const start = { x: 0, y: 4 };
    const finish = { x: 4, y: 0 };
    const path = PathFinding.dijikstras({ graph, start, finish });
    expect(path).not.null;
    expect(path).to.eql([]);
  });

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
    const path = PathFinding.dijikstras({ graph, start, finish });
    expect(path).not.null;
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
      [0, u, o, o, f],
      [u, 1, 1, 1, 1],
      [o, 1, 0, 0, 0],
      [o, 1, 0, 0, 0],
      [s, 1, 0, 0, 0],
    ]);
    const path = PathFinding.dijikstras({ graph, start, finish });
    expect(path).not.null;
    expect(path).to.eql([
      { x: 0, y: 1 },
      { x: 1, y: 0 },
      finish,
    ]);
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
    const path = PathFinding.dijikstras({ graph, start, finish });
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
    const path = PathFinding.dijikstras({ graph, start, finish });
    expect(path).not.null;
    expect(path).to.eql([
      { x: 0, y: 1 },
      { x: 1, y: 0 },
      finish,
    ]);
  });

  it('should go diagonal over the wall', () => {
    const graph = toObjectGraph([
      [0, 0, u, 0, 0],
      [0, o, 1, o, 0],
      [s, 0, 1, 0, f],
      [0, 0, 1, 0, 0],
      [0, 0, 1, 0, 0],
    ]);
    const start = { x: 0, y: 2 };
    const finish = { x: 4, y: 2 };
    const path = PathFinding.dijikstras({ graph, start, finish });
    expect(path).not.null;
    expect(path).to.eql([
      { x: 2, y: 0 },
      finish,
    ]);
  });

  it('should first go up-right (diagonal), then down a corridor', () => {
    const graph = toObjectGraph([
      [0, 0, 0, u, 0],
      [0, 0, u, 1, u],
      [0, 0, u, 1, o],
      [0, o, 0, 1, o],
      [s, 0, 0, 1, f],
    ]);
    const start = { x: 0, y: 4 };
    const finish = { x: 4, y: 4 };
    const path = PathFinding.dijikstras({ graph, start, finish });
    expect(path).not.null;
    expect(path).to.eql([
      { x: 2, y: 2 },
      { x: 2, y: 1 },
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
    expect(result).not.null;
    expect(result).true;
  });
  it('should return false for two areas which are not neighbors', () => {
    const a = { x: 0, y: 0, width: 10, height: 10 };
    const b = { x: 10, y: 10, width: 10, height: 10 };

    const result = PathFinding.areNeighbors(a, b, 4);
    expect(result).not.null;
    expect(result).false;
  });
  it('should return true for a neighbor below it', () => {
    const a = { x: 0, y: 0, width: 2, height: 2 };
    const b = { x: 0, y: 2, width: 2, height: 2 };

    const result = PathFinding.areNeighbors(a, b, 2);
    expect(result).not.null;
    expect(result).true;
  });
  it('should return true for an offset neighbor to the side', () => {
    const a = { x: 0, y: 0, width: 3, height: 3 };
    const b = { x: 3, y: 1, width: 3, height: 3 };

    const result = PathFinding.areNeighbors(a, b, 2);
    expect(result).not.null;
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
    expect(graph).not.null;
    expect(graph).to.eql([{
      x: 0,
      y: 0,
      width: 5,
      height: 5,
      neighbors: [],
      points: [],
    }]);
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
    expect(graph).not.null;
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
    expect(graph).not.null;
    expect(graph.length).to.eql(3);
    expect(graph[0].neighbors.length).to.eql(2);
  });

  it('should should return the right neighbors for a semi-complex graph', () => {
    const a = 0;
    const b = 0;
    const c = 0;
    const d = 0;
    const e = 0;
    const grid = [
      [a, b, b, d, d, d],
      [c, 1, 1, d, d, d],
      [c, 1, 1, d, d, d],
      [e, e, e, f, f, f],
      [e, e, e, f, f, f],
      [e, e, e, f, f, f],
    ];
    const graph = PathFinding.gridToGraph({
      grid,
      width: 6,
      height: 6,
      actorSize: 1,
    });
    expect(graph).not.null;
    expect(graph.length).to.eql(6, 'Incorrect number of areas');
    const aArea = graph.find((t) => t.x === 0 && t.y === 0);
    expect(aArea.neighbors.length).to.eql(2, 'Incorrect number of neighbors');
  });

  it('grid to graph using dijikstras', () => {
    const m = 0;
    const n = 0;
    const grid = [
      [1, 0, 0, 0, f, f],
      [0, 1, 0, 0, f, f],
      [0, 0, 1, 0, 0, 0],
      [0, 0, 0, 1, o, 0],
      [s, s, 0, m, n, 0],
      [s, s, 0, 0, 0, 0],
    ];
    const graph = PathFinding.gridToGraph({
      grid,
      width: 6,
      height: 6,
      actorSize: 2,
    });
    expect(graph).not.null;
    const start = { x: 0, y: 4 };
    const finish = { x: 4, y: 0 };
    const path = PathFinding.dijikstras({ graph, start, finish });
    expect(path).not.null;
    expect(graph.length).gt(0);
    expect(path).to.eql([
      { x: 2, y: 5 },
      { x: 3, y: 4 },
      { x: 5, y: 5 },
      { x: 4, y: 3 },
      finish,
    ]);
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
    expect(res).not.null;
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
    expect(res).not.null;
    expect(res).true;
  });
});

describe('getGatewayPoint', () => {
  it('should pick the mid-point between two neighboring areas (x dir)', () => {
    const a = { x: 0, y: 0, width: 10, height: 10 };
    const b = { x: 10, y: 0, width: 10, height: 10 };
    const gatewayPoint = PathFinding.getGatewayPoint(a, b, 1);
    expect(gatewayPoint).not.null;
    expect(gatewayPoint).to.eql({ x: 10, y: 5 });
  });
  it('should pick the mid-point between two neighboring areas (y dir)', () => {
    const a = { x: 0, y: 0, width: 10, height: 10 };
    const b = { x: 0, y: 10, width: 10, height: 10 };
    const gatewayPoint = PathFinding.getGatewayPoint(a, b, 1);
    expect(gatewayPoint).not.null;
    expect(gatewayPoint).to.eql({ x: 5, y: 10 });
  });
  it('should pick the mid-point between two neighboring areas with a partial overlap', () => {
    const a = { x: 0, y: 0, width: 10, height: 10 };
    const b = { x: 4, y: 10, width: 10, height: 10 };
    const gatewayPoint = PathFinding.getGatewayPoint(a, b, 1);
    expect(gatewayPoint).not.null;
    expect(gatewayPoint).to.eql({ x: 7, y: 10 });
  });
});

describe('graphToForest', () => {
  it('should split a graph into a forest of trees', () => {
    const a = {};
    const b = {};
    const c = {};
    a.neighbors = [b, c];
    b.neighbors = [a, c];
    c.neighbors = [a, b];
    const graph = [a, b, c];
    const forest = PathFinding.graphToForest(graph);
    expect(forest).not.null;
    const leaf = { neighbors: [] };
    expect(forest).to.eql([
      { neighbors: [leaf, leaf] },
      { neighbors: [leaf, leaf] },
      { neighbors: [leaf, leaf] },
    ]);
  });
  it('should work in a cycle', () => {
    const a = {};
    const b = {};
    const c = {};
    a.neighbors = [b];
    b.neighbors = [c];
    c.neighbors = [a];
    const graph = [a, b, c];
    const forest = PathFinding.graphToForest(graph);
    expect(forest).not.null;
    const n = (t) => ({ neighbors: t });
    expect(forest).to.eql([
      n([n([n([])])]),
      n([n([n([])])]),
      n([n([n([])])]),
    ]);
  });
  it('should work on a large graph', () => {
    let a = {};
    let graph = [a];
    const n = 12;
    for (let i = 0; i < n; i++) {
      const b = {};
      const c = {};
      a.neighbors = [b];
      b.neighbors = [c];
      c.neighbors = [a];
      graph = graph.concat([b, c]);
      a = c;
    }
    const forest = PathFinding.graphToForest(graph);
    expect(forest).not.null;
    expect(forest.length).to.equal(n * 2 + 1);
    let count = 0;
    let current = forest[0];
    while (current.neighbors.length > 0) {
      [current] = current.neighbors;
      count++;
    }
    expect(count).to.equal(n * 2);
  });
});
describe('splitGraphIntoPoints', () => {
  it('should return a new graph with points', () => {
    const a = { x: 0, y: 0, width: 10, height: 10 };
    const b = { x: 10, y: 0, width: 10, height: 10 };
    const c = { x: 0, y: 10, width: 10, height: 10 };
    const d = { x: 10, y: 10, width: 10, height: 10 };
    a.neighbors = [b, c];
    b.neighbors = [a, d];
    c.neighbors = [a, d];
    d.neighbors = [b, c];
    const graph = [a, b, c, d];
    const newGraph = PathFinding.splitGraphIntoPoints(graph, 1);
    expect(newGraph).not.null;
    expect(newGraph[0].points.map((t) => ({ x: t.x, y: t.y }))).to.eql([
      { x: 10, y: 5 },
      { x: 5, y: 10 },
    ]);
  });
  it('should return a new graph with points when areas overlap', () => {
    const a = { x: 0, y: 0, width: 10, height: 10 };
    const b = { x: 10, y: 0, width: 10, height: 10 };
    const c = { x: 0, y: 10, width: 20, height: 10 };
    const d = { x: 20, y: 5, width: 10, height: 30 };
    a.neighbors = [b, c];
    b.neighbors = [a, c, d];
    c.neighbors = [a, b, d];
    d.neighbors = [b, c];
    const graph = [a, b, c, d];
    const newGraph = PathFinding.splitGraphIntoPoints(graph, 1);
    expect(newGraph).not.null;
    expect(newGraph[1].points.map((t) => ({ x: t.x, y: t.y }))).to.eql([
      { x: 10, y: 5 },
      { x: 15, y: 10 },
      { x: 20, y: 7 },
    ]);
  });
});
