/* eslint-disable no-use-before-define */
import { Story } from '../story.js';
import { Camera } from '../camera.js';
import { Map } from '../map.js';
import { Sprite } from '../sprite.js';
import { AreasLayer } from './areas-layer.js';
import { CharactersLayer } from './characters-layer.js';
import { Panel } from './panel.js';

const fetchTilesetData = new Promise((res) => {
  fetch('../tileset.json')
    .then((response) => res(response.json()));
});

window.addEventListener('load', async () => {
  const tilemap = await fetchTilesetData;
  const loadedTilesets = await Promise.all(Map.loadImages({ mapJson: tilemap, prepend: '../' }));
  // Load element from DOM (look in index.html)
  const charactersCanvas = document.getElementById('characters-layer');
  const areasCanvas = document.getElementById('areas-layer');
  const layoutCanvas = document.getElementById('layout-layer');
  const canvases = [charactersCanvas, areasCanvas, layoutCanvas];

  const mapDim = Map.getTileMapDim(tilemap);
  const layoutCanvasData = Camera.getCanvasData(layoutCanvas);
  const { canvasWidth, canvasHeight } = layoutCanvasData;
  let gameData = {
    player: {
      x: 100,
      y: 100,
      width: 10,
      height: 10,
      spriteIndex: 8,
      speed: 3,
    },
    characters: [],
    areas: [],
  };

  Camera.setCanvasResolution(charactersCanvas, canvasWidth, canvasHeight);
  Camera.setCanvasResolution(layoutCanvas, canvasWidth, canvasHeight);
  Camera.setCanvasResolution(areasCanvas, canvasWidth, canvasHeight);

  const tileSprites = Map.loadTileMapSprites({
    loadedTilesets,
    canvasProvider,
    zoomLevels: [1, 2],
  });

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
  });

  const zoom = false;

  function updateViewport(v = null, focusArea = gameData.player) {
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

  window.addEventListener('mousemove', (e) => {
    if (!canvases.includes(e.target)) { return; }
    let diffx = 0;
    let diffy = 0;
    if (e.offsetX > canvasWidth * 0.9) {
      diffx = e.offsetX - canvasWidth * 0.9;
    } else if (e.offsetX < canvasWidth * 0.1) {
      diffx = e.offsetX - canvasWidth * 0.1;
    }
    if (e.offsetY > canvasHeight * 0.9) {
      diffy = e.offsetY - canvasHeight * 0.9;
    } else if (e.offsetY < canvasHeight * 0.1) {
      diffy = e.offsetY - canvasHeight * 0.1;
    }
    const focusArea = {
      x: Math.floor(viewport.x + canvasWidth / 2 - 5 + diffx),
      y: Math.floor(viewport.y + canvasHeight / 2 - 5 + diffy),
      width: 10,
      height: 10,
    };
    const newViewport = updateViewport(viewport, focusArea);
    if (newViewport !== viewport) {
      viewport = newViewport;
      drawScene(viewport);
      areasLayer.updateViewport(viewport);
      charactersLayer.updateViewport(viewport);
    }
  });

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
