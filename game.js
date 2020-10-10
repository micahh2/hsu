// This is used when initializing the game world and should only be called once
function getGameContextPixels({ canvas, image  }) {
  let context = canvas.getContext('2d');
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
  return { context, pixels };
}

// This is the main game loop, it calls itself recursively
function gameLoop({ image, context, pixels, player, others, width, height, locMap, updateStats, moveNPC, movePlayer, getGameState }) {
  // Get the move the player wants to make
  let newPlayer = movePlayer({ player, width, height });
  const { paused } = getGameState();

  // Get the move the player is allowed to make (bounds check, ect)
  newPlayer = getUseableMove({ oldActor: player, actor: newPlayer, pixels, width, height, locMap, updateStats, useHandycap: true });
  // Update player location in map
  updateLocationMap(locMap, { actor: newPlayer, oldActor: player, updateStats });

  let newOthers = others;
  if (!paused) {
    newOthers = new Array(others.length);
    for (let i = 0; i < others.length; i++) {
      // Get new NPC move
      let newActor = moveNPC({ npc: others[i], pixels, width, height, locMap, player: newPlayer, attack, updateStats });
      newOthers[i] = getUseableMove({ oldActor: others[i], actor: newActor, pixels, width, height, locMap, updateStats });
      // Update npc location in map
      updateLocationMap(locMap, { actor: newOthers[i], map: locMap, oldActor: others[i], updateStats });
    }
  }

  // Remove old
  context.clearRect(0, 0, width, height);
  // Redraw the bounds
  context.drawImage(image, 0, 50, image.width, image.height);

  context.fillStyle = 'black';

  // Draw new position player position
  context.fillRect(newPlayer.x, newPlayer.y, player.size, player.size);

  context.fillStyle = 'blue';
  for(let i = 0; i < newOthers.length; i++) {
    // Draw new position
    context.fillRect(newOthers[i].x, newOthers[i].y, newOthers[i].size, newOthers[i].size);
  }

  // Increment Frames
  updateStats('frames', 1);

  // Call this function in an infinite recursive loop
  window.requestAnimationFrame(() => {
    gameLoop({ 
      image, 
      context,
      pixels, 
      player: newPlayer,
      others: newOthers, 
      width, height, 
      locMap, 
      updateStats,
      moveNPC,
      movePlayer,
      getGameState
    });
  });
}

// get a key for the location map
function mapKey(x, y, offsetx, offsety) {
  offsetx = offsetx || 0; // Default to 0
  offsety = offsety || 0; // Default to 0
  const keyx = Math.max(Math.floor(x/10)+offsetx, 0); // This means that we can have no items LARGER than 10x10
  const keyy = Math.max(Math.floor(y/10)+offsety, 0);
  // Note this breaks down if we have more than 10000 objects
  return 10000*keyx+keyy;
}

// For performance reasons, this function is not pure! it modified the map passed in
function updateLocationMap(map, { actor, oldActor, updateStats }) {
  let start = new Date(); // All new dates are initialized to "now"
  let key = mapKey(actor.x, actor.y);
  if (oldActor) {
    let oldKey = mapKey(oldActor.x, oldActor.y);
    if (map[oldKey]) {
      map[oldKey] = map[oldKey].filter(t => !eq(t, oldActor));
    }
  }
  map[key] = (map[key] || []).concat(actor);
  updateStats('mapMakingTime', (new Date()) - start); // Subtracting one date from another gives you the difference in milliseconds
  return;
}

// Returns a "moved" actor that has no collision
function getUseableMove({ oldActor, actor, width, height, pixels, locMap, updateStats, useHandycap }) {
  if (oldActor === actor) { return actor; }

  if (!collision({ actor, pixels, locMap, oldActor, updateStats })) {
    return actor;
  }
  const withoutx = { ...actor, x: oldActor.x };
  if (actor.y !== actor.y && actor.x !== oldActor.x && !collision({ actor: withoutx, pixels, locMap, oldActor: oldActor, updateStats })) {
    return withoutx;
  }
  const withouty = { ...actor, y: oldActor.y };
  if (actor.x !== oldActor.x && actor.y !== oldActor.y && !collision({ actor: withouty, pixels, locMap, oldActor: oldActor, updateStats })) {
    return withouty;
  }
  if (useHandycap) {
    for (let handycap = 0; handycap < actor.speed; handycap++) {
      const signx = Math.sign(oldActor.x - actor.x);
      const signy = Math.sign(oldActor.y - actor.y);
      const handycappedx = Math.max(Math.min(actor.x + handycap*signx, width-actor.size), 0);
      const handycappedy = Math.max(Math.min(actor.y + handycap*signy, height-actor.size), 0);
      const handycapped = { ...actor, x: handycappedx, y: handycappedy };
      if (!collision({ actor: handycapped, pixels, locMap, oldActor: oldActor, updateStats })) {
        return handycapped;
      }
    }
  }
  return { ...oldActor, hasCollision: true };
}

// Returns true if a player has a collision
function collision({ actor, locMap, pixels, oldActor, updateStats }) {
  start = new Date(); // Gets the curent time
  // Check against other players in a region surounding the square you're in
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
  // These are the people that you might have a collision with
  const possibleCollisions = nineSquares.map(t => locMap[t]).reduce((a, b) => b ? a.concat(b) : a, []);

  updateStats('collisionChecks', possibleCollisions.length);
  updateStats('collisionCalls', 1);
  // It just takes one to have a collision (we might need to change this to return who you colided with later)
  const hasCollision = possibleCollisions.some(t => {
    // We measure from the top right corner
    const sizex = t.x > actor.x ? actor.size : t.size;
    const sizey = t.y > actor.y ? actor.size : t.size;
    // Collision?
    return (!oldActor || !eq(t, oldActor))
      && Math.abs(t.x-actor.x) < sizex 
      && Math.abs(t.y-actor.y) < sizey;
  });
  if (hasCollision) {
    updateStats('collisionTime', (new Date()) - start);
    return true; 
  }
  // Bounds check - iterate through the alpha channel
  for (let j = actor.y; j < actor.y+actor.size; j++) {
    // As a shortcut some empty lines are null, if they're empty then there can't be a collision there!
    if (pixels[j] == null) { continue; }
    for (let i = actor.x; i < actor.x+actor.size; i++) {
      // IMPORTANT! Pixels are stored in rows first, then columns
      if (pixels[j][i] === 0) { continue; } // Zero means transparent (nothing there!)
      updateStats('collisionTime', (new Date()) - start);
      return true;
    }
  }
  updateStats('collisionTime', (new Date()) - start);
  return false; // No collision!
}
