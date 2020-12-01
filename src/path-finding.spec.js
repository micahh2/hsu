import { expect } from 'chai';
import { PathFinding } from './path-finding.js';

const o = 0; // intermediate points when going without turn (the forward trace)
const u = 0; // turning "u-points"
const s = 0; // start point
const f = 0; // finish point

function testPathAsExpected(graph, start, finish, expectedPath) {
  const path = PathFinding.aStar({ graph, start, finish });
  expect(path).not.null;
  expect(path).to.eql(expectedPath);
}

describe('aStar', () => {
  it('should find a valid path', () => {
    const graph = [
      [0, u, o, o, f],
      [u, 1, 1, 1, 1],
      [0, u, o, u, 0],
      [1, 1, 1, 1, u],
      [s, o, o, u, 0],
    ];
    const start = { x: 0, y: 4 };
    const finish = { x: 4, y: 0 };
    const expectedPath = [
      { x: 3, y: 4 },
      { x: 4, y: 3 },
      { x: 3, y: 2 },
      { x: 1, y: 2 },
      { x: 0, y: 1 },
      { x: 1, y: 0 },
      finish,
    ];
    testPathAsExpected(graph, start, finish, expectedPath);
  });

  it('should generate an optimal path', () => {
    const graph = [
      [0, o, 0, 0, f],
      [o, 1, 1, 1, 1],
      [0, 1, 0, 0, 0],
      [0, 1, 0, 0, 0],
      [s, 1, 0, 0, 0],
    ];
    const start = { x: 0, y: 4 };
    const finish = { x: 4, y: 0 };
    const expectedPath = [
      { x: 0, y: 1 },
      { x: 1, y: 0 },
      finish,
    ];
    testPathAsExpected(graph, start, finish, expectedPath);
  });

  it('should generate a diagonal path', () => {
    const graph = [
      [0, 0, 1, 1, f],
      [0, 1, 1, o, 1],
      [1, 1, o, 1, 1],
      [1, o, 1, 1, 0],
      [s, 1, 1, 0, 0],
    ];
    const start = { x: 0, y: 4 };
    const finish = { x: 4, y: 0 };
    const expectedPath = [
      finish,
    ];
    testPathAsExpected(graph, start, finish, expectedPath);
  });

  it('should go straight over a wall, then diagonal to the right', () => {
    const graph = [
      [0, u, 0, 0, 0],
      [u, 1, o, 0, 0],
      [o, 1, 0, o, 0],
      [o, 1, 0, 0, f],
      [s, 1, 0, 0, 0],
    ];
    const start = { x: 0, y: 4 };
    const finish = { x: 4, y: 3 };
    const expectedPath = [
      { x: 0, y: 1 },
      { x: 1, y: 0 },
      finish,
    ];
    testPathAsExpected(graph, start, finish, expectedPath);
  });

  it('should go straight up, diagonal over the wall, and straight down', () => {
    const graph = [
      [0, 0, u, 0, 0],
      [0, o, 1, o, 0],
      [s, 0, 1, 0, f],
      [0, 0, 1, 0, 0],
      [0, 0, 1, 0, 0],
    ];
    const start = { x: 0, y: 2 };
    const finish = { x: 4, y: 2 };
    const expectedPath = [
      { x: 2, y: 0 },
      finish,
    ];
    testPathAsExpected(graph, start, finish, expectedPath);
  });

  it('should first go up-right (diagonal), then down a corridor', () => {
    const graph = [
      [0, 0, 0, u, 0],
      [0, 0, o, 1, u],
      [0, o, 0, 1, o],
      [u, 0, 0, 1, o],
      [s, 0, 0, 1, f],
    ];
    const start = { x: 0, y: 4 };
    const finish = { x: 4, y: 4 };
    const expectedPath = [
      { x: 0, y: 3 },
      { x: 3, y: 0 },
      { x: 4, y: 1 },
      finish,
    ];
    testPathAsExpected(graph, start, finish, expectedPath);
  });
});
