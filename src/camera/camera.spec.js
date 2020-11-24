import { expect } from 'chai';
import { Camera } from './camera.js';

describe('updateViewport', () => {
  it('should provide a full view', () => {
    const player = {
      x: 400, y: 50, width: 10, height: 10,
    };
    const viewport = Camera.updateViewport({
      scale: 1, canvasWidth: 500, canvasHeight: 100, player, mapWidth: 500, mapHeight: 100,
    });
    expect(viewport).to.eql({
      scale: 1, x: 0, y: 0, width: 500, height: 100,
    });
  });
  it('should provide a zoomed view', () => {
    const player = {
      x: 400, y: 50, width: 10, height: 10,
    };
    const viewport = Camera.updateViewport({
      scale: 2, canvasWidth: 500, canvasHeight: 100, player, mapWidth: 500, mapHeight: 100,
    });
    expect(viewport).to.eql({
      scale: 2, x: 250, y: 50 + 5 - 25, width: 250, height: 50,
    });
  });
});
