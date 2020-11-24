import { expect } from 'chai';
import { Map } from './map.js';
import tilesetData from '../tileset.json';

describe('getSpritable', () => {
  it('should take loaded tile data and return something we can make into a sprite', () => {
    const image = {};
    const scales = [0, 0];
    const tileset = {
      columns: 37,
      firstgid: 1,
      image: 'assets/city_tileset_extruded.png',
      imageheight: 475,
      imagewidth: 628,
      margin: 0,
      name: 'city_tileset',
      spacing: 1,
      tilecount: 1036,
      tileheight: 16,
      tilewidth: 16,
      imageData: image,
    };
    const spriteable = Map.getSpriteable(tileset, scales);
    expect(spriteable).to.eql({
      padding: 1,
      image,
      columns: 37,
      rows: 28,
      scales,
    });
  });
});

describe('loadImages', () => {
  it('should fetch images', () => {
    const image = {};
    const fakeFetch = () => new Promise((res) => {
      res({ blob() { return image; } });
    });
    const convertBlob = (t) => t;
    const loadedImages = Map.loadImages({ fetch: fakeFetch, mapJson: tilesetData, convertBlob });
    expect(loadedImages).not.null;
  });
});
