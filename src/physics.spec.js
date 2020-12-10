import { expect } from 'chai';
import { Physics } from './physics.js';

const updateStats = () => {};

describe('getUseableMove', () => {
  const width = 200;
  const height = 100;
  const pixels = [
    [0, 0, 255],
    [0, 0, 255],
    [255, 255, 255],
  ];
  const player = {
    x: 1, y: 1, width: 1, height: 1, speed: 1,
  };

  it('should move a player left if left is requested', () => {
    const newPlayer = { ...player, x: 0 };
    const updatedPlayer = Physics.getUseableMove({
      oldActor: player,
      actor: newPlayer,
      width,
      height,
      pixels,
      locMap: {},
      updateStats,
      useHandycap: false,
    });
    expect(updatedPlayer.x).to.eql(0);
  });

  it('should let a player move down if down-right is requested, and right is not allowed', () => {
    const oldPlayer = { ...player, x: 1, y: 0 };
    const newPlayer = { ...player, x: 2, y: 1 };
    const updatedPlayer = Physics.getUseableMove({
      oldActor: oldPlayer,
      actor: newPlayer,
      width,
      height,
      pixels,
      locMap: {},
      updateStats,
      useHandycap: true,
    });
    expect(updatedPlayer.x).to.eql(1);
    expect(updatedPlayer.y).to.eql(1);
  });

  it('should let a player move left if down-left is requested, and down is not allowed', () => {
    const oldPlayer = { ...player, x: 1, y: 1 };
    const newPlayer = { ...player, x: 0, y: 2 };
    const updatedPlayer = Physics.getUseableMove({
      oldActor: oldPlayer,
      actor: newPlayer,
      width,
      height,
      pixels,
      locMap: {},
      updateStats,
      useHandycap: true,
    });
    expect(updatedPlayer.x).to.eql(0);
    expect(updatedPlayer.y).to.eql(1);
  });
});

describe('updateLocationMap', () => {
  it('should remove an old player even if it has been modified', () => {
    const oldActor = { id: 1, x: 1, y: 2 };
    const actor = { id: 1, x: 100, y: 200 };
    const locMap = {};
    Physics.updateLocationMap(locMap, { actor: oldActor, oldActor: null, updateStats });
    Physics.updateLocationMap(locMap, { actor, oldActor: { ...oldActor, speed: 0 }, updateStats });
    const items = Object.values(locMap).reduce((a, b) => a.concat(b), []);
    expect(items).to.eql([actor]);
  });
});
