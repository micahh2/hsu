import { expect } from 'chai'
import { PathFinding } from './path-finding.js'

describe.only('aStar', () => {
  const x = 0;
  const graph = [
  	[0, x, 0, 0, x],
  	[x, 1, 1, 1, 1],
  	[0, x, 0, x, 0],
  	[1, 1, 1, 1, x],
  	[0, 0, 0, x, 0]
  ];

  it('should find a valid path', () => {
	  const start = {x: 0, y: 4};
	  const finish = {x: 4, y: 0};
	  const path = PathFinding.aStar({graph, start, finish});
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
});
