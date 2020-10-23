
export class Sprite {

  static loadSprites(args) {
    const spriteNames = Object.keys(args);
    return spriteNames.reduce((a, b) => ({
      ...a,
      [b]: Sprite.loadSpriteData(args[b])
    }), {});
  }

  static loadSpriteData({ image, rows, columns, padding }) {
    const cellWidth = image.width/columns;
    const cellHeight = image.height/rows;

    const parts = [];
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < columns; j++) {
        parts[i*columns+j] = {
          x: Math.round(cellWidth * j + padding),
          y: Math.round(cellHeight * i + padding),
          width: Math.round(cellWidth-(padding*2)),
          height: Math.round(cellHeight-(padding*2))
        };
      }
    }

    return {
      image,
      parts
    };
  }

  static drawActorToContext({ context, actor, sprites }) {
    const centerx = (actor.x + actor.width/2);
    const centery = (actor.y + actor.height/2);

    context.translate(centerx, centery);
    context.rotate(Sprite.getRotationFromFacing(actor.facing));
    context.translate(-centerx, -centery);
    const spriteData = sprites[actor.spriteName || 'characterSprite'];
    const spritePart = spriteData.parts[actor.spriteIndex || 0];
    context.drawImage(spriteData.image, 
      spritePart.x, spritePart.y, spritePart.width, spritePart.height,
      actor.x, actor.y, actor.width, actor.height
    );
    context.setTransform(1, 0, 0, 1, 0, 0);
  }

  static getRotationFromFacing(facing) {
    switch(facing) {
      case 'left':
        return -90 * Math.PI / 180;
      case 'right':
        return 90 * Math.PI / 180;
      case 'down':
        return Math.PI;
      case 'upleft':
        return -45 * Math.PI / 180;
      case 'upright':
        return 45 * Math.PI / 180;
      case 'downright':
        return 135 * Math.PI / 180;
      case 'downleft':
        return 225 * Math.PI / 180;
    }
    return 0; // Facing forward
  }
}
