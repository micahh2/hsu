import { Util } from './util.js';

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
    // Add some random characters
    const characters = (gameData.characters || []).filter((t) => t.copies == null);
    const maxId = characters.reduce((a, b) => Math.max(a, b.id), 0);
    const copyCharacters = (gameData.characters || []).filter((t) => t.copies);
    const newCharacters = copyCharacters
      .map((t) => new Array(t.copies).fill(t).map((k, i) => ({
        ...k,
        name: `${k.name} ${i}`,
      })))
      .reduce((a, b) => a.concat(b), [])
      .map((t, i) => {
        let { spriteIndex } = t;
        if (t.spriteIndexes instanceof Array) {
          const len = t.spriteIndexes.length;
          spriteIndex = t.spriteIndexes[Math.floor(Math.random() * len)];
        }
        return {
          ...t,
          id: i + maxId + 1,
          spriteIndex,
        };
      });

    return {
      ...gameData,
      characters: characters.concat(newCharacters).map((t) => ({
        ...t,
        isNew: true,
      })),
    };
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
    player,
    characters,
    areas,
    trigger,
    now,
    timeSinceLast,
    items,
    conversation,
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
      case 'has-item':
        return items.some((item) => item.id === trigger.itemId && item.inInventory);
      case 'conversation':
        return !!(conversation
          && conversation.active
          && (trigger.characterId == null || conversation.character.id === trigger.characterId));
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
  updateGameState({ gameState, now, timeSinceLast, flags, eventQueue = [], mapDim }) {
    const { player, areas, items, quests } = gameState;
    const { width, height } = mapDim;
    const { attack } = flags || { attack: false };
    const paused = (gameState.conversation && gameState.conversation.active)
       || (flags && flags.paused);

    let { events } = gameState;
    if (paused) { events = []; }
    events = events.concat(eventQueue);
    let changes = [];
    let expired = [];
    const { characters, conversation } = gameState;

    const nearByCharacters = Story.nearByCharacters({ player, characters });

    for (let i = 0; i < events.length; i++) {
      if (!Story.isTriggered({
        areas,
        player,
        characters,
        conversation,
        items,
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
              nearByCharacters,
              characters,
              selector,
            }),
          );
          break;
        case 'update-conversation': {
          const convoUpdates = Story.updateConversation({
            characters,
            conversation: events[i].conversation,
          });
          changes = changes.concat(convoUpdates.changes);
          events = events.concat(convoUpdates.events);
          break;
        }
        case 'show-item':
          changes = changes.concat({
            type: 'update-item',
            id: events[i].itemId,
            prop: 'hidden',
            value: false,
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

    // Update exposure
    changes = changes.concat(
      Story.exposureChanges({ player, nearByCharacters, timeSinceLast }),
    );

    // If near an item, pick it up.
    const itemChanges = (items || [])
      .filter((t) => !t.inInventory && !t.hidden && Util.dist(t, player) < 2 * player.width)
      .map((t) => ({ type: 'update-item', id: t.id, prop: 'inInventory', value: true }));
    changes = changes.concat(itemChanges);

    // Check completed quests
    changes = changes.concat(
      Story.completedTaskChanges({
        quests, characters, areas, player, items, conversation, timeSinceLast, now,
      }),
    );

    // If an npc is bored or blocked, reroute it
    changes = changes.concat(
      Story.blockedBoredNPCChanges({
        characters, changes, areas, width, height, player, attack, now,
      }),
    );

    // If we've removed or added events
    if (events.length !== gameState.events.length
      || events.some((t, index) => gameState.events[index] !== t)) {
      changes = changes.concat({ type: 'update-events', events });
    }

    return changes;
  },

  applyChanges(inState, events) {
    return events.reduce((state, e) => {
      switch (e.type) {
        case 'update-events':
          return { ...state, events };
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
        case 'set-characters-wait':
          return {
            ...state,
            characters: state.characters.map((t) => {
              if (t.isNew) { return t; }
              if (t.destination == null && t.waitStart == null) {
                return { ...t, waitStart: e.waitStart };
              }
              if (t.hasCollision && t.blockedSince == null) {
                return { ...t, blockedSince: e.waitStart };
              }
              if (!t.hasCollision && t.blockedSince != null) {
                return { ...t, blockedSince: null };
              }
              return t;
            }),
          };
        case 'set-character-waypoints':
          return {
            ...state,
            characters: state.characters.map((t) => {
              if (t.id === e.id && (!e.mustHaveCollision || t.hasCollision)) {
                return {
                  ...t,
                  destination: e.destination,
                  waypoints: e.waypoints,
                  exclude: e.exclude,
                  waitStart: null,
                  blockedSince: null,
                  isPathFinding: false,
                };
              }
              return t;
            }),
          };
        case 'set-characters-path-finding-request':
          return {
            ...state,
            characters: state.characters.map((t) => {
              if (!t.isPathFinding && e.ids.includes(t.id)) {
                return { ...t, isPathFinding: true };
              }
              return t;
            }),
          };
        case 'remove-character-path-finding-request':
          return {
            ...state,
            characters: state.characters.map((t) => {
              if (t.isPathFinding && e.id === t.id) {
                return { ...t, isPathFinding: false };
              }
              return t;
            }),
          };
        case 'set-conversation':
          return { ...state, conversation: e.conversation };
        case 'update-player':
          return { ...state, player: { ...state.player, [e.prop]: e.value } };
        case 'set-task-done':
          return {
            ...state,
            quests: state.quests.map((t) => {
              if (t.id === e.questId) {
                return {
                  ...t,
                  tasks: t.tasks.map((k) => {
                    if (k.id === e.taskId) { return { ...k, done: true }; }
                    if (k.id === e.nextTaskId) { return { ...k, hidden: false }; }
                    return k;
                  }),
                };
              }
              return t;
            }),
          };
        case 'end-game':
          return { ...state, end: true };
        default:
          console.warn('Unknown event type', e.type); // eslint-disable-line no-console
          return state;
      }
    }, inState);
  },

  nearByCharacters({ player, characters }) {
    return characters
      .filter((t) => Util.dist(t, player) < player.width * 2);
  },

  exposureChanges({ player, nearByCharacters, timeSinceLast }) {
    const newExposure = nearByCharacters
      .reduce((a, b) => a + b.infectionFactor, 0);
    if (newExposure === 0) { return []; }
    const level = (player.exposureLevel || 0) + newExposure * (timeSinceLast / 1000);
    if (level >= 100) {
      return { type: 'end-game' };
    }
    return {
      type: 'update-player',
      prop: 'exposureLevel',
      value: level,
    };
  },

  completedTaskChanges({
    quests, characters, areas, player, items, conversation, timeSinceLast, now,
  }) {
    if (!quests) { return []; }
    const activeTasks = quests
      .map((quest) => ({
        quest,
        task: quest.tasks.find((t) => !t.hidden && !t.done),
      }))
      .filter((t) => t.task != null);

    return activeTasks.filter(({ task }) => Story.isTriggered({
      player,
      characters,
      areas,
      trigger: task.trigger,
      now,
      timeSinceLast,
      items,
      conversation,
    })).map(({ task, quest }) => {
      const nextIndex = quest.tasks.indexOf(task) + 1;
      const nextTask = quest.tasks[nextIndex];
      return {
        type: 'set-task-done',
        taskId: task.id,
        questId: quest.id,
        nextTaskId: nextTask && nextTask.id,
      };
    });
  },

  blockedBoredNPCChanges({
    characters, changes, areas, width, height, player, attack, now,
  }) {
    let waitChanges = [{ type: 'set-characters-wait', waitStart: now }];

    const nonChanged = characters
      .filter((npc) => !npc.isPathFinding && !npc.stuck)
      .filter((npc) => !changes.some((t) => t.type.includes('character') && t.id === npc.id));

    waitChanges = nonChanged
      .filter((npc) => !npc.isNew
        && npc.hasCollision
        && !npc.stuck
        && npc.waypoints != null
        && npc.waypoints.length > 0)
      .sort((a, b) => (a.exclude || []).length - (b.exclude || []).length)
      .map((npc) => {
        const destination = npc.waypoints[npc.waypoints.length - 1];
        const exclude = (npc.exclude || []).concat(npc.destination);
        return Story.setSingleDestination({
          actor: npc,
          destination,
          exclude,
          mustHaveCollision: true,
        });
      })
      .reduce((a, b) => a.concat(b), waitChanges);

    const timeBetweenMovement = 3000; // 3 seconds
    const maxBlockTime = 5000; // 5 seconds
    waitChanges = nonChanged
      .filter((npc) => {
        const waitTime = (now - (npc.waitStart || 0));
        if (npc.destination == null && (npc.isNew || waitTime > timeBetweenMovement)) {
          return true;
        }
        const blockedTime = (now - (npc.blockedSince || 0));
        if (!npc.isNew && npc.hasCollision && blockedTime > maxBlockTime) {
          return true;
        }
        return false;
      })
      .map((npc) => {
        const newDest = Story.newDestination({ areas, width, height, attack, player, npc });
        return Story.setSingleDestination({ actor: npc, destination: newDest });
      })
      .reduce((a, b) => a.concat(b), waitChanges);

    return waitChanges;
  },

  /**
   * startConversation.
   *
   * @param {}
   */
  startConversation({ player, nearByCharacters, characters, selector }) {
    const nearestNPC = () => {
      const res = nearByCharacters
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
    return {
      changes: [{ type: 'set-conversation', conversation }],
      events: (conversation
        && conversation.currentDialog
        && conversation.currentDialog.events)
        || [],
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
  setDestination({ characters, destination, selector }) {
    return characters.filter(selector)
      .map((actor) => Story.setSingleDestination({ actor, destination }));
  },
  /**
   * setSingleDestination.
   *
   * @param {}
   */
  setSingleDestination({ actor, destination, exclude, mustHaveCollision }) {
    return {
      type: 'request-path-finding',
      actor,
      destination,
      exclude,
      mustHaveCollision,
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
    if (npc.isNew) {
      area = {
        x: Math.max(0, npc.x - 150),
        y: Math.max(0, npc.y - 150),
        width: 300,
        height: 300,
      };
    }
    return {
      x: Math.floor(Math.random() * area.width) + area.x,
      y: Math.floor(Math.random() * area.height) + area.y,
    };
  },
};
