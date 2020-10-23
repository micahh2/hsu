import { Story } from './story.js';
import { Util } from './util.js';
import { Physics } from './physics.js';
import { Sprite } from './sprite.js';
import { Characters } from './characters.js';

const fetchGameData = new Promise((res, rej) => {
  fetch('./gameData.json')
    .then(response => res(response.json()))
});

window.addEventListener('load', async () => {
  const start = new Date(); // Save the start time
  const gameData = await fetchGameData;

  // Load elements from DOM (look in index.html)
  const canvas = document.getElementById('canvas');
  const image = document.getElementById('layout');
  const characterSprite = document.getElementById('character-sprite');
  // const someOtherSprite = document.getElementById('someother-sprite');
  const sprites = Sprite.loadSprites({
    characterSprite: {
      image: characterSprite, // Actual image data
      columns: 3, // How many columns
      rows: 5, // How many rows
      padding: 60 // How much whitespace to ignore
    }//,
    // someOtherSprite: {
    //   image: someOtherSprite,
    //   columns: 3,
    //   rows: 5,
    //   padding: 60
    // }
  });

  // Get bounds pixels and context
  const { context, pixels, ratio, canvasWidth, canvasHeight } = Physics.getGameContextPixels({ canvas, image });

  // Load the initial story
  let gameState = Story.loadGameState({ gameData, width: canvasWidth, height: canvasHeight });
  //let newCharacters = new Array(100).fill(gameState.characters[0]).map((t, i) => ({ ...t, id:i+1 }));

  let physicsState = { 
    image, 
    sprites,
    context,
    pixels,
    player: gameState.player, 
    characters: gameState.characters, //.concat(newCharacters),
    width: canvasWidth,
    height: canvasHeight,
    locMap: {},
    updateStats,
    moveNPC: Characters.moveNPC,
    movePlayer,
    getGameState,
    characterSprite
  };
  const physicsLoop = () => {
    physicsState = Physics.updatePhysicsState(physicsState);
    window.requestAnimationFrame(physicsLoop);
  };
  // Start main game loop
  physicsLoop();


  // Update game state periodically (100ms)
  let last = new Date();
  setInterval(() => {
    const timeSinceLast = new Date()-last;
    const now = - new Date() - start;
    let newGameState = Story.updateGameState({ 
      ...gameState, 
      now,
      timeSinceLast,
      player: physicsState.player,
      characters: physicsState.characters,
    });
    last = new Date();

    if (gameState.conversation !== newGameState.conversation) {
      renderConversation(newGameState.conversation);
    }
  }, 100);

  // Update FPS/other stats every 1000ms
  setInterval(() => {
    updateDiagnostDisp({ fps: frames, mapMakingTime, collisionTime, collisionChecks, collisionCalls });
    clearStats();
  }, 1000);
});


function getGameState() {
  return { paused: pause, attack, up, down, left, right };
}

// Take all the input requests give an updated player
function movePlayer({ player, width, height, up, down, left, right }) {
  let newPlayer = player;
  let prefix = '';
  if (up && !down) {
    prefix = 'up';
    newPlayer = { 
      ...newPlayer,
      y: Math.max(newPlayer.y - newPlayer.speed, 0), facing: prefix
    };
  } 
  if (down && !up) {
    prefix = 'down';
    newPlayer = { 
      ...newPlayer, 
      y: Math.min(newPlayer.y + newPlayer.speed, height-newPlayer.height),
      facing: prefix
    };
  }
  if (left && !right) {
    newPlayer = {
      ...newPlayer,
      x: Math.max(newPlayer.x - newPlayer.speed, 0),
      facing: prefix + 'left'
    };
  }
  if (right && !left) {
    newPlayer = { 
      ...newPlayer,
      x: Math.min(newPlayer.x + newPlayer.speed, width-newPlayer.height),
      facing: prefix + 'right'
    };
  }
  return newPlayer;
}

// Modified by the eventListener
let up = false;
let down = false;
let left = false;
let right = false;
let attack = false;
let pause = false;
window.addEventListener('keydown', (e) => {
  // Do nothing if event already handled
  if (event.defaultPrevented) { return; }

  switch(event.code) {
    case "KeyS":
    case "ArrowDown":
      // Handle "back"
      down = true;
      break;
    case "KeyW":
    case "ArrowUp":
      // Handle "forward"
      up = true;
      break;
    case "KeyA":
    case "ArrowLeft":
      // Handle "turn left"
      left = true;
      break;
    case "KeyD":
    case "ArrowRight":
      // Handle "turn right"
      right = true;
      break;
  }
});
window.addEventListener('keyup', (e) => {
  // Do nothing if event already handled
  if (event.defaultPrevented) { return; }

  switch(event.code) {
    case "KeyS":
    case "ArrowDown":
      down = false;
      break;
    case "KeyW":
    case "ArrowUp":
      up = false;
      break;
    case "KeyA":
    case "ArrowLeft":
      left = false;
      break;
    case "KeyD":
    case "ArrowRight":
      right = false;
      break;
    case "Space":
      attack = !attack;
      break;
    case "KeyP":
      pause = !pause;
      break;
    default:
      console.log(event.code);
      break;
  }
});

// These are modified by updateStats and clearStats
let frames = 0;
let mapMakingTime = 0;
let collisionTime = 0;
let collisionChecks = 0;
let collisionCalls = 0;

function clearStats() {
  frames = 0;
  mapMakingTime = 0;
  collisionTime = 0;
  collisionChecks = 0;
  collisionCalls = 0;
}

function updateStats(key, value) {
  switch(key) {
    case 'frames':
      frames+=value;
      return;
    case 'mapMakingTime':
      mapMakingTime+=value;
      return;
    case 'collisionTime':
      collisionTime+=value;
      return;
    case 'collisionChecks':
      collisionChecks+=value;
      return;
    case 'collisionCalls':
      collisionCalls+=value;
      return;
  }
}

function updateDiagnostDisp({ fps, collisionTime, mapMakingTime, collisionChecks, collisionCalls }) {
  const el = document.getElementById('fps');
  el.innerHTML = `<ul>
    <li>${fps} FPS</li>
    <li>${collisionTime} Col. ms </li>
    <li>${mapMakingTime} Map. ms </li>
    <li>${Math.round(collisionChecks/collisionCalls)} Ave. Col. Checks </li>
  </ul>`;
}

function renderConversation(conversation) {
  const el = document.getElementById('conversation');
  if (!conversation) {
    el.style.display = 'none';
    return;
  }
  const { character, currentDialog } = conversation;
  el.style.display = 'block';
  let html = `<p>
    <b>${character.name}:</b>
    ${currentDialog.response}
  </p>`;
  el.innerHTML = html;
}
