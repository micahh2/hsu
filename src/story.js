import { Util } from './util.js';

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
   * relativeToAbsolute.
   *
   * @param {}
   */
  relativeToAbsolute({ relative, width }) {
    if (!relative) { return relative; }
    const abs = { ...relative };
    for (const i of ['x', 'y', 'height', 'width', 'speed', 'distance']) {
      if (abs[i] == null) { continue; }
      abs[i] = Math.round(abs[i] * width);
    }
    return abs;
  },

  /**
   * loadGameState.
   *
   * @param {}
   */
  loadGameState({ gameData, width, height }) {
    return {
      ...gameData,
      areas: (gameData.areas || []).map((t) => Story.relativeToAbsolute({ relative: t, width })),
      player: Story.relativeToAbsolute({ relative: gameData.player, width }),
      characters: (gameData || []).characters
        .map((t) => Story.relativeToAbsolute({ relative: t, width, height })),
      events: (gameData.events || []).map((t) => ({
        ...t,
        trigger: t.trigger.distance != null
          ? Story.relativeToAbsolute({ relative: t.trigger, width })
          : t.trigger,
        destination: Story.relativeToAbsolute({ relative: t.destination, width, height }),
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
    switch (trigger.type) {
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
    return e.trigger.type === 'interval' && (e.trigger.end == null || now < e.trigger.end);
  },

  /**
   * updateGameState.
   *
   * @param {}
   */
  updateGameState({ gameState, now, timeSinceLast }) {
    const { player, areas } = gameState;
    let { conversation, characters, events, conversationTriggered } = gameState;
    let expired = [];

    for (let i = 0; i < events.length; i++) {
      // if (!Story.isTriggered({
      //   areas, player, characters, trigger: events[i].trigger, now, timeSinceLast,
      // })) {
      //   continue;
      // }

      const selector = events[i].selector && Story.createSelector(events[i].selector);
      switch (events[i].type) {
        case 'set-destination':
          // Set destination
          characters = Story.setDestination({
            characters,
            selector,
            destination: events[i].destination,
          });
          break;
        case 'start-conversation':
          // conversation = Story.startConversation({ characters, selector });
          conversation = Story.conversationTriggered(gameState, player, characters, events, conversationTriggered);
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

    return {
      ...gameState,
      conversation,
      characters,
    };
  },

  /**
   * startConversation.
   *
   * @param {}
   */
  startConversation({ characters, selector }) {
    const character = characters.find(selector);
    return {
      character,
      currentDialog: character.dialog,
      selectedOption: 0,
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
    return characters.map((actor) => {
      if (selector(actor)) {
        return { ...actor, destination };
      }
      return actor;
    });
  },

  /**
   * updateDialog.
   *
   * @param {}
   */
  updateDialog(dialogOption, _action, character) {
    console.log("diaa");
    console.log(character);
    const con = document.getElementById('conversation');

    switch (dialogOption.event) {
      case 'end-conversation':
        return function () {
          con.style.display = 'none';
        }
      case  'return-response':
        if (dialogOption.options){
          let options = ``;
          return function () {
            for (let i in dialogOption.options){
              options += `<button class="option_button">${dialogOption.options[i].query}</button><br>`;
            }
            con.innerHTML = `<p><b>${character.name}: </b>`
                + `${dialogOption.response}</p>` +`<p>${options}</p>`;
          }
        }
        return function () {
          con.innerHTML = `<p><b>${character.name}: </b>`
                        + `${dialogOption.response}</p>`;
        }
    }
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
   * to detect if conversation is triggered
   *
   * @param gameState
   * @param player
   * @param characters
   * @param events
   * @param conversationTriggered
   * @returns {boolean|{conversationTriggered: boolean, character: *, currentDialog: *, selectedOption: number}}
   */
  conversationTriggered(gameState, player, characters, events, conversationTriggered){
    for (let i = 0; i < characters.length; i++){
      let character = characters[i];
      if (character.type === 'vip' && Story.isWithinDistance({ distance: events[2].trigger.distance, a: player, b: character })){
        character.speed = 0; // when triggered, stop moving
        conversationTriggered = true;

        return {
          character,
          currentDialog: character.dialog,
          selectedOption: 0,
          conversationTriggered
        };
      }
      character.speed = 2; //TODO need to be not hardcoded
    }
    conversationTriggered = false;
    return conversationTriggered;
  }
};
