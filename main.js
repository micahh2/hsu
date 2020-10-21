import { Story } from './story.js';
import { Util } from './util.js';
import { Physics } from './physics.js';

const fetchGameData = new Promise((res, rej) => {
  fetch('./gameData.json')
    .then(response => res(response.json()))
});

window.addEventListener('load', async () => {
  const start = new Date(); // Save the start time
  const gameData = await fetchGameData;

  // Load element from DOM (look in index.html)
  let canvas = document.getElementById('canvas');
  let image = document.getElementById('layout');

  // Set canvas resolution
  let canvasSize = image.width;
  canvas.width = canvasSize;
  canvas.height = canvasSize;

  // Get bounds pixels and context
  const { context, pixels } = Physics.getGameContextPixels({ canvas, image });

  // Add some npc's
  const center = Math.floor(canvasSize/2);
  // Load the initial story
  let gameState = Story.loadGameState({ gameData, width: canvasSize, height: canvasSize });

  let physicsState = { 
    image, 
    context,
    pixels,
    player: gameState.player, 
    characters: gameState.characters,
    width: canvasSize,
    height: canvasSize,
    locMap: {},
    updateStats,
    moveNPC,
    movePlayer,
    getGameState
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


// This is what NPCs use right now to find a new place to go 
function newDestination({ width, height, player, attack }) {
  if (player && attack) {
    return { x: player.x, y: player.y };
  }
  return {
    x: Math.floor(Math.random()*width), 
    y: Math.floor(Math.random()*height), 
  };
}

// This is given to the game engine to determine the next move for a given NPC
function moveNPC({ npc, pixels, locMap, width, height, player, attack, updateStats }) {
  let newNPC = npc;

  if (npc.isNew && npc.fallbackSpeed == null) {
    newNPC = { ...newNPC, speed: npc.width+1, fallbackSpeed: npc.speed };
  } else if (npc.isNew && !npc.hasCollision) {
    newNPC = { ...newNPC, speed: newNPC.fallbackSpeed, isNew: false };
  }

  // If we're near to destination, or have a collision pick a new destination
  if (!npc.destination || Util.dist(npc, npc.destination) < npc.speed || npc.hasCollision) {
    newNPC = { ...newNPC, destination: newDestination({ width, height, attack, player }) };
  }

  const xdist = Math.abs(newNPC.x-newNPC.destination.x);
  const xmove = Math.sign(-newNPC.x+newNPC.destination.x)*Math.min(xdist, newNPC.speed);
  const ydist = Math.abs(newNPC.y-newNPC.destination.y);
  const ymove = Math.sign(-newNPC.y+newNPC.destination.y)*Math.min(ydist, newNPC.speed);
  if (xmove !== 0 || ymove !== 0) {
    newNPC = {
      ...newNPC,
      x: Math.min(Math.max(newNPC.x+xmove, 0), width-1),
      y: Math.min(Math.max(newNPC.y+ymove, 0), height-1),
      hasCollision: false
    };
  }
  return newNPC;
}

function getGameState() {
  return { paused: pause, attack };
}

// Take all the input requests give an updated player
function movePlayer({ player, handycap, width, height }) {
  let newPlayer = player;
  handycap = handycap || 0; if (up) {
    newPlayer = { ...newPlayer, y: Math.max(newPlayer.y - newPlayer.speed + handycap, 0)};
  } 
  if (down) {
    newPlayer = { ...newPlayer, y: Math.min(newPlayer.y + newPlayer.speed - handycap, height-newPlayer.height)};
  }
  if (left) {
    newPlayer = { ...newPlayer, x: Math.max(newPlayer.x - newPlayer.speed + handycap, 0)};
  }
  if (right) {
    newPlayer = { ...newPlayer, x: Math.min(newPlayer.x + newPlayer.speed - handycap, width-newPlayer.height)};
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
