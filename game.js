const GRID_SIZE = 9;
const TILE_SIZE = 64;
const COLORS = ['pink_jellyfish', 'blue_jellyfish', 'purple_jellyfish', 'green_jellyfish', 'yellow_jellyfish'];

class LoadingScene extends Phaser.Scene {
    constructor() {
        super({ key: 'LoadingScene' });
    }

    preload() {
        // Create loading bar background
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        
        // Add underwater background gradient
        const gradient = this.add.graphics();
        gradient.fillGradientStyle(0x1a2a6c, 0x1a2a6c, 0x1a2a6c, 0x1a2a6c, 255);
        gradient.fillRect(0, 0, width, height);
        
        // Add loading text
        const loadingText = this.add.text(width / 2, height / 2 - 50, 'Loading...', {
            fontSize: '32px',
            fill: '#ffffff',
            fontFamily: 'Arial'
        }).setOrigin(0.5);
        
        // Create loading bar
        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);
        
        // Add loading text
        const loadingBarText = this.add.text(width / 2, height / 2, '0%', {
            fontSize: '24px',
            fill: '#ffffff',
            fontFamily: 'Arial'
        }).setOrigin(0.5);
        
        // Create bubble particles
        const bubbles = this.add.particles(0, 0, {
            speed: { min: 50, max: 150 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.2, end: 0.4 },
            alpha: { start: 0.6, end: 0 },
            lifespan: 2000,
            quantity: 1,
            blendMode: 'ADD',
            tint: [0x88ffff, 0xffffff],
            emitZone: {
                type: 'random',
                source: new Phaser.Geom.Rectangle(0, 0, width, height)
            }
        });
        
        // Start bubble emission
        bubbles.start();
        
        // Create wave effect
        const wave = this.add.graphics();
        wave.lineStyle(2, 0x88ffff, 0.3);
        wave.beginPath();
        wave.moveTo(0, height / 2);
        for (let x = 0; x < width; x += 10) {
            const y = height / 2 + Math.sin(x / 50) * 20;
            wave.lineTo(x, y);
        }
        wave.strokePath();
        
        // Animate wave
        this.tweens.add({
            targets: wave,
            alpha: { from: 0.3, to: 0.6 },
            duration: 2000,
            yoyo: true,
            repeat: -1
        });
        
        // Load game assets
        this.load.on('progress', (value) => {
            progressBar.clear();
            progressBar.fillStyle(0x88ffff, 1);
            progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
            loadingBarText.setText(Math.round(value * 100) + '%');
        });
        
        this.load.on('complete', () => {
            // Fade out loading screen
            this.tweens.add({
                targets: [gradient, loadingText, progressBar, progressBox, loadingBarText, bubbles, wave],
                alpha: 0,
                duration: 1000,
                onComplete: () => {
                    this.scene.start('GameScene');
                }
            });
        });
        
        // Load all game assets
        COLORS.forEach(jellyfish => {
            this.load.image(jellyfish, `assets/${jellyfish}.png`);
        });
        
        this.load.image('whirlpool', 'assets/whirlpool.png');
        
        const soundFiles = [
            { key: 'match', path: 'assets/sounds/match.mp3' },
            { key: 'whirlpool', path: 'assets/sounds/whirlpool.mp3' },
            { key: 'levelup', path: 'assets/sounds/levelup.mp3' },
            { key: 'ambient', path: 'assets/sounds/ambient.mp3' },
            { key: 'pop', path: 'assets/sounds/pop.mp3' }
        ];
        
        soundFiles.forEach(sound => {
            this.load.audio(sound.key, sound.path);
        });
    }
}

class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.score = 0;
        this.moves = 0;
        this.level = 1;
        this.selectedTile = null;
        this.canMove = true;
        this.dragStartPos = null;
        this.comboCount = 0;
        this.revealedBlocks = new Set(); // Track revealed blocks
        this.whirlpools = new Set(); // Track whirlpool power-ups
        this.debugMode = false; // Debug mode flag
        
        // Add camera shake configuration
        this.cameraShake = {
            intensity: 0.005,
            duration: 100,
            ease: 'Quad.easeOut'
        };
        
        // Level thresholds with accelerating requirements
        this.levelThresholds = [
            0,      // Level 1
            100,    // Level 2
            250,    // Level 3
            450,    // Level 4
            700,    // Level 5
            1000,   // Level 6
            1400,   // Level 7
            1900,   // Level 8
            2500,   // Level 9
            3200    // Level 10
        ];
    }

    preload() {
        // Add loading event listeners
        this.load.on('loaderror', (fileObj) => {
            console.error('Error loading asset:', fileObj.src);
        });

        this.load.on('filecomplete', (key) => {
            console.log('Successfully loaded:', key);
        });

        // Load jellyfish sprites with error handling
        COLORS.forEach(jellyfish => {
            console.log('Attempting to load:', `assets/${jellyfish}.png`);
            this.load.image(jellyfish, `assets/${jellyfish}.png`);
        });

        // Load whirlpool sprite
        this.load.image('whirlpool', 'assets/whirlpool.png');

        // Load sound effects with error handling
        console.log('Loading sound effects...');
        const soundFiles = [
            { key: 'match', path: 'assets/sounds/match.mp3' },
            { key: 'whirlpool', path: 'assets/sounds/whirlpool.mp3' },
            { key: 'levelup', path: 'assets/sounds/levelup.mp3' },
            { key: 'ambient', path: 'assets/sounds/ambient.mp3' },
            { key: 'pop', path: 'assets/sounds/pop.mp3' }
        ];

        soundFiles.forEach(sound => {
            console.log('Loading sound:', sound.path);
            this.load.audio(sound.key, sound.path);
        });
    }

    create() {
        console.log('Creating game grid...');
        this.grid = [];
        this.gems = this.add.group();
        this.selectedTile = null;
        
        // Always set up debug controls
        this.setupDebugControls();
        
        // Initialize sound effects with error handling
        console.log('Initializing sound effects...');
        try {
            this.sounds = {
                match: this.sound.add('match', { volume: 0.6 }),
                whirlpool: this.sound.add('whirlpool', { volume: 0.7 }),
                levelup: this.sound.add('levelup', { volume: 0.8 }),
                ambient: this.sound.add('ambient', { 
                    volume: 0.3,
                    loop: true 
                }),
                pop: this.sound.add('pop', { volume: 0.5 })
            };

            // Add a start button for audio
            const startButton = this.add.text(
                this.game.config.width / 2,
                this.game.config.height / 2,
                'Click to Start',
                {
                    fontSize: '32px',
                    fill: '#fff',
                    backgroundColor: '#4a90e2',
                    padding: { x: 20, y: 10 }
                }
            ).setOrigin(0.5)
             .setInteractive()
             .on('pointerdown', () => {
                 // Resume audio context
                 if (this.sound.context.state === 'suspended') {
                     this.sound.context.resume();
                 }
                 
                 // Start ambient sound
                 console.log('Starting ambient sound...');
                 this.sounds.ambient.play();
                 
                 // Remove the start button
                 startButton.destroy();
                 
                 // Add sound state logging
                 Object.entries(this.sounds).forEach(([key, sound]) => {
                     console.log(`Sound ${key} initialized:`, {
                         volume: sound.volume,
                         isPlaying: sound.isPlaying,
                         duration: sound.duration
                     });
                 });
             });
        } catch (error) {
            console.error('Error initializing sounds:', error);
        }
        
        // Reset map blocks when game starts/restarts
        this.resetMapBlocks();
        
        // Reset game state
        this.score = 0;
        this.moves = 0;
        this.level = 1;
        this.comboCount = 0;
        
        // Add a background rectangle for the game area
        this.add.rectangle(0, 0, GRID_SIZE * TILE_SIZE, GRID_SIZE * TILE_SIZE, 0x222222).setOrigin(0, 0);
        
        // Create the red X graphics (initially invisible)
        this.createRedX();
        
        // Create particle emitter for underwater effects
        this.sparkleEmitter = this.add.particles(0, 0, {
            speed: { min: 30, max: 100 },
            angle: { min: 270, max: 315 }, // Bubbles float upward at an angle
            scale: { start: 0.2, end: 0.5 }, // Bubbles grow as they rise
            alpha: { start: 0.8, end: 0 },
            blendMode: 'ADD',
            lifespan: { min: 800, max: 1200 },
            tint: [0x88ffff, 0xffffff, 0x8888ff], // Underwater blue tints
            quantity: 1,
            gravityY: -50 // Makes bubbles float upward
        });
        this.sparkleEmitter.stop();
        
        // Create shimmer effect emitter
        this.shimmerEmitter = this.add.particles(0, 0, {
            speed: { min: 10, max: 30 },
            scale: { start: 0.3, end: 0 },
            alpha: { start: 0.3, end: 0 },
            blendMode: 'ADD',
            lifespan: { min: 500, max: 700 },
            tint: [0xaaffff, 0xffffff],
            quantity: 1
        });
        this.shimmerEmitter.stop();
        
        // Create swirl effect emitter
        this.swirlEmitter = this.add.particles(0, 0, {
            speed: { min: 100, max: 200 },
            scale: { start: 0.2, end: 0 },
            alpha: { start: 0.6, end: 0 },
            blendMode: 'ADD',
            tint: [0x88ffff, 0xaaffff, 0xffffff],
            lifespan: 1000,
            quantity: 1
        });
        this.swirlEmitter.stop();
        
        // Add trail effect emitter
        this.trailEmitter = this.add.particles(0, 0, {
            speed: { min: 50, max: 100 },
            scale: { start: 0.2, end: 0 },
            alpha: { start: 0.6, end: 0 },
            blendMode: 'ADD',
            tint: [0x88ffff, 0xaaffff],
            lifespan: 300,
            quantity: 1,
            emitZone: {
                type: 'random',
                source: new Phaser.Geom.Circle(0, 0, TILE_SIZE/4)
            }
        });
        this.trailEmitter.stop();

        // Add match highlight effect
        this.matchHighlight = this.add.graphics();
        this.matchHighlight.setAlpha(0);
        
        // Generate a new random board
        this.regenerateBoard();

        // Setup drag events
        this.input.on('dragstart', (pointer, gameObject) => {
            if (!this.canMove) return;
            if (this.selectedTile) {
                this.selectedTile.clearTint();
            }
            gameObject.setTint(0x00ff00);
            gameObject.setDepth(1);
            this.dragStartPos = { x: gameObject.x, y: gameObject.y };
        });

        this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
            if (!this.canMove) return;
            gameObject.x = dragX;
            gameObject.y = dragY;
        });

        this.input.on('dragend', (pointer, gameObject) => {
            if (!this.canMove) return;
            
            gameObject.clearTint();
            gameObject.setDepth(0);

            // Find the gem at the pointer position
            const pointerX = pointer.x;
            const pointerY = pointer.y;
            const targetGem = this.gems.getChildren().find(gem => {
                const bounds = gem.getBounds();
                return gem !== gameObject && 
                       pointerX >= bounds.left && 
                       pointerX <= bounds.right && 
                       pointerY >= bounds.top && 
                       pointerY <= bounds.bottom;
            });

            if (targetGem && this.isAdjacent(gameObject, targetGem)) {
                this.swapGems(gameObject, targetGem);
            } else {
                // Return to original position if invalid move
                gameObject.x = gameObject.originalX;
                gameObject.y = gameObject.originalY;
            }
        });

        // Update UI elements
        this.updateUI();
        console.log('Game initialization complete');
    }

    wouldCreateMatch(x, y, color) {
        // Check horizontal matches (need at least 2 same-colored gems to the left)
        if (x >= 2) {
            if (this.grid[x-1][y]?.color === color && 
                this.grid[x-2][y]?.color === color) {
                return true;
            }
        }
        
        // Check vertical matches (need at least 2 same-colored gems above)
        if (y >= 2) {
            if (this.grid[x][y-1]?.color === color && 
                this.grid[x][y-2]?.color === color) {
                return true;
            }
        }
        
        return false;
    }

    createGem(x, y) {
        let color;
        let attempts = 0;
        const maxAttempts = 10; // Prevent infinite loops
        
        // Keep trying colors until we find one that doesn't create a match
        do {
            color = COLORS[Phaser.Math.Between(0, COLORS.length - 1)];
            attempts++;
        } while (this.wouldCreateMatch(x, y, color) && attempts < maxAttempts);
        
        const gem = this.add.sprite(
            x * TILE_SIZE + TILE_SIZE / 2,
            y * TILE_SIZE + TILE_SIZE / 2,
            color
        );
        
        // Make sure the gem is visible and properly sized
        gem.setDisplaySize(TILE_SIZE - 4, TILE_SIZE - 4);
        
        // Enable input handling
        gem.setInteractive();
        this.input.setDraggable(gem);
        
        // Store grid position and original position
        gem.gridX = x;
        gem.gridY = y;
        gem.color = color;
        gem.originalX = gem.x;
        gem.originalY = gem.y;
        
        this.grid[x][y] = gem;
        this.gems.add(gem);

        // Add click handler
        gem.on('pointerdown', () => {
            if (!this.canMove) return;
            
            if (this.selectedTile) {
                if (this.isAdjacent(gem, this.selectedTile)) {
                    this.swapGems(gem, this.selectedTile);
                }
                // Always clear the selected tile's tint and reset selection
                this.selectedTile.clearTint();
                this.selectedTile = null;
            } else {
                gem.setTint(0x00ff00);
                this.selectedTile = gem;
            }
        });

        return gem;
    }

    findGemAtPosition(x, y) {
        const gridX = Math.floor(x / TILE_SIZE);
        const gridY = Math.floor(y / TILE_SIZE);
        
        if (gridX >= 0 && gridX < GRID_SIZE && gridY >= 0 && gridY < GRID_SIZE) {
            return this.grid[gridX][gridY];
        }
        return null;
    }

    isAdjacent(gem1, gem2) {
        const dx = Math.abs(gem1.gridX - gem2.gridX);
        const dy = Math.abs(gem1.gridY - gem2.gridY);
        return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
    }

    createSparkles(x, y, intensity) {
        // Bubble effect configuration
        const bubbleConfig = {
            speed: { min: 30 * intensity, max: 100 * intensity },
            scale: { start: 0.2 * intensity, end: 0.5 * intensity },
            alpha: { start: 0.8, end: 0 },
            lifespan: { min: 800, max: 1200 },
            quantity: Math.floor(4 * intensity),
            gravityY: -50 * intensity,
            emitZone: {
                type: 'random',
                source: new Phaser.Geom.Circle(0, 0, TILE_SIZE/3)
            }
        };
        
        // Shimmer effect configuration
        const shimmerConfig = {
            speed: { min: 10 * intensity, max: 30 * intensity },
            scale: { start: 0.3 * intensity, end: 0 },
            alpha: { start: 0.3, end: 0 },
            blendMode: 'ADD',
            lifespan: { min: 500, max: 700 },
            tint: [0xaaffff, 0xffffff],
            quantity: Math.floor(3 * intensity),
            emitZone: {
                type: 'random',
                source: new Phaser.Geom.Circle(0, 0, TILE_SIZE/2)
            }
        };
        
        // Create bubble trails
        this.sparkleEmitter.setPosition(x, y);
        this.sparkleEmitter.setConfig(bubbleConfig);
        this.sparkleEmitter.explode(15 * intensity);
        
        // Create water shimmer
        this.shimmerEmitter.setPosition(x, y);
        this.shimmerEmitter.setConfig(shimmerConfig);
        this.shimmerEmitter.explode(10 * intensity);
        
        // Add a ripple effect
        const ripple = this.add.circle(x, y, 5, 0x88ffff, 0.4);
        this.tweens.add({
            targets: ripple,
            scale: { from: 0.5, to: 2 },
            alpha: { from: 0.4, to: 0 },
            duration: 600,
            ease: 'Quad.easeOut',
            onComplete: () => ripple.destroy()
        });
    }

    createRedX() {
        // Create the red X graphics
        this.redX = this.add.graphics();
        this.redX.lineStyle(50, 0x800080);
        
        // Calculate the dimensions for the X
        const padding = 50; // Padding from the edges
        const startX = padding;
        const startY = padding;
        const endX = GRID_SIZE * TILE_SIZE - padding;
        const endY = GRID_SIZE * TILE_SIZE - padding;
        
        // Draw the X
        this.redX.beginPath();
        // First line (top-left to bottom-right)
        this.redX.moveTo(startX, startY);
        this.redX.lineTo(endX, endY);
        // Second line (top-right to bottom-left)
        this.redX.moveTo(endX, startY);
        this.redX.lineTo(startX, endY);
        this.redX.strokePath();
        
        // Set initial state
        this.redX.setAlpha(0);
    }

    showRedX() {
        // Reset alpha and scale
        this.redX.setAlpha(0);
        this.redX.setScale(0.8);
        
        // Create and return the animation promise
        return new Promise(resolve => {
            this.tweens.add({
                targets: this.redX,
                alpha: { from: 0, to: 1 },
                scale: { from: 0.8, to: 1.2 },
                duration: 200,
                yoyo: true,
                ease: 'Cubic.easeOut',
                onComplete: () => {
                    this.redX.setAlpha(0);
                    resolve();
                }
            });
        });
    }

    async swapGems(gem1, gem2) {
        this.canMove = false;
        this.moves++;
        this.comboCount = 0; // Reset combo count at the start of a new move
        
        // Store original positions
        const gem1OriginalX = gem1.gridX;
        const gem1OriginalY = gem1.gridY;
        const gem2OriginalX = gem2.gridX;
        const gem2OriginalY = gem2.gridY;
        
        // Swap grid positions
        gem1.gridX = gem2OriginalX;
        gem1.gridY = gem2OriginalY;
        gem2.gridX = gem1OriginalX;
        gem2.gridY = gem1OriginalY;
        
        this.grid[gem1.gridX][gem1.gridY] = gem1;
        this.grid[gem2.gridX][gem2.gridY] = gem2;

        // Animate the swap
        await Promise.all([
            this.tweenGem(gem1),
            this.tweenGem(gem2)
        ]);

        // Check for matches
        const matches = this.findMatches();
        if (matches.length > 0) {
            await this.handleMatches(matches);
        } else {
            // Swap back if no matches
            await this.swapBack(gem1, gem2, gem1OriginalX, gem1OriginalY, gem2OriginalX, gem2OriginalY);
            this.moves--;
        }

        this.updateUI();
        this.canMove = true;
    }

    async swapBack(gem1, gem2, gem1OriginalX, gem1OriginalY, gem2OriginalX, gem2OriginalY) {
        // Show the red X animation
        const redXAnimation = this.showRedX();
        
        // Return gems to their original positions
        gem1.gridX = gem1OriginalX;
        gem1.gridY = gem1OriginalY;
        gem2.gridX = gem2OriginalX;
        gem2.gridY = gem2OriginalY;
        
        this.grid[gem1.gridX][gem1.gridY] = gem1;
        this.grid[gem2.gridX][gem2.gridY] = gem2;

        // Animate the swap back and red X simultaneously
        await Promise.all([
            this.tweenGem(gem1),
            this.tweenGem(gem2),
            redXAnimation
        ]);
    }

    tweenGem(gem) {
        return new Promise(resolve => {
            this.tweens.add({
                targets: gem,
                x: gem.gridX * TILE_SIZE + TILE_SIZE / 2,
                y: gem.gridY * TILE_SIZE + TILE_SIZE / 2,
                duration: 200,
                ease: 'Back.easeOut',
                onStart: () => this.addTrailEffect(gem),
                onComplete: resolve
            });
        });
    }

    tweenGemFall(gem) {
        return new Promise(resolve => {
            this.tweens.add({
                targets: gem,
                x: gem.gridX * TILE_SIZE + TILE_SIZE / 2,
                y: gem.gridY * TILE_SIZE + TILE_SIZE / 2,
                duration: 500,
                ease: 'Bounce.easeOut', // Bouncy landing effect
                onComplete: resolve
            });
        });
    }

    findMatches() {
        const matches = [];
        const matchedGems = new Set(); // Track all matched gems to avoid double counting
        
        // First pass: Find all horizontal and vertical matches
        const allMatches = [];
        
        // Check horizontal matches
        for (let y = 0; y < GRID_SIZE; y++) {
            let matchLength = 1;
            let currentColor = null;
            let matchStart = 0;
            
            for (let x = 0; x < GRID_SIZE; x++) {
                const gem = this.grid[x][y];
                if (!gem || gem.isWhirlpool) {
                    matchLength = 1;
                    currentColor = null;
                    matchStart = x + 1;
                    continue;
                }
                
                if (currentColor === gem.color) {
                    matchLength++;
                } else {
                    if (matchLength >= 3) {
                        const matchedGems = Array.from({ length: matchLength }, 
                            (_, i) => this.grid[matchStart + i][y]);
                        allMatches.push({
                            gems: matchedGems,
                            color: currentColor,
                            type: 'horizontal'
                        });
                    }
                    matchLength = 1;
                    matchStart = x;
                }
                currentColor = gem.color;
            }
            
            // Check for match at end of row
            if (matchLength >= 3) {
                const matchedGems = Array.from({ length: matchLength }, 
                    (_, i) => this.grid[matchStart + i][y]);
                allMatches.push({
                    gems: matchedGems,
                    color: currentColor,
                    type: 'horizontal'
                });
            }
        }

        // Check vertical matches
        for (let x = 0; x < GRID_SIZE; x++) {
            let matchLength = 1;
            let currentColor = null;
            let matchStart = 0;
            
            for (let y = 0; y < GRID_SIZE; y++) {
                const gem = this.grid[x][y];
                if (!gem || gem.isWhirlpool) {
                    matchLength = 1;
                    currentColor = null;
                    matchStart = y + 1;
                    continue;
                }
                
                if (currentColor === gem.color) {
                    matchLength++;
                } else {
                    if (matchLength >= 3) {
                        const matchedGems = Array.from({ length: matchLength }, 
                            (_, i) => this.grid[x][matchStart + i]);
                        allMatches.push({
                            gems: matchedGems,
                            color: currentColor,
                            type: 'vertical'
                        });
                    }
                    matchLength = 1;
                    matchStart = y;
                }
                currentColor = gem.color;
            }
            
            if (matchLength >= 3) {
                const matchedGems = Array.from({ length: matchLength }, 
                    (_, i) => this.grid[x][matchStart + i]);
                allMatches.push({
                    gems: matchedGems,
                    color: currentColor,
                    type: 'vertical'
                });
            }
        }

        // Second pass: Combine connected matches of the same color
        const processedMatches = new Set();
        
        for (let i = 0; i < allMatches.length; i++) {
            if (processedMatches.has(i)) continue;
            
            const match = allMatches[i];
            const connectedGems = new Set(match.gems);
            processedMatches.add(i);
            
            // Look for other matches of the same color that share gems
            for (let j = i + 1; j < allMatches.length; j++) {
                if (processedMatches.has(j)) continue;
                
                const otherMatch = allMatches[j];
                if (otherMatch.color === match.color) {
                    // Check if matches share any gems
                    const hasSharedGem = otherMatch.gems.some(gem => 
                        match.gems.some(matchGem => matchGem === gem)
                    );
                    
                    if (hasSharedGem) {
                        // Add all gems from the other match
                        otherMatch.gems.forEach(gem => connectedGems.add(gem));
                        processedMatches.add(j);
                    }
                }
            }
            
            // Convert Set back to array and create the match object
            const combinedGems = Array.from(connectedGems);
            if (combinedGems.length >= 5) {
                // Find center of the match for whirlpool placement
                const centerGem = combinedGems[Math.floor(combinedGems.length / 2)];
                matches.push({
                    gems: combinedGems,
                    createWhirlpool: { 
                        x: centerGem.gridX, 
                        y: centerGem.gridY 
                    }
                });
            } else if (combinedGems.length >= 3) {
                matches.push({ gems: combinedGems });
            }
        }

        return matches;
    }

    checkLevelUp() {
        if (this.level >= this.levelThresholds.length) return; // Max level reached
        
        const nextThreshold = this.levelThresholds[this.level];
        if (this.score >= nextThreshold) {
            const oldLevel = this.level;
            this.level++;
            
            // Visual feedback for level up
            this.createLevelUpEffect();
            
            // Get all unrevealed blocks
            const unrevealedBlocks = Array.from(document.querySelectorAll('.map-block:not(.revealed)'));
            
            if (unrevealedBlocks.length > 0) {
                // Randomly select a block to reveal
                const randomIndex = Math.floor(Math.random() * unrevealedBlocks.length);
                const blockToReveal = unrevealedBlocks[randomIndex];
                
                // Add to revealed set and add revealed class
                this.revealedBlocks.add(blockToReveal.getAttribute('data-level'));
                blockToReveal.classList.add('revealed');
                
                // Add some sparkles near the revealed block
                const rect = blockToReveal.getBoundingClientRect();
                const x = rect.left + rect.width / 2;
                const y = rect.top + rect.height / 2;
                this.createSparkles(x, y, 2);

                // Check if all blocks are now revealed
                const allBlocks = document.querySelectorAll('.map-block');
                const allRevealed = Array.from(allBlocks).every(block => block.classList.contains('revealed'));
                
                if (allRevealed) {
                    // Center the treasure map
                    const mapContainer = document.querySelector('.treasure-map');
                    mapContainer.style.position = 'fixed';
                    mapContainer.style.top = '50%';
                    mapContainer.style.left = '50%';
                    mapContainer.style.transform = 'translate(-50%, -50%)';
                    mapContainer.style.zIndex = '1000';
                    
                    // Add victory message
                    const victoryMessage = document.createElement('div');
                    victoryMessage.className = 'victory-message';
                    victoryMessage.innerHTML = 'Congratulations, you win!';
                    document.body.appendChild(victoryMessage);
                    
                    // Add victory message styles
                    const style = document.createElement('style');
                    style.textContent = `
                        .victory-message {
                            position: fixed;
                            top: 50%;
                            left: 50%;
                            transform: translate(-50%, -50%);
                            font-size: 48px;
                            font-weight: bold;
                            color: #FFD700;
                            text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
                            z-index: 1001;
                            text-align: center;
                            animation: victoryPulse 2s infinite;
                        }
                        @keyframes victoryPulse {
                            0% { transform: translate(-50%, -50%) scale(1); }
                            50% { transform: translate(-50%, -50%) scale(1.1); }
                            100% { transform: translate(-50%, -50%) scale(1); }
                        }
                    `;
                    document.head.appendChild(style);
                }
            }
            
            // Update UI
            this.updateUI();
        }
    }

    async handleMatches(matches) {
        this.comboCount++;
        
        // Play match sound with increasing pitch for combos
        try {
            if (this.sound.context.state === 'suspended') {
                this.sound.context.resume();
            }
            console.log('Playing match sound...');
            this.sounds.match.play({
                rate: 1 + (this.comboCount * 0.1)
            });
        } catch (error) {
            console.error('Error playing match sound:', error);
        }
        
        // Add screen shake based on combo count
        await this.shakeScreen(this.comboCount * 0.5, 100 + (this.comboCount * 20));
        
        // Track whirlpool creation positions
        const whirlpoolPositions = [];
        
        // Create underwater effects for each match
        matches.forEach(match => {
            const gems = match.gems;
            const centerGem = gems[Math.floor(gems.length / 2)];
            const centerX = centerGem.x;
            const centerY = centerGem.y;
            
            // Highlight the match
            this.highlightMatch(gems);
            
            // Store whirlpool creation position if it's a match of 5 or more
            if (match.createWhirlpool) {
                whirlpoolPositions.push({
                    ...match.createWhirlpool,
                    matchLength: gems.length
                });
            }
            
            // Create main sparkle effect at the center
            this.createSparkles(centerX, centerY, this.comboCount);
            
            // Create bubble trails from each matched jellyfish
            gems.forEach((gem, index) => {
                if (gem !== centerGem) {
                    const trailIntensity = this.comboCount * (0.3 + (index * 0.2));
                    const numTrails = 3;
                    for (let i = 0; i < numTrails; i++) {
                        setTimeout(() => {
                            const offsetX = Phaser.Math.Between(-10, 10);
                            const offsetY = Phaser.Math.Between(-10, 10);
                            this.createBubbleTrail(
                                gem.x + offsetX,
                                gem.y + offsetY,
                                trailIntensity
                            );
                        }, i * 100);
                    }
                }
            });
        });

        // Fade out and remove matched gems
        await Promise.all(matches.flatMap(match => match.gems).map(gem => {
            return new Promise(resolve => {
                // Play pop sound for each gem
                try {
                    if (this.sound.context.state === 'suspended') {
                        this.sound.context.resume();
                    }
                    console.log('Playing pop sound...');
                    this.sounds.pop.play({
                        rate: 1 + (Math.random() * 0.2)
                    });
                } catch (error) {
                    console.error('Error playing pop sound:', error);
                }
                
                this.tweens.add({
                    targets: gem,
                    alpha: 0,
                    scale: 1.2,
                    duration: 400,
                    ease: 'Power2',
                    onComplete: () => {
                        const baseScore = 10 * this.comboCount;
                        const levelBonus = Math.floor(baseScore * (this.level * 0.1));
                        this.score += baseScore + levelBonus;
                        
                        this.grid[gem.gridX][gem.gridY] = null;
                        gem.destroy();
                        resolve();
                    }
                });
            });
        }));

        // Create whirlpools after gems are cleared
        whirlpoolPositions.forEach(pos => {
            this.createWhirlpool(pos.x, pos.y, pos.matchLength);
        });

        // Check for level up
        this.checkLevelUp();

        // Let gems fall
        await this.cascadeGems();

        // Fill empty spaces
        this.fillEmptySpaces();

        // Check for new matches
        const newMatches = this.findMatches();
        if (newMatches.length > 0) {
            await this.handleMatches(newMatches);
        }

        this.updateUI();
    }

    createBubbleTrail(x, y, intensity) {
        // Configuration for smaller, more delicate bubble trails
        const bubbleConfig = {
            speed: { min: 20 * intensity, max: 60 * intensity },
            scale: { start: 0.1 * intensity, end: 0.3 * intensity },
            alpha: { start: 0.6, end: 0 },
            lifespan: { min: 600, max: 1000 },
            quantity: Math.floor(2 * intensity),
            gravityY: -30 * intensity,
            emitZone: {
                type: 'random',
                source: new Phaser.Geom.Circle(0, 0, TILE_SIZE/4)
            }
        };
        
        // Create smaller bubble trails
        this.sparkleEmitter.setPosition(x, y);
        this.sparkleEmitter.setConfig(bubbleConfig);
        this.sparkleEmitter.explode(8 * intensity);
        
        // Add a small ripple effect
        const ripple = this.add.circle(x, y, 3, 0x88ffff, 0.3);
        this.tweens.add({
            targets: ripple,
            scale: { from: 0.3, to: 1.5 },
            alpha: { from: 0.3, to: 0 },
            duration: 400,
            ease: 'Quad.easeOut',
            onComplete: () => ripple.destroy()
        });
    }

    async cascadeGems() {
        let moved = false;

        for (let x = 0; x < GRID_SIZE; x++) {
            for (let y = GRID_SIZE - 1; y > 0; y--) {
                if (!this.grid[x][y]) {
                    for (let above = y - 1; above >= 0; above--) {
                        if (this.grid[x][above]) {
                            this.grid[x][y] = this.grid[x][above];
                            this.grid[x][above] = null;
                            this.grid[x][y].gridY = y;
                            moved = true;
                            break;
                        }
                    }
                }
            }
        }

        if (moved) {
            await Promise.all(
                this.gems.getChildren()
                    .filter(gem => gem.y < gem.gridY * TILE_SIZE + TILE_SIZE / 2) // Only animate gems that need to fall
                    .map(gem => this.tweenGemFall(gem))
            );
        }
    }

    fillEmptySpaces() {
        for (let x = 0; x < GRID_SIZE; x++) {
            for (let y = 0; y < GRID_SIZE; y++) {
                if (!this.grid[x][y]) {
                    this.createGem(x, y);
                }
            }
        }
    }

    updateUI() {
        document.getElementById('score-value').textContent = this.score;
        document.getElementById('moves-value').textContent = this.moves;
        document.getElementById('level-value').textContent = this.level;
        
        // Update next level threshold
        const nextThreshold = this.level < this.levelThresholds.length ? 
            this.levelThresholds[this.level] : 
            'MAX';
        document.getElementById('next-level-value').textContent = nextThreshold;

        // Update debug text if it exists
        if (this.debugMode && this.debugText) {
            this.debugText.setText([
                'Debug Mode: ON',
                `Score: ${this.score}`,
                `Moves: ${this.moves}`,
                `Level: ${this.level}`,
                `Combo: ${this.comboCount}`
            ].join('\n'));
        }
    }

    resetMapBlocks() {
        // Remove 'revealed' class from all blocks and clear the revealed set
        const blocks = document.querySelectorAll('.map-block');
        blocks.forEach(block => {
            block.classList.remove('revealed');
        });
        this.revealedBlocks.clear();
    }

    hasAvailableMatches() {
        // Check each position for potential matches by swapping with adjacent gems
        for (let x = 0; x < GRID_SIZE; x++) {
            for (let y = 0; y < GRID_SIZE; y++) {
                // Check right swap
                if (x < GRID_SIZE - 1) {
                    // Simulate swap with right neighbor
                    const temp = this.grid[x][y].color;
                    const rightColor = this.grid[x + 1][y].color;
                    this.grid[x][y].color = rightColor;
                    this.grid[x + 1][y].color = temp;
                    
                    // Check for matches
                    const matches = this.findMatches();
                    
                    // Swap back
                    this.grid[x][y].color = temp;
                    this.grid[x + 1][y].color = rightColor;
                    
                    if (matches.length > 0) return true;
                }
                
                // Check down swap
                if (y < GRID_SIZE - 1) {
                    // Simulate swap with bottom neighbor
                    const temp = this.grid[x][y].color;
                    const bottomColor = this.grid[x][y + 1].color;
                    this.grid[x][y].color = bottomColor;
                    this.grid[x][y + 1].color = temp;
                    
                    // Check for matches
                    const matches = this.findMatches();
                    
                    // Swap back
                    this.grid[x][y].color = temp;
                    this.grid[x][y + 1].color = bottomColor;
                    
                    if (matches.length > 0) return true;
                }
            }
        }
        return false;
    }

    async createSwirlingEffect() {
        const centerX = (GRID_SIZE * TILE_SIZE) / 2;
        const centerY = (GRID_SIZE * TILE_SIZE) / 2;
        const radius = GRID_SIZE * TILE_SIZE * 0.4;
        const duration = 1000;
        const particlesPerSwirl = 30;
        
        // Create swirling water effect
        for (let i = 0; i < particlesPerSwirl; i++) {
            const angle = (i / particlesPerSwirl) * Math.PI * 2;
            const startX = centerX + Math.cos(angle) * radius;
            const startY = centerY + Math.sin(angle) * radius;
            
            // Create swirling particle
            const particle = this.add.circle(startX, startY, 4, 0x88ffff, 0.6);
            
            // Animate particle in a spiral
            this.tweens.add({
                targets: particle,
                x: centerX,
                y: centerY,
                scale: { from: 1, to: 0 },
                alpha: { from: 0.6, to: 0 },
                duration: duration,
                ease: 'Quad.in',
                onComplete: () => particle.destroy()
            });
        }
        
        // Add bubble effects around the board
        for (let i = 0; i < 20; i++) {
            setTimeout(() => {
                const side = Phaser.Math.Between(0, 3); // 0: top, 1: right, 2: bottom, 3: left
                let x, y;
                
                switch (side) {
                    case 0: // top
                        x = Phaser.Math.Between(0, GRID_SIZE * TILE_SIZE);
                        y = 0;
                        break;
                    case 1: // right
                        x = GRID_SIZE * TILE_SIZE;
                        y = Phaser.Math.Between(0, GRID_SIZE * TILE_SIZE);
                        break;
                    case 2: // bottom
                        x = Phaser.Math.Between(0, GRID_SIZE * TILE_SIZE);
                        y = GRID_SIZE * TILE_SIZE;
                        break;
                    case 3: // left
                        x = 0;
                        y = Phaser.Math.Between(0, GRID_SIZE * TILE_SIZE);
                        break;
                }
                
                this.createBubbleTrail(x, y, 1.5);
            }, i * 50);
        }
        
        // Create a wave ripple effect
        const ripple = this.add.circle(centerX, centerY, 10, 0x88ffff, 0.3);
        this.tweens.add({
            targets: ripple,
            scale: { from: 0, to: 8 },
            alpha: { from: 0.3, to: 0 },
            duration: duration,
            ease: 'Quad.out',
            onComplete: () => ripple.destroy()
        });
        
        // Wait for the effect to complete
        return new Promise(resolve => setTimeout(resolve, duration));
    }

    createWhirlpool(x, y, matchLength) {
        const whirlpool = this.add.sprite(
            x * TILE_SIZE + TILE_SIZE / 2,
            y * TILE_SIZE + TILE_SIZE / 2,
            'whirlpool'
        );
        
        whirlpool.setDisplaySize(TILE_SIZE - 4, TILE_SIZE - 4);
        whirlpool.gridX = x;
        whirlpool.gridY = y;
        whirlpool.isWhirlpool = true;
        whirlpool.powerLevel = Math.floor((matchLength - 4) / 2); // 5=0, 6-7=1, 8=2 rows
        
        // Add continuous rotation animation
        this.tweens.add({
            targets: whirlpool,
            rotation: Math.PI * 2,
            duration: 2000,
            repeat: -1,
            ease: 'Linear'
        });
        
        // Add pulsing effect with intensity based on power level
        this.tweens.add({
            targets: whirlpool,
            scale: 1.1 + (whirlpool.powerLevel * 0.1),
            duration: 1000 - (whirlpool.powerLevel * 100),
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        // Add glow effect based on power level
        const glowIntensity = 0.3 + (whirlpool.powerLevel * 0.2);
        const glowColor = 0x88ffff;
        const glow = this.add.circle(
            whirlpool.x,
            whirlpool.y,
            TILE_SIZE / 2,
            glowColor,
            glowIntensity
        );
        whirlpool.glow = glow;
        
        // Make interactive
        whirlpool.setInteractive();
        whirlpool.on('pointerdown', () => this.activateWhirlpool(whirlpool));
        
        this.grid[x][y] = whirlpool;
        this.whirlpools.add(whirlpool);
        return whirlpool;
    }

    async activateWhirlpool(whirlpool) {
        if (!this.canMove) return;
        this.canMove = false;
        
        // Play whirlpool sound
        try {
            if (this.sound.context.state === 'suspended') {
                this.sound.context.resume();
            }
            console.log('Playing whirlpool sound...');
            this.sounds.whirlpool.play();
        } catch (error) {
            console.error('Error playing whirlpool sound:', error);
        }
        
        // Create intense whirlpool effect
        const particles = this.add.particles(0, 0, {
            speed: { min: 100 + (whirlpool.powerLevel * 50), max: 200 + (whirlpool.powerLevel * 50) },
            scale: { start: 0.6, end: 0 },
            blendMode: 'ADD',
            tint: [0x88ffff, 0xaaffff, 0xffffff],
            lifespan: 1000,
            quantity: 2 + whirlpool.powerLevel
        });
        
        particles.setPosition(whirlpool.x, whirlpool.y);
        
        // Animate whirlpool growing and spinning faster
        const growTween = this.tweens.add({
            targets: whirlpool,
            scale: 1.5 + (whirlpool.powerLevel * 0.2),
            rotation: Math.PI * (6 + whirlpool.powerLevel * 2),
            duration: 1000,
            ease: 'Quad.easeIn'
        });
        
        // Wait for animation
        await new Promise(resolve => growTween.on('complete', resolve));
        
        // Calculate rows to clear based on power level
        const rowsToRemove = 1 + whirlpool.powerLevel;
        const startRow = Math.max(0, whirlpool.gridY - Math.floor(rowsToRemove / 2));
        const gemsToRemove = [];
        
        // Collect gems from all affected rows
        for (let rowOffset = 0; rowOffset < rowsToRemove; rowOffset++) {
            const currentRow = startRow + rowOffset;
            if (currentRow >= GRID_SIZE) break;
            
            for (let x = 0; x < GRID_SIZE; x++) {
                if (this.grid[x][currentRow] && this.grid[x][currentRow] !== whirlpool) {
                    gemsToRemove.push(this.grid[x][currentRow]);
                }
            }
        }
        
        // Create wave effect for each row
        for (let rowOffset = 0; rowOffset < rowsToRemove; rowOffset++) {
            const currentRow = startRow + rowOffset;
            if (currentRow >= GRID_SIZE) break;
            
            for (let x = 0; x < GRID_SIZE; x++) {
                const delay = (x + rowOffset * GRID_SIZE) * 50;
                const waveParticles = this.add.particles(
                    x * TILE_SIZE + TILE_SIZE / 2,
                    currentRow * TILE_SIZE + TILE_SIZE / 2,
                    {
                        speed: { min: 50, max: 150 },
                        scale: { start: 0.4, end: 0 },
                        blendMode: 'ADD',
                        tint: [0x88ffff, 0xaaffff],
                        lifespan: 800,
                        quantity: 10 + (whirlpool.powerLevel * 5)
                    }
                );
                
                setTimeout(() => waveParticles.destroy(), 1000);
            }
        }
        
        // Remove gems with swirl effect
        await Promise.all(gemsToRemove.map(gem => {
            return new Promise(resolve => {
                this.tweens.add({
                    targets: gem,
                    scale: 0,
                    rotation: Math.PI * 2,
                    alpha: 0,
                    duration: 500,
                    delay: (gem.gridX + (gem.gridY - startRow) * GRID_SIZE) * 50,
                    ease: 'Back.easeIn',
                    onComplete: () => {
                        this.grid[gem.gridX][gem.gridY] = null;
                        gem.destroy();
                        resolve();
                    }
                });
            });
        }));
        
        // Remove whirlpool and its glow
        this.whirlpools.delete(whirlpool);
        this.grid[whirlpool.gridX][whirlpool.gridY] = null;
        whirlpool.glow.destroy();
        whirlpool.destroy();
        particles.destroy();
        
        // Add score for cleared gems with bonus multiplier based on power level
        this.score += gemsToRemove.length * 50 * (1 + whirlpool.powerLevel);
        
        // Let gems fall and fill spaces
        await this.cascadeGems();
        this.fillEmptySpaces();
        
        // Check for new matches
        const newMatches = this.findMatches();
        if (newMatches.length > 0) {
            await this.handleMatches(newMatches);
        }
        
        this.updateUI();
        this.canMove = true;
    }

    // Add screen shake method
    async shakeScreen(intensity = 1, duration = 100) {
        const camera = this.cameras.main;
        const originalX = camera.scrollX;
        const originalY = camera.scrollY;
        
        const shakeIntensity = this.cameraShake.intensity * intensity;
        
        return new Promise(resolve => {
            this.tweens.add({
                targets: camera,
                scrollX: {
                    value: originalX + (Math.random() - 0.5) * shakeIntensity * 100,
                    duration: duration,
                    ease: this.cameraShake.ease,
                    yoyo: true,
                    repeat: 1
                },
                scrollY: {
                    value: originalY + (Math.random() - 0.5) * shakeIntensity * 100,
                    duration: duration,
                    ease: this.cameraShake.ease,
                    yoyo: true,
                    repeat: 1
                },
                onComplete: () => {
                    camera.scrollX = originalX;
                    camera.scrollY = originalY;
                    resolve();
                }
            });
        });
    }

    // Add trail effect to gems
    addTrailEffect(gem) {
        this.trailEmitter.setPosition(gem.x, gem.y);
        this.trailEmitter.start();
        
        // Stop trail after a short delay
        setTimeout(() => {
            this.trailEmitter.stop();
        }, 300);
    }

    // Enhance match highlighting
    highlightMatch(gems) {
        this.matchHighlight.clear();
        this.matchHighlight.lineStyle(4, 0x88ffff, 0.8);
        
        // Draw connecting lines between gems
        for (let i = 0; i < gems.length - 1; i++) {
            const gem1 = gems[i];
            const gem2 = gems[i + 1];
            
            this.matchHighlight.beginPath();
            this.matchHighlight.moveTo(gem1.x, gem1.y);
            this.matchHighlight.lineTo(gem2.x, gem2.y);
            this.matchHighlight.strokePath();
        }
        
        // Add glow effects as separate graphics objects
        const glowObjects = [];
        gems.forEach(gem => {
            const glow = this.add.circle(gem.x, gem.y, TILE_SIZE/2, 0x88ffff, 0.3);
            glowObjects.push(glow);
        });
        
        // Fade out highlight and glow effects
        this.tweens.add({
            targets: [this.matchHighlight, ...glowObjects],
            alpha: 0,
            duration: 500,
            delay: 300,
            ease: 'Quad.easeOut',
            onComplete: () => {
                // Clean up glow objects
                glowObjects.forEach(glow => glow.destroy());
            }
        });
    }

    // Add cleanup method for sounds
    cleanup() {
        // Stop all sounds
        Object.values(this.sounds).forEach(sound => {
            sound.stop();
        });
    }

    // Modify scene shutdown to clean up sounds
    shutdown() {
        this.cleanup();
        super.shutdown();
    }

    createLevelUpEffect() {
        // Play level up sound
        try {
            if (this.sound.context.state === 'suspended') {
                this.sound.context.resume();
            }
            console.log('Playing level up sound...');
            this.sounds.levelup.play();
        } catch (error) {
            console.error('Error playing level up sound:', error);
        }
        
        // Add intense screen shake for level up
        this.shakeScreen(2, 200);
        
        // Create a level up text animation
        const levelUpText = this.add.text(
            this.game.config.width / 2,
            this.game.config.height / 2,
            'LEVEL UP!',
            {
                fontSize: '48px',
                fill: '#fff',
                stroke: '#000',
                strokeThickness: 6
            }
        ).setOrigin(0.5);

        // Add some particle effects
        const particles = this.add.particles(0, 0, {
            speed: { min: 100, max: 200 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.6, end: 0 },
            blendMode: 'ADD',
            tint: [0xffff00, 0x00ffff, 0xff00ff],
            lifespan: 1000,
            quantity: 2
        });

        // Emit particles from the text
        particles.setPosition(this.game.config.width / 2, this.game.config.height / 2);
        particles.explode(50);

        // Animate the text
        this.tweens.add({
            targets: levelUpText,
            y: levelUpText.y - 100,
            alpha: 0,
            duration: 1000,
            ease: 'Power2',
            onComplete: () => {
                levelUpText.destroy();
                particles.destroy();
            }
        });
    }

    // Add regenerateBoard method
    regenerateBoard() {
        // Clear existing gems
        this.gems.clear(true, true);
        this.grid = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(null));
        
        // Create new gems
        for (let x = 0; x < GRID_SIZE; x++) {
            for (let y = 0; y < GRID_SIZE; y++) {
                this.createGem(x, y);
            }
        }
        
        // Check for matches and regenerate if necessary (with a maximum number of attempts)
        let attempts = 0;
        const maxAttempts = 10; // Maximum number of regeneration attempts
        
        while (this.hasAvailableMatches() && attempts < maxAttempts) {
            // Clear existing gems
            this.gems.clear(true, true);
            this.grid = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(null));
            
            // Create new gems
            for (let x = 0; x < GRID_SIZE; x++) {
                for (let y = 0; y < GRID_SIZE; y++) {
                    this.createGem(x, y);
                }
            }
            
            attempts++;
        }
        
        // If we still have matches after max attempts, just accept the board
        if (this.hasAvailableMatches()) {
            console.log('Warning: Could not generate a board without matches after', maxAttempts, 'attempts');
        }
    }

    // Add debug-specific methods
    setupDebugControls() {
        // Add debug text
        this.debugText = this.add.text(10, 10, `Debug Mode: ${this.debugMode ? 'ON' : 'OFF'}`, {
            fontSize: '16px',
            fill: '#00ff00'
        });

        // Add keyboard shortcuts for debug features
        this.input.keyboard.on('keydown-D', () => {
            this.debugMode = !this.debugMode;
            this.debugText.setText(`Debug Mode: ${this.debugMode ? 'ON' : 'OFF'}`);
            console.log(`Debug mode ${this.debugMode ? 'enabled' : 'disabled'}`);
        });

        this.input.keyboard.on('keydown-L', () => {
            if (this.debugMode) {
                this.level++;
                this.updateUI();
                console.log('Debug: Level increased to', this.level);

                // Get all unrevealed blocks
                const unrevealedBlocks = Array.from(document.querySelectorAll('.map-block:not(.revealed)'));
                
                if (unrevealedBlocks.length > 0) {
                    // Reveal the first unrevealed block
                    const blockToReveal = unrevealedBlocks[0];
                    
                    // Add to revealed set and add revealed class
                    this.revealedBlocks.add(blockToReveal.getAttribute('data-level'));
                    blockToReveal.classList.add('revealed');
                    
                    // Add some sparkles near the revealed block
                    const rect = blockToReveal.getBoundingClientRect();
                    const x = rect.left + rect.width / 2;
                    const y = rect.top + rect.height / 2;
                    this.createSparkles(x, y, 2);

                    // Check if all blocks are now revealed
                    const allBlocks = document.querySelectorAll('.map-block');
                    const allRevealed = Array.from(allBlocks).every(block => block.classList.contains('revealed'));
                    
                    if (allRevealed) {
                        // Center the treasure map if it exists
                        const mapContainer = document.querySelector('.treasure-map');
                        if (mapContainer) {
                            mapContainer.style.position = 'fixed';
                            mapContainer.style.top = '50%';
                            mapContainer.style.left = '50%';
                            mapContainer.style.transform = 'translate(-50%, -50%)';
                            mapContainer.style.zIndex = '1000';
                        }
                        
                        // Add victory message
                        const victoryMessage = document.createElement('div');
                        victoryMessage.className = 'victory-message';
                        victoryMessage.innerHTML = 'Congratulations, you win!';
                        document.body.appendChild(victoryMessage);
                        
                        // Add victory message styles
                        const style = document.createElement('style');
                        style.textContent = `
                            .victory-message {
                                position: fixed;
                                top: 50%;
                                left: 50%;
                                transform: translate(-50%, -50%);
                                font-size: 48px;
                                font-weight: bold;
                                color: #FFD700;
                                text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
                                z-index: 1001;
                                text-align: center;
                                animation: victoryPulse 2s infinite;
                            }
                            @keyframes victoryPulse {
                                0% { transform: translate(-50%, -50%) scale(1); }
                                50% { transform: translate(-50%, -50%) scale(1.1); }
                                100% { transform: translate(-50%, -50%) scale(1); }
                            }
                        `;
                        document.head.appendChild(style);
                    }
                }
            }
        });

        this.input.keyboard.on('keydown-S', () => {
            if (this.debugMode) {
                this.score += 100;
                this.updateUI();
                console.log('Debug: Score increased by 100');
            }
        });

        this.input.keyboard.on('keydown-M', () => {
            if (this.debugMode) {
                this.moves += 10;
                this.updateUI();
                console.log('Debug: Moves increased by 10');
            }
        });
    }

    // Add debug logging method
    debugLog(message, data = null) {
        if (this.debugMode) {
            console.log(`[DEBUG] ${message}`, data || '');
        }
    }
}

// Initialize the game
const config = {
    type: Phaser.AUTO,
    width: GRID_SIZE * TILE_SIZE,
    height: GRID_SIZE * TILE_SIZE,
    parent: 'game',
    backgroundColor: '#333333',
    scene: [LoadingScene, GameScene],
    // Disable all storage and persistence features
    storage: null,
    disableContextMenu: true,
    // Add error handling
    errorHandler: (error) => {
        console.error('Game error:', error);
    },
    // Add DOM element handling
    dom: {
        createContainer: true
    }
};

// Create the game instance with error handling
let game;
try {
    // Ensure the game container exists
    let gameContainer = document.getElementById('game');
    if (!gameContainer) {
        gameContainer = document.createElement('div');
        gameContainer.id = 'game';
        document.body.appendChild(gameContainer);
    }
    
    // Clear any existing content
    gameContainer.innerHTML = '';
    
    // Disable storage before creating the game
    if (window.localStorage) {
        window.localStorage.clear();
    }
    if (window.sessionStorage) {
        window.sessionStorage.clear();
    }
    
    // Create game instance
    game = new Phaser.Game(config);
} catch (error) {
    console.error('Error creating game:', error);
    // Fallback: reload the page
    window.location.reload();
}

// Initialize restart button with error handling
const restartBtn = document.getElementById('restart-btn');
if (restartBtn) {
    restartBtn.addEventListener('click', async () => {
        try {
            // Remove victory message if it exists
            const victoryMessage = document.querySelector('.victory-message');
            if (victoryMessage) {
                victoryMessage.remove();
            }

            // Reset treasure map position if it exists
            const mapContainer = document.querySelector('.treasure-map');
            if (mapContainer) {
                mapContainer.style.position = '';
                mapContainer.style.top = '';
                mapContainer.style.left = '';
                mapContainer.style.transform = '';
                mapContainer.style.zIndex = '';
            }

            const scene = game.scene.getScene('GameScene');
            if (scene) {
                // Disable input during transition
                scene.canMove = false;
                
                // Reset the map blocks
                scene.resetMapBlocks();
                
                // Fade out existing gems with swirl effect
                if (scene.gems.getChildren().length > 0) {
                    const fadePromises = scene.gems.getChildren().map(gem => {
                        return new Promise(resolve => {
                            scene.tweens.add({
                                targets: gem,
                                alpha: 0,
                                scale: 0.5,
                                rotation: Phaser.Math.DegToRad(180),
                                duration: 500,
                                ease: 'Back.in',
                                onComplete: resolve
                            });
                        });
                    });
                    
                    await Promise.all(fadePromises);
                }
                
                // Wait for all animations to complete
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // Remove the old scene
                game.scene.remove('GameScene');
                
                // Wait for scene removal to complete
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // Create and add the new scene
                const newScene = new GameScene();
                game.scene.add('GameScene', newScene);
                
                // Start the new scene
                game.scene.start('GameScene');
            }
        } catch (error) {
            console.error('Error during game restart:', error);
            // Fallback restart - just reload the page
            window.location.reload();
        }
    });
} 