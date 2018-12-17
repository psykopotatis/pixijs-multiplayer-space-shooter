var Game = function() {
    this._width = 1920;
    this._height = 1080;

    window.addEventListener('resize', function() {
        this.resize();
    }.bind(this), false);

    this.bgRender = new PIXI.CanvasRenderer({
        width: this._width,
        height: this._height
    });
    document.body.appendChild(this.bgRender.view);
    this.bgStage = new PIXI.Container();

    // Setup the rendering surface. 4th param is to make it transparent, so we see the stars
    this.renderer = new PIXI.CanvasRenderer({
        width: this._width,
        height: this._height,
        transparent: true
    });
    document.body.appendChild(this.renderer.view);
    // Create the main stage to draw on.
    this.stage = new PIXI.Container();

    // Setup physics world simulation
    this.world = new p2.World({
        gravity: [0, 0]
    });

    // Speed params for our ship
    this.speed = 200;
    this.turnSpeed = 2;

    window.addEventListener('keydown', function(event) {
        this.handleKeys(event.keyCode, true);

    }.bind(this), false);

    window.addEventListener('keyup', function(event) {
        this.handleKeys(event.keyCode, false);

    }.bind(this), false);

    this.enemyBodies = [];
    this.enemyGraphics = [];

    // Start running the game
    this.build();
};

Game.prototype = {
    build: function () {
        this.resize();
        this.drawStars();
        this.setupBoundaries();
        this.createShip();
        this.connect();
        // this.createEnemies();
        requestAnimationFrame(this.tick.bind(this));
    },

    connect: function() {
        // Setup connection to server
        this.socket = io('http://localhost:2000');

        var userId = Math.random().toString(36).substring(2, 15);

        this.socket.emit('register', {
            user: userId,
            x: this.ship.position[0],
            y: this.ship.position[1]            
        });

        this.socket.on('hello', function(userId) {
            console.log('hello!', userId);
        });

        this.socket.on('users', function(users) {
            console.log('users!', users);
        });    

        var that = this;
        this.socket.on('new_user', function(userData) {
            console.log('new_user!', userData);
            that.createAnotherPlayer(userData.x, userData.y)
        });
    },

    drawStars: function () {
        for (var i=0; i<1500; i++) {
            // Random parameters
            var x = Math.round(Math.random() * this._width);
            var y = Math.round(Math.random() * this._height);
            var rad = Math.ceil(Math.random() * 2);
            var alpha = Math.min(Math.random() + 0.25, 1);

            var star = new PIXI.Graphics();
            star.beginFill(0xFFFFFF, alpha);
            star.drawCircle(x, y, rad);
            star.endFill();

            // Attach the star to the BACKGROUND stage
            this.bgStage.addChild(star);
        }

        // Optimize: Render the stars once
        this.bgRender.render(this.bgStage);
    },

    setupBoundaries: function () {
        var walls = new PIXI.Graphics();
        walls.beginFill(0xFFFFFF, 0.5);
        // Top wall
        walls.drawRect(0,0, this._width, 10);
        // Right
        walls.drawRect(this._width - 10, 10, 10, this._height - 20);
        // Bottom
        walls.drawRect(0, this._height - 10, this._width, 10);
        // Left
        walls.drawRect(0, 10, 10, this._height - 20);

        // Attach the walls to the stage
        this.bgStage.addChild(walls);


        // Optimize: Render the bounds once
        this.bgRender.render(this.bgStage);

    },

    getRandomHexColor: function() {
        return '0x'+Math.floor(Math.random()*16777215).toString(16);
    },

    createAnotherPlayer: function(x, y) {
        // Create the ship object
        var ship = new p2.Body({
            mass: 1,
            angularVelocity: 0,
            damping: 0,
            angularDamping: 0,  // Prevent velocity to slow down during time
            position: [
                x,
                y
            ]
        });
        var shipShape = new p2.Box({width: 52, height: 69});
        ship.addShape(shipShape);
        this.world.addBody(ship);

        // Triangle
        var shipGraphics = new PIXI.Graphics();
        shipGraphics.beginFill(this.getRandomHexColor());
        shipGraphics.moveTo(26, 0);
        shipGraphics.lineTo(0, 60);
        shipGraphics.lineTo(52, 60);
        shipGraphics.endFill();

        // Cache the ship to only use one draw call per tick.
        var shipCache = new PIXI.CanvasRenderer({
            width: 52,
            height: 69,
            transparent: true
        });

        var shipCacheStage = new PIXI.Container();
        shipCacheStage.addChild(shipGraphics);
        shipCache.render(shipCacheStage);

        var shipTexture = PIXI.Texture.fromCanvas(shipCache.view);
        var anotherPlayerGraphic = new PIXI.Sprite(shipTexture);
        this.stage.addChild(anotherPlayerGraphic);

        this.enemyBodies.push(ship);
        this.enemyGraphics.push(anotherPlayerGraphic);
    },

    createShip: function() {
        // Create the ship object
        this.ship = new p2.Body({
            mass: 1,
            angularVelocity: 0,
            damping: 0,
            angularDamping: 0,  // Prevent velocity to slow down during time
            position: [
                Math.round(Math.random() * this._width),
                Math.round(Math.random() * this._height)
            ]
        });
        var shipShape = new p2.Box({width: 52, height: 69});
        this.ship.addShape(shipShape);
        this.world.addBody(this.ship);

        // Triangle
        var shipGraphics = new PIXI.Graphics();
        shipGraphics.beginFill(this.getRandomHexColor());
        shipGraphics.moveTo(26, 0);
        shipGraphics.lineTo(0, 60);
        shipGraphics.lineTo(52, 60);
        shipGraphics.endFill();

        // Cache the ship to only use one draw call per tick.
        var shipCache = new PIXI.CanvasRenderer({
            width: 52,
            height: 69,
            transparent: true
        });

        var shipCacheStage = new PIXI.Container();
        shipCacheStage.addChild(shipGraphics);
        shipCache.render(shipCacheStage);

        var shipTexture = PIXI.Texture.fromCanvas(shipCache.view);
        this.shipGraphics = new PIXI.Sprite(shipTexture);

        this.stage.addChild(this.shipGraphics);
    },

    /**
     * Handle key presses and filter them.
     * @param code - number, key code pressed
     * @param state - boolean
     */
    handleKeys: function(code, state) {
        switch(code) {
            case 65: // a
                this.keyLeft = state;
                break;

            case 68: // d
                this.keyRight = state;
                break;

            case 87: // w
                this.keyUp = state;
                break;
        }
    },

    updatePhysics: function() {
        // Update ship angular velocities for rotation
        if (this.keyLeft) {
            this.ship.angularVelocity = -1 * this.turnSpeed;
        } else if (this.keyRight) {
            this.ship.angularVelocity = this.turnSpeed;
        } else {
            this.ship.angularVelocity = 0;
        }

        // Apply force vector to our ship
        if (this.keyUp) {
            var angle = this.ship.angle + Math.PI / 2;
            this.ship.force[0] -= this.speed * Math.cos(angle);  // x
            this.ship.force[1] -= this.speed * Math.sin(angle);  // y
        }

        // Update ship graphics from physics simulation ship
        this.shipGraphics.x = this.ship.position[0];
        this.shipGraphics.y = this.ship.position[1];
        this.shipGraphics.rotation = this.ship.angle;

        // Warp ship to other side if out of bounds

        // Left-right
        if (this.ship.position[0] > this._width) {
            this.ship.position[0] = 0;
        } else if (this.ship.position[0] < 0) {
            this.ship.position[0] = this._width;
        }

        if (this.ship.position[1] > this._height) {
            this.ship.position[1] = 0;
        } else if (this.ship.position[1] < 0) {
            this.ship.position[1] = this._height;
        }

        for (var i=0; i<this.enemyBodies.length; i++) {
            this.enemyGraphics[i].x = this.enemyBodies[i].position[0];
            this.enemyGraphics[i].y = this.enemyBodies[i].position[1];
        }

            // Step simulation forward
        this.world.step(1 / 60);
    },

    resize: function() {
        var ratio = 1080 / 1920;
        var docWidth = document.body.clientWidth;
        var docHeight = document.body.clientHeight;

        if (docHeight / docWidth < ratio) {
            this.bgRender.view.style.height = '100%';
            this.renderer.view.style.height = '100%';
            this.bgRender.view.style.width = 'auto';
            this.renderer.view.style.width = 'auto';
        } else {
            this.bgRender.view.style.height = 'auto';
            this.renderer.view.style.height = 'auto';
            this.bgRender.view.style.width = '100%';
            this.renderer.view.style.width = '100%';
        }
    },

    // Fired at the end of the game loop to reset and redraw the canvas
    tick: function () {
        this.updatePhysics();

        // Render the stage for the current frame
        this.renderer.render(this.stage);

        // Begin the next frame
        requestAnimationFrame(this.tick.bind(this));
    }
};