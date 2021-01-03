import { Util } from './util.js';

/** A class containing methods for dealing with characters  */
export const Characters = {
  /**
   * This function determines the next move for a given NPC
   * @param {Object} state
   * @param {Character} state.npc the npc in question
   * @param {number} state.width the width of the whole map
   * @param {number} state.height the height of the whole map
   * @returns {Character} an updated version of the npc
   */
  moveNPC({ npc, width, height }) {
    let newNPC = npc;

    // Allow for spawn points
    if (npc.isNew && npc.fallbackSpeed == null) {
      newNPC = { ...newNPC, speed: npc.width + 1, fallbackSpeed: npc.speed };
    } else if (npc.isNew && !npc.hasCollision) {
      newNPC = { ...newNPC, speed: newNPC.fallbackSpeed, isNew: false };
    }

    // If we're near to destination, or have a collision pick a new destination
    if (!npc.destination || Util.dist(npc, npc.destination) <= npc.speed || npc.hasCollision) {
      let { waypoints } = npc;
      waypoints = waypoints || [];
      newNPC = {
        ...newNPC,
        destination: waypoints[0],
        waypoints: waypoints.slice(1),
      };
    }
    if (newNPC.destination == null) { return npc; }
    const x = newNPC.x + Math.round(newNPC.width / 2);
    const y = newNPC.y + Math.round(newNPC.height / 2);
    const xdist = Math.abs(x - newNPC.destination.x);
    const xmove = Math.sign(-x + newNPC.destination.x) * Math.min(xdist, newNPC.speed);
    const ydist = Math.abs(y - newNPC.destination.y);
    const ymove = Math.sign(-y + newNPC.destination.y) * Math.min(ydist, newNPC.speed);
    if (xmove !== 0 || ymove !== 0) {
      let prefix = '';
      let { facing } = newNPC;
      if (ymove < 0) {
        prefix = 'up';
      } else if (ymove > 0) {
        prefix = 'down';
      }

      if (xmove < 0) {
        facing = `${prefix}left`;
      } else if (xmove > 0) {
        facing = `${prefix}right`;
      } else if (prefix) {
        facing = prefix;
      }

      newNPC = {
        ...newNPC,
        facing,
        x: Math.min(Math.max(newNPC.x + xmove, 0), width - 1),
        y: Math.min(Math.max(newNPC.y + ymove, 0), height - 1),
        hasCollision: false,
      };
    }

    return newNPC;
  },
};
