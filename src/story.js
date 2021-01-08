import { Util } from './util.js';
import { PathFinding } from './path-finding.js';

/**
 * Story.
 */
export const Story = {
  /**
   * getChanges.
   *
   * @param {} oldState
   * @param {} state
   */
  getChanges(oldState, state) {
    const changes = {};
    const stateKeys = Object.keys(state);
    for (const i of stateKeys) {
      if (oldState[i] === state[i]) { continue; }
      if (state[i] != null && state[i]._keep) { // eslint-disable-line no-underscore-dangle
        changes[i] = state[i];
        continue;
      }
      if (typeof oldState[i] === typeof state[i] && typeof state[i] === 'object') {
        const subChanges = Story.getChanges(oldState[i], state[i]);
        if (Object.keys(subChanges).length === 0) { continue; }
        changes[i] = subChanges;
        continue;
      }
      changes[i] = state[i];
    }
    return changes;
  },

  /**
   * applyChanges.
   *
   * @param {} state
   * @param {} changes
   */
  applyChanges(state, changes) {
    if (state == null) { return changes; }
    if (typeof changes !== 'object' || typeof state !== 'object') { return changes; }
    if (changes._keep) { return changes; } // eslint-disable-line no-underscore-dangle
    const changeKeys = Object.keys(changes);
    if (changeKeys.length === 0) { return state; }
    let newState;
    if (state instanceof Array) {
      newState = [...state];
    } else {
      newState = { ...state };
    }

    for (const i of changeKeys) {
      newState[i] = Story.applyChanges(newState[i], changes[i]);
    }
    return newState;
  },

  /**
   * loadGameState.
   *
   * @param {}
   */
  loadGameState(gameData) {
    // Extension point for adding dynamic things
    return gameData;
  },

  /**
   * isTime.
   *
   * @param {}
   */
  isTime({ time, now }) {
    return time <= now;
  },

  /**
   * isWithinInterval.
   *
   * @param {}
   */
  isWithinInterval({
    interval, now, start = 0, end, threshold,
  }) {
    if (now < start || (end != null && now > end)) { return false; }
    return (now - start) % interval <= threshold;
  },

  /**
   * isWithinDistance.
   *
   * @param {}
   */
  isWithinDistance({ distance, a, b }) {
    return Util.dist(a, b) <= distance;
  },

  /**
   * isWithinArea.
   *
   * @param {}
   */
  isWithinArea({ area, actor }) {
    const diffx = actor.x - area.x;
    const diffy = actor.y - area.y;
    return diffx >= 0 && diffx <= area.width && diffy >= 0 && diffy <= area.height;
  },

  /**
   * isTriggered.
   *
   * @param {}
   */
  isTriggered({
    player, characters, areas, trigger, now, timeSinceLast,
  }) {
    const triggerType = trigger ? trigger.type : 'dynamic';
    switch (triggerType) {
      case 'dynamic': // Dynamic events are always triggered
        return true;
      case 'time':
        return Story.isTime({ time: trigger.time, now });
      case 'interval':
        return Story.isWithinInterval({ ...trigger, now, threshold: timeSinceLast });
      case 'distance':
        return Story.isWithinDistance({
          distance: trigger.distance,
          a: player,
          b: characters.find((t) => t.id === trigger.characterId),
        });
      case 'area':
        return Story.isWithinArea({
          area: areas.find((t) => t.id === trigger.areaId),
          actor: player,
        });
      default:
        throw Error(`Unexpected Trigger: ${trigger.type}`);
    }
  },

  /**
   * isRecurrentEvent.
   *
   * @param {} e
   * @param {} now
   */
  isRecurrentEvent(e, now) {
    return e.trigger && e.trigger.type === 'interval' && (e.trigger.end == null || now < e.trigger.end);
  },

  /**
   * updateGameState.
   *
   * @param {}
   */
  updateGameState({ graph, gameState, now, timeSinceLast, flags, eventQueue = [], mapDim }) {
    const { player, areas } = gameState;
    const { width, height } = mapDim;
    const { attack } = flags || { attack: false };
    let { events } = gameState;
    events = events.concat(eventQueue);
    let expired = [];
    let current = {
      characters: gameState.characters,
      conversation: gameState.conversation,
    };

    for (let i = 0; i < events.length; i++) {
      if (!Story.isTriggered({
        areas,
        player,
        characters: current.characters,
        trigger: events[i].trigger,
        now,
        timeSinceLast,
      })) {
        continue;
      }

      const selector = events[i].selector && Story.createSelector(events[i].selector);
      switch (events[i].type) {
        case 'set-destination':
          // Set destination
          current.characters = Story.setDestination({
            graph,
            characters: current.characters,
            selector,
            destination: events[i].destination,
          });
          break;
        case 'start-conversation':
          current = Story.startConversation({
            player,
            characters: current.characters,
            conversation: current.conversation,
            selector,
          });
          break;
        case 'update-conversation':
          current = Story.updateConversation({
            characters: current.characters,
            conversation: events[i].conversation,
          });
          break;
        default:
          break;
      }
      // Tag expired events for removal
      if (!Story.isRecurrentEvent(events[i])) {
        expired = expired.concat(events[i]);
      }
    }
    // Update Events
    events = events.filter((t) => !expired.includes(t));

    // If it's paused, don't update the characters
    current.characters = (gameState.conversation && gameState.conversation.active)
      ? current.characters
      : current.characters.map((npc) => {
        const { destination } = npc;
        if (!destination) {
          const newDest = Story.newDestination({ areas, width, height, attack, player, npc });
          return Story.setSingleDestination({ actor: npc, destination: newDest, graph });
        }
        if (npc.hasCollision) {
          const newDest = Story.newDestination({ areas, width, height, attack, player, npc });
          const exclude = (npc.exclude || []).concat(npc.destination);
          return Story.setSingleDestination({ actor: npc, destination: newDest, graph, exclude });
        }
        if (npc.exclude != null) {
          return { ...npc, exclude: [] };
        }
        return npc;
      });

    return {
      ...gameState,
      ...current,
    };
  },

  /**
   * startConversation.
   *
   * @param {}
   */
  startConversation({ player, characters, selector, conversation }) {
    const nearestNPC = () => {
      const res = characters
        .filter((t) => t.dialog != null) // Only speaking npc's
        .map((t) => ({
          npc: t,
          dist: Util.dist(t, player),
        })).sort((a, b) => (a.dist - b.dist))[0];

      // The nearest npc is too far away
      if (!res || res.dist >= (player.width * 2.5)) { return null; }
      return res.npc;
    };
    const character = selector != null
      ? characters.find(selector)
      : nearestNPC();
    if (!character) { return { characters, conversation }; }

    return {
      characters,
      conversation: {
        character,
        currentDialog: character.dialog,
        active: true,
        selectedOption: 0,
      },
    };
  },

  /**
   * updateConversation.
   *
   * @param {}
   */
  updateConversation({ conversation, characters }) {
    return { characters, conversation };
  },

  /**
   * createSelector.
   *
   * @param {} sel
   */
  createSelector(sel) {
    if (sel.characterId != null) {
      return (t) => t.id === sel.characterId;
    }
    throw Error(`Unknown selector type: ${JSON.stringify(sel)}`);
  },

  /**
   * setDestination.
   *
   * @param {}
   */
  setDestination({ characters, destination, selector, graph }) {
    return characters.map((actor) => {
      if (selector(actor)) {
        return Story.setSingleDestination({ actor, destination, graph });
      }
      return actor;
    });
  },
  /**
   * setSingleDestination.
   *
   * @param {}
   */
  setSingleDestination({ actor, destination, graph, exclude }) {
    const finish = destination;
    const start = {
      x: actor.x, // Math.round(actor.x + actor.width / 2),
      y: actor.y, // Math.round(actor.y + actor.height / 2),
    };
    const waypoints = PathFinding.dijikstras({ graph, start, finish, exclude });
    const newWaypoints = waypoints.slice(1);
    // Bit of a hack to force the changes through
    newWaypoints._keep = true; // eslint-disable-line no-underscore-dangle
    return {
      ...actor,
      destination: waypoints[0],
      waypoints: newWaypoints,
      exclude,
    };
  },

  /**
   * newId.
   *
   * @param {} collection
   */
  newId(collection) {
    return collection.reduce((a, b) => Math.max(a, b.id), -1) + 1;
  },

  /**
   * newDestination.
   *
   * @param {}
   */
  newDestination({ areas, width, height, player, attack, npc }) {
    let area = {
      x: 0, y: 0, width, height,
    };

    if (player && attack) {
      return { x: player.x, y: player.y };
    }

    if (npc.attachedAreaId != null) {
      area = areas.find((t) => t.id === npc.attachedAreaId);
    }
    return {
      x: Math.floor(Math.random() * area.width) + area.x,
      y: Math.floor(Math.random() * area.height) + area.y,
    };
  },
};
