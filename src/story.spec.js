import { expect } from 'chai';
import gameData from './gameData.spec.json';
import { Story } from './story.js';

describe('applyChanges', () => {
  it('should apply conversation changes', () => {
    const conversation = { dialog: 'something-something' };
    const state = { a: 1, b: 2, c: 3 };
    const changes = [{ type: 'set-conversation', conversation }];

    expect(Story.applyChanges(state, changes)).to.eql({ a: 1, b: 2, c: 3, conversation });
  });

  it('should should apply item changes', () => {
    const items = [{ id: 1 }];
    const state = { a: 1, b: 2, c: 3, items };
    const changes = [{ type: 'update-item', id: 1, prop: 'cool', value: true }];

    expect(Story.applyChanges(state, changes)).to.eql(
      { a: 1, b: 2, c: 3, items: [{ id: 1, cool: true }] },
    );
  });

  it('should should update character waypoints/destinations', () => {
    const waypoints = [1, 2, 3];
    const exclude = [4, 5, 6];
    const destination = 1;
    const characters = [{ id: 1, x: 1, y: 2 }];
    const state = { characters };
    const changes = [
      {
        type: 'set-character-waypoints',
        id: 1,
        waypoints,
        exclude,
        destination,
      },
    ];

    expect(Story.applyChanges(state, changes)).to.eql({
      characters: [{
        id: 1,
        x: 1,
        y: 2,
        waypoints,
        exclude,
        destination,
        waitStart: null,
        blockedSince: null,
      }],
    });
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
    const actor = { x: 10, y: 10, width: 10, height: 10 };
    const characters = [{ ...actor, id: 1 }, { ...actor, id: 5 }, { ...actor, id: 3 }];
    const destination = { x: 1, y: 2 };
    const graph = [{ x: 0, y: 0, width: 100, height: 100 }];
    const selector = () => true;

    const newCharacters = Story.setDestination({ graph, characters, destination, selector });
    expect(
      newCharacters.map(() => destination),
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
  const characters = [{
    id: 1,
    name: 'Frau Kold',
    type: 'vip',
    x: 30,
    y: 70,
    maxLeft: 0,
    maxRight: 36,
    maxUp: 0,
    maxDown: 159,
    speed: 1,
    width: 15,
    height: 15,
    spriteIndex: 12,
    isNew: true,
    actions: {
      t: 'start-conversation',
      a: 'attack',
    },
    dialog: {
      response: 'Hello then.',
      options: [
        { id: 1, query: 'Goodbye.', event: 'end-conversation' },
        { id: 2, query: 'Are you going home?', response: 'No.', event: 'return-root' },
      ],
    },
  }];
  it('should return the dialog of a character', () => {
    const selector = (t) => t.id === 1;
    const { conversation } = Story.startConversation({ characters, selector });
    expect(conversation.currentDialog).to.eql(characters[0].dialog);
    expect(conversation.character.id).to.eql(characters[0].id);
    expect(conversation.selectedOption).to.eql(0);
  });
  it('should select the nearest npc if no selector', () => {
    const player = { x: 30, y: 70, width: 10 };
    const nearByCharacters = characters;
    const { conversation } = Story.startConversation({ characters, nearByCharacters, player });
    expect(conversation.character).to.eql(characters[0]);
  });
  it('should do nothing if no selector and no near npc', () => {
    const player = { x: 300, y: 700, width: 10 };
    const nearByCharacters = characters;
    const events = Story.startConversation({ characters, nearByCharacters, player });
    expect(events).to.eql([]);
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
  it('should trigger on any conversation', () => {
    const trigger = { type: 'conversation' };
    expect(Story.isTriggered({ conversation: { active: true }, trigger })).true;
  });
  it('should trigger on conversation with specific npc', () => {
    const trigger = { type: 'conversation', characterId: 123 };
    expect(Story.isTriggered(
      { conversation: { active: true, character: { id: 123 } }, trigger },
    )).true;
  });
  it('should trigger on having an item', () => {
    const items = [{ id: 12, inInventory: true }];
    const trigger = { type: 'has-item', itemId: 12 };
    expect(Story.isTriggered({ items, trigger })).true;
  });
});

describe('updateGameState', () => {
  it('should update conversation on distance', () => {
    const gameState = Story.loadGameState({ gameData, width: 1000, height: 1000 });
    const character = gameData.characters[0];
    const gs = {
      ...gameState,
      conversation: null,
      player: { x: 25, y: 60, width: 10, height: 10 },
      characters: [character],
      events: [gameData.events[2]], // Just one for now
    };
    const flags = { enableConversation: true };
    const [convoChange] = Story.updateGameState({
      gameState: gs,
      flags,
      mapDim: { width: 1000, height: 1000 },
      graph: [{ x: 0, y: 0, width: 1000, height: 1000 }],
    });
    expect(convoChange.conversation.currentDialog).to.eql(character.dialog);
  });
  it('should set destination on time', () => {
    const e = gameData.events[0];
    const character = gameData.characters[0];
    const graph = [{ x: 0, y: 0, width: 100, height: 100 }];
    const gameState = {
      conversation: null,
      ...gameData,
      characters: [character],
      events: [e], // Just one for now
    };
    const [destChange] = Story.updateGameState({
      graph,
      gameState,
      now: 100090,
      mapDim: { width: 100, height: 100 },
    });
    expect(destChange.destination).to.eql(e.destination);
    expect(destChange.id).to.eql(character.id);
  });
});

describe('loadGameState', () => {
  it('shouldn\'t transform choordinates from relative to abs (formerly we did)', () => {
    const d = gameData.events[0].destination;
    const c = gameData.characters[0];
    const gameState = Story.loadGameState(gameData);
    expect(gameState.events[0].destination).to.eql(d);
    expect(gameState.events[2].trigger.distance).to.eql(gameData.events[2].trigger.distance);
    expect(gameState.characters[0].x).to.eql(c.x);
    expect(gameState.characters[0].y).to.eql(c.y);
    expect(gameState.characters[0].width).to.eql(c.width);
    expect(gameState.characters[0].height).to.eql(c.height);
  });
});
