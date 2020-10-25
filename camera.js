import { Sprite } from './sprite.js';

export class Camera {
  static setCanvasResolution(canvas, canvasWidth, canvasHeight) {

    // Set the new rounded size
    canvas.style.width = canvasWidth;
    canvas.style.height = canvasHeight;
    // Set the resolution
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
  }
  // This is used when initializing the game world and should only be called once
  static getCanvasData(canvas) {
    const bounds = canvas.getBoundingClientRect();
    const ratio = bounds.width/bounds.height;
    const canvasWidth = Math.round(bounds.width);
    const canvasHeight = Math.round(bounds.height);
    const context = canvas.getContext('2d');

    return { context, bounds, ratio, canvasWidth, canvasHeight };
  }
  static getContextPixels({ context, canvasWidth, canvasHeight }) {
    const imageData = context.getImageData(0, 0, canvasWidth, canvasHeight)
    const allAlpha = imageData.data
      .filter((_, index) => (index+1) % 4 === 0);
    const pixels = {};

    // Split them into the map for faster access
    for(let i = 0; i < imageData.height; i++) {
      let start = i*imageData.width;
      const slice = allAlpha.slice(start, start+imageData.width);
      if (slice.every(t => t === 0)) { continue; }
      pixels[i] = Uint8Array.from(allAlpha.slice(start, start+imageData.width));
    }
    return pixels;
  }

  static updateViewport({ oldViewport, player, width, height, scale }) {
    const viewportWidth = width / scale;
    const viewportHeight =  height / scale;

    const centerx = Math.round((player.x + player.width/2)/width)*width;
    const centery = Math.round((player.y + player.height/2)/height)*height;

    const viewport = {
      x: Math.min(Math.max(0, Math.round(centerx - viewportWidth/2)), width-viewportWidth),
      y: Math.min(Math.max(0, Math.round(centery - viewportHeight/2)), height-viewportHeight),
      width: Math.round(viewportWidth),
      height: Math.round(viewportHeight),
      scale
    };
    if (oldViewport &&
        oldViewport.x === viewport.x &&
        oldViewport.y === viewport.y &&
        oldViewport.width === viewport.width &&
        oldViewport.height === viewport.height &&
        oldViewport.scale === viewport.scale) {
      return oldViewport;
    }
    return viewport;
  }

  static drawScene({ 
    player,
    characters, 
    context,
    width,
    height,
    sprites,
    layoutImage,
    layoutContext, 
    viewport,
    oldViewport,
  })  {
    if (oldViewport !== viewport) {
      //layoutContext.clearRect(0, 0, width, height);
      const layoutData = sprites['layout'][width*viewport.scale];
      const layoutPart = layoutData.parts[0];
      const w = 
      layoutContext.drawImage(layoutData.canvas, 
        -viewport.x*viewport.scale,
        -viewport.y*viewport.scale,
        layoutPart.width,
        layoutPart.height
      );
    }

    // Remove old
    context.clearRect(0, 0, width, height);

    // Draw new position player position
    Sprite.drawActorToContext({ context, sprites, actor: player, offset: viewport, scale: viewport.scale });

    for(let i = 0; i < characters.length; i++) {
      const actor = characters[i];
      if (viewport.x > (actor.x+actor.width) || (viewport.x+viewport.width) < actor.x) { continue; }
      if (viewport.y > (actor.y+actor.height) || (viewport.y+viewport.height) < actor.y) { continue; }
      // Draw new position
      Sprite.drawActorToContext({ context, sprites, actor, offset: viewport, scale: viewport.scale });
    }
  }
}
