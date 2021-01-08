import { expect } from 'chai';
import { Util } from './util.js';

describe('isWithinArea', () => {
  it('should be when actor is in area', () => {
    const actor = { x: 10, y: 10 };
    const area = {
      x: 5, y: 5, width: 5, height: 5,
    };
    expect(Util.isWithinArea({ actor, area })).true;
  });
  it('should not be when actor is above the area', () => {
    const actor = { x: 10, y: 4 };
    const area = {
      x: 5, y: 5, width: 5, height: 5,
    };
    expect(Util.isWithinArea({ actor, area })).false;
  });
  it('should not be when actor is beyond the area', () => {
    const actor = { x: 11, y: 11 };
    const area = {
      x: 5, y: 0, width: 5, height: 5,
    };
    expect(Util.isWithinArea({ actor, area })).false;
  });
});
