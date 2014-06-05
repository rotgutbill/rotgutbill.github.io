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
return (this.downloadQueue.length === this.successCount + this.errorCount);}

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
                  index * this.frameWidth+ this.startX, vindex*this.frameHeight + this.startY,  // source from sheet
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
function GameEngine(HTMLscore) {
    this.entities = [];
    this.ctx = null;
    this.click = null;
    this.mouse = null;
    this.wheel = null;
    this.surfaceWidth = null;
    this.surfaceHeight = null;
    this.score = 0;
    this.running = false;
    this.isDialog = false;

    this.HTMLscore = HTMLscore;
    this.HTMLscore.innerHTML = "Score: " + this.score;
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

GameEngine.prototype.generateMap = function (width, height) {

    var that = this;
    // this is currently a static map.  a random generator may be replaced here.
    var addWall = function (x, y, endx, endy) {
        var wall;
        // start and end x are the same 
        if (x === endx) {
            // it is a vertical line
            for (var i = y; i < endy; i++) {
                wall = new Wall(that, x * 40, i * 40);
                that.walls.push(wall);
                that.addEntity(wall);
            }
            // if start and end y are the same
        } else if (y === endy) {
            // horizonal line.
            for (var i = x; i < endx; i++) {
                wall = new Wall(that, i * 40, y * 40);
                that.walls.push(wall);
                that.addEntity(wall);
            }
            // idk what to do right now.
        } else {
            console.log("invalid wall segment");
        }
    }

	for (var i = 0; i < 40; i+=20) {
		for (var j = 0; j < 40; j+=20) {
		
			// add the walls
			// stand alone walls
			addWall(4 + i, 0 + j, 4 + i, 8 + j);
			addWall(12 + i, 0 + j, 12 + i, 5 + j);
			addWall(17 + i, 9 + j, 20 + i, 9 + j);

    // L walls
			addWall(0 + i, 15 + j, 4 + i, 15 + j);
			addWall(4 + i, 10 + j, 4 + i, 16 + j);
			addWall(10 + i, 13 + j, 10 + i, 20 + j);
			addWall(8 + i, 13 + j, 10 + i, 13 + j);
			addWall(13 + i, 13 + j, 13 + i, 20 + j);
			addWall(16 + i, 13 + j, 20 + i, 13 + j);
			addWall(12 + i, 7 + j, 12 + i, 9 + j);
			addWall(12 + i, 9 + j, 15 + i, 9 + j);

			// add some random stuff

		}
	}
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
    if (!this.running){
        this.entities[0].draw(this.ctx);
    }
    else{
        for (var i = 1; i < this.entities.length; i++) {
        this.entities[i].draw(this.ctx);
    }
    }
    if (drawCallback) {
        drawCallback(this);
    }
    this.ctx.restore();
}

// forces updates of the entities.
GameEngine.prototype.update = function () {
    var entitiesCount = this.entities.length;
    this.entities[0].update();
    for (var i = 1; i < entitiesCount; i++) {
        var entity = this.entities[i];
        if ((!entity.removeFromWorld && this.running)) entity.update();
    }
    // updating screen coordinates
    // user user x and y and the screenx and screeny
    // to determine if the user has moved outside the motion box
    // if they have moved outside the bounding box update the screenx and screeny
    // else keep it the same.
    // update x screen coordinate
    if (this.user.x < this.screenDims.x + this.screenDims.motionbox.left) {
        this.screenDims.x = Math.max(this.user.x - this.screenDims.motionbox.left, 0);
    } else if (this.user.x > this.screenDims.x + this.screenDims.motionbox.right) {
        this.screenDims.x = Math.min(this.user.x - this.screenDims.motionbox.right, this.mapDims.w - this.screenDims.w);
    } 

    // update y screen coordinate
    if (this.user.y < this.screenDims.y + this.screenDims.motionbox.top) {
        this.screenDims.y = Math.max(this.user.y - this.screenDims.motionbox.top, 0);
    } else if (this.user.y > this.screenDims.y + this.screenDims.motionbox.bottom) {
        this.screenDims.y = Math.min(this.user.y - this.screenDims.motionbox.bottom, this.mapDims.h - this.screenDims.h);
    }

    for (var i = this.entities.length - 1; i >= 0; --i) {
        if (this.entities[i].removeFromWorld) {
            this.entities.splice(i, 1);
            for(var j = 0; j < this.walls.length; j++){
                if(this.walls[j].removeFromWorld){
                    this.walls.splice(j,1);
                }
            }
        }
    }

    this.HTMLscore.innerHTML = "Score: " + this.score;

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
    //this.type = "Entity";
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
    this.endx = game.mouse.x + game.screenDims.x;
    this.endy = game.mouse.y + game.screenDims.y;
    this.speed = 5;
    this.radius = 3;
    this.boundingbox = new BoundingBox(this.x - this.radius, this.y - this.radius, 2 * this.radius, 2 * this.radius);
    this.damage = 1;
    Entity.call(this, game, this.x, this.y);
    //this.speed = entity.gun.speed;
    
}
Bullet.prototype = new Entity();
Wulf.prototype.constructor = Bullet;


Bullet.prototype.update = function () {
    //var slope = ((this.endy - this.y)/(this.endx - this.x));
    var magnitude = .5 * (Math.sqrt(Math.pow((this.endx - this.initialX), 2) + Math.pow((this.endy - this.initialY), 2)));
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
                    pf.health -= this.damage;
                case "wall":
                    this.boundingbox.top = this.y - this.radius;
                    this.boundingbox.bottom = this.boundingbox.top + this.boundingbox.height;
                    this.boundingbox.left = this.x - this.radius;
                    this.boundingbox.right = this.boundingbox.left + this.boundingbox.width;
                    this.removeFromWorld = true;
                    this.boundingbox.removeFromorld = true;
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
    ctx.arc(this.x - this.game.screenDims.x, this.y - this.game.screenDims.y, this.radius, 0, 2 * Math.PI, false);
    ctx.fill();
    
    ctx.strokeStyle = "green";
    ctx.strokeRect(this.x - this.game.screenDims.x, this.y - this.game.screenDims.y, this.boundingbox.width, this.boundingbox.height);
}


/*================================================================================
                                 Frank
================================================================================*/

function Frank (game, wulf, x, y) {
    this.backwardsAnimation = new Animation(ASSET_MANAGER.getAsset("./img/frankenzombie.png"), 0, 0, 32, 49, 0.2, 4, true, false);
    this.leftAnimation = new Animation(ASSET_MANAGER.getAsset("./img/frankenzombie.png"), 0, 46, 32, 49, 0.2, 4, true, false);
    this.rightAnimation = new Animation(ASSET_MANAGER.getAsset("./img/frankenzombie.png"), 0, 95, 32, 49, 0.2, 4, true, false);
    this.forwardAnimation = new Animation(ASSET_MANAGER.getAsset("./img/frankenzombie.png"), 0, 142, 32, 49, 0.2, 4, true, false);
    this.power = 0;
    this.startTimer = 0;
    this.currentTime = 0;
    this.damage = 2;
    this.health = 10;
    this.mode = "follow";
    this.x = x;
    this.y = y;
    this.wulf = wulf;
    this.xforce = 0;
    this.yforce = 0;
    this.force = 0;
    this.type = "enemy";
    this.acceleration = 0;
    this.direction = 0;
    this.boundingbox = new BoundingBox(this.x, this.y, 25, 50);
    
    this.pointValue = 10;

    Entity.call(this, game, this.x, this.y);
      
}

Frank.prototype = new Entity();
Frank.prototype.constructor = Frank;

Frank.prototype.update = function() {
     if (this.health <= 0){ 
        this.removeFromWorld = true;
        this.boundingbox.removeFromWorld = true;
        this.game.score = this.game.score + this.pointValue;
    }
    
    if (this.mode === "follow") {
        this.follow();
    } else {
        this.attack();
        
    }
    var collide = false;
    for (var i = 0; i < this.game.walls.length; i++) {
           
        var pf = this.game.walls[i];
        if (this.boundingbox.collide(pf.boundingbox)) 	{

            var type = pf.type;
            switch(type){
                case "player":
                    console.log("hi");
                    this.boundingbox.top = this.y;
                    this.boundingbox.bottom = this.boundingbox.top + this.boundingbox.height;
                    this.boundingbox.left = this.x;
                    this.boundingbox.right = this.boundingbox.left + this.boundingbox.width;
                    collide = true;
                    this.mode = "attack";
                    this.wulf.health = this.wulf.health - this.damage;
                    this.startTimer = Date.now();
                    
                    break;
                    
                case "wall":
                    //console.log("hi");
                    this.boundingbox.top = this.y;
                    this.boundingbox.bottom = this.boundingbox.top + this.boundingbox.height;
                    this.boundingbox.left = this.x;
                    this.boundingbox.right = this.boundingbox.left + this.boundingbox.width;
                        this.xforce = this.xforce * -.5;
                        this.yforce = this.yforce * -.5;
                    collide = true;                    
                    break;
            }
        } 
    } 
    if(!collide) {
//        console.log("ho");
        this.y = this.boundingbox.top;
        this.x = this.boundingbox.left;
        if(this.currentTime - this.startTimer > 1000) {
            this.wulf.health = this.wulf.health - this.damage;
            this.mode = "follow";
            this.startTimer = 0;
            this.currentTime = 0;
            
        }
        
    }
//    console.log(this.boundingbox.top);    
}

Frank.prototype.attack = function() {
    this.currentTime = Date.now();
    
}

Frank.prototype.follow = function() {
    var cxforce = this.xforce;
    var cyforce = this.yforce;
    for (var i = 0; i < this.game.walls.length; i++) {
           
        var e = this.game.walls[i];
        
        if(e.type === "wall" && getRange(this.x + 12.5,this.y + 25,e.boundingbox.left + 20,e.boundingbox.top + 20) < 60){
        //Calculate the total force from this point on us
            var cforce = e.power/Math.pow(getRange(this.x + 12.5,this.y + 25,e.boundingbox.left + 20 ,e.boundingbox.top + 20)/5,2);
            console.log(cforce);
            //this.force = cforce;
            //Find the bearing from the point to us
            var ang = normalize(Math.PI/2 - Math.atan2(this.y - e.y, this.x - e.x)); 
            console.log(ang);
            this.direction = ang;
            
                cxforce += (Math.sin(ang) * cforce);
               
                cyforce += (Math.cos(ang) * cforce);
                
        }
    }
    
            
//add target's direction    
    var temp = this.addDestination(this.wulf.x , this.wulf.y);
    
    if (this.x < this.wulf.x){
        cxforce -= .25;
    } else {
        cxforce += .25;
    }
    if (this.y < this.wulf.y){
        cyforce -= .25;
    } else {
        cyforce += .25;
    }

       
//    console.log(cyforce);
    if (cyforce > 0) {
        cyforce = Math.min(cyforce * .8, 2);
    } else {
        cyforce = Math.max(cyforce * .8, -2);
    }
    if (cxforce > 0) {
        cxforce = Math.min(cxforce * .8, 2);
    } else {
        cxforce = Math.max(cxforce * .8, -2);
    }

    //Move in the direction of our resolved force.
    //this.game.goTo(this.x - this.xforce, this.y + this.yforce, this);
    
    this.boundingbox.top -= cyforce;
    this.boundingbox.bottom -= cyforce;
    this.boundingbox.left -= cxforce;
    this.boundingbox.right -= cxforce;
    
    this.xforce = cxforce;
    this.yforce = cyforce;
    //this.force = cforce;
   
   
   
       /* var v = f(this.boundingbox.left, this.boundingbox.top, this.game.walls);
        
        this.boundingbox.left += v.x;
        this.boundingbox.top += v.y;
        */
}

Frank.prototype.addDestination = function( x,  y) {
    
    var angleTo = normalize(Math.PI/2 - Math.atan2(this.y - y, this.x - x));
    var cxforce, cyforce;
    if (this.y < y) {
        cyforce = (Math.cos(angleTo) * .8); 
    } else {
        cyforce = (Math.cos(angleTo) * -.8); 
    }
    if (this.x > x) {
        cxforce = (Math.sin(angleTo) * .8); 
    } else {
        cxforce = (Math.sin(angleTo) * -.8); 
    }
            
       
    return {x : cxforce, y: cyforce};
}

function getForce(x, y, obstacle) {
    if (obstacle.power ){
        var magnitude = obstacle.power/Math.pow(getRange(x,y,obstacle.boundingbox.left,obstacle.boundingbox.top),2);
    }
    
   var direction = {x: obstacle.boundingbox.left - x, y: obstacle.boundingbox.top - y };
   
   var ang = normalize(Math.PI/2 - Math.atan2(direction.y, direction.x));
   direction.x = Math.sin(ang) * magnitude;
   direction.y = Math.cos(ang) * magnitude;
   if(direction.x && direction.y) {
       return direction;
   } else {
       return {x:0, y:0};
   }
   
}

function f(x, y, obstacles) {
   var force = {x: 0, y: 0};
   for(var i = 0; i < obstacles.length; i++) {
      var obstacleForce = getForce(x, y, obstacles[i]);
      force.x += obstacleForce.x;
      force.y += obstacleForce.y;
   }
   //console.log(force.x);console.log(force.y);
   
   return force;
}

/*GameEngine.prototype.goTo =  function(x, y, entity) {
    console.log(y);
    entity.boundingbox.top = y;
    entity.boundingbox.bottom = entity.boundingbox.top + entity.height;
    entity.boundingbox.left = x; 
    entity.boundingbox.right = entity.boundingbox.left + entity.width;
   // entity.forward = true; 
}*/

//Returns the distance between two points
function getRange(x1, y1, x2, y2) {
    var x = x2 - x1;
    var y = y2 - y1;
    var range = Math.sqrt(x * x + y * y);
    return range;	
}

function normalize(ang) {
		if (ang > Math.PI)
			ang -= 2*Math.PI;
		if (ang < -Math.PI)
			ang += 2*Math.PI;
		return ang;
	}

Frank.prototype.draw = function(ctx) {
    if (this.forward) {
        this.forwardAnimation.drawFrame(this.game.clockTick, ctx, this.x - this.game.screenDims.x, this.y - this.game.screenDims.y);
        this.lastAnimation = this.forwardAnimation;
    } else if (this.backwards) {
        this.backwardsAnimation.drawFrame(this.game.clockTick, ctx, this.x - this.game.screenDims.x, this.y - this.game.screenDims.y);
        this.lastAnimation = this.backwardsAnimation;
    } else if (this.right) {
        this.rightAnimation.drawFrame(this.game.clockTick, ctx, this.x - this.game.screenDims.x, this.y - this.game.screenDims.y);
        this.lastAnimation = this.rightAnimation;
    } else if (this.left) {
        this.leftAnimation.drawFrame(this.game.clockTick, ctx, this.x - this.game.screenDims.x, this.y - this.game.screenDims.y);
        this.lastAnimation = this.leftAnimation;
    } else {
        this.forwardAnimation.drawFrame(this.game.clockTick, ctx, this.x - this.game.screenDims.x, this.y - this.game.screenDims.y);
    }
    
    ctx.strokeStyle = "green"; 
    ctx.strokeRect(this.boundingbox.left - this.game.screenDims.x, this.boundingbox.top - this.game.screenDims.y, this.boundingbox.width, this.boundingbox.height);
    
}

function DialogBox(game, portrait, text){
    this.portrait = portrait;
    this.text = text;  
    this.type = "DialogBox"
    this.removeFromWorld = false;
}

DialogBox.prototype = new Entity();
DialogBox.prototype.constructor = DialogBox;

DialogBox.prototype.draw = function(ctx){
    ctx.strokeStyle = "green"; 
    ctx.fillStyle = "black";
    ctx.fillRect(0, 350, 800, 250);
    ctx.drawImage(ASSET_MANAGER.getAsset(this.portrait.file), this.portrait.x, this.portrait.y, 
        this.portrait.w, this.portrait.h, 20, 400, 80, 100);
    ctx.fillStyle = "white";
    ctx.font = "14pt Arial";
    for(var i = 0; i < this.text.length; i++){
    ctx.fillText(this.text[i], 150, 400 + 25 * i);  
    ctx.font = "10pt Arial";
    ctx.fillText("(press 'q' to skip)", 500, 550);
    }
}

DialogBox.prototype.update = function(ctx){
    
}

function Dialog(game){
    this.game = game;
    this.boxes = [];
    this.i = 0;
    this.currentBox = new Entity(this.game);
    this.type = "Dialog";
    this.removeFromWorld = false;
}

Dialog.prototype = new Entity();
Dialog.prototype.constructor = Dialog;

Dialog.prototype.update = function(ctx){
    if (this.game.click){
        if (this.i < this.boxes.length - 1){
            this.currentBox.removeFromWorld = true;
            this.i ++;
            this.currentBox = this.boxes[this.i];
            this.game.addEntity(this.currentBox);
            this.currentBox = this.boxes[this.i];
            console.log("updating dialog");
            console.log("current = " + this.currentIndex + "boxes.length = " + this.boxes.length);
        }
        else {
            console.log("end of boxes");
            this.game.isDialog = false;
            this.currentBox.removeFromWorld = true;
            this.removeFromWorld = true;
        }
    }
    
    if (keyState['Q'.charCodeAt(0)]) {
        this.game.isDialog = false;
        this.currentBox.removeFromWorld = true;
        this.removeFromWorld = true;
        }      
}

Dialog.prototype.draw = function(ctx){
    this.boxes[this.i].draw;
}

Dialog.prototype.addBox = function(box){
    this.boxes.push(box);
}
function Inventory(game){
    this.items = [];
    this.items = ['0','0','0','0','0','0','0','0','0','0'];
     for(i=0; i < this.items.length; i++){
         this.items [i] = 0;
     }
 }
 
 Inventory.prototype = new Entity();
 Inventory.prototype.constructor = Inventory;
 
 Inventory.prototype.draw = function (ctx) {
     ctx.strokeStyle = "yellow";
     for (i = 0; i < 8; i ++){       
         ctx.strokeRect(i * 40, 15, 40, 40);
         if (this.items[i] !== 0){
             ctx.drawImage(ASSET_MANAGER.getAsset("./img/tileset_base.png"), 128, 0, 30, 30,
             i * 40, 15, 40, 40);
         }
     }
 }
 Inventory.prototype.update = function (ctx) {
   
}

function Furnishing(game, x, y) {
    this.type = "wall";
    this.boundingbox = new BoundingBox(x, y, 40, 40);

    Entity.call(this, game, x, y); // assigns x y and the game for us.
}

Furnishing.prototype = new Entity();
Furnishing.prototype.constructor = Furnishing;

Furnishing.prototype.draw = function (ctx) {
    ctx.drawImage(ASSET_MANAGER.getAsset("./img/floor.png"), 128, 128,
    30, 30, this.x - this.game.screenDims.x, this.y - this.game.screenDims.y, 40, 40)
    ctx.strokeStyle = "green";
    ctx.strokeRect(this.boundingbox.left - this.game.screenDims.x, this.boundingbox.top - this.game.screenDims.y, this.
        boundingbox.width, this.boundingbox.height);
}

function Wall(game, x, y){
    
    this.game = game;
    this.x = x;
    this.y = y;
    this.power = -40;
    this.removeFromWorld = false;
    this.boundingbox = new BoundingBox(x, y, 40, 40); 
    this.type = "wall";
}

Wall.prototype = new Entity();
Wall.prototype.constructor = Wall;

Wall.prototype.draw = function(ctx){
    ctx.drawImage(ASSET_MANAGER.getAsset("./img/miscItems2.png"), 130, 415, // 600, 240,  // pit for walls  160, 480
    30, 65, this.x - this.game.screenDims.x, this.y - this.game.screenDims.y - 20, 40, 65)
        ctx.strokeStyle = "green";
        ctx.strokeRect(this.boundingbox.left - this.game.screenDims.x, this.boundingbox.top - this.game.screenDims.y, this.
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
    ctx.drawImage(ASSET_MANAGER.getAsset("./img/tileset_base.png"), 128, 0, 30, 30,
                                         this.x - this.game.screenDims.x, this.y - this.game.screenDims.y, 40, 40);
    ctx.strokeStyle = "green";
    ctx.strokeRect(this.boundingbox.x - this.game.screenDims.x, this.boundingbox.y - this.game.screenDims.y, this.
            boundingbox.width, this.boundingbox.height);
}


function ElectricFrank( game , x, y) {
	// set the animations 
	// regular walking animations
    this.leftAnime = new Animation(ASSET_MANAGER.getAsset("./img/Frankenstein.png"), 33, 15, 41, 49, 0.2, 4, true, false);
    this.rightAnime = new Animation(ASSET_MANAGER.getAsset("./img/Frankenstein.png"), 197, 15, 41, 50, 0.2, 4, true, false);
    this.downAnime = new Animation(ASSET_MANAGER.getAsset("./img/Frankenstein.png"), 33, 70, 41, 52, 0.2, 4, true, false);
	this.upAnime = new Animation(ASSET_MANAGER.getAsset("./img/Frankenstein.png"), 197, 70, 41, 52, 0.2, 4, true, false);
    // got hit animations.
	this.upAnimeS = new Animation(ASSET_MANAGER.getAsset("./img/Frankenstein.png"), 30, 210, 56, 55, 0.2, 6, true, false);
    this.downAnimeS = new Animation(ASSET_MANAGER.getAsset("./img/Frankenstein.png"), 30, 280, 56, 55, 0.2, 6, true, false);
    this.leftAnimeS = new Animation(ASSET_MANAGER.getAsset("./img/Frankenstein.png"), 9, 350, 48, 60, 0.2, 4, true, false);
    this.rightAnimeS = new Animation(ASSET_MANAGER.getAsset("./img/Frankenstein.png"), 193, 350, 48, 60, 0.2, 4, true, false);
    // trailing lightening
	this.lighteningAnime = new Animation(ASSET_MANAGER.getAsset("./img/Frankenstein.png"), 140, 415, 20, 20, 0.3, 6, true, false);
	this.death = new Animation(ASSET_MANAGER.getAsset("./img/Frankenstein.png"), 88, 127, 56, 65, 0.2, 4, true, false);
	
	this.direction = {x: 0, y: 1}; // point towards the screen
	this.speed = 1;
	this.targetAnime = "down";
	
    Entity.call(this, game, x, y);
}

ElectricFrank.prototype = new Entity();
ElectricFrank.prototype.constructor = ElectricFrank;

// updates electric frank
ElectricFrank.prototype.update = function () {

		

}

ElectricFrank.prototype.draw = function (ctx) {

	//this.leftAnimeS.drawFrame(this.game.clockTick, ctx, this.x - this.game.screenDims.x, this.y - this.game.screenDims.y);
	switch(this.targetAnime) {
	case "up":
	    this.upAnime.drawFrame(this.game.clockTick, ctx, this.x - this.game.screenDims.x, this.y - this.game.screenDims.y);

	   	break;
	case "down":
		this.downAnime.drawFrame(this.game.clockTick, ctx, this.x - this.game.screenDims.x, this.y - this.game.screenDims.y);
        break;
	case "right":
	    this.rightAnime.drawFrame(this.game.clockTick, ctx, this.x - this.game.screenDims.x, this.y - this.game.screenDims.y);
        break;
	case "left":
	    this.leftAnime.drawFrame(this.game.clockTick, ctx, this.x - this.game.screenDims.x, this.y - this.game.screenDims.y);
        break;
	case "hitup":
	    this.upAnimeS.drawFrame(this.game.clockTick, ctx, this.x - this.game.screenDims.x, this.y - this.game.screenDims.y);
        break;
	case "hitdown":
		this.downAnimeS.drawFrame(this.game.clockTick, ctx, this.x - this.game.screenDims.x, this.y - this.game.screenDims.y);
        break;
	case "hitright":
	    this.rightAnimeS.drawFrame(this.game.clockTick, ctx, this.x - this.game.screenDims.x, this.y - this.game.screenDims.y);
        break;
	case "hitleft":
	    this.leftAnimeS.drawFrame(this.game.clockTick, ctx, this.x - this.game.screenDims.x, this.y - this.game.screenDims.y);
        break;
	case "death":
	    this.death.drawFrame(this.game.clockTick, ctx, this.x - this.game.screenDims.x, this.y - this.game.screenDims.y);
        break;
	} 
}

/*==============================================================================
 *   WULF
 ==============================================================================*/
function Wulf (game) {
    this.idleAnimation = new Animation (ASSET_MANAGER.getAsset("./img/Wulf.png"), 0, 0, 32, 49, 0.2, 1, false, false);
    this.backwardsAnimation = new Animation(ASSET_MANAGER.getAsset("./img/Wulf.png"), 0, 0, 32, 49, 0.2, 4, true, false);
    this.leftAnimation = new Animation(ASSET_MANAGER.getAsset("./img/Wulf.png"), 0, 46, 32, 49, 0.2, 4, true, false);
    this.rightAnimation = new Animation(ASSET_MANAGER.getAsset("./img/Wulf.png"), 0, 95, 32, 49, 0.2, 4, true, false);
    this.forwardAnimation = new Animation(ASSET_MANAGER.getAsset("./img/Wulf.png"), 0, 142, 32, 49, 0.2, 4, true, false);
    this.lastAnimation = this.forwardAnimation;
    this.moving = false;
    this.centerX = 40;
    this.centerY = 10;
    this.boundingbox = new BoundingBox(this.centerX, this.centerY, 25, 50);
    this.inventory = new Inventory(game);
    this.type = "player";
    this.health = 10;
    Entity.call(this, game, 40, 10);
    
}

Wulf.prototype = new Entity();
Wulf.prototype.constructor = Wulf;

//stack overflow suggestion on saving the key state.
Wulf.prototype.update = function () {
    if (this.health === 0) {
        this.removeFromWorld = true;
    }
    var speed = 150  * this.game.clockTick;;
	var bump = false;
    if (keyState['E'.charCodeAt(0)]) {
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
    
    if (keyState['S'.charCodeAt(0)]) {
        this.left = true;
        this.moving = true;
	if (this.x > 0)  {
            this.boundingbox.left = this.boundingbox.left - speed;
            this.boundingbox.right = this.boundingbox.right - speed;
        }

    } else {
        this.left = false;
    }
    
    if (keyState['F'.charCodeAt(0)]) {
       this.right = true;
       this.moving = true;
       if (this.x < this.game.mapDims.w - 25)  {
           this.boundingbox.left = this.boundingbox.left + speed;
           this.boundingbox.right = this.boundingbox.right + speed;
       }

    } else {
        this.right = false;
    }
    
    if (keyState['D'.charCodeAt(0)]) {
        this.backwards = true;
        this.moving = true;
	if (this.y < this.game.mapDims.h - 50) {
            
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
        var collide = false;
	for (var i = 0; i < this.game.walls.length; i++) {
           
            var pf = this.game.walls[i];
            if (this.boundingbox.collide(pf.boundingbox)) 	{
                
                var type = pf.type;
                switch(type){
                    
                case "frank":
                case "wall":
                    //console.log( "wolf: " + this.boundingbox.top + " " + this.boundingbox.left + " wall: " + i);
                    this.boundingbox.top = this.y;
                    this.boundingbox.bottom = this.boundingbox.top + this.boundingbox.height;
                    this.boundingbox.left = this.x;
                    this.boundingbox.right = this.boundingbox.left + this.boundingbox.width;
                    collide = true;  
                    break;

                case "goodie":
                    this.inventory.items.push("sack");
                    pf.removeFromWorld = true;

                    break;
                        
                        
                } 
            } 
        }
            if (!collide){
                this.y = this.boundingbox.top;
                this.x = this.boundingbox.left;
            }
	
	 
    //var duration = this.forwardAnimation.elapsedTime + this.game.clockTick;
}

Wulf.prototype.draw = function(ctx) {

    if (this.forward) {
        this.forwardAnimation.drawFrame(this.game.clockTick, ctx, this.x - this.game.screenDims.x, this.y - this.game.screenDims.y);
        this.lastAnimation = this.forwardAnimation;
    } else if (this.backwards) {
        this.backwardsAnimation.drawFrame(this.game.clockTick, ctx, this.x - this.game.screenDims.x, this.y - this.game.screenDims.y);
        this.lastAnimation = this.backwardsAnimation;
    } else if (this.right) {
        this.rightAnimation.drawFrame(this.game.clockTick, ctx, this.x - this.game.screenDims.x, this.y - this.game.screenDims.y);
        this.lastAnimation = this.rightAnimation;
    } else if (this.left) {
        this.leftAnimation.drawFrame(this.game.clockTick, ctx, this.x - this.game.screenDims.x, this.y - this.game.screenDims.y);
        this.lastAnimation = this.leftAnimation;
    } else {
        this.lastAnimation.drawFrame(this.game.clockTick, ctx, this.x - this.game.screenDims.x, this.y - this.game.screenDims.y);
    }
    
    ctx.strokeStyle = "green";
    ctx.strokeRect(this.boundingbox.left - this.game.screenDims.x, this.boundingbox.top - this.game.screenDims.y, this.boundingbox.width, this.boundingbox.height);
    
    
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

//====================================================================================
//PLAY GAME
//====================================================================================
function PlayGame(game, x, y) {
    Entity.call(this, game, x, y);
}

PlayGame.prototype = new Entity();
PlayGame.prototype.constructor = PlayGame;

PlayGame.prototype.reset = function () {
    this.game.running = false;
}
PlayGame.prototype.update = function () {
    if (this.game.click && this.game.user.health > 0) {
        this.game.isDialog = true;
        this.game.running = true;
    }
}

PlayGame.prototype.draw = function (ctx) {
    if (!this.game.running) {
        ctx.font = "24pt Impact";
        ctx.fillStyle = "black";
        if (this.game.mouse) { ctx.fillStyle = "red"; }
        if (this.game.score > 40){
            ctx.fillText("A winner is Wulf!", this.x, this.y);
        }
        else if (this.game.user.health > 0) {
            ctx.fillText("Click to Play!", this.x, this.y);
        }
        else {
            ctx.fillText("Wulf Blitzer has been devoured by Frankensteins.", this.x-240, this.y);
        }
    }
}


function GameBoard(game) {
    Entity.call(this, game, 0, 0);
    this.type = "gameboard";
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

	for (var i = 0; i < 6; i++) { for (var j = 0; j < 6; j++) {
         ctx.drawImage(ASSET_MANAGER.getAsset("./img/floor.png"), 385, 565, 140, 140, i * 320 - this.game.screenDims.x, j * 320 - this.game.screenDims.y, 320, 320);
        }
	}
    
	for (var i = 0; i < 1600; i+=800) { for (var j = 0; j < 1600; j+=800) {
    // blood spots
		ctx.drawImage(ASSET_MANAGER.getAsset("./img/miscItems3.png"), 0, 80, 35, 70, (160 + i) - this.game.screenDims.x, (320 + j) - this.game.screenDims.y, 35, 80);
		ctx.drawImage(ASSET_MANAGER.getAsset("./img/miscItems3.png"), 0, 80, 35, 70, (400 + i)  - this.game.screenDims.x, (440 + j) - this.game.screenDims.y, 35, 80);
		ctx.drawImage(ASSET_MANAGER.getAsset("./img/miscItems3.png"), 0, 80, 35, 70, (25 + i)  - this.game.screenDims.x, (520 + j) - this.game.screenDims.y, 35, 80);
		ctx.drawImage(ASSET_MANAGER.getAsset("./img/miscItems3.png"), 0, 80, 35, 70, (540 + i)  - this.game.screenDims.x, (280 + j) - this.game.screenDims.y, 35, 80);
		ctx.drawImage(ASSET_MANAGER.getAsset("./img/miscItems3.png"), 0, 80, 35, 70, (150 + i)  - this.game.screenDims.x, (720 + j) - this.game.screenDims.y, 35, 80);
		ctx.drawImage(ASSET_MANAGER.getAsset("./img/miscItems3.png"), 0, 80, 35, 70, (600 + i)  - this.game.screenDims.x, (720 + j) - this.game.screenDims.y, 35, 80);

		ctx.drawImage(ASSET_MANAGER.getAsset("./img/miscItems3.png"), 35, 80, 70, 70, (80 + i)  - this.game.screenDims.x, (200 + j) - this.game.screenDims.y, 35, 80);
		ctx.drawImage(ASSET_MANAGER.getAsset("./img/miscItems3.png"), 35, 80, 70, 70, (300 + i)  - this.game.screenDims.x, (20 + j) - this.game.screenDims.y, 35, 80);
		ctx.drawImage(ASSET_MANAGER.getAsset("./img/miscItems3.png"), 35, 80, 70, 70, (700 + i)  - this.game.screenDims.x, (85 + j) - this.game.screenDims.y, 35, 80);
		ctx.drawImage(ASSET_MANAGER.getAsset("./img/miscItems3.png"), 35, 80, 70, 70, (360 + i)  - this.game.screenDims.x, (560 + j) - this.game.screenDims.y, 35, 80);
		ctx.drawImage(ASSET_MANAGER.getAsset("./img/miscItems3.png"), 35, 80, 70, 70, (590 + i)  - this.game.screenDims.x, (650 + j) - this.game.screenDims.y, 35, 80);

		// pentagrams
		ctx.drawImage(ASSET_MANAGER.getAsset("./img/miscItems2.png"), 320, 290, 95, 95, (5 + i)  - this.game.screenDims.x, (5 + j) - this.game.screenDims.y, 95, 95);
		ctx.drawImage(ASSET_MANAGER.getAsset("./img/miscItems2.png"), 415, 290, 95, 95, (650 + i)  - this.game.screenDims.x, (600 + j)  - this.game.screenDims.y, 95, 95);

		// bones
		ctx.drawImage(ASSET_MANAGER.getAsset("./img/miscItems2.png"), 0, 450, 65, 60, (100 + i)  - this.game.screenDims.x, (100 + j) - this.game.screenDims.y, 65, 60);
		ctx.drawImage(ASSET_MANAGER.getAsset("./img/miscItems2.png"), 0, 450, 65, 60, (350 + i)  - this.game.screenDims.x, j - this.game.screenDims.y, 65, 60);
		ctx.drawImage(ASSET_MANAGER.getAsset("./img/miscItems2.png"), 0, 450, 65, 60, (520 + i)  - this.game.screenDims.x, (300 + j) - this.game.screenDims.y, 65, 60);
		ctx.drawImage(ASSET_MANAGER.getAsset("./img/miscItems2.png"), 0, 450, 65, 60, (80 + i)  - this.game.screenDims.x, (650 + j) - this.game.screenDims.y, 65, 60);
	}}
}

// the "main" code begins here

var ASSET_MANAGER = new AssetManager();
ASSET_MANAGER.queueDownload("./img/Wulf.png");
ASSET_MANAGER.queueDownload("./img/wolfenstein.png");
ASSET_MANAGER.queueDownload("./img/tileset_base.png");
ASSET_MANAGER.queueDownload("./img/frankenzombie.png");
ASSET_MANAGER.queueDownload("./img/floor.png");
ASSET_MANAGER.queueDownload("./img/floor_resize.png");
ASSET_MANAGER.queueDownload("./img/miscItems3.png");
ASSET_MANAGER.queueDownload("./img/miscItems2.png");
ASSET_MANAGER.queueDownload("./img/Frankenstein.png");
ASSET_MANAGER.queueDownload("./img/soledad.png");
ASSET_MANAGER.queueDownload("./img/chuck.png");

ASSET_MANAGER.downloadAll(function () {
    console.log("starting up da sheild");
    var canvas = document.getElementById('gameWorld');
    var HTMLscore = document.getElementById('score');
    var ctx = canvas.getContext('2d');

    var gameEngine = new GameEngine(HTMLscore);
    var gameboard = new GameBoard(gameEngine);
    var pg = new PlayGame(gameEngine, 320, 350);

    gameEngine.screenDims = { w: 800, h: 600, x: 0, y: 0, motionbox: { left: 200, top: 200, right: 600, bottom: 400 } };
    gameEngine.mapDims = {w: 1600, h: 1600};

    var goodie = new Goodie(gameEngine, 300, 300);
    var wulf = new Wulf(gameEngine);
    var frank1 = new Frank(gameEngine, wulf, 200, 200);
    var frank2 = new Frank(gameEngine, wulf, 200, 300);
    var frank3 = new Frank(gameEngine, wulf, 575, 250);
    var frank4 = new Frank(gameEngine, wulf, 50, 750);
    var frank5 = new Frank(gameEngine, wulf, 725, 725);
    var walls = [];
    var openingDialog = new Dialog(gameEngine);
    var inv = new Inventory(gameEngine);
    var wulfPortraitL = {file:"./img/wolfenstein.png", x:15, y:37, w:80, h:100};
    var wulfPortraitR = {file:"./img/wolfenstein.png", x:175, y:37, w:80, h:100};
    var wulfPortraitC = {file:"./img/wolfenstein.png", x:95, y:37, w:80, h:100};
    var soledadPortrait = {file:"./img/soledad.png", x:0, y:0, w:160, h:200};
    var blackSquare = {file:"./img/wolfenstein.png", x:20, y:64, w:1, h:1};
    var chuckPortrait = {file:"./img/chuck.png", x:0, y:0, w:125, h:160};

    openingDialog.addBox(new DialogBox(this, wulfPortraitL, ["...."]));
    openingDialog.addBox(new DialogBox(this, wulfPortraitL, ["Wulf Blitzer: I can remember the fire. My plane must have crashed"]));
    openingDialog.addBox(new DialogBox(this, wulfPortraitL, ["Where am I?"]));
    openingDialog.addBox(new DialogBox(this, wulfPortraitC, ["My Journalistic Instincts tell me I've traveled back in time again. . . ."]));
    openingDialog.addBox(new DialogBox(this, wulfPortraitR, ["But how far?  And where did all these Frankensteins come from?"]));
    openingDialog.addBox(new DialogBox(this, blackSquare,["(ring . . . ring . . .)"]));
    openingDialog.addBox(new DialogBox(this, wulfPortraitL,["We get signal? Cell phone turn on."]));
    openingDialog.addBox(new DialogBox(this, soledadPortrait, ["Wulf, is that you? Thank gosh you survived!"]));
    openingDialog.addBox(new DialogBox(this, soledadPortrait, ["We lost radio contact with your plane and I was so worried."]));
    openingDialog.addBox(new DialogBox(this, wulfPortraitL, ["The living brain of Idi Amin wasn't able to kill me, Soledad O'Brian", "It's gonna take more than a little plane crash."]));
    openingDialog.addBox(new DialogBox(this, soledadPortrait,[". . . . "]));
    openingDialog.addBox(new DialogBox(this, wulfPortraitC, ["Soledad, I'm losing the signal. Check the CNN temporal radar and", "tell me where in history I've landed."]));
    openingDialog.addBox(new DialogBox(this, chuckPortrait, ["I'm way ahead of you, Wulf!"]));
    openingDialog.addBox(new DialogBox(this, wulfPortraitL, ["You're a sight for sore eyes, colossal douchebag Chuck Todd."]));
    openingDialog.addBox(new DialogBox(this, chuckPortrait, ["You gave us all a heck of a scare, Wulf.", "The CNN temporal radar shows you've landed in the year 1792"]));
    openingDialog.addBox(new DialogBox(this, wulfPortraitC, ["Chuck, I need you to put Soledad back on and never speak again."]));
    openingDialog.addBox(new DialogBox(this, chuckPortrait, ["10-4, good buddy.", "(hee hee, classic Wulf.)"]));
    openingDialog.addBox(new DialogBox(this, soledadPortrait, ["I'm here, Wulf. Sensors show you should be able to use your", "phone at critical areas in the castle.", "Find these 'hot spots' and check back in with your progress.", "We might be able to help." ]));
    openingDialog.addBox(new DialogBox(this, wulfPortraitR, ["I'll try, Soledad O'Brien. I've tangled with Frankensteins before, but ", "something tells me this will be my most", "terrifying adventure yet."]));
    openingDialog.addBox(new DialogBox(this, soledadPortrait, ["Kill them all, Wulf. Kill them with your modern firearms and ", "huge muscles. Kill them and come home to me."]));
    openingDialog.addBox(new DialogBox(this, wulfPortraitC, [". . . ."]));


    wulf.inventory = inv;

    walls.push(goodie);
    walls.push(frank1);
    walls.push(frank2);
    walls.push(frank3);        
    walls.push(frank4);
    walls.push(frank5);

    walls.push(wulf);
    gameEngine.addEntity(pg);
    gameEngine.addEntity(gameboard);
    gameEngine.addEntity(wulf);
    gameEngine.addEntity(goodie);
    gameEngine.addEntity(frank1);
    gameEngine.addEntity(frank2);
    gameEngine.addEntity(frank3);
    gameEngine.addEntity(frank4);
    gameEngine.addEntity(frank5);

    gameEngine.addEntity(new ElectricFrank(gameEngine, 250, 100));

    gameEngine.walls = walls;
    gameEngine.running = false;

    gameEngine.user = wulf; // need a user for screen scrolling

    gameEngine.generateMap(1600, 1600);
    for(var i = 0; i < gameEngine.mapDims.w; i+=40) {
        walls.push(new Wall(gameEngine, i, -40));
        walls.push(new Wall(gameEngine, i, gameEngine.mapDims.h + 440));
        console.log(gameEngine.mapDims.h + 440);
    }
    for(var i = 0; i < gameEngine.mapDims.h; i+=40) {
        walls.push(new Wall(gameEngine, -40, i));
        walls.push(new Wall(gameEngine, gameEngine.mapDims.w + 640,i ));
    }
    
    for(i = 0; i < walls.length; i++) {
        if(walls[i].type) {
            console.log(walls[i].type);
        }
        
    }
    gameEngine.addEntity(inv);
    gameEngine.addEntity(openingDialog);
    //for (var i = 0; i < walls.length; i++){console.log(walls[i].x + " " + walls[i].y);}
    gameEngine.init(ctx);
    gameEngine.start();
});
