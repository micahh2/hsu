import { Sprite } from './sprite.js';

export class Map {

  static async convertBlob(blob) {
    let imageData = new Image();
    imageData.src = URL.createObjectURL(blob);
    return new Promise((res, rej) => {
      imageData.addEventListener('load', () => { res(imageData); });
    });
  }

  /**
   * loads images
   * @param {function} [fetch] - to request files
   * @param {function} [convertBlob] - to convert to image
   * @param {function} mapJson - map information
   * returns {Promise[]} Tilesets with image data
   */
  static loadImages({ fetch, mapJson, convertBlob }) {
    fetch = fetch || self.fetch;
    convertBlob = convertBlob || Map.convertBlob;

    const tilesets = mapJson.tilesets;
    return tilesets.map(t => 
      new Promise((res, rej) => {
        fetch(t.image).then(async (response) => {
          const blob = await response.blob();
          res({ ...t, imageData: await convertBlob(blob) });
        })
      })
    );
  }

  // image, rows, columns, padding, canvasProvider, scales, alpha,
  static getSpriteable(l, scales) {
    return {
      image: l.imageData,
      rows: Math.ceil(l.tilecount / l.columns),
      columns: l.columns,
      scales: scales.map(t => l.tilewidth*t),
      padding: l.spacing
    };
  }

  static loadTileMapSprites({ loadedTilesets, canvasProvider, zoomLevels }) {
    const sprites = {};
    for (let set of loadedTilesets) {
      sprites[set.firstgid] = Map.getSpriteable(set, zoomLevels);
    }
    return Sprite.loadSprites(sprites, canvasProvider);
  }

  static getTileMapDim(tilemap) {
    return {
      width: tilemap.width*tilemap.tilewidth,
      height: tilemap.height*tilemap.tileheight,
    };
  }

  static loadTileMapAsSpriteData({ 
    tilemap, loadedTilesets, zoomLevels, canvasWidth, setCanvasResolution, sprites, canvasProvider
  }) {
    const dim = Map.getTileMapDim(tilemap);
    const ratio = canvasWidth / dim.width;

    const spriteData = {};

    for (let z of zoomLevels) {
      const canvas = canvasProvider();
      const width = z * canvasWidth;
      const height = Math.round(z * dim.height * ratio);
      setCanvasResolution(canvas, width, height);
      const context =canvas.getContext('2d', { alpha: false });
      Map.drawTileMapToContext({ tilemap, context, canvasProvider, loadedTilesets, sprites, zoomLevel: z });
      spriteData[width] = {
        canvas,
        parts: [{ x: 0, y: 0, width, height }]
      };
    }
    return spriteData;
  }

  /**
   * draws a map to context
   */
  static drawTileMapToContext({ tilemap, context, loadedTilesets, sprites, zoomLevel, only }) {	
   // const ignore = tilemap.tilesets.reduce((a,b) => b.tiles ? a.concat(b.tiles) : a, []).map(t => t.id);
    for (let layer of tilemap.layers.sort((a,b) => Math.sign(b.id-a.id))) {
      if (layer.type !== "tilelayer") { continue; }
      if (only && !only.includes(layer.name)) { continue; }
      Map.drawTileLayerToContext({ layer, context, sprites, scale: zoomLevel*tilemap.tilewidth });
    }
  }

  /**
   * draws a layer to a context
   */
  static drawTileLayerToContext({ layer, context, sprites, scale }) {
    for(let i = 0; i < layer.data.length; i++) {
      let spriteIndex = layer.data[i];
      if (spriteIndex === 0) { continue; }
      const spriteDataKey = Map.findDescNumericKey(sprites, (t) => t <= spriteIndex);
      spriteIndex -= spriteDataKey; // Move from absolute to relative
      const spriteData = sprites[spriteDataKey][scale];
      const spritePart = spriteData.parts[spriteIndex];
      if (!spritePart) {
        const x = (i % layer.height)*scale;
        const y = Math.floor(i / layer.height)*scale;
        context.fillStyle = 'hotpink';
        context.fillRect(x, y, scale, scale);
        console.log('SprintIndex', spriteIndex, spriteDataKey);
        continue;
      }
      const x = (i % layer.height)*scale;
      const y = Math.floor(i / layer.height)*scale;
      context.drawImage(spriteData.canvas,
        spritePart.x, spritePart.y, spritePart.width, spritePart.height,
        x-1, y-1, scale+2, scale+2);
    }
  }

  static findDescNumericKey(obj, fun) {
    const key = Object.keys(obj)
      .map(t => parseInt(t))
      .sort((a,b) => Math.sign(b-a))
      .find(fun);
    return key;
  }
}
