import { Util } from './util.js';
import { PathFinding } from './path-finding.js';

/**
 * Story.
 */
export const Story = {
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
        return Util.isWithinArea({
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
    const { player, areas, items } = gameState;
    const { width, height } = mapDim;
    const { attack } = flags || { attack: false };
    const paused = (gameState.conversation && gameState.conversation.active) || flags && flags.paused;
    let { events } = gameState;
    events = events.concat(eventQueue);
    let changes = [];
    let expired = [];
    const { characters, conversation } = gameState;

    for (let i = 0; i < events.length; i++) {
      if (!Story.isTriggered({
        areas,
        player,
        characters,
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
          changes = changes.concat(
            Story.setDestination({
              graph,
              characters,
              selector,
              destination: events[i].destination,
            }),
          );
          break;
        case 'start-conversation':
          changes = changes.concat(
            Story.startConversation({
              player,
              characters,
              conversation,
              selector,
            }),
          );
          break;
        case 'update-conversation':
          changes = changes.concat(
            Story.updateConversation({
              characters,
              conversation,
            }),
          );
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

    // Select one directionless/blocked npc per round. This keeps the engine somewhat responsive
    const directionlessNPC = characters
      .find((npc) => npc.destination == null
        && !changes.some((t) => t.type.includes('character') && t.id === npc.id));

    if (directionlessNPC != null) {
      const newDest = Story.newDestination({
        areas, width, height, attack, player, npc: directionlessNPC,
      });
      changes = changes.concat(
        Story.setSingleDestination({ actor: directionlessNPC, destination: newDest, graph }),
      );
    }

    const blockedNPC = directionlessNPC == null && [...characters]
      .sort((a, b) => (a.exclude || []).length - (b.exclude || []).length)
      .find((npc) => !npc.isNew
        && npc.waypoints != null
        && npc.waypoints.length > 0
        && npc.hasCollision
        && !changes.some((t) => t.type.includes('character') && t.id === npc.id));

    if (blockedNPC) {
      const destination = blockedNPC.waypoints[blockedNPC.waypoints.length - 1];
      const exclude = (blockedNPC.exclude || []).concat(blockedNPC.destination);
      changes = changes.concat(
        Story.setSingleDestination({ actor: blockedNPC, destination, graph, exclude }),
      );
    }

    // If near an item, pick it up.
    changes = changes.concat(items && items
      .filter((t) => !t.inInventory && Util.dist(t, player) < 2 * player.width)
      .map((t) => ({ type: 'update-item', id: t.id, prop: 'inInventory', value: true })));

    return changes;
  },

  applyChanges(inState, events) {
    return events.reduce((state, e) => {
      switch (e.type) {
        case 'update-item':
          return {
            ...state,
            items: state.items.map((t) => {
              if (t.id === e.id) {
                return { ...t, [e.prop]: e.value };
              }
              return t;
            }),
          };
        case 'set-character-waypoints':
          return {
            ...state,
            characters: state.characters.map((t) => {
              if (t.id === e.id) {
                return {
                  ...t,
                  destination: e.destination,
                  waypoints: e.waypoints,
                  exclude: e.exclude,
                };
              }
              return t;
            }),
          };
        case 'set-conversation':
          return { ...state, conversation: e.conversation };
        default:
          console.warn('Unknown event type', e.type);
          return state;
      }
    }, inState);
  },

  /**
   * startConversation.
   *
   * @param {}
   */
  startConversation({ player, characters, selector }) {
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
    if (!character) { return []; }

    return {
      type: 'set-conversation',
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
  updateConversation({ conversation }) {
    return { type: 'set-conversation', conversation };
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
    return characters.filter(selector)
      .map((actor) => Story.setSingleDestination({ actor, destination, graph }));
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
    // No way found
    if (waypoints[0] == null) { return []; }
    return {
      type: 'set-character-waypoints',
      id: actor.id,
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
