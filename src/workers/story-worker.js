import { Story } from '../story.js';

let gameState;
let eventQueue = [];
let pathFindingChanges = [];
let flags;
let mapDim;

const pathFindingWorker = new Worker('./path-finding-worker.js');

pathFindingWorker.onmessage = (e) => {
  pathFindingChanges = pathFindingChanges.concat(e.data);
};

let last = new Date();
const start = new Date();
function updateStory() {
  if (!gameState) {
    postMessage({}); // Important to post an empty change to synchronise
    return;
  }
  const now = new Date() - start;
  const timeSinceLast = new Date() - last;
  last = new Date();
  let changes = Story.updateGameState({
    gameState,
    now,
    timeSinceLast,
    eventQueue,
    flags,
    mapDim,
  });
  eventQueue = [];
  const pathFindingRequests = changes.filter((t) => t.type === 'request-path-finding');
  if (pathFindingRequests.length > 0) {
    pathFindingWorker.postMessage({
      type: 'add-requests',
      requests: pathFindingRequests,
    });
    changes = changes
      .filter((t) => t.type !== 'request-path-finding')
      .concat({
        type: 'set-characters-path-finding-request',
        ids: pathFindingRequests.map((t) => t.actor.id),
      });
  }
  if (pathFindingChanges.length > 0) {
    changes = changes.concat(pathFindingChanges);
    pathFindingChanges = [];
  }

  postMessage(changes);
}

onmessage = (e) => {
  switch (e.data.type) {
    case 'update-grid':
      pathFindingWorker.postMessage(e.data);
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
