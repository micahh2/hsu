import { expect } from 'chai';
import gameData from './gameData.spec.json';
import { Story } from './story.js';

describe('getChanges', () => {
  it('should show the diff between two single level objects', () => {
    const oldState = { a: 1, b: 2, c: 3 };
    const state = { a: 1, b: 3, c: 2 };

    expect(Story.getChanges(oldState, state)).to.eql({ b: 3, c: 2 });
  });

  it('should show the diff between two double level objects', () => {
    const oldState = { a: { d: 'something' }, b: 2, c: { e: 12 } };
    const state = { a: { d: 'something' }, b: 3, c: { olga: 12 } };

    expect(Story.getChanges(oldState, state)).to.eql({ b: 3, c: { olga: 12 } });
  });

  it('should show the diff between two arrays', () => {
    const oldState = { a: [1, 2, 3] };
    const state = { a: [4, 5, 6] };

    expect(Story.getChanges(oldState, state)).to.eql({ a: { 0: 4, 1: 5, 2: 6 } });
  });
});

describe('applyChanges', () => {
  it('should apply some changes to a flat object', () => {
    const state = { a: 1, b: 2, c: 3 };
    const changes = { b: 4 };

    expect(Story.applyChanges(state, changes)).to.eql({ a: 1, b: 4, c: 3 });
  });

  it('should should be able to process multi-level changes', () => {
    const state = { a: { d: 1 }, b: 2, c: 3 };
    const changes = { a: { d: 2, e: 2 } };

    expect(Story.applyChanges(state, changes)).to.eql({ a: { d: 2, e: 2 }, b: 2, c: 3 });
  });

  it('should should be able to update arrays', () => {
    const state = [1, 2, 3, 4];
    const changes = { 0: 2, 1: 3 };

    expect(Story.applyChanges(state, changes)).to.eql([2, 3, 3, 4]);
  });
});

describe('newId', () => {
  it('should return the highest id+1', () => {
    const ids = [{ id: 1 }, { id: 5 }, { id: 3 }];
    expect(Story.newId(ids)).to.equal(6);
  });
});

describe('setDestination', () => {
  it('should return updated destinations', () => {
    const characters = [{ id: 1 }, { id: 5 }, { id: 3 }];
    const destination = { x: 1, y: 2 };
    const selector = () => true;
    const newCharacters = Story.setDestination({ characters, destination, selector });
    expect(
      newCharacters.map((t) => destination),
    ).to.eql(
      Array(3).fill().map(() => destination),
    );
  });
});

describe('createSelector', () => {
  it('should create a selector', () => {
    const characters = [{ id: 1 }, { id: 5 }, { id: 3 }];
    const selector = Story.createSelector({ characterId: 5 });
    expect(characters.find(selector)).to.equal(characters[1]);
  });
});

describe('startConversation', () => {
  it('should return the dialog of a character', () => {
    const { characters } = gameData;
    const selector = (t) => t.id === 1;
    const conversation = Story.startConversation({ characters, selector });
    expect(conversation.currentDialog).to.eql(characters[0].dialog);
    expect(conversation.character).to.eql(characters[0]);
    expect(conversation.selectedOption).to.eql(0);
  });
});

const events = [
  { type: 'set-destination', trigger: { type: 'time', time: 100000 } },
  { type: 'set-destination', trigger: { type: 'interval', interval: 100000 } },
  { type: 'update-dialog', trigger: { type: 'area', areaId: 1 } },
  { type: 'start-conversation', trigger: { type: 'distance', characterId: 1, distance: 1 } },
];

describe('isRecurrentEvent', () => {
  it('should be recurrent when it is of type interval', () => {
    expect(Story.isRecurrentEvent(events[0])).to.be.false;
    expect(Story.isRecurrentEvent(events[1])).to.be.true;
    expect(Story.isRecurrentEvent(events[2])).to.be.false;
    expect(Story.isRecurrentEvent(events[3])).to.be.false;
  });
});

describe('isTime', () => {
  it('should be time when it\'s happening exactly now', () => {
    const now = 100000;
    const { trigger } = events[0];
    expect(Story.isTime({ now, time: trigger.time })).true;
  });
  it('should be time when it\'s happened in the past', () => {
    const now = 100001;
    const { trigger } = events[0];
    expect(Story.isTime({ now, time: trigger.time })).true;
  });
  it('should not be time when it has not happened yet', () => {
    const now = 99999;
    const { trigger } = events[0];
    expect(Story.isTime({ now, time: trigger.time })).false;
  });
});

describe('isWithinInterval', () => {
  it('should be within the interval when it\'s happening exactly now', () => {
    const now = 100000;
    const { trigger } = events[1];
    expect(Story.isWithinInterval({ now, interval: trigger.interval, threshold: 1 })).true;
  });
  it('should be within the interval when it\'s happening exactly now + start', () => {
    const now = 100100;
    const { trigger } = events[1];
    expect(Story.isWithinInterval({
      now, interval: trigger.interval, threshold: 1, start: 100,
    })).true;
  });
  it('should be within the interval when it\'s happening now-ish (<threshold)', () => {
    const now = 100000 + 10;
    const { trigger } = events[1];
    expect(Story.isWithinInterval({ now, interval: trigger.interval, threshold: 10 })).true;
  });
  it('should be within the interval when it\'s happening now-ish for the third time', () => {
    const now = 100000 * 3 + 10;
    const { trigger } = events[1];
    expect(Story.isWithinInterval({ now, interval: trigger.interval, threshold: 10 })).true;
  });
  it('should not be within the interval when triggered more than the threshold ago', () => {
    const now = 100000 - 1;
    const { trigger } = events[1];
    expect(Story.isWithinInterval({ now, interval: trigger.interval, threshold: 10 })).false;
  });
  it('should not be within the interval when now is later than end', () => {
    const now = 100000 * 4;
    const { trigger } = events[1];
    expect(Story.isWithinInterval({
      now, interval: trigger.interval, threshold: 1, end: 100000 * 3,
    })).false;
  });
});

describe('isWithinDistance', () => {
  it('should be within distance when near', () => {
    const one = {
      x: 1, y: 2, width: 10, height: 10,
    };
    const two = {
      x: 20, y: 10, width: 10, height: 10,
    };
    expect(Story.isWithinDistance({ a: one, b: two, distance: 21 })).true;
    expect(Story.isWithinDistance({ a: two, b: one, distance: 21 })).true;
  });
  it('should not be within distance when far', () => {
    const one = {
      x: 1, y: 2, width: 10, height: 10,
    };
    const two = {
      x: 20, y: 10, width: 10, height: 10,
    };
    expect(Story.isWithinDistance({ a: one, b: two, distance: 20 })).false;
    expect(Story.isWithinDistance({ a: two, b: one, distance: 20 })).false;
  });
});

describe('isWithinArea', () => {
  it('should be when actor is in area', () => {
    const actor = { x: 10, y: 10 };
    const area = {
      x: 5, y: 5, width: 5, height: 5,
    };
    expect(Story.isWithinArea({ actor, area })).true;
  });
  it('should not be when actor is above the area', () => {
    const actor = { x: 10, y: 4 };
    const area = {
      x: 5, y: 5, width: 5, height: 5,
    };
    expect(Story.isWithinArea({ actor, area })).false;
  });
  it('should not be when actor is beyond the area', () => {
    const actor = { x: 11, y: 11 };
    const area = {
      x: 5, y: 0, width: 5, height: 5,
    };
    expect(Story.isWithinArea({ actor, area })).false;
  });
});

describe('isTriggered', () => {
  it('should should trigger on time', () => {
    const now = 100000;
    expect(Story.isTriggered({ now, trigger: events[0].trigger, timeSinceLast: 1 })).true;
  });
  it('should trigger on interval', () => {
    const now = 100000;
    const { trigger } = events[1];
    expect(Story.isTriggered({ now, trigger, timeSinceLast: 1 })).true;
  });
  it('should trigger when in area', () => {
    const player = { x: 10, y: 10 };
    const areas = [{
      x: 5, y: 5, width: 5, height: 5, id: 1,
    }];
    const { trigger } = events[2]; // areaId: 1
    expect(Story.isTriggered({ trigger, player, areas })).true;
  });
  it('should trigger on distance', () => {
    const one = {
      x: 1, y: 2, width: 10, height: 10,
    };
    const two = {
      x: 1, y: 3, width: 10, height: 10, id: 1,
    };
    const characters = [two];
    const { trigger } = events[3]; // characterId: 1
    expect(Story.isTriggered({ trigger, player: one, characters })).true;
  });
});

const gameState = Story.loadGameState({ gameData, width: 1000, height: 1000 });

describe('updateGameState', () => {
  it('should update conversation on distance', () => {
    const character = gameData.characters[0];
    const gs = {
      ...gameState,
      conversation: null,
      player: {
        x: 0.5, y: 0.1009, width: 0.005, height: 0.005,
      },
      characters: [character],
      events: [gameData.events[2]], // Just one for now
    };
    const newGameState = Story.updateGameState({ gameState: gs });
    expect(newGameState.conversation.currentDialog).to.eql(character.dialog);
  });
  it('should set destination on time', () => {
    const e = gameData.events[0];
    const character = gameData.characters[0];
    const gameState = {
      conversation: null,
      ...gameData,
      characters: [character],
      events: [e], // Just one for now
    };
    const newGameState = Story.updateGameState({ gameState, now: 100090 });
    expect(newGameState.conversation).null;
    expect(newGameState.characters[0].destination).to.eql(e.destination);
  });
});

describe('loadGameState', () => {
  it('should transform choordinates from relative to abs', () => {
    const d = gameData.events[0].destination;
    const c = gameData.characters[0];
    const gameState = Story.loadGameState({ gameData, width: 100, height: 100 });
    expect(gameState.events[0].destination).to.eql({ x: d.x * 100, y: d.y * 100 });
    expect(gameState.events[2].trigger.distance).to.eql(Math.round(gameData.events[2].trigger.distance * 100));
    expect(gameState.characters[0].x).to.eql(Math.round(c.x * 100));
    expect(gameState.characters[0].y).to.eql(Math.round(c.y * 100));
    expect(gameState.characters[0].width).to.eql(Math.round(c.width * 100));
    expect(gameState.characters[0].height).to.eql(Math.round(c.height * 100));
  });
});
