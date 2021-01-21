import { Story } from './story.js';
import { Physics } from './physics.js';
import { Sprite } from './sprite.js';
import { Characters } from './characters.js';
import { Camera } from './camera.js';
import { Map } from './map.js';
import { Music } from './music.js';
import { Time } from './time.js';
import { StartPageUI } from './ui/start-page-ui.js';
import { QuestUI } from './ui/quest-ui.js';
import { OptionsUI } from './ui/options-ui.js';
import { EndScreenUI } from './ui/end-screen-ui.js';
import { InventoryUI } from './ui/inventory-ui.js';
import { ConversationUI } from './ui/conversation-ui.js';
import { EmailUI } from './ui/email-ui.js';
import { PathFinding } from './path-finding.js';

import gameData from './gameData.json';
import tilemap from './tileset.json';

const storyWorker = new Worker(
  // When this is merged, https://github.com/documentationjs/documentation/pull/1344
  // we can go back to using the master branch of documentation.js
  new URL('./workers/story-worker.js', import.meta.url),
  { type: 'module' },
);

function sendStoryEvent(event) {
  storyWorker.postMessage({ type: 'add-event', event });
}

/**
 * canvasProvider.
 * wraps document.createElement, allowing for easy replacement when testing
 * @example
 *    const canvas = canvasProvider();
 */
function canvasProvider() {
  return document.createElement('canvas');
}

// These are modified by updateStats and clearStats
let stats = {};

/**
 * clearStats.
 * This clears all of the statistics/metrics that we've been keeping track o.
 * @example
 clearStats();
 */
function clearStats() {
  stats = {};
}

/**
 * updateStats.
 * Used to keep track of statistics/metrics (fps, collision checking time, ect..),
 * at somepoint it will be rewritten to be more flexible
 * @param {'frames'|'mapMakingTime'|'collisionCalls'|'collisionChecks'} key
 * @param {number} value
 */
function updateStats(key, value) {
  stats[key] = (stats[key] || 0) + value;
}

/**
 * updateDiagnostDisp.
 * Used to update the metrics on screen,
 * at somepoint it will be rewritten to be more flexible
 *
 * @param {Object} args
 * @param {number} args.fps
 * @param {number} args.collisionTime
 * @param {number} args.mapMakingTime
 * @param {number} args.collisionChecks
 * @param {number} args.collisionCalls
 */
function updateDiagnostDisp({ frames }) {
  const el = document.getElementById('fps');
  el.innerHTML = `<div>${frames} FPS</div>`;
}
let playing = false;
function playMusic() {
  if (playing) { return; }
  Music.playTrack('#backgroundchill', true).catch(() => { playing = false; });
  playing = true;
}

// Modified by the keydown/up eventListeners
let up = false;
let down = false;
let left = false;
let right = false;
let pause = false;
let zoom = true;
let debugPathfinding = false;

const zoomLevels = [1, 3];

/* eslint-disable no-shadow */
/**
 * Take all the input requests give an updated player
 *
 * @param {Object} args
 * @param {Actor} args.player - Player
 * @param {number} args.width - Map width
 * @param {number} args.height - Map height
 * @param {boolean} args.up - Is the up key pressed?
 * @param {boolean} args.down - Is the down key pressed?
 * @param {boolean} args.left - Is the left key pressed?
 * @param {boolean} args.right - Is the right key pressed?
 * @returns {Actor} an updated actor
 * @example
 *    movePlayer({ player, width, height, up, down, left, right });
 */
function movePlayer({
  player,
  width,
  height,
  up,
  down,
  left,
  right,
}) {
  /* eslint-enable no-shadow */
  let newPlayer = player;
  let prefix = '';
  if (up && !down) {
    prefix = 'up';
    newPlayer = {
      ...newPlayer,
      y: Math.max(newPlayer.y - newPlayer.speed, 0),
      facing: prefix,
    };
  }
  if (down && !up) {
    prefix = 'down';
    newPlayer = {
      ...newPlayer,
      y: Math.min(newPlayer.y + newPlayer.speed, height - newPlayer.height),
      facing: prefix,
    };
  }
  if (left && !right) {
    newPlayer = {
      ...newPlayer,
      x: Math.max(newPlayer.x - newPlayer.speed, 0),
      facing: `${prefix}left`,
    };
  }
  if (right && !left) {
    newPlayer = {
      ...newPlayer,
      x: Math.min(newPlayer.x + newPlayer.speed, width - newPlayer.height),
      facing: `${prefix}right`,
    };
  }
  return newPlayer;
}
window.addEventListener('load', async () => {
  const mapDim = Map.getTileMapDim(tilemap);
  const loadedTilesets = await Promise.all(Map.loadImages({ mapJson: tilemap }));
  const tileSprites = Map.loadTileMapSprites({
    loadedTilesets,
    canvasProvider,
    zoomLevels,
  });

  // Load elements from DOM (look in index.html)
  const objectCanvas = document.getElementById('objects-layer');
  const layoutCanvas = document.getElementById('layout-layer');
  const aboveCanvas = document.getElementById('above-layer');

  // const layoutImage = document.getElementById('layout');
  // const backgroundImage = document.getElementById('background');

  // Get bounds pixels and context
  const layoutCanvasData = Camera.getCanvasData(layoutCanvas);
  const {
    canvasWidth,
    canvasHeight,
  } = layoutCanvasData;

  Camera.setCanvasResolution(objectCanvas, canvasWidth, canvasHeight);
  Camera.setCanvasResolution(layoutCanvas, canvasWidth, canvasHeight);
  Camera.setCanvasResolution(aboveCanvas, canvasWidth, canvasHeight);

  const virtualCanvas = canvasProvider();
  Camera.setCanvasResolution(virtualCanvas, mapDim.width, mapDim.width);
  Map.drawTileMapToContext({
    context: virtualCanvas.getContext('2d'),
    tilemap,
    only: ['Buildings'],
    sprites: tileSprites,
    zoomLevel: zoomLevels[0],
  });
  const pixels = Camera.getContextPixels({
    context: virtualCanvas.getContext('2d'),
    canvasWidth: mapDim.width,
    canvasHeight: mapDim.height,
  });

  // Default layer context
  const context = objectCanvas.getContext('2d');
  const aboveContext = aboveCanvas.getContext('2d');
  context.imageSmoothingEnabled = false;
  layoutCanvasData.context.imageSmoothingEnabled = false;
  aboveContext.imageSmoothingEnabled = false;

  // Load the initial story
  let gameState = Story.loadGameState(gameData);

  const actorSize = gameState.player.width;
  const graph = PathFinding.gridToGraph({
    grid: pixels,
    width: mapDim.width,
    height: mapDim.height,
    actorSize,
  });

  // Load sprites
  const characterSprite = document.getElementById('character-sprite');
  const uniqueCharacterSprite = document.getElementById('unique-character-sprite');
  const itemSprite = document.getElementById('item-sprite');
  // How big should the cached tile versions be - we just have two sizes
  const scales = [gameState.player.width * zoomLevels[0], gameState.player.width * zoomLevels[1]];
  const sprites = Sprite.loadSprites({
    characterSprite: {
      image: characterSprite, // Actual image data
      columns: 4, // How many columns
      rows: 11, // How many rows
      padding: 60, // How much whitespace to ignore
      scales,
    },
    uniqueCharacterSprite: {
      image: uniqueCharacterSprite,
      columns: 2,
      rows: 3,
      padding: 60,
      scales,
    },
    itemSprite: {
      image: itemSprite,
      columns: 4,
      rows: 4,
      padding: 30,
      scales,
    },
  }, canvasProvider);
  // set background
  sprites.background = Map.loadTileMapAsSpriteData({
    tilemap,
    loadedTilesets,
    setCanvasResolution: Camera.setCanvasResolution,
    sprites: tileSprites,
    canvasWidth,
    zoomLevels,
    canvasProvider,
    except: ['Above'],
  });
  sprites.above = Map.loadTileMapAsSpriteData({
    tilemap,
    loadedTilesets,
    setCanvasResolution: Camera.setCanvasResolution,
    sprites: tileSprites,
    canvasWidth,
    zoomLevels,
    canvasProvider,
    only: ['Above'],
    alpha: 0.9,
  });
  // Wait for start
  const startPage = document.getElementById('start-page');
  const readyToStart = new Promise((resolve) => {
    StartPageUI.renderStartButton(startPage, resolve);
  });
  await readyToStart;

  Time.ingameTime(0);
  // Music - Might not work the first time due to browser permissions
  playMusic();

  const emailIcon = document.getElementById('email');
  const messageOverlay = document.getElementById('message-overlay-container');
  emailIcon.addEventListener('click', () => {
    EmailUI.renderOverlay(messageOverlay);
  });

  let oldItems;
  let oldViewport;
  // Modified in Physics.updateGameState
  const locMap = {};

  /**
   * physicsLoop.
   * Updates the physics state.
   * Called once, then calls itself recursively
   * @example
   *    // Externally - once!
   *    physicsLoop();
   * @example
   *    // Internally
   *    window.requestAnimationFrame(physicsLoop);
   */
  const physicsLoop = () => {
    const flags = { up, down, left, right, paused: pause };
    gameState = Physics.updateGameState({
      gameState,
      pixels,
      flags,
      moveNPC: Characters.moveNPC,
      updateStats,
      movePlayer,
      width: mapDim.width,
      height: mapDim.height,
      locMap,
    });

    const viewport = Camera.updateViewport({
      oldViewport,
      player: gameState.player,
      mapWidth: mapDim.width,
      mapHeight: mapDim.height,
      canvasWidth,
      canvasHeight,
      scale: zoom ? zoomLevels[1] : zoomLevels[0],
    });
    Camera.drawScene({
      player: gameState.player,
      characters: gameState.characters,
      items: gameState.items,
      oldItems,
      context,
      width: canvasWidth,
      height: canvasHeight,
      sprites,
      layoutContext: layoutCanvasData.context,
      oldViewport,
      viewport,
      drawActorToContext: Sprite.drawActorToContext,
      aboveContext,
    });
    if (debugPathfinding && oldViewport !== viewport) {
      Camera.drawDestinations({
        viewport,
        characters: gameState.characters,
        context: aboveContext,
      });
      Camera.drawGraph({ viewport, graph, context: aboveContext });
    }
    oldViewport = viewport;
    oldItems = gameState.items;

    if (gameState.end) { return; }
    window.requestAnimationFrame(physicsLoop);
  };

  // Inventory UI
  const inventoryIcon = document.getElementById('inventory');
  const inventoryOverlay = document.getElementById('inventory-overlay');
  InventoryUI.renderOverlay({
    icon: inventoryIcon,
    overlay: inventoryOverlay,
    items: gameState.items,
  });

  // Quest UI
  const questIcon = document.getElementById('quest'); // HTMLElement
  const questOverlay = document.getElementById('quest-overlay'); // HTMLElement
  QuestUI.renderOverlay({
    icon: questIcon,
    overlay: questOverlay,
    quests: gameState.quests,
  });

  // Options UI
  const options = document.getElementById('options');

  // End Screen UI
  const endScreen = document.getElementById('end-screen');

  // Bind to Music Slider
  document.getElementById('rangeSlider').addEventListener('input', Music.updateVolume);

  // Music UI
  const musicnote = document.getElementById('musicnote');
  let showVolumeSlider = false;
  const volumeSlider = document.getElementById('volumeslider');
  musicnote.addEventListener('click', () => {
    if (showVolumeSlider) {
      volumeSlider.style.visibility = 'hidden';
    } else {
      volumeSlider.style.visibility = 'visible';
    }
    showVolumeSlider = !showVolumeSlider;
  });

  let lastDrop = new Date();
  const maxSoundEffectInterval = 1000; // 1 second

  // Update game state with the latest from story
  storyWorker.onmessage = (e) => {
    const oldState = gameState;
    gameState = Story.applyChanges(gameState, e.data);

    // Play sound effect if exposed
    if (oldState.player.exposureLevel < gameState.player.exposureLevel
      && (new Date() - lastDrop) > maxSoundEffectInterval) {
      Music.playTrack('#waterdrop', false);
      lastDrop = new Date();
    }
    // Update exposure bar
    if (oldState.player.exposureLevel !== gameState.player.exposureLevel) {
      document.getElementById('progress-bar').setAttribute('value', gameState.player.exposureLevel || 0);
    }

    // Show end screen if it's the end
    if (gameState.end) {
      if (!gameState.win) {
        EndScreenUI.showFailure(endScreen);
      } else {
        EndScreenUI.showSuccess(endScreen);
      }
      return; // This ends the story engine cycle
    }

    // Show/update conversation if that changes
    if (oldState.conversation !== gameState.conversation) {
      const updateConvo = (newConvo) => {
        sendStoryEvent({ type: 'update-conversation', conversation: newConvo });
      };
      ConversationUI.renderConversation(gameState.conversation, updateConvo);
    }
    // Update inventory if items change
    if (oldState.items !== gameState.items) {
      InventoryUI.renderOverlay({
        icon: inventoryIcon,
        overlay: inventoryOverlay,
        items: gameState.items,
      });
    }
    // Update quests ui if quest status changes
    if (oldState.quests !== gameState.quests) {
      QuestUI.renderOverlay({
        icon: questIcon,
        overlay: questOverlay,
        quests: gameState.quests,
      });
    }
    // Update option text if there's a change
    if (oldState.optionText !== gameState.optionText) {
      OptionsUI.renderOptions({
        element: options,
        optionText: gameState.optionText,
      });
    }
    // Update story worker with new game state -- this is a cycle/loop
    storyWorker.postMessage({
      type: 'update-game-state',
      gameState,
      flags: { paused: pause },
    });
  };

  // Prep story worker
  storyWorker.postMessage({
    type: 'update-grid',
    grid: pixels,
    mapDim,
    actorSize,
  });
  // Start story worker cycle
  storyWorker.postMessage({
    type: 'update-game-state',
    gameState,
  });

  // Update FPS/other stats every 1000ms
  setInterval(() => {
    updateDiagnostDisp(stats);
    clearStats();
  }, 1000);

  // Start physics loop
  physicsLoop(performance.now());
});

window.addEventListener('keydown', (e) => {
  // Do nothing if event already handled
  if (e.defaultPrevented) {
    return;
  }

  switch (e.code) {
    case 'KeyS':
    case 'ArrowDown':
      // Handle "back"
      down = true;
      break;
    case 'KeyW':
    case 'ArrowUp':
      // Handle "forward"
      up = true;
      break;
    case 'KeyA':
    case 'ArrowLeft':
      // Handle "turn left"
      left = true;
      break;
    case 'KeyD':
    case 'ArrowRight':
      // Handle "turn right"
      right = true;
      break;
    default:
      break;
  }
});
window.addEventListener('keyup', (e) => {
  // Do nothing if event already handled
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
    case 'KeyP':
      pause = !pause;
      break;
    case 'KeyZ':
      zoom = !zoom;
      break;
    case 'KeyC':
      sendStoryEvent({ type: 'start-conversation' });
      break;
    case 'KeyX':
      sendStoryEvent({ type: 'pickup-item' });
      break;
    case 'Digit0':
      debugPathfinding = !debugPathfinding;
      break;
    default:
      console.log(e.code); // eslint-disable-line no-console
      break;
  }
  playMusic();
});
