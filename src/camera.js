/** A module for dealing with perspective and rendering */
export const Camera = {
  /**
   * setCanvasResolution.
   * receives a canvas and the resolution to set it to,
   * then sets the width and height of that canvas.
   *
   * @param {Canvas} canvas
   * @param {number} canvasWidth
   * @param {number} canvasHeight
   * @returns {undefined}
   */
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

  /**
   * getCanvasData.
   * This is used when initializing the game world.
   * It should (generally) only be called once for each layer.
   * @param {Canvas} canvas
   * @returns {Object} - An object containing: context, bounds, ration, canvasWidth, canvasHeight
   */
  getCanvasData(canvas) {
    const bounds = canvas.getBoundingClientRect();
    const ratio = bounds.width / bounds.height;
    const canvasWidth = Math.round(Math.min(bounds.width, 800) * ratio);
    const canvasHeight = Math.round(Math.min(bounds.height, 800));
    const context = canvas.getContext('2d');

    return { context, bounds, ratio, canvasWidth, canvasHeight };
  },

  /**
   * getContextPixels.
   * This returns an 2D array with the values of the alpha layer of a context.
   * We use data calculated in this function to in the physics engine
   * to do collision detection between actors and the terrain.
   *
   * @param {Object} arguments
   * @param {CanvasRenderingContext2D} arguments.context - context to read the alpha pixels from
   * @param {number} arguments.canvasWidth - absolute width of the canvas to process
   * @param {number} arguments.canvasHeight - absolute height of the canvas to process
   * @returns {Uint8Array[]}
   */
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
   * updateViewport.
   * Calculates what the new viewport should be.
   *
   * @param {Object} arguments
   * @param {Viewport} arguments.oldViewport - old viewport which will be returned if there
   *                                    is no difference between the new and the old viewport
   * @param {number} arguments.canvasWidth - absolute width of the canvas/screen
   * @param {number} arguments.canvasHeight - absolute height of the canvas/screen
   * @param {number} arguments.mapWidth - absolute width of the map
   * @param {number} arguments.mapHeight - absolute height of the map
   * @param {number} arguments.scale - an integer, 1 => no scaling
   * @param {Actor} arguments.player - the player to center the viewport on
   * @returns {Viewport}
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
   * drawScene.
   * Draws an entire scene.
   * This function should be called once per frame to redraw the three layers.
   * @param {Object} arguments
   * @param {Actor} arguments.player,
   * @param {Actor[]} arguments.characters,
   * @param {Actor[]} arguments.items,
   * @param {Actor[]} arguments.oldItems,
   * @param {CanvasRenderingContext2D} arguments.context,
   * @param {number} arguments.width,
   * @param {number} arguments.height,
   * @param {number} arguments.sprites,
   * @param {Viewport} arguments.viewport,
   * @param {Viewport} arguments.oldViewport,
   * @param {CanvasRenderingContext2D} arguments.layoutContext,
   * @param {CanvasRenderingContext2D} arguments.aboveContext,
   * @param {function} arguments.drawActorToContext,
   * @returns undefined
   */
  drawScene({
    player,
    characters,
    items,
    oldItems,
    context,
    width,
    height,
    sprites,
    viewport,
    oldViewport,
    layoutContext,
    aboveContext,
    drawActorToContext,
  }) {
    if (oldViewport !== viewport || oldItems !== items) {
      if (aboveContext) {
        aboveContext.clearRect(0, 0, width, height);
        const aboveData = sprites.above[width * viewport.scale];
        aboveContext.drawImage(
          aboveData.canvas,
          viewport.x * viewport.scale,
          viewport.y * viewport.scale,
          viewport.width * viewport.scale,
          viewport.height * viewport.scale,
          0, 0,
          viewport.width * viewport.scale,
          viewport.height * viewport.scale,
        );
      }
      const layoutData = sprites.background[width * viewport.scale];
      layoutContext.drawImage(
        layoutData.canvas,
        viewport.x * viewport.scale,
        viewport.y * viewport.scale,
        viewport.width * viewport.scale,
        viewport.height * viewport.scale,
        0, 0,
        viewport.width * viewport.scale,
        viewport.height * viewport.scale,
      );
      // Draw Items on the background
      for (let i = 0; i < items.length; i++) {
        const actor = items[i];
        if (actor.inInventory || actor.hidden) { continue; }
        if (!Camera.isWithinViewport({ viewport, actor })) { continue; }
        drawActorToContext({
          context: layoutContext,
          sprites,
          actor,
          offset: viewport,
          scale: viewport.scale,
          defaultSprite: 'itemSprite',
          color: 'lightblue',
        });
      }
    }

    // Remove old
    context.clearRect(0, 0, width, height);

    // Draw new position player position
    drawActorToContext({
      context,
      sprites,
      actor: player,
      offset: viewport,
      scale: viewport.scale,
      defaultSprite: 'characterSprite',
      color: 'white',
    });

    for (let i = 0; i < characters.length; i++) {
      const actor = characters[i];
      if (!Camera.isWithinViewport({ viewport, actor })) { continue; }
      // Draw new position
      drawActorToContext({
        context,
        sprites,
        actor,
        offset: viewport,
        scale: viewport.scale,
        defaultSprite: 'characterSprite',
        color: actor.color || 'darkblue',
      });
    }
  },
  /**
   * drawGraph.
   * Draws out a graph of areas and their connection points.
   * This function is used for debugging path-finding and player movement.
   * @param {Object} args
   * @param {Object[]} args.graph - the graph
   * @param {CanvasRenderingContext2D} args.context the context to draw to
   * @param {Object} args.viewport the vewport to draw in
   * @returns {undefined}
   */
  drawGraph({ graph, context, viewport }) {
    graph.forEach((area) => {
      context.strokeStyle = 'black';
      context.strokeRect(
        (area.x - viewport.x) * viewport.scale,
        (area.y - viewport.y) * viewport.scale,
        area.width * viewport.scale,
        area.height * viewport.scale,
      );
      context.strokeStyle = 'red';
      area.points.forEach((point) => {
        context.strokeRect(
          (point.x - viewport.x - 1) * viewport.scale,
          (point.y - viewport.y - 1) * viewport.scale,
          2,
          2,
        );
      });
    });
  },

  /**
   * drawDestinations.
   * Draws all of the characters paths and
   * This function is used for debugging path-finding and player movement.
   * @param {Object} args
   * @param {Actor[]} args.characters
   * @param {CanvasRenderingContext2D} args.context
   * @param {Viewport} args.viewport
   * @returns {undefined}
   */
  drawDestinations({ characters, context, viewport }) {
    context.clearRect(0, 0, context.canvas.width, context.canvas.height);
    context.fillStyle = 'black';
    const colors = ['lightblue', 'red', 'yellow', 'green', 'blue', 'brown', 'purple', 'pink', 'magenta'];
    characters.forEach((c) => {
      context.strokeStyle = 'black';
      const dest = (c.waypoints && c.waypoints[c.waypoints.length - 1]) || c.destination;
      if (!dest) { return; }
      context.fillRect(
        (dest.x - 5 - viewport.x) * viewport.scale,
        (dest.y - 5 - viewport.y) * viewport.scale,
        10 * viewport.scale,
        10 * viewport.scale,
      );
      if (!c.waypoints) { return; }
      context.strokeStyle = colors[c.waypoints.length % colors.length];
      context.beginPath();
      context.moveTo(
        (Math.round(c.x + c.width / 2) - viewport.x) * viewport.scale,
        (Math.round(c.y + c.height / 2) - viewport.y) * viewport.scale,
      );
      context.lineTo(
        (c.destination.x - viewport.x) * viewport.scale,
        (c.destination.y - viewport.y) * viewport.scale,
      );
      c.waypoints.forEach((t) => {
        context.lineTo((t.x - viewport.x) * viewport.scale, (t.y - viewport.y) * viewport.scale);
      });
      context.stroke();
    });
  },
  /**
   * isWithinViewport.
   * Returns truy if an actor is within a viewport.
   * Used to select which actors to draw.
   * @param {Object} args
   * @param {Viewport} args.viewport
   * @param {Actor} args.actor
   * @returns {boolean}
   */
  isWithinViewport({ viewport, actor }) {
    if (viewport.x > (actor.x + actor.width) || (viewport.x + viewport.width) < actor.x) {
      return false;
    }
    if (viewport.y > (actor.y + actor.height) || (viewport.y + viewport.height) < actor.y) {
      return false;
    }
    return true;
  },
};
