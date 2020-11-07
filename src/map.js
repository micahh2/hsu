import { Sprite } from './sprite.js';

export const FLIPPED_HORIZONTALLY_FLAG = 0x80000000;
export const FLIPPED_VERTICALLY_FLAG = 0x40000000;
export const FLIPPED_DIAGONALLY_FLAG = 0x20000000;

/**
 * Map.
 */
export class Map {
  /**
   * convertBlob.
   *
   * @param {} blob
   */
  static async convertBlob(blob) {
    const imageData = new Image();
    imageData.src = URL.createObjectURL(blob);
    return new Promise((res, rej) => {
      imageData.addEventListener('load', () => { res(imageData); });
    });
  }

  /**
   * loads images
   * @param {function} [fetch] - to request files
   * @param {function} [convertBlob] - to convert to image
   * @param {string} [prepend] - string to prepend to image urls
   * @param {function} mapJson - map information
   * returns {Promise[]} Tilesets with image data
   */
  /**
   * loadImages.
   *
   * @param {}
   */
  static loadImages({
    fetch, mapJson, convertBlob, prepend,
  }) {
    fetch = fetch || self.fetch;
    prepend = prepend || '';
    convertBlob = convertBlob || Map.convertBlob;

    const { tilesets } = mapJson;
    return tilesets.map((t) => new Promise((res, rej) => {
      fetch(prepend + t.image).then(async (response) => {
        const blob = await response.blob();
        res({ ...t, imageData: await convertBlob(blob) });
      });
    }));
  }

  // image, rows, columns, padding, canvasProvider, scales, alpha,
  /**
   * getSpriteable.
   *
   * @param {} l
   * @param {} scales
   */
  static getSpriteable(l, scales) {
    return {
      image: l.imageData,
      rows: Math.ceil(l.tilecount / l.columns),
      columns: l.columns,
      scales: scales.map((t) => l.tilewidth * t),
      padding: l.spacing,
    };
  }

  /**
   * loadTileMapSprites.
   *
   * @param {}
   */
  static loadTileMapSprites({ loadedTilesets, canvasProvider, zoomLevels }) {
    const sprites = {};
    for (const set of loadedTilesets) {
      sprites[set.firstgid] = Map.getSpriteable(set, zoomLevels);
    }
    return Sprite.loadSprites(sprites, canvasProvider);
  }

  /**
   * getTileMapDim.
   *
   * @param {} tilemap
   */
  static getTileMapDim(tilemap) {
    return {
      width: tilemap.width * tilemap.tilewidth,
      height: tilemap.height * tilemap.tileheight,
    };
  }

  /**
   * loadTileMapAsSpriteData.
   *
   * @param {}
   */
  static loadTileMapAsSpriteData({
    tilemap, loadedTilesets, zoomLevels, canvasWidth, setCanvasResolution, sprites, canvasProvider,
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
        tilemap, context, canvasProvider, loadedTilesets, sprites, zoomLevel: z,
      });
      spriteData[z * canvasWidth] = {
        canvas,
        parts: [{
          x: 0, y: 0, width, height,
        }],
      };
    }
    return spriteData;
  }

  /**
   * draws a map to context
   */
  /**
   * drawTileMapToContext.
   *
   * @param {}
   */
  static drawTileMapToContext({
    tilemap, context, loadedTilesets, sprites, zoomLevel, only,
  }) {
    // const ignore = tilemap.tilesets.reduce((a,b) => b.tiles ? a.concat(b.tiles) : a, []).map(t => t.id);
    for (const layer of tilemap.layers.sort((a, b) => Math.sign(b.id - a.id))) {
      if (layer.type !== 'tilelayer') { continue; }
      if (only && !only.includes(layer.name)) { continue; }
      Map.drawTileLayerToContext({
        layer, context, sprites, scale: zoomLevel * tilemap.tilewidth,
      });
    }
  }

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
  static getTransformFromFlip({
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
  }

  /**
   * draws a layer to a context
   */
  /**
   * drawTileLayerToContext.
   *
   * @param {}
   */
  static drawTileLayerToContext({
    layer, context, sprites, scale,
  }) {
    for (let i = 0; i < layer.data.length; i++) {
      let spriteIndex = layer.data[i];
      if (spriteIndex <= 0) { continue; }

      // Rotation!
      const horizontally = !!(spriteIndex & FLIPPED_HORIZONTALLY_FLAG);
      const vertically = !!(spriteIndex & FLIPPED_VERTICALLY_FLAG);
      const diagonally = !!(spriteIndex & FLIPPED_DIAGONALLY_FLAG);
      const hasFlip = horizontally || vertically || diagonally;
      // Bitwise operators to remove the flags
      spriteIndex &= ~(FLIPPED_HORIZONTALLY_FLAG | FLIPPED_VERTICALLY_FLAG | FLIPPED_DIAGONALLY_FLAG);

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
        console.log('SpriteIndex', spriteIndex, spriteDataKey);
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
  }

  /**
   * findDescNumericKey.
   *
   * @param {} obj
   * @param {} fun
   */
  static findDescNumericKey(obj, fun) {
    const key = Object.keys(obj)
      .map((t) => parseInt(t))
      .sort((a, b) => Math.sign(b - a))
      .find(fun);
    return key;
  }
}
