import { Story } from './story.js';
import { Physics } from './physics.js';
import { Sprite } from './sprite.js';
import { Characters } from './characters.js';
import { Camera } from './camera.js';
import { Map } from './map.js';

const fetchGameData = new Promise((res) => {
  fetch('./gameData.json')
    .then((response) => res(response.json()));
});
const fetchTilesetData = new Promise((res) => {
  fetch('./tileset.json')
    .then((response) => res(response.json()));
});

window.addEventListener('load', async () => {
  const start = new Date(); // Save the start time
  const [gameData, tilemap] = await Promise.all([
    fetchGameData,
    fetchTilesetData,
  ]);

  const mapDim = Map.getTileMapDim(tilemap);
  const loadedTilesets = await Promise.all(Map.loadImages({ mapJson: tilemap }));
  const tileSprites = Map.loadTileMapSprites({
    loadedTilesets,
    canvasProvider, // eslint-disable-line no-use-before-define
    zoomLevels: [1, 2],
  });

  // Load elements from DOM (look in index.html)
  const objectCanvas = document.getElementById('objects-layer');
  const layoutCanvas = document.getElementById('layout-layer');

  // const layoutImage = document.getElementById('layout');
  // const backgroundImage = document.getElementById('background');

  // Get bounds pixels and context
  const layoutCanvasData = Camera.getCanvasData(layoutCanvas);
  const { canvasWidth, canvasHeight } = layoutCanvasData;

  // mapDim.width, mapDim.height
  Camera.setCanvasResolution(objectCanvas, canvasWidth, canvasHeight);
  Camera.setCanvasResolution(layoutCanvas, canvasWidth, canvasHeight);

  const virtualCanvas = canvasProvider(); // eslint-disable-line no-use-before-define
  Camera.setCanvasResolution(virtualCanvas, mapDim.width, mapDim.width);
  Map.drawTileMapToContext({
    context: virtualCanvas.getContext('2d'),
    tilemap,
    only: ['Buildings'],
    sprites: tileSprites,
    zoomLevel: 1,
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

  // Load sprites
  const characterSprite = document.getElementById('character-sprite');
  const sprites = Sprite.loadSprites({
    characterSprite: {
      image: characterSprite, // Actual image data
      columns: 3, // How many columns
      rows: 5, // How many rows
      padding: 60, // How much whitespace to ignore
      // How big should the cached tile versions be - we just have two sizes
      scales: [gameState.player.width, gameState.player.width * 2],
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

  // Add some random characters
  const newCharacters = new Array(4).fill(gameState.characters[0]).map((t, i) => {
    let spriteIndex = 8;
    while (spriteIndex === 8) { spriteIndex = Math.floor(Math.random() * 13); }
    return {
      ...t, id: i + gameState.characters.length + 1, spriteIndex, type: '',
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
      attack, // game state
    });
    /* eslint-enable no-use-before-define */
    if (storyChanges) {
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
      scale: zoom ? 2 : 1, // eslint-disable-line no-use-before-define
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
    oldViewport = viewport;
    window.requestAnimationFrame(physicsLoop);
  };
  // Start main game loop
  physicsLoop();

  // Update game state periodically (100ms)
  let last = new Date();
  setInterval(() => {
    const timeSinceLast = new Date() - last;
    gameState = {
      ...gameState,
      player: physicsState.player,
      characters: physicsState.characters,
    };
    const now = new Date() - start;
    let conversationTriggered = false;
    const newGameState = Story.updateGameState({
      gameState,
      now,
      timeSinceLast,
      conversationTriggered
    });
    last = new Date();
    if (newGameState !== gameState) {
      storyChanges = Story.getChanges(gameState, newGameState);
    }

    if (gameState.conversation !== newGameState.conversation && enableConversation === true) {
      console.log("connnn")
      /* eslint-disable no-use-before-define */
      const updateConvo = (newConvo) => {
        gameState.conversation = newConvo;
        renderConversation(gameState.conversation, updateConvo);
      };
      renderConversation(newGameState.conversation, updateConvo);
      /* eslint-enable no-use-before-define */
      enableConversation = false;
    }
  }, 100);

  // Update FPS/other stats every 1000ms
  setInterval(() => {
    /* eslint-disable no-use-before-define */
    updateDiagnostDisp({
      fps: frames, mapMakingTime, collisionTime, collisionChecks, collisionCalls,
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
  inventory.addEventListener('click', (e) => { e.preventDefault(); });

  // Time
  tim();

  // just added these here for testing
  setTimer(40);
  ingameTime(0);
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
window.addEventListener('keydown', (e) => {
  // Do nothing if event already handled
  if (e.defaultPrevented) { return; }

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
  if (e.defaultPrevented) { return; }

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
    default:
      console.log(e.code); // eslint-disable-line no-console
      break;
  }
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
  const { character, currentDialog } = conversation;
  const response = currentDialog.response;
  const goodbye = { query: 'Goodbye' };
  const options = (currentDialog.options || []).concat(goodbye);

  el.style.display = 'block';

  // add multiple conversation options
  let optionHTML = '';
  for (let i in Object.keys(options)) {
    optionHTML += `<button class="option_button">${options[i].query}</button><br>`;
  }

  const html = `<p>
                 <b>${character.name}:</b>
                 ${response}
                </p>`;

  const button_html = `<p>${optionHTML}</p>`;

  const final_html = html + button_html;


  el.innerHTML = final_html;

  // add onclick functions to all buttons
  for (let i in Object.keys(options)) {
    let button = document.getElementsByClassName("option_button")[i];
    button.onclick = () =>  {
      // Story.updateDialog( currentDialog.options[i], null, character);
      const option = options[i];
      if (option === goodbye || option.response == null) {
        // Recursive!
        updateConvo({ ...conversation, conversationTriggered: false });
        return;
      }
      // Recursive!
      updateConvo({ ...conversation, currentDialog: option });
    };
  }

  if (!conversation.conversationTriggered) {
    el.style.display = 'none';
  }
}

/**
 * tim, because I wasted 30 odd minutes trying to figure out
 * what's wrong and turns out I named it tim() as opposed to time().
 * Calls itself recursively and updates the #time element in `index.html`.
 * Only ever call this once.
 */
function tim() {
  const date = new Date();

  let tHour = date.getHours();
  let tMin = date.getMinutes();
  let tSec = date.getSeconds();

  if (tHour < 10) { tHour = `0${tHour}`; }
  if (tMin < 10) { tMin = `0${tMin}`; }
  if (tSec < 10) { tSec = `0${tSec}`; }

  setTimeout(tim, 500); // so tim can keep updating

  document.getElementById('time').innerHTML = `${tHour}:${tMin}:${tSec}`;
}

/*
* this function formats time (in seconds) into a nice looking
* time with hours, minutes and seconds
*/
function formatTime(time) {
  const hrs = Math.floor(time / 60 / 60);
  const mins = Math.floor((time / 60) % 60);
  const secs = Math.floor(time % 60);

  let ret = '';
  if (hrs > 0) {
    ret += `${hrs}:${mins < 10 ? '0' : ''}`;
  }
  ret += `${mins}:${secs < 10 ? '0' : ''}`;
  ret += `${secs}`;
  return ret;
}

// counts time from the moment of calling the function, can be set to 0 to reset
function ingameTime(seconds) {
  let time = seconds;
  setInterval(() => {
    document.getElementById('ingameTime').innerHTML = formatTime(time);
    time++;
  }, 1000);
}
// sets a timer that counts down to 0. Time must be specified in seconds.
// To stop the timer, use "stopTimer(intervalName)" function
function setTimer(seconds) {
  let time = seconds;
  // sets the interval in which the time will tick, 1000 = 1s
  const timer = setInterval(() => {
    document.getElementById('timer').innerHTML = formatTime(time);

    // if timer runs out, this function returns a 1
    if (time <= 0) {
      document.getElementById('timer').innerHTML = '';
      clearTimeout(timer);
    }
    // if timer didnt run out, decrease time by 1
    if (!pause) {
      time -= 1;
    }
  // the interval in which the time gets updated (1000 = 1 second)
  }, 1000);
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
  player, width, height, up, down, left, right,
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
  fps, collisionTime, mapMakingTime, collisionChecks, collisionCalls,
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
  if (e.defaultPrevented) { return; }
  if (!overlayOpen) {
    overlay.style.display = 'block';
    overlayOpen = true;
  } else {
    overlay.style.display = 'none';
    overlayOpen = false;
  }
}
