import {expect} from 'chai';
import {PathFinding} from './path-finding.js';

describe('aStar', () => {
    const o = 0; // intermediate points
    const s = 0;
    const f = 0;
    var graphs = [];
    var testNumber = 0;

    graphs.push(
        [
            [0, o, 0, 0, f],
            [o, 1, 1, 1, 1],
            [0, o, 0, o, 0],
            [1, 1, 1, 1, o],
            [s, 0, 0, o, 0],
        ]);
    it('should find a valid path', () => {
        const start = {x: 0, y: 4};
        const finish = {x: 4, y: 0};
        const path = PathFinding.aStar({graph: graphs[testNumber++], start: start, finish: finish});
        expect(path).to.eql([
            {x: 3, y: 4},
            {x: 4, y: 3},
            {x: 3, y: 2},
            {x: 1, y: 2},
            {x: 0, y: 1},
            {x: 1, y: 0},
            finish,
        ]);
    });

    graphs.push(
        [
            [0, o, 0, 0, f],
            [o, 1, 1, 1, 1],
            [0, 0, 0, 0, 0],
            [0, 0, 0, 1, 0],
            [s, 0, 0, 0, 0],
        ]);
    it('should generate an optimal path', () => {
        const start = {x: 0, y: 4};
        const finish = {x: 4, y: 0};
        const path = PathFinding.aStar({graph: graphs[testNumber++], start: start, finish: finish});
        expect(path).not.null;
        expect(path).to.eql([
            {x: 0, y: 1},
            {x: 1, y: 0},
            finish,
        ]);
    });

    graphs.push(
        [
            [0, 0, 0, 0, f],
            [0, 1, 1, 0, 1],
            [0, 0, 0, 0, 0],
            [0, 0, 0, 1, 0],
            [s, 0, 0, 0, 0],
        ]);
    it('should generate a diagonal path', () => {
        const start = {x: 0, y: 4};
        const finish = {x: 4, y: 0};
        const path = PathFinding.aStar({graph: graphs[testNumber++], start: start, finish: finish});
        expect(path).not.null;
        expect(path).to.eql([
            finish,
        ]);
    });

    graphs.push([
        [0, o, 0, 0, 0],
        [o, 1, o, 0, 0],
        [o, 1, 0, o, 0],
        [o, 1, 0, 0, f],
        [s, 1, 0, 0, 0],
    ]);
    it('when GAS was in doubt of correctness the algo, this set of tests was created', () => {
        const start = {x: 0, y: 4};
        const finish = {x: 4, y: 3};
        const path = PathFinding.aStar({graph: graphs[testNumber++], start: start, finish: finish});
        expect(path).not.null;
        expect(path).to.eql([
            {x: 0, y: 3},
            {x: 0, y: 2},
            {x: 0, y: 1},
            {x: 1, y: 0},
            {x: 2, y: 1},
            {x: 3, y: 2},
            finish,
        ]);
    });

    graphs.push([
        [0, o, o, o, 0],
        [o, 0, 1, 0, o],
        [o, 0, 1, 0, o],
        [o, 0, 1, 0, o],
        [s, 0, 1, 0, f],
    ]);
    it('when GAS was in doubt of correctness the algo, this set of tests was created', () => {
        const start = {x: 0, y: 4};
        const finish = {x: 4, y: 4};
        const path = PathFinding.aStar({graph: graphs[testNumber++], start: start, finish: finish});
        expect(path).not.null;
        expect(path).to.eql([
            {x: 0, y: 3},
            {x: 0, y: 2},
            {x: 2, y: 1},
            {x: 1, y: 0},
            {x: 3, y: 1},
            {x: 3, y: 3},
            finish,
        ]);
    });

    graphs.push([
        [0, 0, 0, o, 0],
        [0, 0, o, 1, o],
        [0, o, 0, 1, o],
        [s, 0, 0, 1, o],
        [0, 0, 0, 1, f],
    ]);
    it('when GAS was in doubt of correctness the algo, this set of tests was created', () => {
        const start = {x: 0, y: 4};
        const finish = {x: 4, y: 4};
        const path = PathFinding.aStar({graph: graphs[testNumber++], start: start, finish: finish});
        expect(path).not.null;
        expect(path).to.eql([
            {x: 0, y: 3},
            {x: 3, y: 2},
            {x: 0, y: 1},
            {x: 1, y: 0},
            {x: 4, y: 1},
            {x: 3, y: 2},
            finish,
        ]);
    });
});
