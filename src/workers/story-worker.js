//importScripts('../story.js');
import { Story } from '../story.js';

const importLine = /^import.*$/gi;
let gameState;
let eventQueue;
let changes = false;
onmessage = (e) => {
  switch (e.data.type) {
    case 'load-modules':
      //const modules = e.data.modules;
      //const moduleNames = Object.keys(e.data.modules);
      //moduleNames.forEach((t) => {
      //  let moduleText = modules[t].replace('export const', 'const');
      //  moduleText = modules[t].replace('export class', 'class');
      //  moduleText = modules[t].replace(importLine, '');
      //  self[t] = eval(moduleText);
      //});
      //gameState = e.data.gameState;
      break;
    case 'update-game-state':
      gameState = e.data.gameState;
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
  changes = false;
  const now = new Date() - start;
  const timeSinceLast = new Date() - last;
  last = new Date();
  const callingEventQueue = eventQueue;
  const newGameState = Story.updateGameState({
    gameState,
    now,
    timeSinceLast,
    eventQueue,
  });
  eventQueue = eventQueue.filter((t) => !callingEventQueue.includes(t));
  postMessage(newGameState);
}, 100); // Once every 100ms
