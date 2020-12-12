import { expect } from 'chai';
import { Characters } from './characters.js';

describe('moveNPC', () => {
  it('should always move an npc as an integer', () => {
    const width = 900;
    const height = 900;
    const player = {};
    const updateStats = () => {};
    const graph = [{ x: 0, y: 0, width, height, neighbors: [] }];
    const attack = false;

    for (let i = 0; i < 100; i++) {
      const npc1 = {
        x: i, y: i * i, speed: i * 2, width: i, height: i * 3, isNew: true,
      };
      const newNPC1 = Characters.moveNPC({
        npc: npc1, width, height, player, attack, updateStats, graph,
      });
      expect(newNPC1.x).to.satisfy(Number.isInteger);
      expect(newNPC1.y).to.satisfy(Number.isInteger);

      const npc2 = {
        x: i * 3, y: i * 4, speed: i * i, width: i * i, height: 3, isNew: false,
      };
      const newNPC2 = Characters.moveNPC({
        npc: npc2, width, height, player, attack, updateStats, graph,
      });
      expect(newNPC2.x).to.satisfy(Number.isInteger);
      expect(newNPC2.y).to.satisfy(Number.isInteger);

      const npc3 = {
        x: i * 3, y: i * 4, speed: i * i, width: i * i, height: 3, isNew: true,
      };
      const newNPC3 = Characters.moveNPC({
        npc: npc3, width, height, player, attack, updateStats, graph,
      });
      expect(newNPC3.x).to.satisfy(Number.isInteger);
      expect(newNPC3.y).to.satisfy(Number.isInteger);
    }
  });
});
