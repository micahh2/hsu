import { Util } from './util.js';
import { Sprite } from './sprite.js';

export class Physics {

  // This is the main game loop, it calls itself recursively
  static updatePhysicsState(state) {
    const { 
      image, context, pixels, player, 
      characters, width, height, locMap, updateStats, 
      moveNPC, movePlayer, getGameState, sprites
    } = state;

    // Get the move the player wants to make
    const { paused, attack, up, down, left, right } = getGameState();
    let newPlayer = movePlayer({ player, width, height, up, down, left, right });

    // Get the move the player is allowed to make (bounds check, ect)
    newPlayer = Physics.getUseableMove({
      oldActor: player,
      actor: newPlayer,
      pixels,
      width,
      height,
      locMap,
      updateStats,
      useHandycap: true
    });
    // Update player location in map
    Physics.updateLocationMap(locMap, { actor: newPlayer, oldActor: player, updateStats });

    let newOthers = characters;
    if (!paused) {
      newOthers = new Array(characters.length);
      for (let i = 0; i < characters.length; i++) {
        // Get new NPC move
        let newActor = moveNPC({ npc: characters[i], width, height, player: newPlayer, attack, updateStats });
        newOthers[i] = Physics.getUseableMove({ 
          oldActor: characters[i], actor: newActor, pixels, width, height, locMap, updateStats
        });
        // Update npc location in map
        Physics.updateLocationMap(locMap, 
          { actor: newOthers[i], map: locMap, oldActor: characters[i], updateStats }
        );
      }
    }

    // Remove old
    context.clearRect(0, 0, width, height);

    // Draw new position player position
    Sprite.drawActorToContext({ context, sprites, actor: player });

    for(let i = 0; i < newOthers.length; i++) {
      // Draw new position
      Sprite.drawActorToContext({ context, sprites, actor: newOthers[i] });
    }

    // Increment Frames
    updateStats('frames', 1);

    return { 
      ...state,
      player: newPlayer,
      characters: newOthers, 
    };
  }

  // get a key for the location map
  static mapKey(x, y, offsetx, offsety) {
    offsetx = offsetx || 0; // Default to 0
    offsety = offsety || 0; // Default to 0
    const keyx = Math.max(Math.floor(x/30)+offsetx, 0); // This means that we can have no items LARGER than 30
    const keyy = Math.max(Math.floor(y/30)+offsety, 0);
    // Note this breaks down if we have more than 10000 objects
    return 10000*keyx+keyy;
  }

  // For performance reasons, this function is not pure! it modified the map passed in
  static updateLocationMap(map, { actor, oldActor, updateStats }) {
    let start = new Date(); // All new dates are initialized to "now"
    let key = Physics.mapKey(actor.x, actor.y);
    if (oldActor) {
      let oldKey = Physics.mapKey(oldActor.x, oldActor.y);
      if (map[oldKey]) {
        map[oldKey] = map[oldKey].filter(t => !Util.eq(t, oldActor));
      }
    }
    map[key] = (map[key] || []).concat(actor);
    updateStats('mapMakingTime', (new Date()) - start); // Subtracting one date from another gives you the difference in milliseconds
    return;
  }

  // Returns a "moved" actor that has no collision
  static getUseableMove({ oldActor, actor, width, height, pixels, locMap, updateStats, useHandycap }) {
    if (oldActor === actor) { return actor; }

    if (!Physics.collision({ actor, pixels, locMap, oldActor, updateStats })) {
      return actor;
    }
    if (actor.y !== oldActor.y && actor.x !== oldActor.x) {
      const withoutx = { ...actor, x: oldActor.x };
      if (!Physics.collision({ actor: withoutx, pixels, locMap, oldActor: oldActor, updateStats })) {
        return withoutx;
      }
      const withouty = { ...actor, y: oldActor.y };
      if (!Physics.collision({ actor: withouty, pixels, locMap, oldActor: oldActor, updateStats })) {
        return withouty;
      }
    }
    if (useHandycap) {
      for (let handycap = 0; handycap < actor.speed; handycap++) {
        const signx = Math.sign(oldActor.x - actor.x);
        const signy = Math.sign(oldActor.y - actor.y);
        const handycappedx = Math.max(Math.min(actor.x + handycap*signx, width-actor.width), 0);
        const handycappedy = Math.max(Math.min(actor.y + handycap*signy, height-actor.height), 0);
        const handycapped = { ...actor, x: handycappedx, y: handycappedy };
        if (!Physics.collision({ actor: handycapped, pixels, locMap, oldActor: oldActor, updateStats })) {
          return handycapped;
        }
      }
    }
    return { ...oldActor, hasCollision: true };
  }

  // Returns true if a player has a collision
  static collision({ actor, locMap, pixels, oldActor, updateStats }) {
    let start = new Date(); // Gets the curent time
    // Check against other players in a region surounding the square you're in
    const nineSquares = [
      Physics.mapKey(actor.x, actor.y, -1, -1),
      Physics.mapKey(actor.x, actor.y,  0, -1),
      Physics.mapKey(actor.x, actor.y,  1, -1),
      Physics.mapKey(actor.x, actor.y, -1,  0),
      Physics.mapKey(actor.x, actor.y,  0,  0),
      Physics.mapKey(actor.x, actor.y,  1,  0),
      Physics.mapKey(actor.x, actor.y, -1,  1),
      Physics.mapKey(actor.x, actor.y,  0,  1),
      Physics.mapKey(actor.x, actor.y,  1,  1),
    ].filter((t, i, self) => self.indexOf(t) === i);
    // These are the people that you might have a collision with
    const possibleCollisions = nineSquares.map(t => locMap[t]).reduce((a, b) => b ? a.concat(b) : a, []);

    updateStats('collisionChecks', possibleCollisions.length);
    updateStats('collisionCalls', 1);
    // It just takes one to have a collision (we might need to change this to return who you colided with later)
    const hasCollision = possibleCollisions.some(t => {
      // We measure from the top right corner
      const firstWidth = t.x > actor.x ? actor.width : t.width;
      const firstHeight = t.y > actor.y ? actor.height : t.height;
      // Collision?
      return (!oldActor || !Util.eq(t, oldActor))
        && Math.abs(t.x-actor.x) < firstWidth 
        && Math.abs(t.y-actor.y) < firstHeight;
    });
    if (hasCollision) {
      updateStats('collisionTime', (new Date()) - start);
      return true; 
    }
    // Bounds check - iterate through the alpha channel
    for (let j = actor.y; j < actor.y+actor.height; j++) {
      // As a shortcut some empty lines are null, if they're empty then there can't be a collision there!
      if (pixels[j] == null) { continue; }
      for (let i = actor.x; i < actor.x+actor.width; i++) {
        // IMPORTANT! Pixels are stored in rows first, then columns
        if (pixels[j][i] === 0) { continue; } // Zero means transparent (nothing there!)
        updateStats('collisionTime', (new Date()) - start);
        return true;
      }
    }
    updateStats('collisionTime', (new Date()) - start);
    return false; // No collision!
  }
}
