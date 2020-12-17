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

const fetchGameData = new Promise((res) => {
  fetch('./gameData.json')
    .then((response) => res(response.json()));
});
const fetchTilesetData = new Promise((res) => {
  fetch('./tileset.json')
    .then((response) => res(response.json()));
});

const storyWorker = new Worker(
  new URL('./workers/story-worker.js', import.meta.url),
  { type: 'module' },
);

function sendStoryEvent(event) {
  storyWorker.postMessage({ type: 'add-event', event });
}

const zoomLevels = [1, 4];
window.addEventListener('load', async () => {
  const [gameData, tilemap] = await Promise.all([
    fetchGameData,
    fetchTilesetData,
  ]);

  const mapDim = Map.getTileMapDim(tilemap);
  const loadedTilesets = await Promise.all(Map.loadImages({ mapJson: tilemap }));
  const tileSprites = Map.loadTileMapSprites({
    loadedTilesets,
    canvasProvider, // eslint-disable-line no-use-before-define
    zoomLevels,
  });

  // Load elements from DOM (look in index.html)
  const objectCanvas = document.getElementById('objects-layer');
  const layoutCanvas = document.getElementById('layout-layer');
  const debugCanvas = document.getElementById('debug-layer');

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

  const virtualCanvas = canvasProvider(); // eslint-disable-line no-use-before-define
  Camera.setCanvasResolution(virtualCanvas, mapDim.width, mapDim.width);
  Camera.setCanvasResolution(debugCanvas, mapDim.width, mapDim.width);
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
  context.imageSmoothingEnabled = false;
  layoutCanvasData.context.imageSmoothingEnabled = false;

  // Load the initial story
  let gameState = Story.loadGameState(gameData);

  storyWorker.postMessage({
    type: 'update-grid',
    grid: pixels,
    mapDim,
    actorSize: gameState.player.width,
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
      scales: [gameState.player.width * zoomLevels[0], gameState.player.width * zoomLevels[1]],
    },
  }, canvasProvider); // eslint-disable-line no-use-before-define
  // set background
  sprites.background = Map.loadTileMapAsSpriteData({
    tilemap,
    loadedTilesets,
    setCanvasResolution: Camera.setCanvasResolution,
    sprites: tileSprites,
    canvasWidth,
    zoomLevels,
    canvasProvider, // eslint-disable-line no-use-before-define
  });
  // Wait for start
  const startPage = document.getElementById('start-page');
  const readyToStart = new Promise((resolve) => {
    StartPageUI.renderStartButton(startPage, resolve);
  });
  await readyToStart;

  /* eslint-disable no-use-before-define */
  // Icons
  inventoryIcon = document.getElementById('inventory');
  overlay = document.getElementById('overlay');
  inventory = document.querySelector('.inventory');
  overlay.addEventListener('click', toggleInventoryOverlay);
  inventoryIcon.addEventListener('click', toggleInventoryOverlay);
  inventory.addEventListener('click', (e) => { e.preventDefault(); });

  /**
   *  just added these here for testing, uncomment to test -Eetu
   */
  Time.ingameTime(0);
  Time.setTimer(4);

  // Music - Might not work the first time
  playMusic();

  const emailIcon = document.getElementById('email');
  const messageOverlay = document.getElementById('message-overlay-container');
  emailIcon.addEventListener('click', () => {
    renderMessageOverlay(messageOverlay);
  });

  /* eslint-enable no-use-before-define */

  // Add some random characters
  const newCharacters = new Array(4).fill(gameState.characters[0])
    .map((t, i) => {
      let spriteIndex = 8;
      while (spriteIndex === 8) {
        spriteIndex = Math.floor(Math.random() * 13);
      }
      return {
        ...t,
        id: i + gameState.characters.length + 1,
        spriteIndex,
        type: '',
      }; // other NPCs' IDs follow the 'vip' NPCs'
    });

  let storyChanges;
  let oldViewport;
  let physicsState = {
    pixels,
    player: gameState.player,
    characters: gameState.characters.concat(newCharacters),
    width: mapDim.width,
    height: mapDim.height,
    locMap: {},
    updateStats, // eslint-disable-line no-use-before-define
    moveNPC: Characters.moveNPC,
    movePlayer, // eslint-disable-line no-use-before-define
  };

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
    /* eslint-disable no-use-before-define */
    physicsState = Physics.updatePhysicsState({
      ...physicsState,
      up,
      down,
      left,
      right,
      paused: pause,
    });
    /* eslint-enable no-use-before-define */
    if (storyChanges != null && Object.keys(storyChanges).length > 0) {
      physicsState = Story.applyChanges(physicsState, storyChanges);
      storyChanges = null;
    }
    const viewport = Camera.updateViewport({
      oldViewport,
      player: physicsState.player,
      mapWidth: physicsState.width,
      mapHeight: physicsState.height,
      canvasWidth,
      canvasHeight,
      scale: zoom ? zoomLevels[1] : zoomLevels[0], // eslint-disable-line no-use-before-define
    });
    Camera.drawScene({
      player: physicsState.player,
      characters: physicsState.characters,
      context,
      width: canvasWidth,
      height: canvasHeight,
      sprites,
      layoutContext: layoutCanvasData.context,
      oldViewport,
      viewport,
      drawActorToContext: Sprite.drawActorToContext,
    });
    if (debugPathfinding) {
      Camera.drawDestinations({ viewport, characters: physicsState.characters, context: debugCanvas.getContext('2d') });
      Camera.drawGraph({ viewport, graph, context: debugCanvas.getContext('2d') });
    }

    oldViewport = viewport;
    window.requestAnimationFrame(physicsLoop);
  };
  // Start main game loop
  physicsLoop(performance.now());

  // Update game state periodically (100ms)
  let last = new Date();
  setInterval(() => {
    const timeSinceLast = new Date() - last;
    // Update game state with the latest from physics
    gameState = {
      ...gameState,
      player: physicsState.player,
      characters: physicsState.characters,
    };
    storyWorker.postMessage({
      type: 'update-game-state',
      gameState,
      flags: { attack, enableConversation }, // eslint-disable-line no-use-before-define
    });

    oldViewport = viewport;
    window.requestAnimationFrame(physicsLoop);
  };
  // Start main game loop
  physicsLoop(performance.now());

  /// / Update game state with the latest from physics
  storyWorker.onmessage = (e) => {
    storyChanges = e.data;
    /* eslint-disable no-use-before-define */
    if (storyChanges.conversation != null) {
      const updateConvo = (newConvo) => {
        sendStoryEvent({ type: 'update-conversation', conversation: newConvo });
      };
      renderConversation(storyChanges.conversation, updateConvo);
      enableConversation = false;
    }
    /* eslint-enable no-use-before-define */
  };

  // Update FPS/other stats every 1000ms
  setInterval(() => {
    /* eslint-disable no-use-before-define */
    updateDiagnostDisp({
      fps: frames,
      mapMakingTime,
      collisionTime,
      collisionChecks,
      collisionCalls,
    });
    clearStats();
    /* eslint-enable no-use-before-define */
  }, 1000);
  /* eslint-disable no-use-before-define */

  // Icons
  inventoryIcon = document.getElementById('inventory');
  overlay = document.getElementById('overlay');
  inventory = document.querySelector('.inventory');
  overlay.addEventListener('click', toggleInventoryOverlay);
  inventoryIcon.addEventListener('click', toggleInventoryOverlay);
  inventory.addEventListener('click', (e) => {
    e.preventDefault();
  });

  // Quest UI
  const quests = [{
    title: 'Talk to someone',
    tasks: [{ description: 'Talk to anyone about anything!' }],
  }, {
    title: 'Find your notebook',
    tasks: [
      { description: 'You last left your notebook in a classroom. Talk to your teachers.' },
      {
        description: 'Frau Kold says another student picked it up!',
        hidden: true,
      },
    ],
  }];
  const questIcon = document.getElementById('quest'); // HTMLElement
  const questOverlay = document.getElementById('quest-overlay'); // HTMLElement
  QuestUI.renderOverlay({
    icon: questIcon,
    overlay: questOverlay,
    quests,
  });
  /* eslint-enable no-use-before-define */
});

// Modified by the eventListener
let up = false;
let down = false;
let left = false;
let right = false;
let attack = false;
let pause = false;
let zoom = false;
let enableConversation = false;
let debugPathfinding = false;
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
    case 'Space':
      attack = !attack;
      break;
    case 'KeyP':
      pause = !pause;
      break;
    case 'KeyZ':
      zoom = !zoom;
      break;
    case 'KeyI':
      toggleInventoryOverlay(e); // eslint-disable-line no-use-before-define
      break;
    case 'KeyC':
      enableConversation = !enableConversation; // eslint-disable-line no-use-before-define
      break;
    case 'Digit0':
      debugPathfinding = !debugPathfinding;
      break;
    default:
      console.log(e.code); // eslint-disable-line no-console
      break;
  }
  playMusic(); // eslint-disable-line no-use-before-define
});

/**
 * canvasProvider.
 * wraps document.createElement, allowing for easy replacement when testing
 * @example
 *    const canvas = canvasProvider();
 */
function canvasProvider() {
  return document.createElement('canvas');
}

/**
 * renderConversation.
 *
 * @param {Object} conversation
 * @param {Character} conversation.character
 * @param {currentDialog} conversation.currentDialog
 * @example
 renderConversation(gameState.conversation);
 */
function renderConversation(conversation, updateConvo) {
  const el = document.getElementById('conversation');
  if (!conversation) {
    el.style.display = 'none';
    return;
  }
  const {
    character,
    currentDialog,
  } = conversation;
  const { response } = currentDialog;
  const goodbye = { query: 'Goodbye' };
  const options = (currentDialog.options || []).concat(goodbye);

  el.style.display = 'block';

  // add multiple conversation options
  const optionHTML = Object.keys(options)
    .map(
      (i) => `<button class="option_button">${options[i].query}</button><br>`,
    )
    .join('');

  const html = `<p>
                 <b>${character.name}:</b>
                 ${response}
                </p>`;

  const buttonHTML = `<p>${optionHTML}</p>`;

  const finalHTML = html + buttonHTML;

  el.innerHTML = finalHTML;

  // add onclick functions to all buttons
  const buttons = el.querySelectorAll('button');
  Object.keys(options)
    .forEach((i) => {
      const button = buttons[i];
      button.addEventListener('click', () => {
        const option = options[i];
        if (option === goodbye || option.response == null) {
          updateConvo({
            ...conversation,
            active: false,
          });
          return;
        }
        updateConvo({
          ...conversation,
          currentDialog: option,
        });
      });
    });

  if (!conversation.active) {
    el.style.display = 'none';
  }
}

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

// These are modified by updateStats and clearStats
let frames = 0;
let mapMakingTime = 0;
let collisionTime = 0;
let collisionChecks = 0;
let collisionCalls = 0;

/**
 * clearStats.
 * This clears all of the statistics/metrics that we've been keeping track of,
 * at somepoint it will be rewritten to be more flexible
 * @example
 clearStats();
 */
function clearStats() {
  frames = 0;
  mapMakingTime = 0;
  collisionTime = 0;
  collisionChecks = 0;
  collisionCalls = 0;
}

/**
 * updateStats.
 * Used to keep track of statistics/metrics (fps, collision checking time, ect..),
 * at somepoint it will be rewritten to be more flexible
 * @param {'frames'|'mapMakingTime'|'collisionCalls'|'collisionChecks'} key
 * @param {number} value
 */
function updateStats(key, value) {
  switch (key) {
    case 'frames':
      frames += value;
      return;
    case 'mapMakingTime':
      mapMakingTime += value;
      return;
    case 'collisionTime':
      collisionTime += value;
      return;
    case 'collisionChecks':
      collisionChecks += value;
      return;
    case 'collisionCalls':
      collisionCalls += value;
      break;
    default:
      break;
  }
}

/* eslint-disable no-shadow */
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
function updateDiagnostDisp({
  fps,
  collisionTime,
  mapMakingTime,
  collisionChecks,
  collisionCalls,
}) {
  /* eslint-enable no-shadow */
  const el = document.getElementById('fps');
  el.innerHTML = `<ul>
    <li>${fps} FPS</li>
    <li>${collisionTime} Col. ms </li>
    <li>${mapMakingTime} Map. ms </li>
    <li>${Math.round(collisionChecks / collisionCalls)} Ave. Col. Checks </li>
  </ul>`;
}

let overlayOpen = false;
let inventoryIcon;
let overlay;
let inventory;

function toggleInventoryOverlay(e) {
  if (e.defaultPrevented) {
    return;
  }
  if (!overlayOpen) {
    overlay.style.display = 'block';
    overlayOpen = true;
  } else {
    overlay.style.display = 'none';
    overlayOpen = false;
  }
}

function renderMessageOverlay(element) {
  const innerEl = element.querySelector('#message-overlay');
  const background = element.querySelector('.overlay');
  const html = `
    <button class="accHead">Course Schedule</button>
    <div class="accBody">Unavilable.</div>

    <button class="accHead">Reregistration for Next Semester</button>
    <div class="accBody">Gib Money.</div>

    <button class="accHead">Greetings from a Nigerian Prince</button>
    <div class="accBody">Need help, send money and get money.</div>

    <button class="accHead">Maultaschen?</button>
    <div class="accBody">Maultaschen!</div>
  `;
  innerEl.innerHTML = html; // eslint-disable-line

  let isOpen = true;
  background.style.display = 'block';
  innerEl.style.display = 'block';
  background.addEventListener('click', () => {
    if (isOpen) {
      innerEl.style.display = 'none';
      background.style.display = 'none';
    } else {
      innerEl.style.display = 'block';
      background.style.display = 'block';
    }
    isOpen = !isOpen;
  });

  const accHeadList = innerEl.querySelectorAll('.accHead');
  for (let i = 0; i < accHeadList.length; i++) {
    accHeadList[i].addEventListener('click', (e) => {
      e.preventDefault();
      const accBodyList = e.target.nextElementSibling;
      if (accBodyList.style.display === 'block') {
        accBodyList.style.display = 'none';
      } else {
        accBodyList.style.display = 'block';
      }
    });
  }
}

let playing = false;
function playMusic() {
  if (playing) { return; }
  Music.playTrack('#backgroundchill', true).catch(() => { playing = false; });
  playing = true;
}

// updates the volume based on where the volumeslider is
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('rangeSlider').addEventListener('input', Music.updateVolume);
});

const musicnote = document.getElementById('musicnote');
let currentstate = false;
const volumeslider = document.getElementById('volumeslider');
musicnote.addEventListener('click', () => {
  if (currentstate) {
    volumeslider.style.visibility = 'hidden';
  } else {
    volumeslider.style.visibility = 'visible';
  }
  currentstate = !currentstate;
});
