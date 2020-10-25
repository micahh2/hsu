import { expect } from 'chai';
import { Sprite } from './sprite.js';

// fake canvas provider for unit testing
const canvasProvider = () => {
  return {
    width: 100,
    height: 100,
    getContext: () => ({
      drawImage: () => {}
    })
  };
}

describe('loadSpriteData', ()=> {
  it('should load sprite data into parts', () => {
    const image = { width: 20, height: 20 };
    const spriteData = Sprite.loadSpriteData({
      image, rows: 2, columns: 2, padding: 2, canvasProvider, scales: [10]
    });
    expect(spriteData[10].canvas).not.null;
    expect(spriteData[10].parts.length).to.eql(4);
    expect(spriteData[10].parts).to.have.deep.members([
      { x: 2, y: 2, width: 6, height: 6 },
      { x: 12, y: 2, width: 6, height: 6 },
      { x: 2, y: 12, width: 6, height: 6 },
      { x: 12, y: 12, width: 6, height: 6 }
    ]);
  });

  it('should load sprite data with different scales', () => {
    const image = { width: 20, height: 20 };
    const spriteData = Sprite.loadSpriteData({
      image, rows: 2, columns: 2, padding: 2, canvasProvider, scales: [10, 20]
    });
    expect(spriteData[10].canvas).not.null;
    expect(spriteData[10].parts.length).to.eql(4);
    expect(spriteData[10].parts).to.have.deep.members([
      { x: 2, y: 2, width: 6, height: 6 },
      { x: 12, y: 2, width: 6, height: 6 },
      { x: 2, y: 12, width: 6, height: 6 },
      { x: 12, y: 12, width: 6, height: 6 }
    ]);
    expect(spriteData[20].canvas).not.null;
    expect(spriteData[20].parts.length).to.eql(4);
    expect(spriteData[20].parts).to.have.deep.members([
      { x: 4, y: 4, width: 12, height: 12 },
      { x: 24, y: 4, width: 12, height: 12 },
      { x: 4, y: 24, width: 12, height: 12 },
      { x: 24, y: 24, width: 12, height: 12 }
    ]);
  });
});
