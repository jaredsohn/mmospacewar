/*

   Copyright (c) 2010 Doug McInnes

   Permission is hereby granted, free of charge, to any person obtaining a copy
   of this software and associated documentation files (the "Software"), to deal
   in the Software without restriction, including without limitation the rights
   to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
   copies of the Software, and to permit persons to whom the Software is
   furnished to do so, subject to the following conditions:

   The above copyright notice and this permission notice shall be included in
   all copies or substantial portions of the Software.

   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
   IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,       
   FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE    
   AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER         
   LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,  
   OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN      
   THE SOFTWARE.

*/

// Updated to allow multiple players and renamed MMOAsteroids by @vikrum5000 of Firebase.
// Made more Spacewar (DOS)-like, uses MMOInstance for choosing an instance, and many bugs fixed by Jared Sohn (http://www.jaredsohn.com)


var ENERGY_FULL = 100;
var ENERGY_SHOOT = 1;
var ENERGY_WARP = 5;
var ENERGY_THRUST = 1;
var ENERGY_COLLISION = 10;
var ENERGY_REGEN = 1;

KEY_CODES = {
  32: 'space', // shoot
  37: 'left',  // rotate
  38: 'up',    // thrust
  39: 'right', // rotate
  71: 'g', // shows which objects are on the screen. Useful for debugging.
  77: 'm', // toggle sound
  79: 'o', // spawn an asteroid
  80: 'p', // spawn alien now
  81: 'q', // instant death
  87: 'w', // instant death to all asteroids
  90: 'z', // warp
}

KEY_STATUS = { keyDown:false };
for (code in KEY_CODES) {
  KEY_STATUS[KEY_CODES[code]] = false;
}

$(window).keydown(function (e) {
  if (Game.FSM.state == 'boot')
  {
    Game.FSM.state = 'start';
  }

  KEY_STATUS.keyDown = true;
  if (KEY_CODES[e.keyCode]) {
    e.preventDefault();
    KEY_STATUS[KEY_CODES[e.keyCode]] = true;
  }
}).keyup(function (e) {
  KEY_STATUS.keyDown = false;
  if (KEY_CODES[e.keyCode]) {
    //console.log(e.keyCode);
    if (e.keyCode == '38') //TODO: shouldn't hardcode this
    {
//      console.log("stopping...");
//      SFX.thrust().finish(true);
    }
    e.preventDefault();
    KEY_STATUS[KEY_CODES[e.keyCode]] = false;
  }
});

GRID_SIZE = 60;

var server = 'http://spacewar.firebaseio.com/';

var namespace = mmoInstance.Name;
var frefA = server + namespace;
//TODO var frefA2 = server + 'space_' + mmoInstance.Name;

var frefL = server + 'leaderboard';
var frefGL = server + 'gamelist';

console.log(frefA);

var asteroids = new Firebase(frefA);
var myship = asteroids.child('players').push();
myship.removeOnDisconnect();

// Leaderboard start
var LEADERBOARD_SIZE = 25;
var leaderboard = new Firebase(frefL);
var scoreListRef = leaderboard.child('scoreList');
var htmlForPath = {};
var currentUser = { name: "Guest" + Math.floor((10000 * Math.random())), type: 'guest', photo: null };

function updateName() {
 if(currentUser.type == 'twitter') {
   $('#my-name').html('<img height=24 src="' + currentUser.photo + '"> @' + currentUser.name);
   twttr.anywhere(function (T) { T("#my-name").linkifyUsers();});
 }
 else {
   $('#my-name').text(currentUser.name);
 }
}
updateName();

twttr.anywhere(function (T) {
  if(T.isConnected()) {
    currentUser = { name: T.currentUser.data('screen_name'), type: 'twitter', photo: T.currentUser.data('profile_image_url') };
    $('#login').remove();
  }
  updateName();

  T.bind("authComplete", function (e, user) {
    currentUser = { name: user.data('screen_name'), type: 'twitter', photo: user.data('profile_image_url') };
    $('#login').remove();
    updateName();
  });
});
            
function handleScoreAdded(scoreSnapshot, lowerScoreName) {
  var newScoreRow = $("<tr/>");
        // postScoreRef.setWithPriority({user: currentUser, score: Game.score}, Game.score);
  var postedScore = scoreSnapshot.val();
  if(postedScore.user.type == 'twitter') {
    newScoreRow.append($("<td/>").append('<img height=24 src="' + postedScore.user.photo + '">').append($("<strong/>").text('@' + postedScore.user.name)));
    newScoreRow.append($("<td/>").text(postedScore.score));
    twttr.anywhere(function (T) { T("#leaderboardTable").linkifyUsers();});
  }
  else {
    newScoreRow.append($("<td/>").append($("<strong/>").text(postedScore.user.name)));
    newScoreRow.append($("<td/>").text(postedScore.score));
  }

  // Store a reference to the table row so we can get it again later.
  htmlForPath[scoreSnapshot.name()] = newScoreRow;

  // Insert the new score in the appropriate place in the GUI.
  if (lowerScoreName === null) {
    $("#leaderboardTable").append(newScoreRow);
  }
  else {
    var lowerScoreRow = htmlForPath[lowerScoreName];
    lowerScoreRow.before(newScoreRow);
  }
}

function handleScoreRemoved(scoreSnapshot) {
  var removedScoreRow = htmlForPath[scoreSnapshot.name()];
  removedScoreRow.remove();
  delete htmlForPath[scoreSnapshot.name()];
}

var scoreListView = scoreListRef.limit(LEADERBOARD_SIZE);

scoreListView.on('child_added', function (newScoreSnapshot, prevScoreName) {
    handleScoreAdded(newScoreSnapshot, prevScoreName);
    });

scoreListView.on('child_removed', function (oldScoreSnapshot) {
    handleScoreRemoved(oldScoreSnapshot);
    });

var changedCallback = function (scoreSnapshot, prevScoreName) {
  handleScoreRemoved(scoreSnapshot);
  handleScoreAdded(scoreSnapshot, prevScoreName);
};
scoreListView.on('child_moved', changedCallback);
scoreListView.on('child_changed', changedCallback);

function setScore(score) {
   Game.score = score;
   updateScore();
}

function deltaScore(score) {
   Game.score += score;
   updateScore();
}

function updateScore() {
     $("#my-score").html(Game.score);
}

function updateEnergy() {
     $("#my-energy").html(Game.ship.energy);
}


// Leaderboard end


Matrix = function (rows, columns) {
  var i, j;
  this.data = new Array(rows);
  for (i = 0; i < rows; i++) {
    this.data[i] = new Array(columns);
  }

  this.configure = function (rot, scale, transx, transy) {
    var rad = (rot * Math.PI)/180;
    var sin = Math.sin(rad) * scale;
    var cos = Math.cos(rad) * scale;
    this.set(cos, -sin, transx,
             sin,  cos, transy);
  };

  this.set = function () {
    var k = 0;
    for (i = 0; i < rows; i++) {
      for (j = 0; j < columns; j++) {
        this.data[i][j] = arguments[k];
        k++;
      }
    }
  }

  this.multiply = function () {
    var vector = new Array(rows);
    for (i = 0; i < rows; i++) {
      vector[i] = 0;
      for (j = 0; j < columns; j++) {
        vector[i] += this.data[i][j] * arguments[j];
      }
    }
    return vector;
  };
};

Sprite = function () {
  this.init = function (name, points) {
    this.name     = name;
    this.points   = points;

    this.vel = {
      x:   0,
      y:   0,
      rot: 0
    };

    this.acc = {
      x:   0,
      y:   0,
      rot: 0
    };
  };

  this.children = {};

  this.visible  = false;
  this.reap     = false;
  this.bridgesH = true;
  this.bridgesV = true;

  this.collidesWith = [];

  this.x     = 0;
  this.y     = 0;
  this.rot   = 0;
  this.scale = 1;

  this.currentNode = null;
  this.nextSprite  = null;

  this.preMove  = null;
  this.postMove = null;
  this.strokeStyle = "#ffffff";

  this.run = function(delta) {

    this.move(delta);
    this.updateGrid();

    this.context.save();
    this.configureTransform();
    this.draw();

    var canidates = this.findCollisionCanidates();

    this.matrix.configure(this.rot, this.scale, this.x, this.y);
    this.checkCollisionsAgainst(canidates);

    this.context.restore();

    if (this.bridgesH && this.currentNode && this.currentNode.dupe.horizontal) {
      this.x += this.currentNode.dupe.horizontal;
      this.context.save();
      this.configureTransform();
      this.draw();
      this.checkCollisionsAgainst(canidates);
      this.context.restore();
      if (this.currentNode) {
        this.x -= this.currentNode.dupe.horizontal;
      }
    }
    if (this.bridgesV && this.currentNode && this.currentNode.dupe.vertical) {
      this.y += this.currentNode.dupe.vertical;
      this.context.save();
      this.configureTransform();
      this.draw();
      this.checkCollisionsAgainst(canidates);
      this.context.restore();
      if (this.currentNode) {
        this.y -= this.currentNode.dupe.vertical;
      }
    }
    if (this.bridgesH && this.bridgesV &&
        this.currentNode &&
        this.currentNode.dupe.vertical &&
        this.currentNode.dupe.horizontal) {
      this.x += this.currentNode.dupe.horizontal;
      this.y += this.currentNode.dupe.vertical;
      this.context.save();
      this.configureTransform();
      this.draw();
      this.checkCollisionsAgainst(canidates);
      this.context.restore();
      if (this.currentNode) {
        this.x -= this.currentNode.dupe.horizontal;
        this.y -= this.currentNode.dupe.vertical;
      }
    }
  };
  this.move = function (delta) {
    if (!this.visible) return;
    this.transPoints = null; // clear cached points

    if ($.isFunction(this.preMove)) {
      this.preMove(delta);
    }

    this.vel.x += this.acc.x * delta;
    this.vel.y += this.acc.y * delta;
    this.x += this.vel.x * delta;
    this.y += this.vel.y * delta;
    this.rot += this.vel.rot * delta;
    if (this.rot > 360) {
      this.rot -= 360;
    } else if (this.rot < 0) {
      this.rot += 360;
    }

    if ($.isFunction(this.postMove)) {
      this.postMove(delta);
    }
  };
  this.updateGrid = function () {
    if (!this.visible) return;
    var gridx = Math.floor(this.x / GRID_SIZE);
    var gridy = Math.floor(this.y / GRID_SIZE);
    gridx = (gridx >= this.grid.length) ? 0 : gridx;
    gridy = (gridy >= this.grid[0].length) ? 0 : gridy;
    gridx = (gridx < 0) ? this.grid.length-1 : gridx;
    gridy = (gridy < 0) ? this.grid[0].length-1 : gridy;
    var newNode = this.grid[gridx][gridy];
    if (newNode != this.currentNode) {
      if (this.currentNode) {
        this.currentNode.leave(this);
      }
      newNode.enter(this);
      this.currentNode = newNode;
    }

    if (KEY_STATUS.g && this.currentNode) {
      this.context.lineWidth = 3.0;
      this.context.strokeStyle = 'green';
      this.context.strokeRect(gridx*GRID_SIZE+2, gridy*GRID_SIZE+2, GRID_SIZE-4, GRID_SIZE-4);
      this.context.strokeStyle = 'black';
      this.context.lineWidth = 1.0;
    }
  };
  this.configureTransform = function () {
    if (!this.visible) return;

    var rad = (this.rot * Math.PI)/180;

    this.context.translate(this.x, this.y);
    this.context.rotate(rad);
    this.context.scale(this.scale, this.scale);
  };
  this.draw = function () {
    if (!this.visible) return;

    this.context.lineWidth = 1.5 / this.scale;

    for (child in this.children) {
      this.children[child].draw();
    }

    this.context.beginPath();

    this.context.moveTo(this.points[0], this.points[1]);
    for (var i = 1; i < this.points.length/2; i++) {
      var xi = i*2;
      var yi = xi + 1;
      this.context.lineTo(this.points[xi], this.points[yi]);
    }

    this.context.closePath();
    this.context.strokeStyle = this.strokeStyle;
    this.context.stroke();
  };
  this.findCollisionCanidates = function () {
    if (!this.visible || !this.currentNode) return [];
    var cn = this.currentNode;
    var canidates = [];
    if (cn.nextSprite) canidates.push(cn.nextSprite);
    if (cn.north.nextSprite) canidates.push(cn.north.nextSprite);
    if (cn.south.nextSprite) canidates.push(cn.south.nextSprite);
    if (cn.east.nextSprite) canidates.push(cn.east.nextSprite);
    if (cn.west.nextSprite) canidates.push(cn.west.nextSprite);
    if (cn.north.east.nextSprite) canidates.push(cn.north.east.nextSprite);
    if (cn.north.west.nextSprite) canidates.push(cn.north.west.nextSprite);
    if (cn.south.east.nextSprite) canidates.push(cn.south.east.nextSprite);
    if (cn.south.west.nextSprite) canidates.push(cn.south.west.nextSprite);
    return canidates
  };
  this.checkCollisionsAgainst = function (canidates) {
    for (var i = 0; i < canidates.length; i++) {
      var ref = canidates[i];
      do {
        this.checkCollision(ref);
        ref = ref.nextSprite;
      } while (ref)
    }
  };
  this.checkCollision = function (other) {
    if (!other.visible ||
         this == other ||
         this.collidesWith.indexOf(other.name) == -1) return;
    var trans = other.transformedPoints();
    var px, py;
    var count = trans.length/2;
    for (var i = 0; i < count; i++) {
      px = trans[i*2];
      py = trans[i*2 + 1];
      // mozilla doesn't take into account transforms with isPointInPath >:-P
      if (($.browser.mozilla) ? this.pointInPolygon(px, py) : this.context.isPointInPath(px, py)) {
        other.collision(this);
        this.collision(other);
        return;
      }
    }
  };
  this.pointInPolygon = function (x, y) {
    var points = this.transformedPoints();
    var j = 2;
    var y0, y1;
    var oddNodes = false;
    for (var i = 0; i < points.length; i += 2) {
      y0 = points[i + 1];
      y1 = points[j + 1];
      if ((y0 < y && y1 >= y) ||
          (y1 < y && y0 >= y)) {
        if (points[i]+(y-y0)/(y1-y0)*(points[j]-points[i]) < x) {
          oddNodes = !oddNodes;
        }
      }
      j += 2
      if (j == points.length) j = 0;
    }
    return oddNodes;
  };
  this.collision = function () {
  };
  this.die = function () {
    this.visible = false;
    this.reap = true;
    if (this.currentNode) {
      this.currentNode.leave(this);
      this.currentNode = null;
    }
  };
  this.transformedPoints = function () {
    if (this.transPoints) return this.transPoints;
    var trans = new Array(this.points.length);
    this.matrix.configure(this.rot, this.scale, this.x, this.y);
    for (var i = 0; i < this.points.length/2; i++) {
      var xi = i*2;
      var yi = xi + 1;
      var pts = this.matrix.multiply(this.points[xi], this.points[yi], 1);
      trans[xi] = pts[0];
      trans[yi] = pts[1];
    }
    this.transPoints = trans; // cache translated points
    return trans;
  };
  this.isClear = function () {
    if (this.collidesWith.length == 0) return true;
    var cn = this.currentNode;
    if (cn == null) {
      var gridx = Math.floor(this.x / GRID_SIZE);
      var gridy = Math.floor(this.y / GRID_SIZE);
      gridx = (gridx >= this.grid.length) ? 0 : gridx;
      gridy = (gridy >= this.grid[0].length) ? 0 : gridy;
      cn = this.grid[gridx][gridy];
    }
    return (cn.isEmpty(this.collidesWith) &&
            cn.north.isEmpty(this.collidesWith) &&
            cn.south.isEmpty(this.collidesWith) &&
            cn.east.isEmpty(this.collidesWith) &&
            cn.west.isEmpty(this.collidesWith) &&
            cn.north.east.isEmpty(this.collidesWith) &&
            cn.north.west.isEmpty(this.collidesWith) &&
            cn.south.east.isEmpty(this.collidesWith) &&
            cn.south.west.isEmpty(this.collidesWith));
  };
  this.wrapPostMove = function () {
    if (this.x > Game.canvasWidth) {
      this.x = 0;
    } else if (this.x < 0) {
      this.x = Game.canvasWidth;
    }
    if (this.y > Game.canvasHeight) {
      this.y = 0;
    } else if (this.y < 0) {
      this.y = Game.canvasHeight;
    }
  };

};

Ship = function () {
  this.init("ship",
            [-5,   4,
              0, -12,
              5,   4]);

  this.scale = 1.5;
  this.children.exhaust = new Sprite();
  this.children.exhaust.strokeStyle = "#ff0000";
  this.children.exhaust.init("exhaust",
                             [-3,  6,
                               0, 11,
                               3,  6]);

  this.energy = ENERGY_FULL;
  this.prevenergy = this.energy;
  this.bulletCounter = 0;
  this.strokeStyle = "#ffff00";
  this.keyFrame = 0;

  this.postMove = this.wrapPostMove;

  this.collidesWith = ["enemybullet", "enemyship", "asteroid", "bigalien", "alienbullet"];

  this.previousKeyFrame = { vel: { rot: 0 }, accb: false };

  this.preMove = function (delta) {
    if (KEY_STATUS.left) {
      this.vel.rot = -5;
    } else if (KEY_STATUS.right) {
      this.vel.rot = 5;
    } else {
      this.vel.rot = 0;
    }

    if (KEY_STATUS.up) {
      if (this.energy > ENERGY_THRUST)
      {
/*        console.log('0');
        if (SFX.thrust().ended == true)   
        {     
          console.log('1');
          console.log(SFX.thrust().paused);
          SFX.thrust().play();
        }*/

        var rad = ((this.rot-90) * Math.PI)/180;
        this.acc.x = 0.5 * Math.cos(rad);
        this.acc.y = 0.5 * Math.sin(rad);
        this.children.exhaust.visible = Math.random() > 0.1;
        this.energy -= ENERGY_THRUST;
        myship.set({ship: {acc: this.acc, vel: this.vel, x: this.x, y: this.y, rot: this.rot, accb: KEY_STATUS.up, energy: this.energy }, user: currentUser  });
        this.prevenergy = this.energy;
        updateEnergy();
      }
    } else {
      this.acc.x = 0;
      this.acc.y = 0;
      this.children.exhaust.visible = false;
    }
    
    if (KEY_STATUS.m) {
        KEY_STATUS.m = false;
        SFX.muted = !SFX.muted;
    }

    if (KEY_STATUS.o) {
        KEY_STATUS.o = false;
        Game.spawnAsteroids(1);
    }

    if (KEY_STATUS.p) {
        KEY_STATUS.p = false;       
        Game.addBigAlien();
    }

    if (KEY_STATUS.q)
    {
      Game.FSM.state = 'player_died';
      Game.explosionAt(Game.ship.x, Game.ship.y);
      Game.ship.visible = false;
      Game.lives--;
      //this.currentNode.leave(this);
      //this.currentNode = null;
    }

    if (KEY_STATUS.w) // clear all asteroids and big aliens
    {
      for (sprite in Game.sprites) {
        if ((Game.sprites[sprite].name == 'asteroid') || (Game.sprites[sprite].name == 'bigalien')) {
          Game.sprites[sprite].die();
        }
      }
    }

    if (KEY_STATUS.z) { // warp
      if (this.energy > ENERGY_WARP)
      {
        SFX.warp().play();

        KEY_STATUS.z = false;
        this.x = Math.floor(Game.canvasWidth * Math.random());
        this.y = Math.floor(Game.canvasHeight * Math.random());
        this.energy -= ENERGY_WARP;
        myship.set({ship: {acc: this.acc, vel: this.vel, x: this.x, y: this.y, rot: this.rot, accb: KEY_STATUS.up, energy: this.energy }, user: currentUser  });
        this.prevenergy = this.energy;
        updateEnergy();
      }
    }

    if (KEY_STATUS.space) {
      if (this.bulletCounter <= 0) {
        this.bulletCounter = 10;
        for (var i = 0; i < this.bullets.length; i++) {
          if (!this.bullets[i].visible) {

            if (this.energy > ENERGY_SHOOT)
            {
              this.energy -= ENERGY_SHOOT;
              myship.set({ship: {acc: this.acc, vel: this.vel, x: this.x, y: this.y, rot: this.rot, accb: KEY_STATUS.up, energy: this.energy }, user: currentUser  });
              this.prevenergy = this.energy;
              updateEnergy();

              SFX.laser().play();
              var bullet = this.bullets[i];
              var rad = ((this.rot-90) * Math.PI)/180;
              var vectorx = Math.cos(rad);
              var vectory = Math.sin(rad);
              // move to the nose of the ship
              bullet.x = this.x + vectorx * 4;
              bullet.y = this.y + vectory * 4;
              bullet.vel.x = 6 * vectorx + this.vel.x;
              bullet.vel.y = 6 * vectory + this.vel.y;
              bullet.visible = true;
              bullet.fref = asteroids.child('bullets').push({s: myship.name(), x: bullet.x, y: bullet.y, vel: bullet.vel});
              bullet.fref.removeOnDisconnect();
            }
            break;
          }
        }
      }
    }



    if (this.bulletCounter > 0) {
      this.bulletCounter -= delta;
    }

    // limit the ship's speed
    if (Math.sqrt(this.vel.x * this.vel.x + this.vel.y * this.vel.y) > 8) {
      this.vel.x *= 0.95;
      this.vel.y *= 0.95;
    }

    if((this.vel.rot != this.previousKeyFrame.vel.rot) || (KEY_STATUS.up != this.previousKeyFrame.accb)) {
      myship.set({ship: {acc: this.acc, vel: this.vel, x: this.x, y: this.y, rot: this.rot, accb: KEY_STATUS.up, energy: this.energy }, user: currentUser  });
      myship.prevenergy = this.energy;
      updateEnergy();
    }
    this.previousKeyFrame = { vel: { rot: this.vel.rot }, accb: KEY_STATUS.up };

    this.keyFrame++;
    if(this.keyFrame % 60 == 0) {
      myship.set({ship: {acc: this.acc, vel: this.vel, x: this.x, y: this.y, rot: this.rot, accb: KEY_STATUS.up, energy: this.energy }, user: currentUser  });
      myship.prevenergy = myship.energy;
      updateEnergy();
    }
  };

  this.collision = function (other) {
//    console.log("I've been hit!");

    this.energy -= ENERGY_COLLISION;
    updateEnergy();
    myship.set({ship: {acc: this.acc, vel: this.vel, x: this.x, y: this.y, rot: this.rot, accb: KEY_STATUS.up, energy: this.energy }, user: currentUser  });

    SFX.explosion().play();
    if(other != null) {
      Game.explosionAt(other.x, other.y);
    }
    else {
      Game.explosionAt(Game.ship.x, Game.ship.y);
    }

    if (this.energy <= 0)
    {
//      console.log("death!");
      Game.FSM.state = 'player_died';
      this.visible = false;
      this.currentNode.leave(this);
      this.currentNode = null;
      Game.lives--;
      if (other != null && other.name == "enemyship") deltaScore(Math.floor(100 * Math.random()));
    }
  };

};
Ship.prototype = new Sprite();

//http://stackoverflow.com/questions/1267283/how-can-i-create-a-zerofilled-value-using-javascript
function zeroFill( number, width )
{
  width -= number.toString().length;
  if ( width > 0 )
  {
    return new Array( width + (/\./.test( number ) ? 2 : 1) ).join( '0' ) + number;
  }
  return number;
}

EnemyShip = function () {
  this.init("enemyship",
            [-5,   4,
              0, -12,
              5,   4]);

  this.children.exhaust = new Sprite();
  this.children.exhaust.strokeStyle = "#ff0000";
  this.children.exhaust.init("exhaust",
                             [-3,  6,
                               0, 11,
                               3,  6]);

  this.scale = 1.5;
  this.bulletCounter = 0;
  if (typeof(this.energy) == 'undefined')
    this.energy = 1;

  this.strokeStyle = '#ffffff';

  this.postMove = this.wrapPostMove;
  this.collidesWith = ["bullet"];

  this.computeStrokeStyle = function () {

    // the color should fade from white to red as the energy decreases
    var gbComponent = (parseInt(255 * this.energy / ENERGY_FULL)).toString(16);
    //gbComponent = gbComponent.slice(0,-1); // remove trailing f
    if (gbComponent.length < 2)
      gbComponent = Array(2 - gbComponent.length + 1).join("0") + gbComponent;

  //  if (gbComponent == '0')
  //    gbComponent = '00';
    this.strokeStyle = '#ff' + gbComponent + '' + gbComponent;    //"#ffffff";
  //  this.strokeStyle = 'green'; //'#' + gbComponent + 'ff' + gbComponent;    //"#ffffff";
  }

  this.draw = function () {
    if (!this.visible) return;

    this.context.lineWidth = 1.5 / this.scale;

    for (child in this.children) {
      this.children[child].draw();
    }

    this.context.beginPath();

    this.context.moveTo(this.points[0], this.points[1]);
    for (var i = 1; i < this.points.length/2; i++) {
      var xi = i*2;
      var yi = xi + 1;
      this.context.lineTo(this.points[xi], this.points[yi]);
    }

    this.context.closePath();
    this.context.strokeStyle = this.strokeStyle;
    if(this.eimg != null) {
     this.context.drawImage(this.eimg, 0, 0, 20, 20);
    }
    this.context.stroke();
  };

  this.preMove = function (delta) {
    // limit the ship's speed
    if (Math.sqrt(this.vel.x * this.vel.x + this.vel.y * this.vel.y) > 8) {
      this.vel.x *= 0.95;
      this.vel.y *= 0.95;
    }

    if(this.accb) {
      var rad = ((this.rot-90) * Math.PI)/180;
      this.acc.x = 0.5 * Math.cos(rad);
      this.acc.y = 0.5 * Math.sin(rad);
       this.children.exhaust.visible = Math.random() > 0.1;
    }
    else {
       this.acc.x = 0;
       this.acc.y = 0;
       this.children.exhaust.visible = false;
    }
  };

  this.collision = function (other) {
    SFX.explosion().play();
    Game.explosionAt(other.x, other.y);
//    console.log("enemy ship hit!");
    // Commenting out the below allowed bullets to hit ships consistently in new code
    //this.fref.remove();
    //this.visible = false;
    //this.currentNode.leave(this);
    //this.currentNode = null;
    ////Game.lives--;
  };

};
EnemyShip.prototype = new Sprite();


Asteroid = function () {
  this.init("asteroid",
            [-10,   0,
              -5,   7,
              -3,   4,
               1,  10,
               5,   4,
              10,   0,
               5,  -6,
               2, -10,
              -4, -10,
              -4,  -5]);

  this.visible = true;
  this.scale = 6;
  this.postMove = this.wrapPostMove;

  this.collidesWith = ["ship", "bullet", "bigalien", "alienbullet"];

  this.collision = function (other) {
    SFX.explosion().play();
    if (other.name == "bullet") Game.score += 120 / this.scale;
    this.scale /= 3;
    if (this.scale > 0.5) {
      // break into fragments
      for (var i = 0; i < 3; i++) {
        var roid = $.extend(true, {}, this);
        roid.vel.x = Math.random() * 6 - 3;
        roid.vel.y = Math.random() * 6 - 3;
        if (Math.random() > 0.5) {
          roid.points.reverse();
        }
        roid.vel.rot = Math.random() * 2 - 1;
        roid.move(roid.scale * 3); // give them a little push
        Game.sprites.push(roid);
      }
    }
    Game.explosionAt(other.x, other.y);
    this.die();
  };
};
Asteroid.prototype = new Sprite();

Bullet = function () {
  this.init("bullet", [0, 0]);
  this.time = 0;
  this.bridgesH = false;
  this.bridgesV = false;
  this.postMove = this.wrapPostMove;

  this.configureTransform = function () {};
  this.draw = function () {
    if (this.visible) {
      this.context.save();
      this.context.lineWidth = 2;
      this.context.beginPath();
      this.context.moveTo(this.x-1, this.y-1);
      this.context.lineTo(this.x+1, this.y+1);
      this.context.moveTo(this.x+1, this.y-1);
      this.context.lineTo(this.x-1, this.y+1);
      this.context.strokeStyle = "#ffffff";
      this.context.stroke();
      this.context.restore();
    }
  };
  this.preMove = function (delta) {
    if (this.visible) {
      this.time += delta;
    }
    if (this.time > 50) {
      this.visible = false;
      this.time = 0;
      if ((typeof(this.fref) != 'unknown') && (this.fref != null))
        this.fref.remove();
    }
  };
  this.collision = function (other) {
//    console.log("bullet hit");
    this.time = 0;    
    this.visible = false;
//TODO    this.fref.remove();
    this.currentNode.leave(this);
    this.currentNode = null;
    if (other.name == "enemyship") deltaScore(100);
  };
  this.transformedPoints = function (other) {
    return [this.x, this.y];
  };

};
Bullet.prototype = new Sprite();

EnemyBullet = function () {
  this.init("enemybullet", [0, 0]);
  this.time = 0;
  this.bridgesH = false;
  this.bridgesV = false;
  this.postMove = this.wrapPostMove;

  this.configureTransform = function () {};
  this.draw = function () {
    if (this.visible) {
      this.context.save();
      this.context.lineWidth = 2;
      this.context.beginPath();
      this.context.moveTo(this.x-1, this.y-1);
      this.context.lineTo(this.x+1, this.y+1);
      this.context.moveTo(this.x+1, this.y-1);
      this.context.lineTo(this.x-1, this.y+1);
      this.context.strokeStyle = "#ffffff"; // was red
      this.context.stroke();
      this.context.restore();
    }
  };
  this.preMove = function (delta) {
    if (this.visible) {
      this.time += delta;
    }
    if (this.time > 50) {
      this.visible = false;
      this.time = 0;
      this.fref.remove();
    }
  };
  this.collision = function (other) {
//    console.log("enemy bullet hit");
    this.time = 0;
    this.visible = false;
    this.currentNode.leave(this);
    this.currentNode = null;
  };
  this.transformedPoints = function (other) {
    return [this.x, this.y];
  };

};
EnemyBullet.prototype = new Sprite();

Explosion = function () {
  this.init("explosion");

  this.bridgesH = false;
  this.bridgesV = false;

  this.lines = [];
  for (var i = 0; i < 5; i++) {
    var rad = 2 * Math.PI * Math.random();
    var x = Math.cos(rad);
    var y = Math.sin(rad);
    this.lines.push([x, y, x*2, y*2]);
  }

  this.draw = function () {
    if (this.visible) {
      this.context.save();
      this.context.lineWidth = 1.0 / this.scale;
      this.context.beginPath();
      for (var i = 0; i < 5; i++) {
        var line = this.lines[i];
        this.context.moveTo(line[0], line[1]);
        this.context.lineTo(line[2], line[3]);
      }
      this.context.strokeStyle = "#CC3232";
      this.context.stroke();
      this.context.restore();
    }
  };

  this.preMove = function (delta) {
    if (this.visible) {
      this.scale += delta;
    }
    if (this.scale > 8) {
      this.die();
    }
  };
};
Explosion.prototype = new Sprite();

GridNode = function () {
  this.north = null;
  this.south = null;
  this.east  = null;
  this.west  = null;

  this.nextSprite = null;

  this.dupe = {
    horizontal: null,
    vertical:   null
  };

  this.enter = function (sprite) {
    sprite.nextSprite = this.nextSprite;
    this.nextSprite = sprite;
  };

  this.leave = function (sprite) {
    var ref = this;
    while (ref && (ref.nextSprite != sprite)) {
      ref = ref.nextSprite;
    }
    if (ref) {
      ref.nextSprite = sprite.nextSprite;
      sprite.nextSprite = null;
    }
  };

  this.eachSprite = function(sprite, callback) {
    var ref = this;
    while (ref.nextSprite) {
      ref = ref.nextSprite;
      callback.call(sprite, ref);
    }
  };

  this.isEmpty = function (collidables) {
    var empty = true;
    var ref = this;
    while (ref.nextSprite) {
      ref = ref.nextSprite;
      empty = !ref.visible || collidables.indexOf(ref.name) == -1
      if (!empty) break;
    }
    return empty;
  };
};


BigAlien = function () {
  this.init("bigalien",
            [-20,   0,
             -12,  -4,
              12,  -4,
              20,   0,
              12,   4,
             -12,   4,
             -20,   0,
              20,   0]);

  this.children.top = new Sprite();
  this.children.top.init("bigalien_top",
                         [-8, -4,
                          -6, -6,
                           6, -6,
                           8, -4]);
  this.children.top.visible = true;

  this.children.bottom = new Sprite();
  this.children.bottom.init("bigalien_top",
                            [ 8, 4,
                              6, 6,
                             -6, 6,
                             -8, 4]);
  this.children.bottom.visible = true;

  this.collidesWith = ["asteroid", "ship", "bullet"];

  this.bridgesH = false;

  this.bullets = [];
  this.bulletCounter = 0;

  this.newPosition = function () {
    if (Math.random() < 0.5) {
      this.x = -20;
      this.vel.x = 1.5;
    } else {
      this.x = Game.canvasWidth + 20;
      this.vel.x = -1.5;
    }
    this.y = Math.random() * Game.canvasHeight;
  };

  this.setup = function () {
    this.newPosition();

    for (var i = 0; i < 3; i++) {
      var bull = new AlienBullet();
      this.bullets.push(bull);
      Game.sprites.push(bull);
    }
  };

  this.preMove = function (delta) {
    var cn = this.currentNode;
    if (cn == null) return;

    var topCount = 0;
    if (cn.north.nextSprite) topCount++;
    if (cn.north.east.nextSprite) topCount++;
    if (cn.north.west.nextSprite) topCount++;

    var bottomCount = 0;
    if (cn.south.nextSprite) bottomCount++;
    if (cn.south.east.nextSprite) bottomCount++;
    if (cn.south.west.nextSprite) bottomCount++;

    if (topCount > bottomCount) {
      this.vel.y = 1;
    } else if (topCount < bottomCount) {
      this.vel.y = -1;
    } else if (Math.random() < 0.01) {
      this.vel.y = -this.vel.y;
    }

    this.bulletCounter -= delta;
    if (this.bulletCounter <= 0) {
      this.bulletCounter = 22;
      for (var i = 0; i < this.bullets.length; i++) {
        if (!this.bullets[i].visible) {
          bullet = this.bullets[i];
          var rad = 2 * Math.PI * Math.random();
          var vectorx = Math.cos(rad);
          var vectory = Math.sin(rad);
          bullet.x = this.x;
          bullet.y = this.y;
          bullet.vel.x = 6 * vectorx;
          bullet.vel.y = 6 * vectory;
          bullet.visible = true;
          SFX.laser().play();
          break;
        }
      }
    }

  };

  BigAlien.prototype.collision = function (other) {
    if (other.name == "bullet") Game.score += 200;
    SFX.explosion().play();
    Game.explosionAt(other.x, other.y);
    this.die();
    Game.bigAlienCount--;
  };

  this.postMove = function () {
    if (this.y > Game.canvasHeight) {
      this.y = 0;
    } else if (this.y < 0) {
      this.y = Game.canvasHeight;
    }

    if ((this.vel.x > 0 && this.x > Game.canvasWidth + 20) ||
        (this.vel.x < 0 && this.x < -20)) {
      // why did the alien cross the road?
      this.visible = false;
      this.newPosition();
    }
  }
};
BigAlien.prototype = new Sprite();


AlienBullet = function () {
  this.init("alienbullet");

  this.draw = function () {
    if (this.visible) {
      this.context.save();
      this.context.strokeStyle = "#FFFFFF";      
      this.context.lineWidth = 2;
      this.context.beginPath();
      this.context.moveTo(this.x, this.y);
      this.context.lineTo(this.x-this.vel.x, this.y-this.vel.y);
      this.context.stroke();
      this.context.restore();
    }
  };
};
AlienBullet.prototype = new Bullet();

// borrowed from typeface-0.14.js
// http://typeface.neocracy.org
Text = {
  renderGlyph: function (ctx, face, char) {
    this.context.strokeStyle = "#FFFFFF";
    this.context.fillStyle = "#FFFFFF";

    var glyph = face.glyphs[char];

    if (glyph.o) {

      var outline;
      if (glyph.cached_outline) {
        outline = glyph.cached_outline;
      } else {
        outline = glyph.o.split(' ');
        glyph.cached_outline = outline;
      }

      var outlineLength = outline.length;
      for (var i = 0; i < outlineLength; ) {

        var action = outline[i++];

        switch(action) {
          case 'm':
            ctx.moveTo(outline[i++], outline[i++]);
            break;
          case 'l':
            ctx.lineTo(outline[i++], outline[i++]);
            break;

          case 'q':
            var cpx = outline[i++];
            var cpy = outline[i++];
            ctx.quadraticCurveTo(outline[i++], outline[i++], cpx, cpy);
            break;

          case 'b':
            var x = outline[i++];
            var y = outline[i++];
            ctx.bezierCurveTo(outline[i++], outline[i++], outline[i++], outline[i++], x, y);
            break;
        }
      }
    }
    if (glyph.ha) {
      ctx.translate(glyph.ha, 0);
    }
  },

  renderText: function(text, size, x, y) {
    this.context.save();

    this.context.translate(x, y);

    var pixels = size * 72 / (this.face.resolution * 100);
    this.context.scale(pixels, -1 * pixels);
    this.context.beginPath();
    var chars = text.split('');
    var charsLength = chars.length;
    this.context.strokeStyle = "#FFFFFF";
    this.context.fillStyle = "#FFFFFF";
    for (var i = 0; i < charsLength; i++) {
      this.renderGlyph(this.context, this.face, chars[i]);
    }
    this.context.fill();

    this.context.restore();
  },

  context: null,
  face: null
};

SFX = {
  laser:     new Audio('39459__THE_bizniss__laser.wav'),
  explosion: new Audio('51467__smcameron__missile_explosion.wav'),
  warp: new Audio('Jump-SoundBible.com-1007297584.wav'), 
  death: new Audio('Bomb_Exploding-Sound_Explorer-68256487.wav'), 
  //  thrust: new Audio('Rocket Thrusters-SoundBible.com-1432176431.wav'),
};

// preload audio
for (var sfx in SFX) {
  (function () {
    var audio = SFX[sfx];
    audio.muted = true;
    audio.play();

    SFX[sfx] = function () {
      if (!this.muted) {
        if (audio.duration == 0) {
          // somehow dropped out
          audio.load();
          audio.play();
        } else {
          audio.muted = false;
          audio.currentTime = 0;
        }
      }
      return audio;
    }
  })();
}
// pre-mute audio
SFX.muted = true;

Game = {
  score: 0,
  lives: 0,

  canvasWidth: 1000,
  canvasHeight: 700,

  sprites: [],
  ship: null,

  bigAlienCount: 0,
  nextBigAlienTime: null,


  addBigAlien: function ()
  {
    var bigAlien = new BigAlien();
    bigAlien.setup();
    bigAlien.visible = true;
    Game.sprites.push(bigAlien);
    Game.bigAlienCount++;
  },

  spawnAsteroids: function (count) {
    if (!count) count = this.totalAsteroids;
    for (var i = 0; i < count; i++) {
      var roid = new Asteroid();
      roid.x = Math.random() * this.canvasWidth;
      roid.y = Math.random() * this.canvasHeight;
      while (!roid.isClear()) {
        roid.x = Math.random() * this.canvasWidth;
        roid.y = Math.random() * this.canvasHeight;
      }
      roid.vel.x = Math.random() * 4 - 2;
      roid.vel.y = Math.random() * 4 - 2;
      if (Math.random() > 0.5) {
        roid.points.reverse();
      }
      roid.vel.rot = Math.random() * 2 - 1;
      Game.sprites.push(roid);
    }
  },

  explosionAt: function (x, y) {
    var splosion = new Explosion();
    splosion.x = x;
    splosion.y = y;
    splosion.visible = true;
    Game.sprites.push(splosion);
  },

  FSM: {
    boot: function () {
      setScore(0);
      Game.ship.energy = 0;
      Text.renderText('Press any key to start', 30, 230, Game.canvasHeight/2 + 10);
    },
    start: function () {

      // 'any key' shouldn't do anything
      for (code in KEY_CODES) {
        KEY_STATUS[KEY_CODES[code]] = false;
      }

      for (sprite in Game.sprites) {
        if (Game.sprites[sprite].name == 'bullet') {
          Game.sprites[sprite].visible = false;
        }
      }

//      Game.spawnAsteroids(1); //TODO: for now.  should move it to a key instead

      setScore(0);
      Game.lives = mmoac.l; 

      Game.nextBigAlienTime = Date.now() + 30000 + (30000 * Math.random());

      this.state = 'spawn_ship';
    },
    spawn_ship: function () {
      Game.ship.x = Math.floor(Game.canvasWidth * Math.random());
      Game.ship.y = Math.floor(Game.canvasHeight* Math.random());
      if (Game.ship.isClear()) {
        Game.ship.rot = 0;
        Game.ship.vel.x = 0;
        Game.ship.vel.y = 0;
        Game.ship.energy = ENERGY_FULL;
        Game.ship.prevenergy = Game.ship.energy;
        Game.ship.visible = true;
        this.state = 'run';
      }
    },
    run: function () {
          if (Date.now() > Game.nextBigAlienTime) {
            // Uncomment whole block if we want to allow multiple aliens being automatically generated
            /* //if (Game.bigAlienCount == 0) //Uncomment if we want to allow only one at a time
            {
              Game.addBigAlien();
            } */
            //Game.nextBigAlienTime = Date.now() + (30000 * Math.random());    
      }
    },
    player_died: function () {
      if (Game.lives < 0) {
        this.state = 'end_game';
        Game.ship.energy = 0;
        updateEnergy();
        SFX.death().play();

      } else {
        if (this.timer == null) {
          this.timer = Date.now();
        }
        // wait a second before spawning
        if (Date.now() - this.timer > 1000) {
          this.timer = null;
          this.state = 'spawn_ship';
        }
      }
    },
    end_game: function () {
      Text.renderText('GAME OVER. Respawning...', 50, 30, Game.canvasHeight/2 + 10);
      if (this.timer == null) {
        this.timer = Date.now();
      }
      // wait 5 seconds then go back to start state
      if (Date.now() - this.timer > 5000) {
        this.timer = null;
        this.state = 'boot';

        var postScoreRef = scoreListRef.push();
        postScoreRef.setWithPriority({user: currentUser, score: Game.score}, Game.score);
      }
    },

    execute: function () {
      this[this.state]();
    },
    state: 'boot'
  }

};


$(function () {
  var canvas = $("#canvas");
  Game.canvasWidth  = canvas.width();
  Game.canvasHeight = canvas.height();

  canvas.on('mousedown', function() {
    KEY_STATUS.space = true;
    if (Game.FSM.state == 'boot')
    {
      Game.FSM.state = 'start';
    }
  });
  canvas.on('mouseup', function() {
    KEY_STATUS.space = false;
  });

  var context = canvas[0].getContext("2d");

  Text.context = context;
  Text.face = vector_battle;

  var gridWidth = Math.round(Game.canvasWidth / GRID_SIZE);
  var gridHeight = Math.round(Game.canvasHeight / GRID_SIZE);
  var grid = new Array(gridWidth);
  for (var i = 0; i < gridWidth; i++) {
    grid[i] = new Array(gridHeight);
    for (var j = 0; j < gridHeight; j++) {
      grid[i][j] = new GridNode();
    }
  }

  // set up the positional references
  for (var i = 0; i < gridWidth; i++) {
    for (var j = 0; j < gridHeight; j++) {
      var node   = grid[i][j];
      node.north = grid[i][(j == 0) ? gridHeight-1 : j-1];
      node.south = grid[i][(j == gridHeight-1) ? 0 : j+1];
      node.west  = grid[(i == 0) ? gridWidth-1 : i-1][j];
      node.east  = grid[(i == gridWidth-1) ? 0 : i+1][j];
    }
  }

  // set up borders
  for (var i = 0; i < gridWidth; i++) {
    grid[i][0].dupe.vertical            =  Game.canvasHeight;
    grid[i][gridHeight-1].dupe.vertical = -Game.canvasHeight;
  }

  for (var j = 0; j < gridHeight; j++) {
    grid[0][j].dupe.horizontal           =  Game.canvasWidth;
    grid[gridWidth-1][j].dupe.horizontal = -Game.canvasWidth;
  }

  var sprites = [];
  Game.sprites = sprites;

  // so all the sprites can use it
  Sprite.prototype.context = context;
  Sprite.prototype.grid    = grid;
  Sprite.prototype.matrix  = new Matrix(2, 3);

  var ship = new Ship();

//  ship.x = Game.canvasWidth / 2;
//  ship.y = Game.canvasHeight / 2;

  sprites.push(ship);

  ship.bullets = [];
  for (var i = 0; i < 10; i++) {
    var bull = new Bullet();
    ship.bullets.push(bull);
    sprites.push(bull);
  }
  Game.ship = ship;

  var extraDude = new Ship();
  extraDude.scale = 0.6;
  extraDude.visible = true;
  extraDude.preMove = null;
  extraDude.children = [];

  var i, j = 0;

  var avgFramerate = 0;
  var frameCount = 0;
  var elapsedCounter = 0;

  var lastFrame = Date.now();
  var thisFrame;
  var elapsed;
  var delta;

  var canvasNode = canvas[0];

  // shim layer with setTimeout fallback
  // from here:
  // http://paulirish.com/2011/requestanimationframe-for-smart-animating/
  window.requestAnimFrame = (function () {
    return  window.requestAnimationFrame       ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame    ||
            window.oRequestAnimationFrame      ||
            window.msRequestAnimationFrame     ||
            function (/* function */ callback, /* DOMElement */ element) {
              window.setTimeout(callback, 1000 / 60);
            };
  })();

  var mainLoop = function () {
    context.clearRect(0, 0, Game.canvasWidth, Game.canvasHeight);

    Game.FSM.execute();

    if (KEY_STATUS.g) {
      context.beginPath();
      for (var i = 0; i < gridWidth; i++) {
        context.moveTo(i * GRID_SIZE, 0);
        context.lineTo(i * GRID_SIZE, Game.canvasHeight);
      }
      for (var j = 0; j < gridHeight; j++) {
        context.moveTo(0, j * GRID_SIZE);
        context.lineTo(Game.canvasWidth, j * GRID_SIZE);
      }
      context.closePath();
      context.stroke();
    }

    thisFrame = Date.now();
    elapsed = thisFrame - lastFrame;
    lastFrame = thisFrame;
    delta = elapsed / 30;

    var i = 0;
    for (sprite in sprites) {
      var s = sprites[sprite];
      if(typeof(s) != undefined) {
        s.run(delta);
        if (s.reap) {
          s.reap = false;
          sprites.splice(i, 1);
          i--;
        }
      }
      i++;
    }

/*
    // extra dudes
    for (i = 0; i < Game.lives; i++) {
      context.save();
      extraDude.x = Game.canvasWidth - (8 * (i + 1));
      extraDude.y = 16;
      extraDude.configureTransform();
      extraDude.draw();
      context.restore();
    }
*/
    frameCount++;
    elapsedCounter += elapsed;
    if (elapsedCounter > 1000) {
      elapsedCounter -= 1000;
      avgFramerate = frameCount;
      frameCount = 0;


      if ((Game.ship.energy < ENERGY_FULL) && (Game.lives >= 0))
      {
        Game.ship.energy += ENERGY_REGEN;      
        if (myship.energy > ((ENERGY_REGEN * 4) + myship.prevenergy)) // We reduce activity by not updating all regenerated energy
          myship.set({ship: {acc: this.acc, vel: this.vel, x: this.x, y: this.y, rot: this.rot, accb: KEY_STATUS.up, energy: this.energy }, user: currentUser  });
        updateEnergy();
      }
    }

    requestAnimFrame(mainLoop, canvasNode);
  };

  mainLoop();

  asteroids.child('players').on('child_added', function(snapshot) {
    if(snapshot.name() != myship.name()) {
  var enemy = new EnemyShip();
  enemy.acc = snapshot.val().ship.acc;
  enemy.vel = snapshot.val().ship.vel;
  enemy.x = snapshot.val().ship.x;
  enemy.y = snapshot.val().ship.y;
  enemy.rot = snapshot.val().ship.rot;
  enemy.accb = snapshot.val().ship.accb;
  enemy.visible = true;
  enemy.user = snapshot.val().user;
  enemy.energy = snapshot.val().ship.energy;
  enemy.fref = asteroids.child('players').child(snapshot.name());

  enemy.computeStrokeStyle();

  if(typeof(enemy.user.photo) != undefined && enemy.user.photo != null) {
    enemy.eimg = new Image();
    enemy.eimg.src = enemy.user.photo;
  }
  else {
    enemy.eimg = null;
  }
  Game.sprites[snapshot.name()] = enemy;
  }
    else {
    }
  });

  asteroids.child('players').on('child_changed', function(snapshot) {
    if(snapshot.name() != myship.name()) {
  var enemy = Game.sprites[snapshot.name()];
  enemy.visible = true;
  enemy.acc = snapshot.val().ship.acc;
  enemy.vel = snapshot.val().ship.vel;
  enemy.x = snapshot.val().ship.x;
  enemy.y = snapshot.val().ship.y;
  enemy.energy = snapshot.val().ship.energy;
  enemy.rot = snapshot.val().ship.rot;
  enemy.accb = snapshot.val().ship.accb;
  enemy.user = snapshot.val().user;
  enemy.fref = asteroids.child('players').child(snapshot.name());

  enemy.computeStrokeStyle();

  if(typeof(enemy.user.photo) != undefined && enemy.user.photo != null) {
    enemy.eimg = new Image();
    enemy.eimg.src = enemy.user.photo;
  }
  else {
    enemy.eimg = null;
  }
    }
    else {
    }
  });

  asteroids.child('players').on('child_removed', function(snapshot) {
    if(snapshot.name() != myship.name()) {
      var enemy = Game.sprites[snapshot.name()];
      enemy.visible = false;
      delete Game.sprites[snapshot.name()];
      SFX.death().play();
    }
    else {
      Game.ship.collision(null);
    }
  });


  // bullet.fref = asteroids.child('bullets').push({s: myship.name(), x: bullet.x, y: bullet.y, vel: bullet.vel});
  asteroids.child('bullets').on('child_added', function(snapshot) {
     var bullet = snapshot.val();
     if(bullet.s != myship.name()) {
  var enemybullet = new EnemyBullet();
  enemybullet.x = bullet.x;
  enemybullet.y = bullet.y;
  enemybullet.vel = bullet.vel;
  enemybullet.visible = true;
  enemybullet.fref = asteroids.child('bullets').child(snapshot.name());
  Game.sprites['bullet:' + snapshot.name()] = enemybullet;
     }
  });

  asteroids.child('bullets').on('child_removed', function(snapshot) {
     var bullet = snapshot.val();
     if(bullet.s != myship.name()) {
  var enemybullet = Game.sprites['bullet:' + snapshot.name()];
  if(enemybullet != null) {
    enemybullet.visible = false;
  }
  delete Game.sprites['bullet:' + snapshot.name()];
     }
  });
});