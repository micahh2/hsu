let player = { x: 100, y: 20, size: 5, speed: 3 };
let requestedVert;
let requestedHorz;
let frames = 0;
let attack = false;

window.addEventListener('load', () => {
  let canvas = document.getElementById('canvas');
  let context = canvas.getContext('2d');
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
  context.fillRect(player.x, player.y, player.size, player.size);
  // Add some npc's
  const center = Math.floor(image.width/2);
  //const others = [];
  const others = [
    ...(new Array(200).fill({ x: center, y: Math.floor(center*.8), speed: 1, size: 5 })),
    ...(new Array(200).fill({ x: Math.floor(center*1.3), y: center, speed: 1, size: 5 })),
    ...(new Array(200).fill({ x: Math.floor(center/2), y: Math.floor(center/2), speed: 1, size: 5 })),
    ...(new Array(200).fill({ x: Math.floor(center*1.35), y: Math.floor(center/4), speed: 1, size: 5 })), // Cafateria
    ...(new Array(200).fill({ x: Math.floor(center*1.8), y: Math.floor(center/4), speed: 1, size: 5 })), // Mensa
  ].map(t => ({ ...t }));
  // Start main loop
  main({ context, pixels, player, others, width: image.width, height: image.width });

  // Update FPS display
  setInterval(() => {
    updateFPS(frames);
    frames = 0;
  }, 1000);
});

function main({ context, pixels, player, others, width, height }) {
  let otherMap = others.reduce((map, actor) => updateLocationMap({ map, actor }), {});

  let newPlayer = movePlayer({ player, requestedVert, requestedHorz, width, height });
  newPlayer = getUseableMove({ player, newPlayer, pixels, requestedVert, requestedHorz, width, height, otherMap });
  otherMap = updateLocationMap({ actor: newPlayer, map: otherMap });

  let newOthers = new Array(others.length);
  for (let i = 0; i < others.length; i++) {
    newOthers[i] = moveNPC({ npc: others[i], pixels, width, height, otherMap, player: newPlayer, attack });
    otherMap = updateLocationMap({ actor: newOthers[i], map: otherMap, oldActor: others[i] });
  }

  context.fillStyle = 'black';
  if (player !== newPlayer) {
    // Remove old position
    context.clearRect(player.x, player.y, player.size, player.size);
    // Draw new position
    context.fillRect(newPlayer.x, newPlayer.y, player.size, player.size);
  }
  context.fillStyle = 'blue';
  for(let i = 0; i < others.length; i++) {
    const other = others[i];
    const newOther = newOthers[i];
    // Remove old position
    context.clearRect(other.x, other.y, other.size, other.size);
    // Draw new position
    context.fillRect(newOther.x, newOther.y, newOther.size, newOther.size);
  }

  // Increment Frames
  frames++;

  // Call this function in an infinite recursive loop
  window.requestAnimationFrame(() => {
    main({ context, pixels, player: newPlayer, others: newOthers, width, height });
  });
}

function eq(a, b) {
  return a.x === b.x && a.y === b.y && a.size === b.size && a.speed === b.speed;
}

function mapKey({ x, y }) {
  return `${Math.floor(x/50)}:${Math.floor(y/50)}`;
}

function updateLocationMap({ actor, map, oldActor }) {
  let key = mapKey(actor);
  let newMap = { ...map, [key]: (map[key] || []).concat(actor) };
  if (oldActor) {
    let oldKey = mapKey(oldActor);
    newMap[oldKey] = newMap[oldKey].filter(t => !eq(t, oldActor));
  }
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
function moveNPC({ npc, pixels, otherMap, width, height, player, attack }) {
  let newNPC = npc;
  if (!npc.destination || dist(npc, npc.destination) < npc.speed) {
    newNPC = { ...npc, destination: newDestination({ width, height, attack }) };
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
  // Check against other players
  const fourCorners = [
    mapKey({ x: actor.x, y: actor.y }),
    mapKey({ x: actor.x, y: actor.y+actor.size }),
    mapKey({ x: actor.x+actor.size, y: actor.y }),
    mapKey({ x: actor.x+actor.size, y: actor.y+actor.size })
  ].filter((t, i, self) => self.indexOf(t) === i);
  const possibleCollisions = fourCorners.map(t => otherMap[t]).reduce((a, b) => b ? a.concat(b) : a, []);
  const hasCollision = possibleCollisions.some(t => {
    const sizex = t.x > actor.x ? actor.size : t.size;
    const sizey = t.y > actor.y ? actor.size : t.size;
    return t !== oldActor
      && Math.abs(t.x-actor.x) < sizex 
      && Math.abs(t.y-actor.y) < sizey;
  })
  if (hasCollision) {
    return true; 
  }

  // Bounds check
    for (let j = actor.y; j < actor.y+actor.size; j++) {
      if (pixels[j] == null) { continue; }
      for (let i = actor.x; i < actor.x+actor.size; i++) {
        // IMPORTANT! Pixels are stored in rows first, then columns
        if (pixels[j][i] === 0) { continue; }
        return true;
      }
    }
  return false;
}

// Returns a "moved" player that has no collision
function getUseableMove({ player, newPlayer, requestedVert, requestedHorz, width, height, pixels, otherMap }) {
  if (player === newPlayer) { return newPlayer; }

  if (!collision({ actor: newPlayer, pixels, otherMap })) {
    return newPlayer;
  }
  const withoutx = { ...newPlayer, x: player.x };
  if (newPlayer.y !== player.y && newPlayer.x !== player.x && !collision({ actor: withoutx, pixels, otherMap })) {
    return withoutx;
  }
  const withouty = { ...newPlayer, y: player.y };
  if (newPlayer.x !== player.x && newPlayer.y !== player.y && !collision({ actor: withouty, pixels, otherMap })) {
    return withouty;
  }
  for (let handycap = 0; handycap < newPlayer.speed; handycap++) {
    const handycapped = movePlayer({ player, handycap, requestedVert, requestedHorz, width, height });
    if (!collision({ actor: handycapped, pixels, otherMap })) {
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
      console.log('Space', attack);
      break;
    default:
      console.log(event.code);
      break;
  }
});

function updateFPS(fps) {
  const el = document.getElementById('fps');
  el.innerHTML = `${fps} FPS`;
}
