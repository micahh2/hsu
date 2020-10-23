import { expect } from 'chai';
import { Sprite } from './sprite.js';

describe('loadSpriteData', ()=> {
  it('should load sprite data into parts', () => {
    const image = { width: 20, height: 20 };
    const spriteData = Sprite.loadSpriteData({ image, rows: 2, columns: 2, padding: 2 });
    expect(spriteData.image).to.eql(image);
    expect(spriteData.parts.length).to.eql(4);
    expect(spriteData.parts).to.have.deep.members([
      { x: 2, y: 2, width: 6, height: 6 },
      { x: 12, y: 2, width: 6, height: 6 },
      { x: 2, y: 12, width: 6, height: 6 },
      { x: 12, y: 12, width: 6, height: 6 }
    ]);
  });
});
