import { expect } from 'chai';
import { PathFinding } from './path-finding';

describe.only('star', () => {
  const x = 0;
  const s = 0;
  const f = 0;
  const graph = [
    [0, x, 0, 0, f],
    [x, 1, 1, 1, 1],
    [0, x, 0, x, 0],
    [1, 1, 1, 1, x],
    [s, 0, 0, x, 0],
  ];
  // TODO test this
  it('should find a valid path', () => {
    const start = { x: 0, y: 4 };
    const finish = { x: 4, y: 0 };
    const path = PathFinding.star({ graph: graph, start: start, finish: finish });
    expect(path).to.eql([
      { x: 3, y: 4 },
      { x: 4, y: 3 },
      { x: 3, y: 2 },
      { x: 1, y: 2 },
      { x: 0, y: 1 },
      { x: 1, y: 0 },
      { x: 4, y: 0 },
    ]);
  });

  const graph2 = [
    [x, 0, 0, 0, f],
    [0, 1, 1, 1, 1],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 1, 0],
    [s, 0, 0, 0, 0],
  ];
    // TODO test this
  it('should generate an optimal path', () => {
    const start = { x: 0, y: 4 };
    const destination = { x: 4, y: 0 };
    const path = PathFinding.star({ graph: graph2, start: start, finish: destination });
    expect(path).not.null;
    expect(path).to.eql([
      { x: 0, y: 1 },
      { x: 1, y: 0 },
      destination,
    ]);
  });
  const graph3 = [
    [0, 0, 0, 0, f],
    [0, 1, 1, 0, 1],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 1, 0],
    [s, 0, 0, 0, 0],
  ];
  it('should generate a diagonal path', () => {
    const start = { x: 0, y: 4 };
    const destination = { x: 4, y: 0 };
    const path = PathFinding.star({ graph: graph3, start: start, finish: destination });
    expect(path).not.null;
    expect(path).to.eql([
      destination,
    ]);
  });
});
