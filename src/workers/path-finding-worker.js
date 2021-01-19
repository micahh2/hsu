import { PathFinding } from '../path-finding.js';

let graph;

function routeCharacters(requestQueue) {
  if (!graph) { return; }
  for (let i = 0; i < requestQueue.length; i++) {
    const { actor, destination, exclude, mustHaveCollision } = requestQueue[i];
    const finish = destination;
    const start = {
      x: Math.round(actor.x + actor.width / 2),
      y: Math.round(actor.y + actor.height / 2),
    };
    // const startTime = new Date();
    const waypoints = PathFinding.dijikstras({ graph, start, finish, exclude });
    // const endTime = new Date();
    const newWaypoints = waypoints.slice(1);
    // No way found
    if (waypoints[0] == null) {
      postMessage({
        type: 'remove-character-path-finding-request',
        id: actor.id,
      });
      continue;
    }
    postMessage({
      type: 'set-character-waypoints',
      id: actor.id,
      destination: waypoints[0],
      waypoints: newWaypoints,
      mustHaveCollision,
      exclude,
    });
  }
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
      break;
    case 'add-requests':
      routeCharacters(e.data.requests);
      break;
    default:
      console.warn(`Unknown event passed to path worker: ${e.data.type}`); // eslint-disable-line no-console
  }
};
