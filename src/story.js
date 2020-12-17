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
    const { enableConversation, attack } = flags || { enableConversation: false, attack: false };
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
          if (!enableConversation) { break; }
          current = Story.startConversation({
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

    current.characters = current.characters.map((npc) => {
      const { destination } = npc;
      let { waypoints } = npc;
      if (!destination || npc.hasCollision) {
        const finish = (npc.hasCollision && waypoints && waypoints.length)
          ? waypoints[waypoints.length - 1]
          : Story.newDestination({ areas, width, height, attack, player, npc });
        const start = {
          x: Math.round(npc.x + npc.width / 2),
          y: Math.round(npc.y + npc.height / 2),
        };
        waypoints = PathFinding.aStar({ graph, start, finish });
        return { ...npc, destination: waypoints[0], waypoints: waypoints.slice(1) };
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
  startConversation({ characters, selector }) {
    const character = characters.find(selector);
    const newCharacter = {
      ...character,
      fallbackSpeed: character.speed || character.fallbackSpeed,
      speed: 0,
    };
    const updateCharacters = characters.map((t) => {
      if (t.id === character.id) { return newCharacter; }
      return t;
    });
    return {
      characters: updateCharacters,
      conversation: {
        character: newCharacter,
        currentDialog: newCharacter.dialog,
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
    const { character } = conversation;
    const newCharacter = conversation.active
      ? character
      : {
        ...character,
        speed: character.fallbackSpeed,
      };
    const updateCharacters = conversation.active
      ? characters
      : characters.map((t) => {
        if (t.id === character.id) { return newCharacter; }
        return t;
      });
    return {
      characters: updateCharacters,
      conversation,
    };
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
        const finish = destination;
        const start = {
          x: actor.x, // Math.round(actor.x + actor.width / 2),
          y: actor.y, // Math.round(actor.y + actor.height / 2),
        };
        const waypoints = PathFinding.aStar({ graph, start, finish });
        return {
          ...actor,
          destination: waypoints[0],
          waypoints: waypoints.slice(1),
        };
      }
      return actor;
    });
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
