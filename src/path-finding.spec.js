import { expect } from 'chai';
import { PathFinding } from './path-finding.js';

describe('aStar', () => {
  const o = 0; // intermediate points
  const x = 0; // turning points
  const s = 0;
  const f = 0;

  it('should find a valid path', () => {
    const graph = [
      [0, x, o, o, f],
      [x, 1, 1, 1, 1],
      [0, x, o, x, 0],
      [1, 1, 1, 1, x],
      [s, o, o, x, 0],
    ];
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
    const graph = [
      [0, o, 0, 0, f],
      [o, 1, 1, 1, 1],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 1, 0],
      [s, 0, 0, 0, 0],
    ];
    const path = PathFinding.aStar({ graph, start, finish });
    expect(path).not.null;
    expect(path).to.eql([
      { x: 0, y: 1 },
      { x: 1, y: 0 },
      finish,
    ]);
  });

  it('should generate a diagonal path', () => {
    const graph = [
      [0, 0, 0, 0, f],
      [0, 1, 1, o, 1],
      [0, 0, o, 0, 0],
      [0, o, 0, 1, 0],
      [s, 0, 0, 0, 0],
    ];
    const start = { x: 0, y: 4 };
    const finish = { x: 4, y: 0 };
    const path = PathFinding.aStar({ graph, start, finish });
    expect(path).not.null;
    expect(path).to.eql([
      finish,
    ]);
  });

  it('should go straight over a wall, then diagonal to the right', () => {
    const graph = [
      [0, x, 0, 0, 0],
      [x, 1, o, 0, 0],
      [o, 1, 0, o, 0],
      [o, 1, 0, 0, f],
      [s, 1, 0, 0, 0],
    ];
    const start = { x: 0, y: 4 };
    const finish = { x: 4, y: 3 };
    const path = PathFinding.aStar({ graph, start, finish });
    expect(path).not.null;
    expect(path).to.eql([
      { x: 0, y: 1 },
      { x: 1, y: 0 },
      finish,
    ]);
  });

  it('should go straight up, diagonal over the wall, and straight down', () => {
    const graph = [
      [0, 0, x, 0, 0],
      [0, o, 1, x, 0],
      [x, 0, 1, o, 0],
      [o, 0, 1, x, 0],
      [s, 0, 1, 0, f],
    ];
    const start = { x: 0, y: 4 };
    const finish = { x: 4, y: 4 };
    const path = PathFinding.aStar({ graph, start, finish });
    expect(path).not.null;
    expect(path).to.eql([
      { x: 0, y: 2 },
      { x: 2, y: 0 },
      { x: 3, y: 1 },
      { x: 3, y: 3 },
      finish,
    ]);
  });

  it('should first go up-right (diagonal), then down a corridor', () => {
    const graph = [
      [0, 0, 0, x, 0],
      [0, 0, o, 1, x],
      [0, o, 0, 1, o],
      [x, 0, 0, 1, o],
      [s, 0, 0, 1, f],
    ];
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
