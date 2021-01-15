/* eslint-disable no-use-before-define */
import { Story } from '../story.js';
import { Camera } from '../camera.js';
import { Map } from '../map.js';
import { Sprite } from '../sprite.js';
import { AreasLayer } from './areas-layer.js';
import { CharactersLayer } from './characters-layer.js';
import { Panel } from './panel.js';

import importedGameData from '../gameData.json';
import tilemap from '../tileset.json';

window.addEventListener('load', async () => {
  const loadedTilesets = await Promise.all(Map.loadImages({ mapJson: tilemap, prepend: '../' }));
  // Load element from DOM (look in index.html)
  const charactersCanvas = document.getElementById('characters-layer');
  const areasCanvas = document.getElementById('areas-layer');
  const layoutCanvas = document.getElementById('layout-layer');

  const mapDim = Map.getTileMapDim(tilemap);
  const { bounds } = Camera.getCanvasData(layoutCanvas);
  const canvasWidth = Math.round(bounds.width);
  const canvasHeight = Math.round(bounds.height);

  Camera.setCanvasResolution(charactersCanvas, canvasWidth, canvasHeight);
  Camera.setCanvasResolution(layoutCanvas, canvasWidth, canvasHeight);
  Camera.setCanvasResolution(areasCanvas, canvasWidth, canvasHeight);

  const tileSprites = Map.loadTileMapSprites({
    loadedTilesets,
    canvasProvider,
    zoomLevels: [1, 2],
  });

  let gameData = importedGameData;

  // Load sprites
  const characterSprite = document.getElementById('character-sprite');
  const sprites = Sprite.loadSprites({
    characterSprite: {
      image: characterSprite, // Actual image data
      columns: 3, // How many columns
      rows: 5, // How many rows
      padding: 60, // How much whitespace to ignore
      // How big should the cached tile versions be - we just have two sizes
      scales: [gameData.player.width, gameData.player.width * 2],
    },
  }, canvasProvider); // eslint-disable-line no-use-before-define
  // set background
  sprites.background = Map.loadTileMapAsSpriteData({
    tilemap,
    loadedTilesets,
    setCanvasResolution: Camera.setCanvasResolution,
    sprites: tileSprites,
    canvasWidth,
    zoomLevels: [1, 2],
    canvasProvider, // eslint-disable-line no-use-before-define
    except: ['Above'],
  });

  function updateViewport(v = null, focusArea = gameData.player, zoom = false) {
    return Camera.updateViewport({
      oldViewport: v,
      player: focusArea,
      mapWidth: mapDim.width,
      mapHeight: mapDim.height,
      canvasWidth,
      canvasHeight,
      scale: zoom ? 2 : 1,
    });
  }

  let viewport = updateViewport();

  function drawScene(v) {
    Camera.drawScene({
      player: gameData.player,
      characters: [],
      context: charactersCanvas.getContext('2d'), // Gets cleared - meh.
      width: canvasWidth,
      height: canvasHeight,
      sprites,
      layoutContext: layoutCanvas.getContext('2d'),
      oldViewport: null,
      viewport: v,
      items: [],
      drawActorToContext: () => {}, // Don't actually do that
    });
  }
  drawScene(viewport);

  const panel = document.getElementById('side-panel');
  Panel.initialize({ areasCanvas, charactersCanvas, panel });
  const areasLayer = AreasLayer.initialize({
    areasCanvas, canvasWidth, canvasHeight, viewport, panel,
  });
  const charactersLayer = CharactersLayer.initialize({
    charactersCanvas,
    canvasWidth,
    canvasHeight,
    viewport,
    panel,
    player: gameData.player,
    sprites,
  });
  areasLayer.updateAreas(gameData.areas);
  charactersLayer.updateCharacters(gameData.characters);

  let up = false;
  let down = false;
  let left = false;
  let right = false;
  let zoom = false;
  window.addEventListener('keydown', (e) => {
    if (e.defaultPrevented) { return; }
    if (e.target.tagName === 'INPUT') { return; }

    switch (e.code) {
      case 'KeyS':
      case 'ArrowDown':
        down = true;
        break;
      case 'KeyW':
      case 'ArrowUp':
        up = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        left = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        right = true;
        break;
      case 'KeyZ':
        zoom = !zoom;
        break;
      default:
        break;
    }
  });
  window.addEventListener('keyup', (e) => {
    if (e.defaultPrevented) {
      return;
    }

    switch (e.code) {
      case 'KeyS':
      case 'ArrowDown':
        down = false;
        break;
      case 'KeyW':
      case 'ArrowUp':
        up = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        left = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        right = false;
        break;
      default:
        break;
    }
  });
  const focusArea = {
    x: Math.floor(viewport.x + canvasWidth / 2 - 5),
    y: Math.floor(viewport.y + canvasHeight / 2 - 5),
    width: 10,
    height: 10,
  };
  setInterval(() => {
    const speed = 30;
    const diffx = (left ? -speed : 0) + (right ? speed : 0);
    const diffy = (up ? -speed : 0) + (down ? speed : 0);
    focusArea.x = Math.max(
      Math.min(focusArea.x + diffx, mapDim.width - canvasWidth / 4),
      canvasWidth / 4,
    );
    focusArea.y = Math.max(
      Math.min(focusArea.y + diffy, mapDim.height - canvasHeight / 4),
      canvasHeight / 4,
    );
    const newViewport = updateViewport(viewport, focusArea, zoom);
    if (newViewport !== viewport) {
      viewport = newViewport;
      drawScene(viewport);
      areasLayer.updateViewport(viewport);
      charactersLayer.updateViewport(viewport);
    }
  }, 30);

  const filePicker = document.getElementById('file');
  filePicker.addEventListener('change', async () => {
    const file = filePicker.files[0];
    gameData = (await importFile({ file })).gameData;
    areasLayer.updateAreas(gameData.areas);
    charactersLayer.updateCharacters(gameData.characters);
  });
  const download = document.getElementById('download');
  download.addEventListener('click', () => {
    const dataURI = exportFile({
      ...gameData,
      areas: areasLayer.getAreas(),
      characters: charactersLayer.getCharacters(),
    });
    download.href = dataURI;
  });
});

async function importFile({ file, width, height }) {
  const text = await file.text();
  return Story.loadGameState({ gameData: JSON.parse(text), width, height });
}

function exportFile(gameData) {
  return `data:text/json;base64,${btoa(JSON.stringify(gameData, null, 2))}`;
}

function canvasProvider() {
  return document.createElement('canvas');
}

/* eslint-enable no-use-before-define */
