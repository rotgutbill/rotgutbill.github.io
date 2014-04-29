// This game shell was happily copied from Googler Seth Ladd's "Bad Aliens" game and his Google IO talk in 2011

window.requestAnimFrame = (function () {
    return window.requestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame ||
            window.oRequestAnimationFrame ||
            window.msRequestAnimationFrame ||
            function (/* function */ callback, /* DOMElement */ element) {
                window.setTimeout(callback, 1000 / 60);
            };
})();

/*
 * Asset manager.
 * Container for all 'assets' printing to the screen
 */
function AssetManager() {
    this.successCount = 0;
    this.errorCount = 0;
    this.cache = [];
    this.downloadQueue = [];
}

// downloads the queue
AssetManager.prototype.queueDownload = function (path) {
    console.log(path.toString());
    this.downloadQueue.push(path);
}

// returns truethy if the download is finished.
AssetManager.prototype.isDone = function () {
    return (this.downloadQueue.length == this.successCount + this.errorCount);
}

// downloads all assets.
AssetManager.prototype.downloadAll = function (callback) {
    if (this.downloadQueue.length === 0) window.setTimeout(callback, 100);
    for (var i = 0; i < this.downloadQueue.length; i++) {
        var path = this.downloadQueue[i];
        var img = new Image();
        var that = this;
        img.addEventListener("load", function () {
            console.log("dun: " + this.src.toString());
            that.successCount += 1;
            if (that.isDone()) { callback(); }
        });
        img.addEventListener("error", function () {
            that.errorCount += 1;
            if (that.isDone()) { callback(); }
        });
        img.src = path;
        this.cache[path] = img;
    }
}

// gets the asset from the cache
AssetManager.prototype.getAsset = function(path){
    //console.log(path.toString());
    return this.cache[path];
}


function Timer() {
    this.gameTime = 0;
    this.maxStep = 0.05;
    this.wallLastTimestamp = 0;
}


Timer.prototype.tick = function() {
    var wallCurrent = Date.now();
    var wallDelta = (wallCurrent - this.wallLastTimestamp) / 1000;
    this.wallLastTimestamp = wallCurrent;
    
    var gameDelta = Math.min(wallDelta, this.maxStep);
    this.gameTime += gameDelta;
    return gameDelta;
}


/* 
 * canvas manager
 * 
 * It is where the events are stored,
 * stores the canvas, and initiates
 * displaying to screen.
 *
 */
function GameEngine() {
    this.entities = [];
    this.ctx = null;
    this.click = null;
    this.mouse = null;
    this.wheel = null;
    this.surfaceWidth = null;
    this.surfaceHeight = null;

    // stores all the keyboard inputs
    this.keys = {
        a: 0, s: 0, d: 0, w: 0, space: false,
        shift: false, q: 0, e: 0, tab: false, zero: false,
        one: false, two: false, three: false, four: false, five: false,
        six: false, seven: false, eight: false, nine: false, o: false, i:false
    };

    // timer variables.
    this.timer = new Timer();
    this.lastTime = this.timer.gameTime - this.timer.maxStep;
}

// initializes the canvas manager
GameEngine.prototype.init = function (ctx) {
    this.ctx = ctx;
    this.surfaceWidth = this.ctx.canvas.width;
    this.surfaceHeight = this.ctx.canvas.height;
    this.startInput();

    console.log('game initialized');
}

// Starts the game.
GameEngine.prototype.start = function () {
    console.log("starting game");
    var that = this;
    (function gameLoop() {
        that.loop();
        requestAnimFrame(gameLoop, that.ctx.canvas);
    })();
}

// loads all the input listeners.
GameEngine.prototype.startInput = function () {
    console.log('Starting input');

    // returns x and y coordinates of the event.
    var getXandY = function (e) {
        var x = e.clientX - that.ctx.canvas.getBoundingClientRect().left;
        var y = e.clientY - that.ctx.canvas.getBoundingClientRect().top;

        // x is less than 1024 
        if (x < 1024) {
            x = Math.floor(x / 32);
            y = Math.floor(y / 32);
        }

        return { x: x, y: y };
    }

    var that = this;  // that is this

    // mouse click listener
    this.ctx.canvas.addEventListener("click", function (e) {
        that.click = getXandY(e);
        e.preventDefault();
    }, false);

    // mouse move listener
    this.ctx.canvas.addEventListener("mousemove", function (e) {
        that.mouse = getXandY(e);
        e.preventDefault();
    }, false);

    // mouse wheel listener
    this.ctx.canvas.addEventListener("mousewheel", function (e) {
        that.wheel = e;
        e.preventDefault();
    }, false);

    this.ctx.canvas.addEventListener('keydown', function (e) {
        console.log("Keydown");
        switch (String.fromCharCode(e.which)) {
            case 'a': that.keys.a = -5; break;
            case 's': that.keys.s = 5; break;
            case 'd': that.keys.d = 5; break;
            case 'w': that.keys.w = -5; break;
            case ' ': that.keys.space = true; break;
            case 'q': that.keys.q = 0; break; 
            case 'e': that.keys.e = 0; break;
            
        }
        e.preventDefault();
    }, false);

    this.ctx.canvas.addEventListener('keyup', function (e) {
        console.log(e.keyCode);
        switch (String.fromCharCode(e.which)) {
            case 'a': that.keys.a = 0; break;
            case 's': that.keys.s = 0; break;
            case 'd': that.keys.d = 0; break;
            case 'w': that.keys.w = 0; break;
            case ' ': that.keys.space = false; break;
            case 'q': that.keys.q = 0; break;
            case 'e': that.keys.e = 0; break;
        }
        e.preventDefault();
    }, false);

    this.ctx.canvas.addEventListener('keypress', function (e) {
        switch (String.fromCharCode(e.which)) {
            case '0': break;
            case '1':  break;
            case '2':  break;
            case '3':  break;
            case '4': break;
            case '5': break;
            case '6': break;
            case '7': break;
            case '8': break;
            case '9': break;
            case '\t': break;
            case 'i': break;
            case 'o': break;
        }
        e.preventDefault();
    }, false);
    console.log('Input started');
}

// finds and returns the entities of all collisions involving the entity.
GameEngine.prototype.collisions = function (entity) {
   
    // loop thru the entities list
    for (var i = 0; i < this.entities.length; i++) {
        // if they have collided with anything addit it to the collide list.
        if (entity != this.entities[i] && entity.collisionCheck(this.entities[i])) {
            return true;
        }
    }
    return false;
}

// adds the entity to the Game Eng. (Asset mngr)
GameEngine.prototype.addEntity = function (entity) {
    console.log('added entity');
    this.entities.push(entity);
}

//  draws the entities on the canvas
GameEngine.prototype.draw = function (drawCallback) {
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    this.ctx.save();
    for (var i = 0; i < this.entities.length; i++) {
        this.entities[i].draw(this.ctx);
    }
    if (drawCallback) {
        drawCallback(this);
    }
    this.ctx.restore();
}

// forces updates of the entities.
GameEngine.prototype.update = function () {
    var entitiesCount = this.entities.length;

    for (var i = 0; i < entitiesCount; i++) {
        var entity = this.entities[i];

        if (!entity.removeFromWorld) {
            entity.update();
        }
    }

    for (var i = this.entities.length - 1; i >= 0; --i) {
        if (this.entities[i].removeFromWorld) {
            this.entities.splice(i, 1);
        }
    }
}

// calls updae and draw,
// sets click and wheel to null
GameEngine.prototype.loop = function () {
    this.update();
    this.timer.tick();
    // limites the drawing to a steady pace linked to the game timer.
    if (this.lastTime + this.timer.maxStep <= this.timer.gameTime) {
        this.draw();
        this.lastTime = this.timer.gameTime;
    }
    this.click = null;
    this.wheel = null;
}

// Entity 'Class'
// container for a drawable object
function Entity(game, x, y, collide) {
    this.game = game;
    this.x = x;
    this.y = y;
    // all the collision detection information
    if (collide) {
        this.collide = collide;
    } else {
        this.collide = { radius: 0, width: 0, height: 0 };
    }
    this.removeFromWorld = false;
}

// returns true if no collision has happened.
// else returns false.
Entity.prototype.collisionCheck = function (entity) {

    var y_delta = this.y - entity.y;
    var x_delta = this.x - entity.x;

    // if this.collide.radius === -10 than its the game board and we will check bounds.
    if (entity.collide.radius === -10) {
        if (this.x - this.collide.width > entity.x + entity.line * 2 && 
            this.x + this.collide.width < entity.x + entity.collide.width &&
            this.y + this.collide.height < entity.y + entity.collide.height &&
            this.y - this.collide.height > entity.y + entity.line * 2) {
            return false; // not colliding with the boundary.
        } else {
            return true; // else we are outside the boundary.
        }
      // if the entity has a radius larger than zero then apply 
    } else if (entity.collide.radius > 0) {
        if (Math.sqrt((x_delta * x_delta) + (y_delta * y_delta)) < 20) {
            return true;
        } else { // else check if via the sqaure check method.
            return false;
        }
    } else if (Math.abs(x_delta) <= this.collide.width + entity.collide.width && 
               Math.abs(y_delta) <= this.collide.height + entity.collide.height) {
        return true;
    }
    // else return false.
    return false;

}

// default updates the entity. 
Entity.prototype.update = function () {
}

// default draw function
Entity.prototype.draw = function (ctx) {
    if (this.game.showOutlines && this.radius) {
        ctx.beginPath();
        ctx.strokeStyle = "green";
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
        ctx.stroke();
        ctx.closePath();
    }
}

// rotates the image and returns a canvas with the newly
// rotated image.  the 'offscreenCanvas' can be treated like any other image.
Entity.prototype.rotateAndCache = function (image, angle) {
    var offscreenCanvas = document.createElement('canvas');
    var size = Math.max(image.width, image.height);
    offscreenCanvas.width = size;
    offscreenCanvas.height = size;
    var offscreenCtx = offscreenCanvas.getContext('2d');
    offscreenCtx.save();
    offscreenCtx.translate(size / 2, size / 2);
    offscreenCtx.rotate(angle);
    offscreenCtx.translate(0, 0);
    offscreenCtx.drawImage(image, -(image.width / 2), -(image.height / 2));
    offscreenCtx.restore();
    //offscreenCtx.strokeStyle = "red";
    //offscreenCtx.strokeRect(0,0,size,size);
    return offscreenCanvas;
}

// GameBoard code below
// this could be the floor, or the background, or
// an actual game board depending on the game.
// it is what the game plays off of .  I.E the 'gameboard'
function GameBoard() {
    this.width = 780;
    this.height = 580;
    this.line = 10;
    Entity.call(this, null, 0, 0, { radius: -10, width: this.width, height: this.height });
}

// gameboard is an entity
GameBoard.prototype = new Entity();
GameBoard.prototype.constructor = GameBoard;

// updates the game board
GameBoard.prototype.update = function () {
    Entity.prototype.update.call(this);
}

// draws the game board
GameBoard.prototype.draw = function (ctx) {

    ctx.strokeStyle = "#FF0808";
    ctx.lineWidth = this.line;
    ctx.strokeRect(this.line + 3, this.line + 3, this.width - 4, this.height - 4);

}

function Player(game, x, y, color) {
    this.width = 780;
    this.height = 580;
    this.line = 5;
    this.color = color;
    Entity.call(this, game, x, y, { radius: 10, width: 10, height: 10 });
}


// gameboard is an entity
Player.prototype = new Entity();
Player.prototype.constructor = Player;

// updates the game board
Player.prototype.update = function () {
    
    this.x += this.game.keys.d; // + this.game.keys.d);
    this.y += this.game.keys.s; // + this.game.keys.s);

    // console.log(this.x + " " + this.y);

    Entity.prototype.update.call(this);
}

// draws the game board
Player.prototype.draw = function (ctx) {

    ctx.beginPath();
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 3;
    ctx.arc(this.x, this.y, this.collide.radius, 0, Math.PI * 2, false);
    ctx.stroke();
    ctx.closePath();
}

function Npc(game, x, y, color) {
    // selects a direction randomly up, down, left, right -> 0-3 respectively.
    this.direction = Math.round(Math.random() * 100) % 4;
    this.roaming = 0;
    this.color = color;

    this.changeDir = false;

    this.x_delta = (Math.round(Math.random() * 100) % 2) - 1;
    this.y_delta = (Math.round(Math.random() * 100) % 2) - 1;

    // entity 
    Entity.call(this, game, x, y, { radius: 10, width: 10, height: 10 });
}

// gameboard is an entity
Npc.prototype = new Entity();
Npc.prototype.constructor = Npc;

// updates the game board
Npc.prototype.update = function () {

    this.x_delta = (Math.round(Math.random() * 100) % 2) - 1;
    this.y_delta = -(Math.round(Math.random() * 100) % 2) - 1;

    if (this.changeDir) {
        this.x -= this.x_delta;
        this.y -= this.y_delta;
    } else {
        this.x += this.x_delta;
        this.y += this.y_delta;
    }


    /************  NOTE: make collisions return a integer so that better action can ************** 
    *************        be taken then convert this to a switch and adjust only the **************
    *************        values that simulate a bouce off                           **************/
    if (this.game.collisions(this)) {
        this.changeDir = !this.changeDir;
        if (this.changeDir) {
            this.x -= this.x_delta;
            this.y -= this.y_delta;
        } else {
            this.x += this.x_delta;
            this.y += this.y_delta;
        }
     }

    Entity.prototype.update.call(this);
}

// draws the game board
Npc.prototype.draw = function (ctx) {

    ctx.beginPath();
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 3;
    ctx.arc(this.x, this.y, this.collide.radius, 0, Math.PI * 2, false);
    ctx.stroke();
    ctx.closePath();
}

// the "main" code begins here

var ASSET_MANAGER = new AssetManager();

ASSET_MANAGER.downloadAll(function () {
    console.log("starting up da sheild");
    var canvas = document.getElementById('gameWorld');
    var ctx = canvas.getContext('2d');

    var gameEngine = new GameEngine();
    var gameboard = new GameBoard();
    
    gameEngine.addEntity(gameboard);
    gameEngine.addEntity(new Npc(gameEngine, 450, 400, "green"));
    gameEngine.addEntity(new Npc(gameEngine, 470, 400, "white"));
    gameEngine.addEntity(new Player(gameEngine, 40, 40, "red"));

    gameEngine.init(ctx);
    canvas.focus();
    gameEngine.start();
});
