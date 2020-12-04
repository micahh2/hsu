import { Story } from '../story.js';

const anonFunc = () => {};

export const AreasLayer = {
  initialize({
    areasCanvas, areas = [], updateCallback = anonFunc, viewport, canvasWidth, canvasHeight,
  }) {
    let selected;
    let stat;
    const args = {
      width: canvasWidth,
      height: canvasHeight,
      canvas: areasCanvas,
      context: areasCanvas.getContext('2d'),
    };

    function updateAreas(newAreas) {
      areas = newAreas; // eslint-disable-line
      AreasLayer.drawAll({ ...args, areas, selected, viewport });
      updateCallback(areas);
    }

    areasCanvas.addEventListener('mousedown', (e) => {
      const x = e.offsetX + viewport.x;
      const y = e.offsetY + viewport.y;
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
          const x = e.offsetX + viewport.x;
          const y = e.offsetY + viewport.y;
          selected = {
            ...selected,
            width: x - selected.x,
            height: y - selected.y,
          };
        } else if (stat === 'move') {
          selected = {
            ...selected,
            x: selected.x + e.movementX,
            y: selected.y + e.movementY,
          };
        }
        updateAreas(updatedAreas.concat(selected));
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
        x: area.x - viewport.x,
        y: area.y - viewport.y,
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

  inHandle({ areas, x, y }) {
    for (let i = areas.length - 1; i >= 0; i--) {
      const diffx = Math.abs(x - (areas[i].x + areas[i].width));
      const diffy = Math.abs(y - (areas[i].y + areas[i].height));
      if (diffx < 10 && diffy < 10) {
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
};
