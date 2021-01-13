import { Story } from '../story.js';
import { PathFinding } from '../path-finding.js';

let gameState;
let eventQueue = [];
let graph;
let flags;
let mapDim;

let last = new Date();
const start = new Date();
function updateStory() {
  if (!gameState || !graph) {
    postMessage({}); // Important to post an empty change to synchronise
    return;
  }
  const now = new Date() - start;
  const timeSinceLast = new Date() - last;
  last = new Date();
  const changes = Story.updateGameState({
    graph,
    gameState,
    now,
    timeSinceLast,
    eventQueue,
    flags,
    mapDim,
  });
  eventQueue = [];
  postMessage(changes);
}

onmessage = (e) => {
  switch (e.data.type) {
    case 'update-grid':
      graph = PathFinding.gridToGraph({
        grid: e.data.grid,
        width: e.data.mapDim.width,
        height: e.data.mapDim.height,
        actorSize: e.data.actorSize,
      });
      mapDim = e.data.mapDim;
      break;
    case 'update-game-state':
      gameState = e.data.gameState;
      flags = e.data.flags;
      updateStory();
      break;
    case 'add-event':
      eventQueue = eventQueue.concat(e.data.event);
      break;
    default:
      console.warn(`Unknown event passed to worker: ${e.data.type}`); // eslint-disable-line no-console
  }
};
