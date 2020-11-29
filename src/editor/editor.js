/* eslint-disable no-use-before-define */
import { Story } from '../story.js';
import { Camera } from '../camera.js';
import { Map } from '../map.js';
import { Sprite } from '../sprite.js';

const fetchTilesetData = new Promise((res) => {
  fetch('../tileset.json')
    .then((response) => res(response.json()));
});

window.addEventListener('load', async () => {
  const tilemap = await fetchTilesetData;
  const loadedTilesets = await Promise.all(Map.loadImages({ mapJson: tilemap, prepend: '../' }));
  // Load element from DOM (look in index.html)
  const objectCanvas = document.getElementById('objects-layer');
  const areasCanvas = document.getElementById('areas-layer');
  const layoutCanvas = document.getElementById('layout-layer');

  const mapDim = Map.getTileMapDim(tilemap);
  const layoutCanvasData = Camera.getCanvasData(layoutCanvas);
  const { canvasWidth, canvasHeight } = layoutCanvasData;
  let gameData = {
    player: {
      x: 100,
      y: 100,
      width: 20,
      height: 20,
      spriteIndex: 8,
      speed: 1,
    },
    characters: [],
    areas: [],
  };

  Camera.setCanvasResolution(objectCanvas, canvasWidth, canvasHeight);
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
  let viewport = Camera.updateViewport({
    oldViewport: null,
    player: gameData.player,
    mapWidth: mapDim.width,
    mapHeight: mapDim.height,
    canvasWidth,
    canvasHeight,
    scale: zoom ? 2 : 1,
  });
  Camera.drawScene({
    player: gameData.player,
    characters: gameData.characters,
    context: objectCanvas.getContext('2d'),
    width: canvasWidth,
    height: canvasHeight,
    sprites,
    layoutContext: layoutCanvas.getContext('2d'),
    oldViewport: null,
    viewport,
    drawActorToContext: Sprite.drawActorToContext,
  });


  let areas = [];

  let selected;
  let stat;
  canvas.addEventListener('mousedown', (e) => {
    const x = e.offsetX;
    const y = e.offsetY;
    const grabbed = inHandle({ areas, x, y });
    selected = grabbed || inArea({ areas, x, y });
    if (grabbed) {
      stat = 'resize';
    } else if (selected) { // Drag area
      stat = 'move';
    } else { // New area
      const id = Story.newId(areas);
      selected = {
        id, x, y, width: 0, height: 0, color: getShade(), name: newName(id),
      };
      stat = 'resize';
    }

    // Update areas
    if (selected) {
      areas = areas.filter((t) => t !== selected).concat(selected);
    }
  });
  canvas.addEventListener('mousemove', (e) => {
    if (selected) {
      const updatedAreas = areas.filter((t) => t !== selected);
      if (stat === 'resize') {
        selected = {
          ...selected,
          width: e.offsetX - selected.x,
          height: e.offsetY - selected.y,
        };
      } else if (stat === 'move') {
        selected = {
          ...selected,
          x: selected.x + e.movementX,
          y: selected.y + e.movementY,
        };
      }
      areas = updatedAreas.concat(selected);
    } else {
      const player = gameData.player;
      let diffx = 0;
      let diffy = 0;
      if (e.offsetX > canvasWidth*.9) {
        diffx = e.offsetX - canvasWidth*.9;
      } else if (e.offsetX < canvasWidth*.1) {
        diffx = e.offsetX - canvasWidth*.1;
      }
      if (e.offsetY > canvasHeight*.9) {
        diffy = e.offsetY - canvasHeight*.9;
      } else if (e.offsetY < canvasHeight*.1) {
        diffy = e.offsetY - canvasHeight*.1 ;
      }
      viewport = Camera.updateViewport({
        oldViewport: null,
        player: {
          x: Math.floor(viewport.x + canvasWidth/2 - 5 + diffx),
          y: Math.floor(viewport.y + canvasHeight/2 - 5 + diffy),
          width: 10,
          height: 10
        },
        mapWidth: mapDim.width,
        mapHeight: mapDim.height,
        canvasWidth,
        canvasHeight,
        scale: zoom ? 2 : 1,
      });
      Camera.drawScene({
        player: gameData.player,
        characters: gameData.characters,
        context: objectCanvas.getContext('2d'),
        width: canvasWidth,
        height: canvasHeight,
        sprites,
        layoutContext: layoutCanvas.getContext('2d'),
        oldViewport: null,
        viewport,
        drawActorToContext: Sprite.drawActorToContext,
      });
    }
  });

  function done() {
    // Something selected and we're doing something
    if (selected && stat != null) {
      const updatedAreas = areas.filter((t) => t !== selected);
      // Remove areas that are too small
      if (Math.abs(selected.width) > 2 || Math.abs(selected.height) > 2) {
        const x = selected.x + selected.width;
        const y = selected.y + selected.height;
        selected = {
          ...selected,
          width: Math.round(Math.abs(selected.width)),
          height: Math.round(Math.abs(selected.height)),
          x: Math.round(Math.min(x, selected.x)),
          y: Math.round(Math.min(y, selected.y)),
        };
        areas = updatedAreas.concat(selected);
      } else {
        areas = updatedAreas;
        selected = null;
      }
    }
    stat = null;
  }
  canvas.addEventListener('mouseup', done);
  canvas.addEventListener('mouseout', done);

  const args = {
    width: canvasWidth,
    height: canvasHeight,
    canvas: objectCanvas,
    context: areasCanvas.getContext('2d'),
  };

  setInterval(() => { drawAreas({ ...args, areas, selected }); }, 20);

  const filePicker = document.getElementById('file');
  filePicker.addEventListener('change', async () => {
    const file = filePicker.files[0];
    gameData = await importFile({ file, width, height });
    areas = gameData.areas;
  });
  const download = document.getElementById('download');
  download.addEventListener('click', () => {
    const dataURI = exportFile({ ...gameData, areas });
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

function newName(id) {
  return `name${id}`;
}

function inArea({ areas, x, y }) {
  for (let i = areas.length - 1; i >= 0; i--) {
    const diffx = x - areas[i].x;
    const diffy = y - areas[i].y;
    if (diffx > 0 && diffy > 0 && diffx < areas[i].width && diffy < areas[i].height) {
      return areas[i];
    }
  }
  return null;
}

function inHandle({ areas, x, y }) {
  for (let i = areas.length - 1; i >= 0; i--) {
    const diffx = Math.abs(x - (areas[i].x + areas[i].width));
    const diffy = Math.abs(y - (areas[i].y + areas[i].height));
    if (diffx < 10 && diffy < 10) {
      return areas[i];
    }
  }
  return null;
}

function draw({
  context, areas, width, height, selected,
}) {
  window.requestAnimationFrame(() => {
    context.clearRect(0, 0, width, height);

    for (let i = 0; i < areas.length; i++) {
      const area = areas[areas.length - i - 1];
      drawArea({ area, context, active: area === selected });
    }
  });
}

function drawArea({ context, area, active }) {
  context.fillStyle = area.color;
  context.fillRect(area.x, area.y, area.width, area.height);
  context.fillStyle = 'black';
  if (!active) { return; }

  context.strokeRect(area.x, area.y, area.width, area.height);

  context.beginPath();
  context.arc(area.x + area.width, area.y + area.height, 5, 0, 2 * Math.PI);
  context.closePath();
  context.fill();
}

function getShade() {
  return `rgba(${Math.floor(Math.random() * 255)},${Math.floor(Math.random() * 255)},${Math.floor(Math.random() * 255)},0.5)`;
}

function canvasProvider() {
  return document.createElement('canvas');
}

/* eslint-enable no-use-before-define */
