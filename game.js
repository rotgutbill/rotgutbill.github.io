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

function Animation(spriteSheet, startX, startY, frameWidth, frameHeight, frameDuration, frames, loop, reverse) {
    this.spriteSheet = spriteSheet;
    this.startX = startX;
    this.startY = startY;
    this.frameWidth = frameWidth;
    this.frameDuration = frameDuration;
    this.frameHeight = frameHeight;
    this.frames = frames;
    this.totalTime = frameDuration*frames;
    this.elapsedTime = 0;
    this.loop = loop;
    this.reverse = reverse;
}

Animation.prototype.drawFrame = function (tick, ctx, x, y, scaleBy) {
    var scaleBy = scaleBy || 1;
    this.elapsedTime += tick;
    if (this.loop) {
        if (this.isDone()) {
            this.elapsedTime = 0;
        }
    } else if (this.isDone()) {
        return;
    }
    
    var index = this.currentFrame();
    var vindex = 0;
    
    if ((index+1) * this.frameWidth + this.startX > this.spriteSheet.width) {
        index -= Math.floor((this.spriteSheet.width - this.startX) / this.frameWidth);
        vindex++;
    }
    while ((index + 1) * this.frameWidth > this.spriteSheet.width) {
        index -= Math.floor(this.spriteSheet.width / this.frameWidth);
        vindex++;
    }
    
    
    var locX = x;
    var locY = y;
    ctx.drawImage(this.spriteSheet,
                  index * this.frameWidth, vindex*this.frameHeight + this.startY,  // source from sheet
                  this.frameWidth, this.frameHeight,
                  locX, locY,
                  this.frameWidth * scaleBy,
                  this.frameHeight * scaleBy);
}

Animation.prototype.currentFrame = function () {
    return Math.floor(this.elapsedTime / this.frameDuration);
}

Animation.prototype.isDone = function () {
    return (this.elapsedTime >= this.totalTime);
}

function Timer() {
    this.gameTime = 0;
    this.maxStep = 0.05;
    this.wallLastTimestamp = 0;
}

Timer.prototype.tick = function () {
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
    
}

// initializes the canvas manager
GameEngine.prototype.init = function (ctx) {
    this.ctx = ctx;
    this.surfaceWidth = this.ctx.canvas.width;
    this.surfaceHeight = this.ctx.canvas.height;
    this.startInput();
    this.timer = new Timer();
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

        
        return { x: x, y: y };
    }

    var that = this;  // that is this

    // mouse click listener
    this.ctx.canvas.addEventListener("click", function (e) {
        that.click = getXandY(e);
    }, false);

    // mouse move listener
    this.ctx.canvas.addEventListener("mousemove", function (e) {
        that.mouse = getXandY(e);
    }, false);

    // mouse wheel listener
    this.ctx.canvas.addEventListener("mousewheel", function (e) {
        that.wheel = e;
    }, false);
    
    keyState = {};
    window.addEventListener('keydown',function(e){
        keyState[e.keyCode || e.which] = true;
    },true);

    window.addEventListener('keyup',function(e){
        keyState[e.keyCode || e.which] = false;
    },true);


    console.log('Input started');
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
    this.clockTick = this.timer.tick();
    this.update();
    this.draw();
    //this.forward = null;
    this.click = null;
    this.wheel = null;
    this.forward = null;
    this.backward = null;
    this.left = null;
    this.right = null;
}

// Entity 'Class'
// container for a drawable object
function Entity(game, x, y) {
    this.game = game;
    this.x = x;
    this.y = y;
    this.removeFromWorld = false;
}

// default updates the entity. 
Entity.prototype.update = function () {
}

// default draw function
Entity.prototype.draw = function (ctx) {
    
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

function Bullet (game, entity) {
    this.x = entity.x + 12;
    this.y = entity.y + 22;
    this.initialX = this.x;
    this.initialY = this.y;
    this.endx = game.mouse.x;
    this.endy = game.mouse.y;
    this.speed = 5;
    this.radius = 3;
    this.boundingbox = new BoundingBox(this.x - this.radius, this.y - this.radius, 2 * this.radius, 2 * this.radius);
    Entity.call(this, game, this.x, this.y);
    //this.speed = entity.gun.speed;
    
}
Bullet.prototype = new Entity();
Wulf.prototype.constructor = Bullet;


Bullet.prototype.update = function () {
    //var slope = ((this.endy - this.y)/(this.endx - this.x));
    var magnitude = Math.sqrt(Math.pow((this.endx - this.initialX), 2) + Math.pow((this.endy - this.initialY), 2));
    this.boundingbox.left = this.boundingbox.left + (this.endx - this.initialX) / magnitude * this.speed;
    this.boundingbox.right = this.boundingbox.left + this.boundingbox.width;
    this.boundingbox.top = this.boundingbox.top + (this.endy - this.initialY) / magnitude * this.speed;
    this.boundingbox.bottom = this.boundingbox.top + this.boundingbox.height;
    for (var i = 0; i < this.game.walls.length; i++) {
           
        var pf = this.game.walls[i];
        if (this.boundingbox.collide(pf.boundingbox) && pf !== this) 	{

            var type = pf.type;
            switch(type){
                case "enemy":
                    pf.removedfromorld = true;
                case "wall":
                    this.boundingbox.top = this.y - this.radius;
                    this.boundingbox.bottom = this.boundingbox.top + this.boundingbox.height;
                    this.boundingbox.left = this.x - this.radius;
                    this.boundingbox.right = this.boundingbox.left + this.boundingbox.width;
                    //this.removeFromWorld = true;
                    //this.boundingbox.removeFromorld = true;
                    break;
            }
        } else {
            this.x = this.boundingbox.left + this.radius;
            this.y = this.boundingbox.top + this.radius;
        }
    } 
    
}
Bullet.prototype.draw = function (ctx) {
    ctx.fillStyle = "blue";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI, false);
    ctx.fill();
    
    ctx.strokeStyle = "green";
    ctx.strokeRect(this.boundingbox.left, this.boundingbox.top, this.boundingbox.width, this.boundingbox.height);
}

function Frank (game, wulf) {
    this.backwardsAnimation = new Animation(ASSET_MANAGER.getAsset("./img/frankenzombie.png"), 0, 0, 32, 49, 0.2, 4, true, false);
    this.leftAnimation = new Animation(ASSET_MANAGER.getAsset("./img/frankenzombie.png"), 0, 46, 32, 49, 0.2, 4, true, false);
    this.rightAnimation = new Animation(ASSET_MANAGER.getAsset("./img/frankenzombie.png"), 0, 95, 32, 49, 0.2, 4, true, false);
    this.forwardAnimation = new Animation(ASSET_MANAGER.getAsset("./img/frankenzombie.png"), 0, 142, 32, 49, 0.2, 4, true, false);
    
    
    
    this.x = 200;
    this.y = 0;
    this.wulf = wulf;
    this.type = "enemy";
    this.boundingbox = new BoundingBox(this.x, this.y, 25, 50);
    
    Entity.call(this, game, this.x, this.y);
    
    
}

Frank.prototype = new Entity();
Frank.prototype.constructor = Frank;

Frank.prototype.update = function() {
    var speed = 100 * this.game.clockTick;
    if(this.x < this.wulf.x) {
        this.boundingbox.left = this.boundingbox.left + speed;
        this.boundingbox.right = this.boundingbox.right + speed;
        this.right = true;
        this.left = false;
    } else if (this.x > this.wulf.x) {
        this.boundingbox.left = this.boundingbox.left - speed;
        this.boundingbox.right = this.boundingbox.right - speed;
        this.right = false;
        this.left = true;
    }
    
    if(this.y < this.wulf.y) {
        this.boundingbox.top = this.boundingbox.top + speed;
        this.boundingbox.bottom = this.boundingbox.bottom + speed;
        this.forward = true; 
        this.backwards = false;
    } else if (this.y > this.wulf.y) {
        
        this.boundingbox.top = this.boundingbox.top - speed;
        this.boundingbox.bottom = this.boundingbox.bottom - speed;
        this.forward = false;
        this.backwards = true;
    }
    
    for (var i = 0; i < this.game.walls.length; i++) {
           
        var pf = this.game.walls[i];
        if (this.boundingbox.collide(pf.boundingbox)) 	{

            var type = pf.type;
            switch(type){
                case "player":
                    
                    
                case "wall":
                    console.log("hi");
                    this.boundingbox.top = this.y;
                    this.boundingbox.bottom = this.boundingbox.top + this.boundingbox.height;
                    this.boundingbox.left = this.x;
                    this.boundingbox.right = this.boundingbox.left + this.boundingbox.width;
                    break;
            }
        } else {
            console.log("ho");
            this.y = this.boundingbox.top;
            this.x = this.boundingbox.left;
        }
    } 
}

Frank.prototype.draw = function(ctx) {
    
    if (this.forward) {
        this.forwardAnimation.drawFrame(this.game.clockTick, ctx, this.x, this.y);
        this.lastAnimation = this.forwardAnimation;
    } else if (this.backwards) {
        this.backwardsAnimation.drawFrame(this.game.clockTick, ctx, this.x, this.y);
        this.lastAnimation = this.backwardsAnimation;
    } else if (this.right) {
        this.rightAnimation.drawFrame(this.game.clockTick, ctx, this.x, this.y);
        this.lastAnimation = this.rightAnimation;
    } else if (this.left) {
        this.leftAnimation.drawFrame(this.game.clockTick, ctx, this.x, this.y);
        this.lastAnimation = this.leftAnimation;
    } else {
        this.forwardAnimation.drawFrame(this.game.clockTick, ctx, this.x, this.y);
    }
    
    ctx.strokeStyle = "green";
    ctx.strokeRect(this.boundingbox.left, this.boundingbox.top, this.boundingbox.width, this.boundingbox.height);
    
    
}

function Inventory(game){
    this.items = [];
}

function Wall(game, x, y){
    this.game = game;
    this.x = x;
    this.y = y;
    this.removeFromWorld = false;
    this.boundingbox = new BoundingBox(x, y, 40, 40); 
    this.type = "wall";
}

Wall.prototype = new Entity();
Wall.prototype.constructor = Wall;

Wall.prototype.draw = function(ctx){
    ctx.drawImage(ASSET_MANAGER.getAsset("./img/tileset_base.png"),128, 128, 
    30, 30, this.x, this.y, 40, 40)
        ctx.strokeStyle = "green";
    ctx.strokeRect(this.boundingbox.left, this.boundingbox.top, this.
            boundingbox.width, this.boundingbox.height);
}

function Goodie(game, x, y){
    this.game = game;
    this.x = x;
    this.y = y;
    this.removeFromWorld = false;
    this.boundingbox = new BoundingBox(x, y, 40, 40); 
    this.type = "goodie"
}

Goodie.prototype = new Entity();
Goodie.prototype.constructor = Goodie;

Goodie.prototype.draw = function(ctx){
    ctx.drawImage(ASSET_MANAGER.getAsset("./img/tileset_base.png"),128, 0, 
    30, 30, this.x, this.y, 40, 40)
        ctx.strokeStyle = "green";
    ctx.strokeRect(this.boundingbox.x, this.boundingbox.y, this.
            boundingbox.width, this.boundingbox.height);
}


function Wulf (game) {
    this.idleAnimation = new Animation (ASSET_MANAGER.getAsset("./img/Wulf.png"), 0, 0, 32, 49, 0.2, 1, false, false);
    this.backwardsAnimation = new Animation(ASSET_MANAGER.getAsset("./img/Wulf.png"), 0, 0, 32, 49, 0.2, 4, true, false);
    this.leftAnimation = new Animation(ASSET_MANAGER.getAsset("./img/Wulf.png"), 0, 46, 32, 49, 0.2, 4, true, false);
    this.rightAnimation = new Animation(ASSET_MANAGER.getAsset("./img/Wulf.png"), 0, 95, 32, 49, 0.2, 4, true, false);
    this.forwardAnimation = new Animation(ASSET_MANAGER.getAsset("./img/Wulf.png"), 0, 142, 32, 49, 0.2, 4, true, false);
    this.lastAnimation = this.forwardAnimation;
    this.moving = false;
    this.centerX = 0;
    this.centerY = 0;
    this.boundingbox = new BoundingBox(this.centerX, this.centerY, 25, 50);
    this.inventory = new Inventory(game);
    this.type = "player";
    Entity.call(this, game, 0, 0);
    
}
Wulf.prototype = new Entity();
Wulf.prototype.constructor = Wulf;

//stack overflow suggestion on saving the key state.
Wulf.prototype.update = function () {
    var speed = 150  * this.game.clockTick;;
	var bump = false;
    if (keyState['W'.charCodeAt(0)]) {
        this.forward = true;
        this.moving = true;
	   //check for top of frame
	if(this.y > 0) {
            this.boundingbox.top = this.boundingbox.top - speed;
            this.boundingbox.bottom = this.boundingbox.bottom - speed;
        }
        
           
    } else {
        this.forward = false;
    }
    
    if (keyState['A'.charCodeAt(0)]) {
        this.left = true;
        this.moving = true;
	if (this.x > 0)  {
            this.boundingbox.left = this.boundingbox.left - speed;
            this.boundingbox.right = this.boundingbox.right - speed;
        }

    } else {
        this.left = false;
    }
    
    if (keyState['D'.charCodeAt(0)]) {
       this.right = true;
       this.moving = true;
       if (this.x < 775)  {
           this.boundingbox.left = this.boundingbox.left + speed;
           this.boundingbox.right = this.boundingbox.right + speed;
       }

    } else {
        this.right = false;
    }
    
    if (keyState['S'.charCodeAt(0)]) {
        this.backwards = true;
        this.moving = true;
	if (this.y < 750) {
            
            this.boundingbox.top = this.boundingbox.top + speed;
            this.boundingbox.bottom = this.boundingbox.bottom + speed;
        }

    } else {
        this.backwards = false;
    }
    
    if (keyState[' '.charCodeAt(0)]) {
        var bullet = new Bullet(this.game, this);
        this.game.addEntity(bullet);
    } else {
        
    }
    
    if (this.backwards === false && this.forward === false && this.left === false && this.right === false) {
        this.moving = false;
    }
//=======================================================	
	//collision detection
//=======================================================
    
	for (var i = 0; i < this.game.walls.length; i++) {
           
            var pf = this.game.walls[i];
            if (this.boundingbox.collide(pf.boundingbox) ) 	{
                
                var type = pf.type;
                switch(type){
                    
                case "player":
                case "wall":
                    this.boundingbox.top = this.y;
                    this.boundingbox.bottom = this.boundingbox.top + this.boundingbox.height;
                    this.boundingbox.left = this.x;
                    this.boundingbox.right = this.boundingbox.left + this.boundingbox.width;
                    break;

                case "goodie":
                    this.inventory.items.push("sack");
                    pf.removeFromWorld = true;

                    break;
                        
                        
                }
                
               
            } else {
                this.y = this.boundingbox.top;
                this.x = this.boundingbox.left;
            }
        }
    
	
	   
    //var duration = this.forwardAnimation.elapsedTime + this.game.clockTick;
}

Wulf.prototype.draw = function(ctx) {
    
    if (this.forward) {
        this.forwardAnimation.drawFrame(this.game.clockTick, ctx, this.x, this.y);
        this.lastAnimation = this.forwardAnimation;
    } else if (this.backwards) {
        this.backwardsAnimation.drawFrame(this.game.clockTick, ctx, this.x, this.y);
        this.lastAnimation = this.backwardsAnimation;
    } else if (this.right) {
        this.rightAnimation.drawFrame(this.game.clockTick, ctx, this.x, this.y);
        this.lastAnimation = this.rightAnimation;
    } else if (this.left) {
        this.leftAnimation.drawFrame(this.game.clockTick, ctx, this.x, this.y);
        this.lastAnimation = this.leftAnimation;
    } else {
        this.lastAnimation.drawFrame(this.game.clockTick, ctx, this.x, this.y);
    }
    
    ctx.strokeStyle = "green";
    ctx.strokeRect(this.boundingbox.left, this.boundingbox.top, this.boundingbox.width, this.boundingbox.height);
    
    
}
// GameBoard code below
// this could be the floor, or the background, or
// an actual game board depending on the game.
// it is what the game plays off of .  I.E the 'gameboard'

function BoundingBox(x, y, width, height) { 
    this.width = width;
    this.height = height;

    this.left = x;
    this.top = y;
    this.right = this.left + width;
    this.bottom = this.top + height;
}

BoundingBox.prototype.collide = function (oth) {
    if (this.right > oth.left && this.left < oth.right && this.top < oth.bottom && this.bottom > oth.top) return true;
    return false;
}

function GameBoard() {

    Entity.call(this, null, 0, 0);
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

	for (var i = 0; i < 20; i++) {
            for (var j = 0; j < 20; j++) {
		ctx.drawImage(ASSET_MANAGER.getAsset("./img/tileset_base.png"),0, 0, 30, 30, i * 40, j * 40, 40, 40);
            }
	}
}

// the "main" code begins here

var ASSET_MANAGER = new AssetManager();
ASSET_MANAGER.queueDownload("./img/Wulf.png");
ASSET_MANAGER.queueDownload("./img/tileset_base.png");
ASSET_MANAGER.queueDownload("./img/frankenzombie.png");


ASSET_MANAGER.downloadAll(function () {
    console.log("starting up da sheild");
    var canvas = document.getElementById('gameWorld');
    var ctx = canvas.getContext('2d');

    var gameEngine = new GameEngine();
    var gameboard = new GameBoard();


    var goodie = new Goodie(gameEngine, 300, 300);
    var wulf = new Wulf(gameEngine);
    var frank = new Frank(gameEngine, wulf);
    var walls = [];
    var wall = new Wall(gameEngine, 128, 128);
    walls.push(wall);
    walls.push(goodie);
    walls.push(frank);
    walls.push(wulf);
    gameEngine.addEntity(gameboard);
    gameEngine.addEntity(wulf);
    gameEngine.addEntity(goodie);
    gameEngine.addEntity(frank);
    gameEngine.walls = walls;
    
    for (var i = 0; i < gameEngine.walls.length; i ++){
        gameEngine.addEntity(walls[i]);
        console.log(walls[i].type);
    }
 
    gameEngine.init(ctx);
    gameEngine.start();
});
