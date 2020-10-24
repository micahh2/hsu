
export class Camera {
  static setCanvasResolution(canvas, canvasWidth, canvasHeight) {

    // Set the new rounded size
    canvas.style.width = canvasWidth;
    canvas.style.height = canvasHeight;
    // Set the resolution
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
  }
  // This is used when initializing the game world and should only be called once
  static getCanvasData(canvas) {
    const bounds = canvas.getBoundingClientRect();
    const ratio = bounds.width/bounds.height;
    const canvasWidth = Math.round(bounds.width);
    const canvasHeight = Math.round(bounds.height);
    const context = canvas.getContext('2d');

    return { context, bounds, ratio, canvasWidth, canvasHeight };
  }
  static getContextPixels({ context, canvasWidth, canvasHeight }) {
    const imageData = context.getImageData(0, 0, canvasWidth, canvasHeight)
    const allAlpha = imageData.data
      .filter((_, index) => (index+1) % 4 === 0);
    const pixels = {};

    // Split them into the map for faster access
    for(let i = 0; i < imageData.height; i++) {
      let start = i*imageData.width;
      const slice = allAlpha.slice(start, start+imageData.width);
      if (slice.every(t => t === 0)) { continue; }
      pixels[i] = Uint8Array.from(allAlpha.slice(start, start+imageData.width));
    }
    return pixels;
  }
}
