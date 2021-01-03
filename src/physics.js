/**
 * Physics.
 * Methods for dealing with physics
 */
export const Physics = {
  /**
   * This function provides a 1 tick update to the physics state
   * @param {Object} state physics state
   * @param {Uint8Array[]} state.pixels 2d Array with wall data
   * @param {Character[]} state.characters Non-playable characters
   * @param {Player} state.player Current player
   * @param {Object} state.locMap Location Look up Map (Empty on first call, modified)
   * @param {function} state.updateState Function to provide timing statistics
   * @param {function} state.moveNPC Function to get next NPC move
   * @param {function} state.movePlayer Function to move Player
   * @param {function} state.getGameState Function to get game state
   * @returns {Object} changes
   */
  updatePhysicsState(state) {
    const {
      pixels, player,
      characters, width, height,
      locMap, updateStats,
      moveNPC, movePlayer,
      paused, up, down, left, right,
    } = state;

    // Get the move the player wants to make
    let newPlayer = movePlayer({
      player, width, height, up, down, left, right,
    });

    // Get the move the player is allowed to make (bounds check, ect)
    newPlayer = Physics.getUseableMove({
      oldActor: player,
      actor: newPlayer,
      pixels,
      width,
      height,
      locMap,
      updateStats,
      useHandycap: true,
    });
    // Update player location in map
    Physics.updateLocationMap(locMap, { actor: newPlayer, oldActor: player, updateStats });

    let newOthers = characters;
    if (!paused) {
      newOthers = new Array(characters.length);
      for (let i = 0; i < characters.length; i++) {
        // Get new NPC move
        const newActor = moveNPC({ npc: characters[i], width, height });
        newOthers[i] = Physics.getUseableMove({
          oldActor: characters[i], actor: newActor, pixels, width, height, locMap, updateStats,
        });
        // Update npc location in map
        Physics.updateLocationMap(locMap,
          {
            actor: newOthers[i], map: locMap, oldActor: characters[i], updateStats,
          });
      }
    }

    // Increment Frames
    updateStats('frames', 1);

    return {
      ...state,
      player: newPlayer,
      characters: newOthers,
    };
  },

  // get a key for the location map
  mapKey(x, y, offsetx = 0, offsety = 0) {
    // This means that we can have no items LARGER than 30
    const keyx = Math.max(Math.floor(x / 30) + offsetx, 0);
    const keyy = Math.max(Math.floor(y / 30) + offsety, 0);
    // Note: this breaks down if we have more than 100,000 cells in our grid
    return 100000 * keyx + keyy;
  },

  // For performance reasons, this function is not pure! it modified the map passed in
  updateLocationMap(map, { actor, oldActor, updateStats }) {
    /* eslint-disable no-param-reassign */
    const start = new Date(); // All new dates are initialized to "now"
    const key = Physics.mapKey(actor.x, actor.y);
    if (oldActor) {
      const oldKey = Physics.mapKey(oldActor.x, oldActor.y);
      if (map[oldKey]) {
        map[oldKey] = map[oldKey].filter((t) => t.id !== oldActor.id);
      }
    }
    map[key] = (map[key] || []).concat(actor);
    /* eslint-enable no-param-reassign */
    // Subtracting one date from another gives you the difference in milliseconds
    updateStats('mapMakingTime', (new Date()) - start);
  },

  // Returns a "moved" actor that has no collision
  getUseableMove({ oldActor, actor, width, height, pixels, locMap, updateStats, useHandycap }) {
    if (oldActor === actor) { return actor; }

    if (!Physics.collision({ actor, pixels, locMap, updateStats })) {
      return actor;
    }
    if (actor.y !== oldActor.y && actor.x !== oldActor.x) {
      const withoutx = { ...actor, x: oldActor.x };
      if (!Physics.collision({ actor: withoutx, pixels, locMap, updateStats })) {
        return withoutx;
      }
      const withouty = { ...actor, y: oldActor.y };
      if (!Physics.collision({
        actor: withouty, pixels, locMap, oldActor, updateStats,
      })) {
        return withouty;
      }
    }
    if (useHandycap) {
      for (let handycap = 0; handycap < actor.speed; handycap++) {
        const signx = Math.sign(oldActor.x - actor.x);
        const signy = Math.sign(oldActor.y - actor.y);
        const handycappedx = Math.max(
          Math.min(actor.x + handycap * signx, width - actor.width),
          0,
        );
        const handycappedy = Math.max(
          Math.min(actor.y + handycap * signy, height - actor.height),
          0,
        );
        const handycapped = { ...actor, x: handycappedx, y: handycappedy };
        if (!Physics.collision({ actor: handycapped, pixels, locMap, updateStats })) {
          return handycapped;
        }
      }
    }
    return { ...oldActor, hasCollision: true };
  },

  // Returns true if a player has a collision
  collision({ actor, locMap, pixels, updateStats }) {
    const start = new Date(); // Gets the curent time
    // Check against other players in a region surounding the square you're in
    const nineSquares = [
      Physics.mapKey(actor.x, actor.y, -1, -1),
      Physics.mapKey(actor.x, actor.y, 0, -1),
      Physics.mapKey(actor.x, actor.y, 1, -1),
      Physics.mapKey(actor.x, actor.y, -1, 0),
      Physics.mapKey(actor.x, actor.y, 0, 0),
      Physics.mapKey(actor.x, actor.y, 1, 0),
      Physics.mapKey(actor.x, actor.y, -1, 1),
      Physics.mapKey(actor.x, actor.y, 0, 1),
      Physics.mapKey(actor.x, actor.y, 1, 1),
    ].filter((t, i, self) => self.indexOf(t) === i);
    // These are the people that you might have a collision with
    const possibleCollisions = nineSquares
      .map((t) => locMap[t])
      .reduce((a, b) => (b ? a.concat(b) : a), []);

    updateStats('collisionChecks', possibleCollisions.length);
    updateStats('collisionCalls', 1);
    // It just takes one to have a collision
    //    (we *might* need to change this to return who you colided with later)
    const hasCollision = possibleCollisions.some((t) => {
      // We measure from the top right corner
      const firstWidth = t.x > actor.x ? actor.width : t.width;
      const firstHeight = t.y > actor.y ? actor.height : t.height;
      // Collision?
      return (t.id !== actor.id)
        && Math.abs(t.x - actor.x) < firstWidth
        && Math.abs(t.y - actor.y) < firstHeight;
    });
    if (hasCollision) {
      updateStats('collisionTime', (new Date()) - start);
      return true;
    }
    // Bounds check - iterate through the alpha channel
    for (let j = actor.y; j < actor.y + actor.height; j++) {
      // As a shortcut some empty lines are null,
      //    if they're empty then there can't be a collision there!
      if (pixels[j] == null) { continue; }
      for (let i = actor.x; i < actor.x + actor.width; i++) {
        // IMPORTANT! Pixels are stored in rows first, then columns
        if (pixels[j][i] === 0) { continue; } // Zero means transparent (nothing there!)
        updateStats('collisionTime', (new Date()) - start);
        return true;
      }
    }
    updateStats('collisionTime', (new Date()) - start);
    return false; // No collision!
  },
};
