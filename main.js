let player = { x: 100, y: 20, size: 5, speed: 3 };
let requestedVert;
let requestedHorz;
let frames = 0;

window.addEventListener('load', () => {
  let canvas = document.getElementById('canvas');
  let context = canvas.getContext('2d');
  let image = document.getElementById('layout');
  canvas.width = image.width;
  canvas.height = image.width;
  let ratio = image.height/image.width;
  context.drawImage(image, 0, 0, canvas.width, canvas.width*ratio);

  // Transparent pixels
  let imageData = context.getImageData(0, 0, canvas.width, canvas.height)
  let allAlpha = imageData.data
    .filter((_, index) => (index+1) % 4 === 0);
  let pixels = new Array(context.height);
  // Split them into the map for faster access
  for(let i = 0; i < imageData.height; i++) {
    let start = i*imageData.width;
    pixels[i] = allAlpha.slice(start, start+imageData.width);
  }
  // Draw initial player
  context.fillRect(player.x, player.y, player.size, player.size);
  // Start main loop
  main({ context, canvas, pixels, player });

  // Update FPS display
  setInterval(() => {
    updateFPS(frames);
    frames = 0;
  }, 1000);
});

function main({ canvas, context, pixels, player }) {
  const width = pixels[0].length;
  const height = pixels.length;
  let newPlayer = movePlayer({ player, requestedVert, requestedHorz, width, height });
  newPlayer = getUseableMove({ player, newPlayer, pixels, requestedVert, requestedHorz, width, height });

  if (player !== newPlayer) {
    // Remove old position
    context.clearRect(player.x, player.y, player.size, player.size);
    // Draw new position
    context.fillRect(newPlayer.x, newPlayer.y, player.size, player.size);
  }

  // Increment Frames
  frames++;

  // Call this function in an infinite recursive loop
  window.requestAnimationFrame(() => {
    main({ canvas, context, pixels, player: newPlayer });
  });
}

// Take all the input requests give an updated player
function movePlayer({ player, handycap, requestedVert, requestedHorz, width, height }) {
  let newPlayer = player;
  handycap = handycap || 0;
  if (requestedVert === 'up') {
    newPlayer = { ...newPlayer, y: Math.max(newPlayer.y - newPlayer.speed + handycap, 0)};
  } else if (requestedVert === 'down') {
    newPlayer = { ...newPlayer, y: Math.min(newPlayer.y + newPlayer.speed - handycap, height-newPlayer.size)};
  }
  if (requestedHorz === 'left') {
    newPlayer = { ...newPlayer, x: Math.max(newPlayer.x - newPlayer.speed + handycap, 0)};
  } else if (requestedHorz === 'right') {
    newPlayer = { ...newPlayer, x: Math.min(newPlayer.x + newPlayer.speed - handycap, width-newPlayer.size)};
  }
  return newPlayer;
}

// Returns if a player has a collision
function collision({ newPlayer, pixels }) {
  for (let i = newPlayer.x; i < newPlayer.x+newPlayer.size; i++) {
    for (let j = newPlayer.y; j < newPlayer.y+newPlayer.size; j++) {
      // IMPORTANT! Pixels are stored in rows first, then columns
      if (pixels[j][i] === 0) { continue; }
      return true;
    }
  }
  return false;
}
// Returns a "moved" player that has no collision
function getUseableMove({ player, newPlayer, requestedVert, requestedHorz, width, height, pixels }) {
  if (player === newPlayer) { return newPlayer; }

  if (!collision({ newPlayer, pixels })) {
    return newPlayer;
  }
  //debugger;
  const withoutx = { ...newPlayer, x: player.x };
  if (newPlayer.y !== player.y && newPlayer.x !== player.x && !collision({ newPlayer: withoutx, pixels })) {
    return withoutx;
  }
  const withouty = { ...newPlayer, y: player.y };
  if (newPlayer.x !== player.x && newPlayer.y !== player.y && !collision({ newPlayer: withouty, pixels })) {
    return withouty;
  }
  for (let handycap = 0; handycap < newPlayer.speed; handycap++) {
    const handycapped = movePlayer({ player, handycap, requestedVert, requestedHorz, width, height });
    if (!collision({ newPlayer: handycapped, pixels })) {
      return handycapped;
    }
  }
  return player;
}

window.addEventListener('keydown', (e) => {
  // Do nothing if event already handled
  if (event.defaultPrevented) { return; }

  switch(event.code) {
    case "KeyS":
    case "ArrowDown":
      // Handle "back"
      requestedVert = 'down';
      break;
    case "KeyW":
    case "ArrowUp":
      // Handle "forward"
      requestedVert = 'up';
      break;
    case "KeyA":
    case "ArrowLeft":
      // Handle "turn left"
      requestedHorz = 'left';
      break;
    case "KeyD":
    case "ArrowRight":
      // Handle "turn right"
      requestedHorz = 'right';
      break;
  }
});
window.addEventListener('keyup', (e) => {
  // Do nothing if event already handled
  if (event.defaultPrevented) { return; }

  switch(event.code) {
    case "KeyS":
    case "ArrowDown":
      requestedVert = null;
      break;
    case "KeyW":
    case "ArrowUp":
      requestedVert = null;
      break;
    case "KeyA":
    case "ArrowLeft":
      requestedHorz = null;
      break;
    case "KeyD":
    case "ArrowRight":
      requestedHorz = null;
      break;
  }
});

function updateFPS(fps) {
  const el = document.getElementById('fps');
  el.innerHTML = `${fps} FPS`;
}
