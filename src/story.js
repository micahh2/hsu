import { Util } from './util.js';

/**
 * Story.
 */
export class Story {

  /**
   * getChanges.
   *
   * @param {} oldState
   * @param {} state
   */
  static getChanges(oldState, state) {
    const changes = {};
    const stateKeys = Object.keys(state);
    for (let i of stateKeys) {
      if (oldState[i] === state[i]) { continue; }
      if (typeof oldState[i] === typeof state[i] && typeof state[i] === 'object') {
        const subChanges = Story.getChanges(oldState[i], state[i]);
        if (Object.keys(subChanges).length === 0) { continue; }
        changes[i] = subChanges
        continue;
      }
      changes[i] = state[i];
    }
    return changes;
  }

  /**
   * applyChanges.
   *
   * @param {} state
   * @param {} changes
   */
  static applyChanges(state, changes) {
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

    for (let i of changeKeys) {
      newState[i] = Story.applyChanges(newState[i], changes[i]);
    }
    return newState;
  }

  /**
   * areaObjectMap.
   *
   * @param {}
   */
  static areaObjectMap({ objects, areas }) { }

  /**
   * relativeToAbsolute.
   *
   * @param {}
   */
  static relativeToAbsolute({ relative, width }) {
    if (!relative) { return relative; }
    const abs = { ...relative };
    for (let i of ['x', 'y', 'height', 'width', 'speed', 'distance']) {
      if(abs[i] == null) { continue; }
      abs[i] = Math.round(abs[i]*width);
    }
    return abs;
  }

  /**
   * loadGameState.
   *
   * @param {}
   */
  static loadGameState({ gameData, width, height }) {
    return {
      ...gameData,
      areas: (gameData.areas || []).map(t => Story.relativeToAbsolute({ relative: t, width })),
      player: Story.relativeToAbsolute({ relative: gameData.player, width }),
      characters: (gameData || []).characters.map(t => Story.relativeToAbsolute({ relative: t, width, height })),
      events: (gameData.events || []).map(t => ({
        ...t,
        trigger: t.trigger.distance != null
          ? Story.relativeToAbsolute({ relative: t.trigger, width })
          : t.trigger,
        destination: Story.relativeToAbsolute({ relative: t.destination, width, height })
      }))
    };
  }

  /**
   * isTime.
   *
   * @param {}
   */
  static isTime({ time, now }) {
    return time <= now;
  }

  /**
   * isWithinInterval.
   *
   * @param {}
   */
  static isWithinInterval({ interval, now, start, end, threshold }) {
    start = start || 0;
    if (now < start || (end != null && now > end)) { return false; }
    return (now-start) % interval <= threshold;
  }

  /**
   * isWithinDistance.
   *
   * @param {}
   */
  static isWithinDistance({ distance, a, b }) {
    return Util.dist(a, b) <= distance;
  }

  /**
   * isWithinArea.
   *
   * @param {}
   */
  static isWithinArea({ area, actor }) {
    const diffx = actor.x - area.x;
    const diffy = actor.y - area.y;
    return diffx >= 0 && diffx <= area.width && diffy >= 0 && diffy <= area.height;
  }

  /**
   * isTriggered.
   *
   * @param {}
   */
  static isTriggered({ player, characters, areas, trigger, now, timeSinceLast }) {
    switch(trigger.type) {
      case 'time':
        return Story.isTime({ time: trigger.time, now });
      case 'interval':
        return Story.isWithinInterval({ ...trigger, now, threshold: timeSinceLast })
      case 'distance':
        const character = characters.find(t => t.id === trigger.characterId);
        return Story.isWithinDistance({ distance: trigger.distance, a: player, b: character })
      case 'area':
        const area = areas.find(t => t.id === trigger.areaId);
        return Story.isWithinArea({ area, actor: player })
    }
    throw Error(`Unexpected Trigger: ${trigger.type}`);
  }

  /**
   * isRecurrentEvent.
   *
   * @param {} e
   * @param {} now
   */
  static isRecurrentEvent(e, now) {
    return e.trigger.type === 'interval' && (e.trigger.end == null || now < e.trigger.end);
  }

  /**
   * updateGameState.
   *
   * @param {}
   */
  static updateGameState({ gameState, now, locMap, collisions, timeSinceLast }) {
    let { player, areas, conversation, inventory, mail, characters, events } = gameState;
    let expired = [];

    for (let i = 0; i < events.length; i++) {

      if (!Story.isTriggered({ areas, player, characters, trigger: events[i].trigger, now, timeSinceLast })) {
        continue; 
      }

      const selector = events[i].selector && Story.createSelector(events[i].selector);
      switch(events[i].type) {
        case 'set-destination':
          // Set destination
          characters = Story.setDestination({ characters, selector, destination: events[i].destination });
          break;
        case 'start-conversation':
          conversation = Story.startConversation({ characters, selector })
          break;
      }
      // Tag expired events for removal
      if (!Story.isRecurrentEvent(events[i])) {
        expired = expired.concat(events[i]);
      }
    }
    // Update Events
    events = events.filter(t => !expired.includes(t));

    return {
      ...gameState,
      conversation,
      characters
    };
  }

  /**
   * startConversation.
   *
   * @param {}
   */
  static startConversation({ characters, selector }) {
    const character = characters.find(selector); 
    return { 
      character,
      currentDialog: character.dialog,
      selectedOption: 0
    };
  }

  /**
   * createSelector.
   *
   * @param {} sel
   */
  static createSelector(sel) {
    if (sel.characterId != null) {
      return (t) => t.id === sel.characterId;
    }
    throw Error('Unknown selector type: ' + JSON.stringify(sel));
  }

  /**
   * setDestination.
   *
   * @param {}
   */
  static setDestination({ characters, destination, selector }) {
    return characters.map(actor =>  {
      if (selector(actor)) {
        return { ...actor, destination };
      }
      return actor;
    });
  }

  /**
   * updateDialog.
   *
   * @param {}
   */
  static updateDialog({ dialog, action }) {
    // Todo
  }

  /**
   * newId.
   *
   * @param {} collection
   */
  static newId(collection) {
    return collection.reduce((a,b) => Math.max(a,b.id), -1)+1;
  }
}
