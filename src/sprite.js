
/**
 * Sprite.
 */
export class Sprite {

  /**
   * loadSprites.
   *
   * @param {} args
   * @param {} canvasProvider
   */
  static loadSprites(args, canvasProvider) {
    const spriteNames = Object.keys(args);
    return spriteNames.reduce((a, b) => ({
      ...a,
      [b]: Sprite.loadSpriteData({ ...args[b], canvasProvider })
    }), {});
  }

  /**
   * loadSpriteData.
   *
   * @param {Object} args
   */
  static loadSpriteData({ image, rows, columns, padding, canvasProvider, scales, alpha }) {
    alpha = alpha == null ? true : !!alpha;
    const scaleData = {};
    for (let i = 0; i < scales.length; i++) {
      const cellWidth = image.width/columns;
      const cellHeight = image.height/rows;
      const ratio = scales[i]/cellWidth;

      const canvas = canvasProvider();
      const canvasWidth = Math.round(image.width * ratio);
      const canvasHeight = Math.round(image.height * ratio);
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      const context = canvas.getContext('2d', { alpha });
      context.imageSmoothingEnabled = false;
      context.drawImage(image, 0, 0, image.width, image.height, 0, 0, canvasWidth, canvasHeight); 

      const parts = [];
      for (let i = 0; i < rows; i++) {
        for (let j = 0; j < columns; j++) {
          parts[i*columns+j] = {
            x: Math.round((cellWidth * j + padding)*ratio),
            y: Math.round((cellHeight * i + padding)*ratio),
            width: Math.round((cellWidth-(padding*2))*ratio),
            height: Math.round((cellHeight-(padding*2))*ratio)
          };
        }
      }
      scaleData[scales[i]] = {
        canvas,
        parts
      };
    }

    return scaleData;
  }

  /**
   * drawActorToContext.
   *
   * @param {}
   */
  static drawActorToContext({ context, actor, sprites, offset, scale }) {
    offset = offset || { x: 0, y: 0 };
    const x = actor.x -offset.x;
    const y = actor.y -offset.y;
    const centerx = (x + actor.width/2);
    const centery = (y + actor.height/2);

    context.scale(scale, scale);
    context.translate(centerx, centery);
    context.rotate(Sprite.getRotationFromFacing(actor.facing));
    context.translate(-centerx, -centery);
    const spriteData = sprites[actor.spriteName || 'characterSprite'][actor.width*scale];
    const spritePart = spriteData.parts[actor.spriteIndex || 0];
    context.drawImage(spriteData.canvas, 
      spritePart.x, spritePart.y, spritePart.width, spritePart.height,
      x, y, actor.width, actor.height
    );
    context.setTransform(1, 0, 0, 1, 0, 0);
  }

  /**
   * getRotationFromFacing.
   *
   * @param {} facing
   */
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
