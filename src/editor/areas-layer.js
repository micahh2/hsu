import { Story } from '../story.js';
import { Render } from './render.js';
import { Elements } from './elements.js';

export const AreasLayer = {
  initialize({ areasCanvas, areas = [], viewport, canvasWidth, canvasHeight, panel }) {
    const areaPane = panel.querySelector('#area-pane');
    let selected;
    let stat;
    const args = {
      width: canvasWidth,
      height: canvasHeight,
      canvas: areasCanvas,
      context: areasCanvas.getContext('2d'),
    };

    function changeAreas(change) {
      switch (change.type) {
        case 'update-area':
          updateAreas(areas.map((t) => { // eslint-disable-line
            if (t.id !== change.id) { return t; }
            return { ...t, [change.prop]: change.value };
          }));
          break;
        case 'delete-area':
          updateAreas(areas.filter((t) => { // eslint-disable-line
            if (t.id !== change.id) { return true; }
            return false;
          }));
          break;
        default:
          throw Error('Unknown Change Type');
      }
    }
    function updateAreas(newAreas) {
      areas = newAreas; // eslint-disable-line
      AreasLayer.drawAll({ ...args, areas, selected, viewport });
      AreasLayer.renderAreaPane({ areaPane, areas, changeAreas });
    }
    AreasLayer.renderAreaPane({ areaPane, areas, changeAreas });

    areasCanvas.addEventListener('mousedown', (e) => {
      const x = (e.offsetX / viewport.scale + viewport.x);
      const y = (e.offsetY / viewport.scale + viewport.y);
      const grabbed = AreasLayer.inHandle({ areas, x, y });
      selected = grabbed || AreasLayer.inArea({ areas, x, y });
      if (grabbed) {
        stat = 'resize';
      } else if (selected) { // Drag area
        stat = 'move';
      } else { // New area
        const id = Story.newId(areas);
        selected = {
          id, x, y, width: 0, height: 0, color: AreasLayer.getShade(), name: AreasLayer.newName(id),
        };
        stat = 'resize';
      }

      // Update areas
      if (selected) {
        updateAreas(areas.filter((t) => t !== selected).concat(selected));
      }
    });
    areasCanvas.addEventListener('mousemove', (e) => {
      if (selected) {
        const updatedAreas = areas.filter((t) => t !== selected);
        if (stat === 'resize') {
          const x = (e.offsetX / viewport.scale + viewport.x);
          const y = (e.offsetY / viewport.scale + viewport.y);
          selected = {
            ...selected,
            width: x - selected.x,
            height: y - selected.y,
          };
          updateAreas(updatedAreas.concat(selected));
        } else if (stat === 'move') {
          selected = {
            ...selected,
            x: selected.x + e.movementX / viewport.scale,
            y: selected.y + e.movementY / viewport.scale,
          };
          updateAreas(updatedAreas.concat(selected));
        }
      }
    });

    function done() {
      // Something selected and we're doing something
      if (selected && stat != null) {
        const updatedAreas = areas.filter((t) => t !== selected);
        // Remove areas that are too small
        if (Math.abs(selected.width) > 2 || Math.abs(selected.height) > 2) {
          const x = selected.x + selected.width;
          const y = selected.y + selected.height;
          selected = {
            ...selected,
            width: Math.round(Math.abs(selected.width)),
            height: Math.round(Math.abs(selected.height)),
            x: Math.round(Math.min(x, selected.x)),
            y: Math.round(Math.min(y, selected.y)),
          };
          updateAreas(updatedAreas.concat(selected));
        } else {
          updateAreas(updatedAreas);
          selected = null;
        }
      }
      stat = null;
    }
    areasCanvas.addEventListener('mouseup', done);
    areasCanvas.addEventListener('mouseout', done);

    return {
      updateAreas,
      updateViewport(newViewport) {
        viewport = newViewport; // eslint-disable-line
        AreasLayer.drawAll({ ...args, areas, selected, viewport });
      },
      getAreas() { return areas; },
    };
  },

  inArea({ areas, x, y }) {
    for (let i = areas.length - 1; i >= 0; i--) {
      const diffx = x - areas[i].x;
      const diffy = y - areas[i].y;
      if (diffx > 0 && diffy > 0 && diffx < areas[i].width && diffy < areas[i].height) {
        return areas[i];
      }
    }
    return null;
  },

  drawAll({ context, areas, width, height, selected, viewport }) {
    context.clearRect(0, 0, width, height);

    for (let i = 0; i < areas.length; i++) {
      const area = areas[areas.length - i - 1];
      const shiftedArea = {
        ...area,
        x: (area.x - viewport.x) * viewport.scale,
        y: (area.y - viewport.y) * viewport.scale,
        width: area.width * viewport.scale,
        height: area.height * viewport.scale,
      };
      AreasLayer.drawArea({ area: shiftedArea, context, active: area === selected });
    }
  },

  drawArea({ context, area, active }) {
    context.fillStyle = area.color;
    context.fillRect(area.x, area.y, area.width, area.height);
    context.fillStyle = 'black';
    if (!active) { return; }

    context.strokeRect(area.x, area.y, area.width, area.height);

    context.beginPath();
    context.arc(area.x + area.width, area.y + area.height, 5, 0, 2 * Math.PI);
    context.closePath();
    context.fill();
  },

  inHandle({ areas, x, y, scale }) {
    for (let i = areas.length - 1; i >= 0; i--) {
      const diffx = Math.abs(x - (areas[i].x + areas[i].width));
      const diffy = Math.abs(y - (areas[i].y + areas[i].height));
      if (diffx < 10 * scale && diffy < 10 * scale) {
        return areas[i];
      }
    }
    return null;
  },

  getShade() {
    return `rgba(${Math.floor(Math.random() * 255)},${Math.floor(Math.random() * 255)},${Math.floor(Math.random() * 255)},0.5)`;
  },

  newName(id) {
    return `name${id}`;
  },
  renderAreaPane({ areaPane, areas, changeAreas }) {
    const ul = Elements.create('ul');
    const content = [Elements.wrap('h2', 'Areas'), ul];
    for (let i = 0; i < areas.length; i++) {
      const a = areas[i];

      const color = AreasLayer.convertRgbaToHex(a.color);
      const colorEl = Elements.create('input', { type: 'color', value: color });
      Render.registerEvent(colorEl, 'change', (e) => {
        const newColor = AreasLayer.convertHextoRgba(e.target.value);
        changeAreas({ type: 'update-area', id: a.id, prop: 'color', value: newColor });
      });
      const nameEl = Elements.create('input', { type: 'text', value: a.name });
      Render.registerEvent(nameEl, 'keyup', (e) => {
        changeAreas({ type: 'update-area', id: a.id, prop: 'name', value: e.target.value });
      });
      const del = Elements.create('input', { type: 'button', value: 'x' });
      Render.registerEvent(del, 'click', () => { changeAreas({ type: 'delete-area', id: a.id }); });

      const item = Elements.wrap('li', [Elements.wrap('div', `${a.id}`), colorEl, nameEl, del]);
      ul.appendChild(item);
    }
    Render.renderToEl(areaPane, content);
  },
  convertRgbaToHex(rgba) {
    const sub = rgba.slice(rgba.indexOf('(') + 1, rgba.indexOf(')'));
    const [r, g, b] = sub
      .split(',')
      .map((t) => AreasLayer.pad(parseInt(t, 10).toString(16), 2, '0'));
    return `#${r}${g}${b}`.toUpperCase();
  },
  convertHextoRgba(hex, alpha = 0.5) {
    const [r, g, b] = [
      hex.slice(1, 3),
      hex.slice(3, 5),
      hex.slice(5, 7),
    ].map((t) => parseInt(t, 16));

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  },
  pad(str, len, value) {
    let newStr = str;
    while (newStr.length < len) {
      newStr = value + newStr;
    }
    return newStr;
  },
};
