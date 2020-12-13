import { Sprite } from './sprite.js';

export const FLIPPED_HORIZONTALLY_FLAG = 0x80000000;
export const FLIPPED_VERTICALLY_FLAG = 0x40000000;
export const FLIPPED_DIAGONALLY_FLAG = 0x20000000;

/**
 * Map Module.
 * Handles the loading and information gathering for tilemap.
 * More information about the format imported can be found here:
 * https://doc.mapeditor.org/en/stable/reference/json-map-format/
 * @example
 * const mapDim = Map.getTileMapDim(tilemap);
 * @example
 */
export const Map = {
  /**
   * convertBlob.
   * Converts a blob to an Image.
   * We need a *loaded* image to be able to draw it to a sprite.
   * When loading images dynamically, we only get them as Blobs,
   * this converts them. (unfortunately not testable in NodeJS)
   * https://developer.mozilla.org/en-US/docs/Web/API/Blob
   *
   * @param {Blob} blob
   * @returns {Promise<Image>}
   * @example
   * const blob = await response.blob();
   * await convertBlob(blob);
   */
  async convertBlob(blob) {
    const imageData = new Image();
    imageData.src = URL.createObjectURL(blob);
    return new Promise((res) => {
      imageData.addEventListener('load', () => { res(imageData); });
    });
  },

  /**
   * loads images
   * @param {Object} args
   * @param {function} [args.fetch] - to request files from an url
   * @param {function} [args.convertBlob] - to convert a blob to image
   * @param {string} [args.prepend] - string to prepend to image urls (use this to set local folder)
   * @param {function} args.mapJson - map information
   * @returns {Promise[]} Tilesets with image data
   * @example
   *    const loadedTilesets = await Promise.all(Map.loadImages({ mapJson: tilemap }));
   */
  loadImages({
    fetch = window.fetch,
    mapJson,
    convertBlob = Map.convertBlob,
    prepend = '',
  }) {
    const { tilesets } = mapJson;
    return tilesets.map((t) => new Promise((res) => {
      fetch(prepend + t.image).then(async (response) => {
        const blob = await response.blob();
        res({ ...t, imageData: await convertBlob(blob) });
      });
    }));
  },

  /**
   * getSpriteable.
   * Convert a loaded map layer into an object that can be converted into a sprite
   * @param {LoadedTileSet} l - loaded tileset, tileset with the image attached
   * @param {number[]} zoomLevels - multipliers of the size individual tiles to load
   * @returns {Spriteable}
   * @example
   * cosnt spriteable = Map.getSpriteable(loadedTileset, [1, 2]);
   * const sprite = Sprite.loadSprite(spriteable, canvasProvider);
   */
  getSpriteable(l, zoomLevels) {
    return {
      image: l.imageData,
      rows: Math.ceil(l.tilecount / l.columns),
      columns: l.columns,
      scales: zoomLevels.map((t) => l.tilewidth * t),
      padding: l.spacing,
    };
  },

  /**
   * loadTileMapSprites.
   *
   * @param {Object} args
   * @param {LoadedTileSet[]} args.loadedTilesets - Loaded tilesets with the image attatched
   * @param {function} args.canvasProvider - function that returns a new Canvas when called
   * @param {number[]} args.zoomLevels - multipliers of each spriteset to load
   * @returns {Object} an object with the keys set as the first guid of the respective tileset,
   *    and the value set to be the coresponding sprite
   * @example
   * const tileSprites = Map.loadTileMapSprites({
   *                        loadedTilesets,
   *                        canvasProvider,
   *                        zoomLevels: [1, 2]
   *                     });
   */
  loadTileMapSprites({ loadedTilesets, canvasProvider, zoomLevels }) {
    const sprites = {};
    for (const set of loadedTilesets) {
      sprites[set.firstgid] = Map.getSpriteable(set, zoomLevels);
    }
    return Sprite.loadSprites(sprites, canvasProvider);
  },

  /**
   * getTileMapDim.
   *
   * @param {TileMap} tilemap
   */
  getTileMapDim(tilemap) {
    return {
      width: tilemap.width * tilemap.tilewidth,
      height: tilemap.height * tilemap.tileheight,
    };
  },

  /**
   * loadTileMapAsSpriteData.
   *
   * @param {}
   */
  loadTileMapAsSpriteData({
    tilemap, zoomLevels, canvasWidth, setCanvasResolution, sprites, canvasProvider,
  }) {
    const dim = Map.getTileMapDim(tilemap);

    const spriteData = {};

    for (const z of zoomLevels) {
      const canvas = canvasProvider();
      const width = z * dim.width;
      const height = Math.round(z * dim.height);
      setCanvasResolution(canvas, width, height);
      const context = canvas.getContext('2d', { alpha: false });
      context.imageSmoothingEnabled = false;
      Map.drawTileMapToContext({
        tilemap, context, canvasProvider, sprites, zoomLevel: z,
      });
      spriteData[z * canvasWidth] = {
        canvas,
        parts: [{
          x: 0, y: 0, width, height,
        }],
      };
    }
    return spriteData;
  },

  /**
   * draws a map to context
   */
  /**
   * drawTileMapToContext.
   *
   * @param {}
   */
  drawTileMapToContext({ tilemap, context, sprites, zoomLevel, only }) {
    for (const layer of tilemap.layers) {
      if (!layer.visible || layer.type !== 'tilelayer') { continue; }
      if (only && !only.includes(layer.name)) { continue; }
      Map.drawTileLayerToContext({
        layer, context, sprites, scale: zoomLevel * tilemap.tilewidth,
      });
    }
  },

  /**
   * getTransformFromFlip.
   *
   * @param {Object} args
   * @param {boolean} args.horizontally - Should flip horizontally
   * @param {boolean} args.vertically - Should flip vertically
   * @param {boolean} args.diagonally - Should flip diagonally
   * @param {number} args.centerx -  centerx to translate to (must be moved back after)
   * @param {number} args.centery - centery to translate to (must be moved back after)
   * @returns {Object} translation with the keys a,b,c,d,e,f
   */
  getTransformFromFlip({
    horizontally, vertically, diagonally, centerx, centery,
  }) {
    const transform = {
      a: 1,
      c: 0,
      e: centerx,
      b: 0,
      d: 1,
      f: centery,
    };
    // [x, y] * [1, 0, 0, 1] = (x + 0y), (0x + 0y)
    if (horizontally) {
      transform.d *= -1;
    }
    if (vertically) {
      transform.a *= -1;
    }
    if (diagonally) {
      const olda = transform.a;
      const oldc = transform.c;
      transform.a = transform.b;
      transform.c = transform.d;
      transform.b = olda;
      transform.d = oldc;
    }
    return transform;
  },

  /**
   * draws a layer to a context
   */
  /**
   * drawTileLayerToContext.
   *
   * @param {}
   */
  drawTileLayerToContext({
    layer, context, sprites, scale,
  }) {
    for (let i = 0; i < layer.data.length; i++) {
      let spriteIndex = layer.data[i];
      if (spriteIndex <= 0) { continue; }

      // Rotation!
      /* eslint-disable no-bitwise */
      const horizontally = !!(spriteIndex & FLIPPED_HORIZONTALLY_FLAG);
      const vertically = !!(spriteIndex & FLIPPED_VERTICALLY_FLAG);
      const diagonally = !!(spriteIndex & FLIPPED_DIAGONALLY_FLAG);
      const hasFlip = horizontally || vertically || diagonally;
      // Bitwise operators to remove the flags
      spriteIndex &= ~(
        FLIPPED_HORIZONTALLY_FLAG
        | FLIPPED_VERTICALLY_FLAG
        | FLIPPED_DIAGONALLY_FLAG
      );
      /* eslint-enable no-bitwise */

      const spriteDataKey = Map.findDescNumericKey(sprites, (t) => t <= spriteIndex);

      spriteIndex -= spriteDataKey; // Move from absolute to relative
      const spriteData = sprites[spriteDataKey][scale];
      const spritePart = spriteData.parts[spriteIndex];

      // If we can't find a tile, mark it
      if (!spritePart) {
        const x = (i % layer.height) * scale;
        const y = Math.floor(i / layer.height) * scale;
        context.fillStyle = 'hotpink';
        context.fillRect(x, y, scale, scale);
        continue;
      }

      const x = (i % layer.height) * scale - 1;
      const y = Math.floor(i / layer.height) * scale - 1;
      const width = scale + 2;
      const height = scale + 2;
      if (hasFlip) {
        const centerx = (x + width / 2);
        const centery = (y + height / 2);
        // context.translate(centerx, centery);
        const trans = Map.getTransformFromFlip({
          horizontally, vertically, diagonally, centerx, centery,
        });
        context.setTransform(trans.a, trans.b, trans.c, trans.d, trans.e, trans.f);
        context.translate(-centerx, -centery);
        // context.setTransform(1, 0, 1, 0, 1, 1);
      }
      context.drawImage(spriteData.canvas,
        spritePart.x, spritePart.y, spritePart.width, spritePart.height,
        x, y, width, height);
      context.setTransform(1, 0, 0, 1, 0, 0);
    }
  },

  /**
   * findDescNumericKey.
   *
   * @param {Object} obj
   * @param {function} fun
   */
  findDescNumericKey(obj, fun) {
    const key = Object.keys(obj)
      .map((t) => parseInt(t, 10))
      .sort((a, b) => Math.sign(b - a))
      .find(fun);
    return key;
  },
};
