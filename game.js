const GRID_SIZE = 8;
const TILE_SIZE = 64;
const COLORS = ['pink_jellyfish', 'blue_jellyfish', 'purple_jellyfish', 'green_jellyfish', 'yellow_jellyfish'];

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
    }

    create() {
        console.log('Creating game grid...');
        this.grid = [];
        this.gems = this.add.group();
        this.selectedTile = null;
        
        // Reset map blocks when game starts/restarts
        this.resetMapBlocks();
        
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
        
        // Create the game grid
        for (let x = 0; x < GRID_SIZE; x++) {
            this.grid[x] = [];
            for (let y = 0; y < GRID_SIZE; y++) {
                const gem = this.createGem(x, y);
            }
        }

        // Check if there are available matches, if not regenerate the board
        if (!this.hasAvailableMatches()) {
            this.regenerateBoard();
        }

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
        this.redX.lineStyle(50, 0xff0000);
        
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
                ease: 'Back.easeOut', // Slight overshoot and bounce back
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

        // Check horizontal matches
        for (let y = 0; y < GRID_SIZE; y++) {
            for (let x = 0; x < GRID_SIZE - 2; x++) {
                const color = this.grid[x][y].color;
                if (color === this.grid[x + 1][y].color && 
                    color === this.grid[x + 2][y].color) {
                    matches.push([
                        this.grid[x][y],
                        this.grid[x + 1][y],
                        this.grid[x + 2][y]
                    ]);
                }
            }
        }

        // Check vertical matches
        for (let x = 0; x < GRID_SIZE; x++) {
            for (let y = 0; y < GRID_SIZE - 2; y++) {
                const color = this.grid[x][y].color;
                if (color === this.grid[x][y + 1].color && 
                    color === this.grid[x][y + 2].color) {
                    matches.push([
                        this.grid[x][y],
                        this.grid[x][y + 1],
                        this.grid[x][y + 2]
                    ]);
                }
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
            }
            
            // Update UI
            this.updateUI();
        }
    }

    createLevelUpEffect() {
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

    async handleMatches(matches) {
        this.comboCount++;
        
        // Create underwater effects for each match
        matches.forEach(match => {
            const centerGem = match[1];
            const centerX = centerGem.x;
            const centerY = centerGem.y;
            
            // Create main sparkle effect at the center
            this.createSparkles(centerX, centerY, this.comboCount);
            
            // Create bubble trails from each matched jellyfish
            match.forEach((gem, index) => {
                if (gem !== centerGem) {
                    // Create smaller bubble trails with varying intensities
                    const trailIntensity = this.comboCount * (0.3 + (index * 0.2));
                    
                    // Create a sequence of bubble trails
                    const numTrails = 3;
                    for (let i = 0; i < numTrails; i++) {
                        setTimeout(() => {
                            // Add some randomness to the position
                            const offsetX = Phaser.Math.Between(-10, 10);
                            const offsetY = Phaser.Math.Between(-10, 10);
                            this.createBubbleTrail(
                                gem.x + offsetX,
                                gem.y + offsetY,
                                trailIntensity
                            );
                        }, i * 100); // Stagger the trails
                    }
                }
            });
        });

        // Fade out and remove matched gems
        await Promise.all(matches.flat().map(gem => {
            return new Promise(resolve => {
                this.tweens.add({
                    targets: gem,
                    alpha: 0,
                    scale: 1.2,
                    duration: 400,
                    ease: 'Power2',
                    onComplete: () => {
                        // Increase score based on combo and level
                        const baseScore = 10 * this.comboCount;
                        const levelBonus = Math.floor(baseScore * (this.level * 0.1));
                        this.score += baseScore + levelBonus;
                        
                        gem.destroy();
                        this.grid[gem.gridX][gem.gridY] = null;
                        resolve();
                    }
                });
            });
        }));

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

    regenerateBoard() {
        console.log('No matches available, regenerating board...');
        
        // Store current game state
        const currentScore = this.score;
        const currentMoves = this.moves;
        const currentLevel = this.level;
        
        // Destroy existing gems
        this.gems.clear(true, true);
        this.grid = [];
        
        // Recreate the grid
        for (let x = 0; x < GRID_SIZE; x++) {
            this.grid[x] = [];
            for (let y = 0; y < GRID_SIZE; y++) {
                const gem = this.createGem(x, y);
            }
        }
        
        // If the new board also has no matches, try again
        if (!this.hasAvailableMatches()) {
            this.regenerateBoard();
            return;
        }
        
        // Restore game state
        this.score = currentScore;
        this.moves = currentMoves;
        this.level = currentLevel;
        
        // Update UI
        this.updateUI();
    }
}

// Initialize the game
const config = {
    type: Phaser.AUTO,
    width: GRID_SIZE * TILE_SIZE,
    height: GRID_SIZE * TILE_SIZE,
    parent: 'game',
    backgroundColor: '#333333',
    scene: GameScene
};

// Create the game instance
const game = new Phaser.Game(config);

// Initialize pause and restart buttons
document.getElementById('pause-btn').addEventListener('click', () => {
    if (game.scene.isPaused('GameScene')) {
        game.scene.resume('GameScene');
    } else {
        game.scene.pause('GameScene');
    }
});

document.getElementById('restart-btn').addEventListener('click', () => {
    // Reset the map blocks
    const scene = game.scene.getScene('GameScene');
    if (scene) {
        scene.resetMapBlocks();
    }
    game.scene.restart('GameScene');
}); 