let player = { x: 100, y: 20, size: 5, speed: 3 };
let requestedVert;
let requestedHorz;
let attack = false;
let pause = false;

let frames = 0;
let mapMakingTime = 0;
let collisionTime = 0;
let collisionChecks = 0;
let collisionCalls = 0;

let context;

window.addEventListener('load', () => {
  let canvas = document.getElementById('canvas');
  /* let */ context = canvas.getContext('2d');
  let image = document.getElementById('layout');
  canvas.width = image.width;
  canvas.height = image.width;
  let ratio = image.height/image.width;
  context.drawImage(image, 0, 50, canvas.width, canvas.width*ratio);

  // Transparent pixels
  let imageData = context.getImageData(0, 0, canvas.width, canvas.height)
  let allAlpha = imageData.data
    .filter((_, index) => (index+1) % 4 === 0);
  let pixels = {};
  // Split them into the map for faster access
  for(let i = 0; i < imageData.height; i++) {
    let start = i*imageData.width;
    const slice = allAlpha.slice(start, start+imageData.width);
    if (slice.every(t => t === 0)) { continue; }
    pixels[i] = allAlpha.slice(start, start+imageData.width);
  }
  // Draw initial player
  //context.fillRect(player.x, player.y, player.size, player.size);

  // Add some npc's
  const center = Math.floor(image.width/2);
  //const others = [];
  const other = { speed: 1, size: 5, isNew: true };
  const others = [
    ...(new Array(200).fill({ ...other, x: center, y: Math.floor(center*.8) })),
    ...(new Array(200).fill({ ...other, x: Math.floor(center*1.3), y: center })),
    ...(new Array(200).fill({ ...other, x: Math.floor(center/2), y: Math.floor(center/2)})),
    ...(new Array(200).fill({ ...other, x: Math.floor(center*1.35), y: Math.floor(center/4)})), // Cafeteria
    ...(new Array(200).fill({ ...other, x: Math.floor(center*1.8), y: Math.floor(center/4) })), // Mensa
  ];
  let otherMap = others.reduce((map, actor) => updateLocationMap({ actor, map }), {});
  // Start main loop
  main({ image, imageRatio: ratio, context, pixels, player, others, width: image.width, height: image.width, otherMap });

  // Update FPS display
  setInterval(() => {
    updateDiagnostics({ fps: frames, mapMakingTime, collisionTime, collisionChecks, collisionCalls });
    frames = 0;
    mapMakingTime = 0;
    collisionTime = 0;
    collisionChecks = 0;
    collisionCalls = 0;
  }, 1000);
});

function main({ image, imageRatio, context, pixels, player, others, width, height, otherMap }) {
  let newPlayer = movePlayer({ player, requestedVert, requestedHorz, width, height });
  newPlayer = getUseableMove({ player, newPlayer, pixels, requestedVert, requestedHorz, width, height, otherMap });
  let newOtherMap = updateLocationMap({ actor: newPlayer, map: otherMap, oldActor: player });

  let newOthers = new Array(others.length);
  for (let i = 0; i < others.length; i++) {
    newOthers[i] = moveNPC({ npc: others[i], pixels, width, height, otherMap: newOtherMap, player: newPlayer, attack, pause});
    newOtherMap = updateLocationMap({ actor: newOthers[i], map: newOtherMap, oldActor: others[i] });
  }

  // Remove old
  context.clearRect(0, 0, width, height);
  // Redraw image
  context.drawImage(image, 0, 50, width, width*imageRatio);

  context.fillStyle = 'black';

  // Draw new position
  context.fillRect(newPlayer.x, newPlayer.y, player.size, player.size);

  context.fillStyle = 'blue';
  for(let i = 0; i < others.length; i++) {
    const other = others[i];
    const newOther = newOthers[i];
    // Draw new position
    context.fillRect(newOther.x, newOther.y, newOther.size, newOther.size);
  }

  // Increment Frames
  frames++;

  // Call this function in an infinite recursive loop
  window.requestAnimationFrame(() => {
    main({ image, imageRatio, context, pixels, player: newPlayer, others: newOthers, width, height, otherMap: newOtherMap });
  });
}

function eq(a, b) {
  return a.x === b.x && a.y === b.y && a.size === b.size && a.speed === b.speed;
}

function mapKey(x, y, offsetx, offsety) {
  offsetx = offsetx || 0;
  offsety = offsety || 0;
  const keyx = Math.max(Math.floor(x/10)+offsetx, 0);
  const keyy = Math.max(Math.floor(y/10)+offsety, 0);
  return 10000*keyx+keyy;
}

function updateLocationMap({ actor, map, oldActor }) {
  let start = new Date();
  let newMap = map; //{ ...map };
  let key = mapKey(actor.x, actor.y);
  if (oldActor) {
    let oldKey = mapKey(oldActor.x, oldActor.y);
    if (newMap[oldKey]) {
      newMap[oldKey] = newMap[oldKey].filter(t => !eq(t, oldActor));
    }
  }
  newMap[key] = (newMap[key] || []).concat(actor);
  mapMakingTime += (new Date()) - start;
  return newMap;
}

function dist(a, b) {
  return Math.sqrt(Math.pow(a.x-b.x, 2) + Math.pow(a.y-b.y, 2));
}
function newDestination({ width, height, player, attack }) {
  if (player && attack) {
    return { x: player.x, y: player.y };
  }
  return {
    x: Math.floor(Math.random()*width), 
    y: Math.floor(Math.random()*height), 
  };
}
function moveNPC({ npc, pixels, otherMap, width, height, player, attack, pause }) {
  if (pause) { return npc; }
  let newNPC = npc;
  if (npc.isNew) {
    newNPC = { ...newNPC, speed: npc.size+5, fallbackSpeed: npc.speed };
  }
  if (!npc.destination || dist(npc, npc.destination) < npc.speed) {
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
    };
    if (collision({ actor: newNPC, pixels, otherMap, oldActor: npc })) {
      newNPC = { ...npc, destination: newDestination({ width, height, attack, player }) };
    } else if(newNPC.isNew) {
      newNPC = { ...newNPC, speed: newNPC.fallbackSpeed, isNew: false };
    }
  }
  return newNPC;
}

// Take all the input requests give an updated player
function movePlayer({ player, handycap, requestedVert, requestedHorz, width, height }) {
  let newPlayer = player;
  handycap = handycap || 0;
  if (requestedVert === 'up') {
    newPlayer = { ...newPlayer, y: Math.max(newPlayer.y - newPlayer.speed + handycap, 0)};
  } else if (requestedVert === 'down') {
    newPlayer = { ...newPlayer, y: Math.min(newPlayer.y + newPlayer.speed - handycap, height-newPlayer.size)};
  }
  if (requestedHorz === 'left') {
    newPlayer = { ...newPlayer, x: Math.max(newPlayer.x - newPlayer.speed + handycap, 0)};
  } else if (requestedHorz === 'right') {
    newPlayer = { ...newPlayer, x: Math.min(newPlayer.x + newPlayer.speed - handycap, width-newPlayer.size)};
  }
  return newPlayer;
}

// Returns if a player has a collision
function collision({ actor, otherMap, pixels, oldActor }) {
  start = new Date();
  // Check against other players in a region
  const nineSquares = [
    mapKey(actor.x, actor.y, -1, -1),
    mapKey(actor.x, actor.y,  0, -1),
    mapKey(actor.x, actor.y,  1, -1),
    mapKey(actor.x, actor.y, -1,  0),
    mapKey(actor.x, actor.y,  0,  0),
    mapKey(actor.x, actor.y,  1,  0),
    mapKey(actor.x, actor.y, -1,  1),
    mapKey(actor.x, actor.y,  0,  1),
    mapKey(actor.x, actor.y,  1,  1),
  ].filter((t, i, self) => self.indexOf(t) === i);
  const possibleCollisions = nineSquares.map(t => otherMap[t]).reduce((a, b) => b ? a.concat(b) : a, []);

  collisionChecks += possibleCollisions.length;
  collisionCalls++;
  const hasCollision = possibleCollisions.some(t => {
    const sizex = t.x > actor.x ? actor.size : t.size;
    const sizey = t.y > actor.y ? actor.size : t.size;
    return (!oldActor || !eq(t, oldActor))
      && Math.abs(t.x-actor.x) < sizex 
      && Math.abs(t.y-actor.y) < sizey;
  });
  if (hasCollision) {
    collisionTime += (new Date()) - start;
    return true; 
  }
  // Bounds check
  for (let j = actor.y; j < actor.y+actor.size; j++) {
    if (pixels[j] == null) { continue; }
    for (let i = actor.x; i < actor.x+actor.size; i++) {
      // IMPORTANT! Pixels are stored in rows first, then columns
      if (pixels[j][i] === 0) { continue; }
      collisionTime += (new Date()) - start;
      return true;
    }
  }
  collisionTime += (new Date()) - start;
  return false;
}

// Returns a "moved" player that has no collision
function getUseableMove({ player, newPlayer, requestedVert, requestedHorz, width, height, pixels, otherMap }) {
  if (player === newPlayer) { return newPlayer; }

  if (!collision({ actor: newPlayer, pixels, otherMap, oldActor: player })) {
    return newPlayer;
  }
  const withoutx = { ...newPlayer, x: player.x };
  if (newPlayer.y !== player.y && newPlayer.x !== player.x && !collision({ actor: withoutx, pixels, otherMap, oldActor: player })) {
    return withoutx;
  }
  const withouty = { ...newPlayer, y: player.y };
  if (newPlayer.x !== player.x && newPlayer.y !== player.y && !collision({ actor: withouty, pixels, otherMap, oldActor: player })) {
    return withouty;
  }
  for (let handycap = 0; handycap < newPlayer.speed; handycap++) {
    const handycapped = movePlayer({ player, handycap, requestedVert, requestedHorz, width, height });
    if (!collision({ actor: handycapped, pixels, otherMap, oldActor: player })) {
      return handycapped;
    }
  }
  return player;
}

window.addEventListener('keydown', (e) => {
  // Do nothing if event already handled
  if (event.defaultPrevented) { return; }

  switch(event.code) {
    case "KeyS":
    case "ArrowDown":
      // Handle "back"
      requestedVert = 'down';
      break;
    case "KeyW":
    case "ArrowUp":
      // Handle "forward"
      requestedVert = 'up';
      break;
    case "KeyA":
    case "ArrowLeft":
      // Handle "turn left"
      requestedHorz = 'left';
      break;
    case "KeyD":
    case "ArrowRight":
      // Handle "turn right"
      requestedHorz = 'right';
      break;
  }
});
window.addEventListener('keyup', (e) => {
  // Do nothing if event already handled
  if (event.defaultPrevented) { return; }

  switch(event.code) {
    case "KeyS":
    case "ArrowDown":
      requestedVert = null;
      break;
    case "KeyW":
    case "ArrowUp":
      requestedVert = null;
      break;
    case "KeyA":
    case "ArrowLeft":
      requestedHorz = null;
      break;
    case "KeyD":
    case "ArrowRight":
      requestedHorz = null;
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

function updateDiagnostics({ fps, collisionTime, mapMakingTime, collisionChecks, collisionCalls }) {
  const el = document.getElementById('fps');
  el.innerHTML = `<ul>
    <li>${fps} FPS</li>
    <li>${collisionTime} Col. ms </li>
    <li>${mapMakingTime} Map. ms </li>
    <li>${Math.round(collisionChecks/collisionCalls)} Ave. Col. Checks </li>
  </ul>`;
}
