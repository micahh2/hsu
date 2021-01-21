<!-- # main.js -->

main.js is a ES6 javascript module. This means that it can import other scripts using the `import` keyword, and that it runs in what is known as javascript's [strict mode](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode).

main.js has two main parts, an event listener that is called when the page is loaded, and auxiliary functions that support that event listener.

**"Load" Event Listener**

When index.html hands of execution of the game to main.js, much of the page is still being loaded. The first thing that main.js does is register an event listener using [`window.addEventListener()`](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener). This event listener waits for everything in index.html to be loaded, and then calls the given anonymous function.

    window.addEventListener('load', async () => {
        // Do something when the page loads
    });

[`window`](https://developer.mozilla.org/en-US/docs/Web/API/Window) is a global variable available to *most* javascript in the browser. We avoid references to global variables outside of main.js because they don't work in NodeJS (where we execute our unit tests), and because it is important to have an organizational method of how and where the browser can be interacted with.

In essence, the 'load' event listener main.js has three responsibilities:

1. Ensure all resources are finished loading
1. Parse and configure resources (images, json) and output (canvas)
1. Start the game loops

*1. Ensure all resources are finished loading*

Since some resources depend on other resources, they have to be loaded dynamically and might not be loaded by the time the `load` event is triggered. Here we make use of a newer javascript feature called [`async/await`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function). There are a number of ways to execute multiple functions simultaneously in javascript (Note: this does NOT mean it's multi-threaded), [Promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) are simple way to have a result from something asynchronous that you can wait get later.

*2. Parse and configure resources (images, json) and output (canvas)*

Not everything structural can be defined in index.html or main.css, some information about the canvases need to be determined based on, for example, the size of images after they loaded. This step also involves some basic parsing of the sprites, scaling them to the sizes we will use.


*3. Start the game loops*

We have two game loops, one for the Story and one for the Physics. Both are not "proper" `while` or `for` loops but instead functions that are called repetitively, or messages that are passed back-and-forth in a cycle.

The physics loop is recursive, calling it self using [`window.requestAnimationFrame`](https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame). It has two current jobs:

- Update the game state to the next state (one "tick")
- Display the new state on screen

The story loop runs in its own thread. It only has one job: evaluate the game logic and create updates. 
The story loop is started by sending an 'update-game-state' message to the [storyWorker](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers).
The story worker uses the updated game state to create changes, and passes those changes back to an event handler in main.js. The main.js event-handler applies those changes to the current state (using Story.applyChanges) and sends the newly updated state back to the story worker with 'update-game-state'. This goes on in a cycle until the game ends.

**Auxiliary Event Listeners and Functions**

There are a few auxiliary event listeners, and functions that are used to support them. Including two very important event listeners, which handle keyboard events: 

- [`keydown`](https://developer.mozilla.org/en-US/docs/Web/API/Document/keydown_event)
- [`keyup`](https://developer.mozilla.org/en-US/docs/Web/API/Document/keyup_event)

There are also some functions for updating on-screen statistics and parts of the general UI.


