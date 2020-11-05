<!-- # index.html -->

The whole application starts in index.html. It is a relatively small html file that sets the overall structure of the game and names the other initial files to bring in.

Below is a simplified version of the index.html
    <html>
        <head>
            <title>Hochschule Ulm</title>
            <link href="main.css" rel="stylesheet" /> 
        </head>
        <body>
            <div id="images">
                <img id="character-sprite" src="assets/charBatch1_sprite.png">
            </div>
            <div id="stage">
                <canvas id="objects-layer"></canvas>
                <canvas id="layout-layer"></canvas>
            </div>
        </body>
        <script type="module" src="main.js"></script>
    </html>

Index.html does three main things:

1. Loads images to be referenced later
1. Loads javascript/css (main.js & main.css)
1. Sets up the canvases that will be drawn on and displayed

After this file is given to the browser, main.js takes over running the show.
