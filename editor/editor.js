window.addEventListener('load', () => {
  // Load element from DOM (look in index.html)
  let canvas = document.getElementById('canvas');
  let image = document.getElementById('layout');

  // Set canvas resolution
  const canvasSize = image.width;
  canvas.width = canvasSize;
  canvas.height = canvasSize;
  const rect = canvas.getBoundingClientRect();
  const scale = canvas.width / rect.width; 
  

  // Get bounds pixels and context
  const { context, pixels } = getGameContextPixels({ canvas, image });

  let areas = [];

  const args = { context, image, width: canvasSize, height: canvasSize, areas };
  let selected;
  let stat;
  canvas.addEventListener('mousedown', (e) => {
    const x = e.offsetX*scale;
    const y = e.offsetY*scale;
    const grabbed = inHandle({ areas, x, y });
    selected = grabbed || inArea({ areas, x, y })
    if (grabbed) {
      stat = 'resize';
    } else if (selected) { // Drag area
      stat = 'move';
    } else { // New area
      selected = { x, y, width: 0, height: 0, color: getShade(), name: newName() };
      stat = 'resize';
    }

    // Update areas
    if (selected) {
      areas = areas.filter(t => t !== selected).concat(selected);
    }
  });
  canvas.addEventListener('mousemove', (e) => {
    if (selected) {
      let updatedAreas = areas.filter(t => t !== selected);
      if (stat === 'resize') {
        selected = {
          ...selected,
          width: e.offsetX*scale - selected.x,
          height: e.offsetY*scale - selected.y,
        };
      } else if(stat === 'move') {
        selected = {
          ...selected,
          x: selected.x+e.movementX*scale,
          y: selected.y+e.movementY*scale,
        };
      }
      areas = updatedAreas.concat(selected);
    }
  });
  function done(e) {
    // Something selected and we're doing something
    if (selected && stat != null) {
      const updatedAreas = areas.filter(t => t !== selected);
      // Remove areas that are too small
      if(Math.abs(selected.width) > 2 || Math.abs(selected.height) > 2) {
        const x = selected.x+selected.width;
        const y = selected.y+selected.height;
        selected = {
          ...selected,
          width: Math.round(Math.abs(selected.width)),
          height: Math.round(Math.abs(selected.height)),
          x: Math.round(Math.min(x, selected.x)),
          y: Math.round(Math.min(y, selected.y)),
        };
        areas = updatedAreas.concat(selected);
      } else {
        areas = updatedAreas;
        selected = null;
      }
    }
    stat = null;
  }
  canvas.addEventListener('mouseup', done);
  canvas.addEventListener('mouseout', done);

  setInterval(() => { draw({ ...args, areas, selected }) }, 20);

  
  const filePicker = document.getElementById('file');
  filePicker.addEventListener('change', async (e) => {
    const file = filePicker.files[0];
    const data = await importFile(file);
    areas = data.areas;
  });
  const download = document.getElementById('download');
  download.addEventListener('click', (e) => {
    const dataURI = exportFile({ areas });
    download.href = dataURI;
  });
});

async function importFile(file) {
  const text = await file.text()
  return JSON.parse(text);
}

function exportFile(args) {
  return 'data:text/json;base64,' + btoa(JSON.stringify(args));
}

function newName() {
  return `name${Math.floor(Math.random()*1000000)}`;
}

function inArea({ areas, x, y }) {
  for (let i = areas.length-1; i >= 0; i--) {
    let diffx = x - areas[i].x;
    let diffy = y - areas[i].y;
    if (diffx > 0 && diffy > 0 && diffx < areas[i].width && diffy < areas[i].height) {
      return areas[i];
    }
  }
  return;
}
function inHandle({ areas, x, y }) {
  for (let i = areas.length-1; i >= 0; i--) {
    let diffx = Math.abs(x - (areas[i].x + areas[i].width));
    let diffy = Math.abs(y - (areas[i].y + areas[i].height));
    if (diffx < 10 && diffy < 10) {
      return areas[i];
    }
  }
  return;
}

function draw({ context, areas, image, width, height, selected }) {
  window.requestAnimationFrame(() => {
    context.clearRect(0, 0, width, height);
    context.drawImage(image, 0, 50, image.width, image.height);

    for (let i = 0; i < areas.length; i++) {
      const area = areas[areas.length-i-1];
      drawArea({ area, context, active: area === selected })
    }
  });
}


function drawArea({ context, area, active }) {
  context.fillStyle=area.color;
  context.fillRect(area.x, area.y, area.width, area.height);
  context.fillStyle='black';
  if(!active) { return; }

  context.strokeRect(area.x, area.y, area.width, area.height);

  context.beginPath();
  context.arc(area.x+area.width, area.y+area.height, 5, 0, 2*Math.PI);
  context.closePath();
  context.fill();
}

function getShade() {
  return `rgba(${Math.floor(Math.random()*255)},${Math.floor(Math.random()*255)},${Math.floor(Math.random()*255)},0.5)`;
}
