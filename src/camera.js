/** A class for dealing with perspective and rendering */
export const Camera = {
  setCanvasResolution(canvas, canvasWidth, canvasHeight) {
    /* eslint-disable no-param-reassign */
    // Set the new rounded size
    canvas.style.width = canvasWidth;
    canvas.style.height = canvasHeight;
    // Set the resolution
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    /* eslint-enable no-param-reassign */
  },

  // This is used when initializing the game world and should only be called once
  getCanvasData(canvas) {
    const bounds = canvas.getBoundingClientRect();
    const ratio = bounds.width / bounds.height;
    const canvasWidth = Math.round(bounds.width);
    const canvasHeight = Math.round(bounds.height);
    const context = canvas.getContext('2d');

    return {
      context, bounds, ratio, canvasWidth, canvasHeight,
    };
  },

  getContextPixels({ context, canvasWidth, canvasHeight }) {
    const imageData = context.getImageData(0, 0, canvasWidth, canvasHeight);
    const allAlpha = imageData.data
      .filter((_, index) => (index + 1) % 4 === 0);
    const pixels = {};

    // Split them into the map for faster access
    for (let i = 0; i < imageData.height; i++) {
      const start = i * imageData.width;
      const slice = allAlpha.slice(start, start + imageData.width);
      if (slice.every((t) => t === 0)) { continue; }
      pixels[i] = Uint8Array.from(allAlpha.slice(start, start + imageData.width));
    }
    return pixels;
  },

  /**
   * updateViewport
   *
   * @param {Object} arguments
   * @param {Viewport=} arguments.oldViewport - old viewport which will be returned if there
   *                                    is no difference between the new and the old viewport
   * @param {number} arguments.canvasWidth - absolute width of the canvas/screen
   * @param {number} arguments.canvasHeight - absolute height of the canvas/screen
   * @param {number} arguments.mapWidth - absolute width of the map
   * @param {number} arguments.mapHeight - absolute height of the map
   * @param {number} arguments.scale - an integer, 1 => no scaling
   */
  updateViewport({
    oldViewport, player, mapWidth, mapHeight, scale, canvasWidth, canvasHeight,
  }) {
    const viewportWidth = canvasWidth / scale;
    const viewportHeight = canvasHeight / scale;

    // Constantly updating viewport
    const centerx = Math.round((player.x + player.width / 2));
    const centery = Math.round((player.y + player.height / 2));

    const viewport = {
      x: Math.min(
        Math.max(0, Math.round(centerx - viewportWidth / 2)),
        mapWidth - viewportWidth,
      ),
      y: Math.min(
        Math.max(0, Math.round(centery - viewportHeight / 2)),
        mapHeight - viewportHeight,
      ),
      width: Math.round(viewportWidth),
      height: Math.round(viewportHeight),
      scale,
    };
    if (oldViewport
        && oldViewport.x === viewport.x
        && oldViewport.y === viewport.y
        && oldViewport.width === viewport.width
        && oldViewport.height === viewport.height
        && oldViewport.scale === viewport.scale) {
      return oldViewport;
    }
    return viewport;
  },

  /**
   * updateViewport
   *
   * @param {Object} arguments
   * @param {Player} arguments.player the player
   * @param {Characters} arguments.characters Non-playable characters
   * @param {CanvasRenderingContext2D} arguments.context The active collision context scene
   * @param {Viewport} arguments.viewport The current viewport
   * @param {Viewport} arguments.[oldViewport] The viewport from last time
   */
  drawScene({
    player,
    characters,
    context,
    width,
    height,
    sprites,
    viewport,
    oldViewport,
    layoutContext,
    drawActorToContext,
  }) {
    if (oldViewport !== viewport) {
      // layoutContext.clearRect(0, 0, width, height);
      const layoutData = sprites.background[width * viewport.scale];
      const layoutPart = layoutData.parts[0];
      layoutContext.drawImage(
        layoutData.canvas,
        -viewport.x * viewport.scale,
        -viewport.y * viewport.scale,
        layoutPart.width,
        layoutPart.height,
      );
    }

    // Remove old
    context.clearRect(0, 0, width, height);

    // Draw new position player position
    drawActorToContext({
      context, sprites, actor: player, offset: viewport, scale: viewport.scale,
    });

    for (let i = 0; i < characters.length; i++) {
      const actor = characters[i];
      if (viewport.x > (actor.x + actor.width) || (viewport.x + viewport.width) < actor.x) {
        continue;
      }
      if (viewport.y > (actor.y + actor.height) || (viewport.y + viewport.height) < actor.y) {
        continue;
      }
      // Draw new position
      drawActorToContext({
        context, sprites, actor, offset: viewport, scale: viewport.scale,
      });
    }
  },
};
