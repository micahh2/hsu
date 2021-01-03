import { Story } from '../story.js';

let gameState;
let eventQueue = [];
let graph;
let flags;
let mapDim;
let changes = false;
onmessage = (e) => {
  switch (e.data.type) {
    case 'update-graph':
      graph = e.data.graph;
      mapDim = e.data.mapDim;
      break;
    case 'update-game-state':
      gameState = e.data.gameState;
      flags = e.data.flags;
      break;
    case 'add-event':
      eventQueue = eventQueue.concat(e.data.event);
      break;
    default:
      return;
  }
  changes = true;
};

let last = new Date();
const start = new Date();
setInterval(() => {
  if (!changes) { return; }
  if (!gameState || !graph) { return; }
  changes = false;
  const now = new Date() - start;
  const timeSinceLast = new Date() - last;
  last = new Date();
  const callingEventQueue = eventQueue;
  const oldGameState = gameState;
  const newGameState = Story.updateGameState({
    graph,
    gameState,
    now,
    timeSinceLast,
    eventQueue,
    flags,
    mapDim,
  });
  // Something
  eventQueue = eventQueue.filter((t) => !callingEventQueue.includes(t));
  const gameChanges = Story.getChanges(oldGameState, newGameState);
  postMessage(gameChanges);
}, 100); // Once every 100ms
