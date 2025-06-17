// Game variables
let gameStarted = false;
let gameOver = false;
let score = 0;
let highScore = 0;
let gravity = 0.7; // Increased gravity for better game feel
let velocity = 0;
let frogPosition = 200;
let pipes = [];
let pipeWidth = 52;
let pipeGap = 150;
let minPipeHeight = 50;
let pipeInterval = 3000; // Time between pipes in milliseconds (increased further to reduce performance issues)
let lastPipeTime = 0;
let animationFrameId = null;
let lastCloudTime = 0;
let cloudInterval = 8000; // Time between new clouds in milliseconds
let lastFrameTime = 0; // For frame rate limiting
let targetFPS = 60; // Target frames per second (changed to let so it can be modified)
let gameWidth, gameHeight; // Store dimensions for consistent access
let hitSound = null; // Sound for when player hits an obstacle using Web Audio API

// Flies variables
let flies = [];
let flySpeed = 1.5;
let lastFlyTime = 0;
let flyInterval = 1500; // Further reduced from 2000 to generate flies even more frequently
let maxFlies = 8; // Increased from 6 to allow even more flies on screen
let flyRandomnessLevel = 0.85; // Increased from 0.7 for even more random positioning
let tongueExtended = false;
let tongueX = 0;
let tongueY = 0;
let tongueLength = 0;
let maxTongueLength = 240; // Increased from 200 to reach even further for flies
let tongueSpeed = 15; // Increased from 12 for even faster tongue extension
let tongueCooldown = false;

// FPS tracking variables
let fpsCounter = 0;
let fpsStartTime = 0;
let currentFPS = 0;

// Function to generate decorative background clouds
function generateCloud() {
    if (!gameArea || !gameWidth) {
        console.error("Game area or dimensions not initialized!");
        return;
    }
    
    // Create a cloud element
    const cloud = document.createElement('div');
    
    // Determine cloud size (small, medium, large)
    const sizes = ['small', 'medium', 'large'];
    const sizeIndex = Math.floor(Math.random() * sizes.length);
    const size = sizes[sizeIndex];
    
    // Set cloud class for basic styling
    cloud.className = `cloud ${size}`;
    
    // Set random vertical position, avoiding area where pipes and frog are
    const verticalPosition = Math.random() * (gameHeight - 100) + 20;
    
    // Start from the left, off-screen
    const startPosition = -150;
    
    // Position the cloud
    cloud.style.top = `${verticalPosition}px`;
    cloud.style.left = `${startPosition}px`;
    
    // Set random speed (slower for larger clouds)
    let speed;
    if (size === 'small') speed = 0.3 + Math.random() * 0.3;
    else if (size === 'medium') speed = 0.2 + Math.random() * 0.2;
    else speed = 0.1 + Math.random() * 0.15;
    
    // Store speed and creation time as data attributes
    cloud.dataset.speed = speed;
    cloud.dataset.creationTime = Date.now();
    
    // Add to the game area
    gameArea.appendChild(cloud);
    
    // Track the cloud
    if (!window.activeClouds) window.activeClouds = [];
    window.activeClouds.push(cloud);
}

// Function to generate pipes
function generatePipe() {
    if (!gameArea || !gameWidth) {
        console.error("Game area or dimensions not initialized!");
        return;
    }

    // Check pipe limits
    if (pipes.length >= 5) {
        return;
    }
    
    console.log("Generating new pipe");
    
    // Calculate random height for top pipe
    const availableHeight = gameHeight - pipeGap - (2 * minPipeHeight);
    
    // Calculate random height for top pipe
    const topPipeHeight = minPipeHeight + Math.random() * availableHeight;
    
    // Calculate bottom pipe height
    const bottomPipeHeight = gameHeight - topPipeHeight - pipeGap;
    
    // Create pipe elements
    const topPipe = document.createElement('div');
    const bottomPipe = document.createElement('div');
    
    // Set initial position using transform for performance
    const initialTransform = `translateX(${gameWidth}px)`;
    
    // Configure top pipe
    topPipe.className = 'pipe pipe-top';
    topPipe.style.height = `${topPipeHeight}px`;
    topPipe.style.transform = initialTransform;
    
    // Configure bottom pipe
    bottomPipe.className = 'pipe pipe-bottom';
    bottomPipe.style.height = `${bottomPipeHeight}px`;
    bottomPipe.style.transform = initialTransform;
    
    // Add pipes to the game area
    gameArea.appendChild(topPipe);
    gameArea.appendChild(bottomPipe);
    
    // Add to the pipes array for tracking
    pipes.push({
        top: topPipe,
        bottom: bottomPipe,
        position: gameWidth,
        passed: false
    });
}

// Game elements
const gameArea = document.querySelector('.game-area');
const frog = document.getElementById('frog');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('high-score');
const startMessage = document.getElementById('start-message');
const gameOverMessage = document.getElementById('game-over');
const finalScoreElement = document.getElementById('final-score');
const finalHighScoreElement = document.getElementById('final-high-score');

// Audio initialization flag
let audioInitialized = false;
let audioContext = null;
let useFallbackAudio = true; // Always use fallback audio

// Initialize audio on first user interaction
function initializeAudio() {
    if (audioInitialized) return;
    
    console.log('Initializing audio...');
    
    try {
        // Create audio context for better browser compatibility
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        if (window.AudioContext) {
            audioContext = new AudioContext();
            console.log('AudioContext created, state:', audioContext.state);
            
            // For Safari, we need to resume the context immediately on user interaction
            if (audioContext.state === 'suspended') {
                audioContext.resume().then(() => {
                    console.log('AudioContext resumed immediately');
                });
            }
        }
    } catch (e) {
        console.log('AudioContext not supported:', e);
    }
    
    audioInitialized = true;
    console.log('Audio initialized successfully');
    
    // Set up hit sound using Web Audio API
    if (audioContext) {
        // Set up the hit sound function
        createWebAudioHitSound();
    }
    
    // Try to resume audio context if suspended
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
            console.log('AudioContext resumed');
        }).catch(err => {
            console.log('Failed to resume AudioContext:', err);
        });
    }
}

// Game dimensions
gameWidth = gameArea.clientWidth;
gameHeight = gameArea.clientHeight;

// Set initial frog position
updateFrogPosition();
console.log("Frog initialized at position:", frogPosition);

// Check if audio elements are loaded properly
// High score management
function loadHighScore() {
    const saved = localStorage.getItem('filipFrogHighScore');
    highScore = saved ? parseInt(saved, 10) : 0;
    console.log('Loaded high score:', highScore);
}

function saveHighScore() {
    localStorage.setItem('filipFrogHighScore', highScore.toString());
    console.log('Saved high score:', highScore);
}

function updateHighScore() {
    if (score > highScore) {
        highScore = score;
        saveHighScore();
        return true; // New high score!
    }
    return false;
}

function updateHighScoreDisplay() {
    if (highScoreElement) {
        highScoreElement.textContent = `Best: ${highScore}`;
    }
}

// Load the high score when the game loads
loadHighScore();
// Update the display to show the loaded high score
updateHighScoreDisplay();

// Handle key press (space bar for flap, other keys for tongue)
function handleKeyDown(event) {
    if (event.code === 'Space') {
        event.preventDefault();
        
        if (!gameStarted) {
            init();
        } else if (gameOver) {
            init();
        } else {
            flap();
        }
    } else if (event.code === 'KeyX' || event.code === 'KeyZ') {
        event.preventDefault();
        
        if (gameStarted && !gameOver) {
            extendTongue();
        }
    }
}

// Make the frog flap/fart
function flap() {
    console.log('🐸 Flap function called');
    
    // Upward velocity
    velocity = -9.5;
    
    // Track flap count for effect frequency
    if (window.flapCount === undefined) window.flapCount = 0;
    window.flapCount++;
    
    console.log('Flap count:', window.flapCount);
    
    // Initialize audio on first interaction
    initializeAudio();
    
    // Play sound and effects
    console.log('About to play fart sound...');
    playFartSound();
    createFartCloud();
    
    // Add flap animation (visual feedback is important)
    frog.classList.add('flap');
    setTimeout(() => {
        frog.classList.remove('flap');
    }, 200);
}

// Event listeners
document.addEventListener('keydown', handleKeyDown);

// Add basic touch support for mobile
document.addEventListener('touchstart', handleTouch, { passive: false });

// Basic touch handler for mobile support
function handleTouch(event) {
    event.preventDefault(); // Prevent scrolling and other touch behaviors
    
    if (!gameStarted) {
        init();
    } else if (gameOver) {
        init();
    } else {
        flap();
    }
}

// Handle touch events for mobile
gameArea.addEventListener('touchstart', (event) => {
    event.preventDefault();
    handleKeyDown({ code: 'Space' });
});

// Handle touch events for mobile
gameArea.addEventListener('touchstart', (event) => {
    event.preventDefault();
    // Create a proper event object for handleKeyDown
    const fakeEvent = { 
        code: 'Space',
        preventDefault: () => {}
    };
    handleKeyDown(fakeEvent);
});

gameArea.addEventListener('click', (event) => {
    // Create a proper event object for handleKeyDown
    const fakeEvent = { 
        code: 'Space',
        preventDefault: () => {}
    };
    handleKeyDown(fakeEvent);
});

// Initialize game
function init() {
    // Cancel any existing animation frame to prevent multiple loops
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    
    // Initialize audio on game start
    initializeAudio();
    
    // Cache frog height to avoid layout thrashing
    window.frogHeight = frog.clientHeight || 40;
    
    // Reset game variables
    gameStarted = true;
    gameOver = false;
    score = 0;
    velocity = 0;
    frogPosition = 200;
    pipes = [];
    lastPipeTime = 0;
    lastCloudTime = 0;
    cloudInterval = 8000; // Time between new clouds
    lastFrameTime = 0;
    window.frogSetup = false; // For updateFrogPosition optimization
    window.frameCount = 0;
    window.flapCount = 0;
    window.activeClouds = []; // Reset active cloud tracking
    flies = []; // Reset flies
    
    // Clear UI elements
    scoreElement.textContent = score;
    updateHighScoreDisplay();
    startMessage.classList.add('hidden');
    gameOverMessage.classList.add('hidden');
    
    // Remove all existing pipes and dynamic clouds to clean up the DOM
    document.querySelectorAll('.pipe').forEach(pipe => pipe.remove());
    document.querySelectorAll('.cloud:not(.cloud-1):not(.cloud-2):not(.cloud-3):not(.cloud-4):not(.cloud-5):not(.cloud-6)').forEach(cloud => {
        if (cloud.parentNode) cloud.parentNode.removeChild(cloud);
    });
    document.querySelectorAll('.fly').forEach(fly => fly.remove());
    document.querySelectorAll('.tongue').forEach(tongue => tongue.remove());
    
    // Reset tongue state and ensure clean element
    tongueExtended = false;
    tongueLength = 0;
    tongueCooldown = false;
    window.isRetractingTongue = false; // Cancel any ongoing retraction animations
    
    // Ensure we have a clean tongue element
    handleTongueCleanup();
    
    // Reset pipe debug counters
    window.pipeDebugCount = 0;
    window.firstPipeGenerated = false;
    
    // Start game loop with a small delay to ensure clean start
    setTimeout(() => {
        animationFrameId = requestAnimationFrame(gameLoop);
    }, 50);
}

// Update frog's position on screen
function updateFrogPosition() {
    if (!frog) return; // Safety check
    
    // Always update position - this is critical for gameplay
    // Use top for position since the frog already has CSS animations using transform
    frog.style.top = `${Math.round(frogPosition)}px`;
    
    // Track setup state to avoid unnecessary DOM operations
    window.frogSetup = true;
}

// The generatePipe function has been moved to the top of the file for global scope access

// Move the pipes and handle scoring
function movePipes() {
    // Skip if no pipes
    if (pipes.length === 0) return;
    
    // Configure pipe movement speed
    const pipeSpeed = 2.5;
    
    // Update pipes
    for (let i = pipes.length - 1; i >= 0; i--) {
        const pipe = pipes[i];
        
        // Update position
        pipe.position -= pipeSpeed;
        
        // Always update visual position - this is critical for gameplay
        // Round position for better GPU performance and use translateZ(0) for hardware acceleration
        const position = Math.round(pipe.position);
        const transform = `translateX(${position}px) translateZ(0)`;
        pipe.top.style.transform = transform;
        pipe.bottom.style.transform = transform;
        
        // Check if pipe is now off-screen
        if (pipe.position < -pipeWidth) {
            // Remove from DOM
            if (pipe.top.parentNode) pipe.top.parentNode.removeChild(pipe.top);
            if (pipe.bottom.parentNode) pipe.bottom.parentNode.removeChild(pipe.bottom);
            
            // Remove from tracking array
            pipes.splice(i, 1);
            continue;
        }
        
        // Score point when passing pipe
        if (!pipe.passed && pipe.position + pipeWidth < gameWidth / 2) {
            pipe.passed = true;
            score++;
            scoreElement.textContent = score;
        }
    }
}

// Check for collisions between the frog and pipes
function checkCollisions() {
    // Get frog position
    const frogLeft = 50; // Horizontal position (center of game area)
    const frogRight = frogLeft + 40; // Approximate frog width
    const frogTop = frogPosition;
    const frogHeight = window.frogHeight || 40;
    const frogBottom = frogPosition + frogHeight;
    
    // Check collision with each pipe
    for (const pipe of pipes) {
        // Skip pipes that aren't in collision range
        if (pipe.position > gameWidth || pipe.position + pipeWidth < 0) {
            continue;
        }
        
        // Calculate pipe positions
        const pipeLeft = pipe.position;
        const pipeRight = pipeLeft + pipeWidth;
        
        // Check for horizontal overlap
        if (frogRight > pipeLeft && frogLeft < pipeRight) {
            // Get top pipe height
            const topPipeHeight = parseInt(pipe.top.style.height);
            
            // Check collision with top pipe
            if (frogTop < topPipeHeight) {
                return true;
            }
            
            // Check collision with bottom pipe
            const bottomPipeTop = topPipeHeight + pipeGap;
            if (frogBottom > bottomPipeTop) {
                return true;
            }
        }
    }
    
    return false;
}

// Function to end the game when player dies
function endGame() {
    // Set game state to over
    gameOver = true;
    
    // Stop animation frame
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    
    // Play hit sound if available
    if (hitSound && audioContext) {
        hitSound.play().catch(e => console.error("Could not play hit sound", e));
    }
    
    // Show game over message
    if (gameOverMessage) {
        gameOverMessage.classList.remove('hidden');
    }
    
    // Update final score
    if (finalScoreElement) {
        finalScoreElement.textContent = score;
    }
    if (finalHighScoreElement) {
        finalHighScoreElement.textContent = highScore;
    }
    
    // Check and update high score
    const isNewHighScore = updateHighScore();
    updateHighScoreDisplay();
    if (isNewHighScore) {
        console.log("NEW HIGH SCORE:", highScore);
        // Update the final high score display too
        if (finalHighScoreElement) {
            finalHighScoreElement.textContent = highScore;
        }
    }
    
    console.log("Game over! Final score:", score);
}

// Game loop
function gameLoop(timestamp) {
    if (!gameStarted || gameOver) return;
    
    // FPS calculation
    fpsCounter++;
    if (fpsStartTime === 0) {
        fpsStartTime = timestamp;
    }
    
    // Update FPS display every second
    if (timestamp - fpsStartTime >= 1000) {
        currentFPS = Math.round(fpsCounter * 1000 / (timestamp - fpsStartTime));
        
        // Update FPS counter display
        const fpsElement = document.getElementById('fps-counter');
        if (fpsElement) {
            const frameDuration = window.lastFrameDuration ? Math.round(window.lastFrameDuration) : 0;
            const pipeCount = pipes.length;
            const targetInfo = `T:${targetFPS}`;
            fpsElement.textContent = `FPS: ${currentFPS} ${targetInfo} | ${frameDuration}ms | P:${pipeCount}`;
        }
        
        // Reset counters
        fpsCounter = 0;
        fpsStartTime = timestamp;
    }
    
    // First frame initialization
    if (lastFrameTime === 0) {
        lastFrameTime = timestamp;
        // Always continue to the next frame
        animationFrameId = requestAnimationFrame(gameLoop);
        return;
    }
    
    // Debug frog motion - log if position isn't changing
    if (window.lastFrogPosition === frogPosition && window.frameCount % 30 === 0) {
        console.log("Frog position not changing!", frogPosition, velocity);
    }
    window.lastFrogPosition = frogPosition;
    window.frameCount = (window.frameCount || 0) + 1;
    
    // Track performance
    const elapsed = timestamp - lastFrameTime;
    window.lastFrameDuration = elapsed; // Store for adaptive rendering decisions

    // Apply minimal frame limiting for consistent physics
    const frameDelay = 1000 / targetFPS;
    
    // Only limit FPS if we're running much faster than target (allow natural browser limits)
    if (elapsed < frameDelay * 0.5) { // Very generous headroom
        animationFrameId = requestAnimationFrame(gameLoop);
        return;
    }
    
    // Calculate time step for physics simulation - cap to avoid large jumps
    // which is critical for performance
    const timeStep = Math.min(elapsed, 50); 
    lastFrameTime = timestamp;
    
    // Apply gravity and update frog position with more consistent physics
    // Use a more conservative scaling approach with a minimum effect
    const gravityScale = Math.max(timeStep / 16.67, 0.7); 
    velocity += gravity * gravityScale;
    frogPosition += velocity;
    
    // Update position every frame (critical for gameplay)
    updateFrogPosition();
    
    // Check boundaries
    if (frogPosition < 0) {
        frogPosition = 0;
        velocity = 0;
        updateFrogPosition(); // Make sure visuals update
    }
    
    // Use cached height instead of clientHeight which causes layout thrashing
    const frogHeight = window.frogHeight || 40; // Approximate height if not set
    
    if (frogPosition > gameHeight - frogHeight) {
        // Instead of touching the ground (which we've removed), 
        // the frog flies off the bottom of the screen
        frogPosition = gameHeight - frogHeight;
        updateFrogPosition(); // Make sure visuals update before ending
        endGame();
        return;
    }
    
    // Generate new pipes
    if (!lastPipeTime || timestamp - lastPipeTime > pipeInterval) {
        generatePipe();
        lastPipeTime = timestamp;
    }
    
    // Generate new clouds occasionally
    if (!lastCloudTime || timestamp - lastCloudTime > cloudInterval) {
        generateCloud();
        lastCloudTime = timestamp;
        
        cloudInterval = 6000 + Math.random() * 8000; // 6-14 seconds
    }
    
    // Generate new flies occasionally
    if (!lastFlyTime || timestamp - lastFlyTime > flyInterval) {
        generateFly();
        lastFlyTime = timestamp;
    }
    
    // Move pipes
    movePipes();
    
    // Move flies
    moveFlies();
    
    // Auto-extend tongue when flies are near
    checkForNearbyFliesAndExtendTongue();
    
    // Check collisions
    if (checkCollisions()) {
        endGame();
        return;
    }
    
    // Move clouds
    moveClouds();
    
    // Update tongue position if extended
    if (tongueExtended) {
        updateTonguePosition();
    }
    
    // Continue the loop
    animationFrameId = requestAnimationFrame(gameLoop);
}

// Function to generate flies with even more randomness
function generateFly() {
    // Don't generate too many flies
    if (flies.length >= maxFlies) return;
    
    if (!gameArea || !gameWidth || !gameHeight) {
        console.error("Game area or dimensions not initialized!");
        return;
    }
    
    // Generate flies even without pipes sometimes for more variety
    if (pipes.length === 0 || Math.random() > 0.5) {
        // Generate a completely random fly more often
        generateRandomFly();
        return;
    }
    
    // Decide whether to generate a fly near pipes or in a random position
    // Increased randomness level means more completely random flies
    if (Math.random() < flyRandomnessLevel) {
        // Generate a completely random fly
        generateRandomFly();
        return;
    }
    
    // Otherwise, generate flies near pipes for challenge (original behavior)
    // Find a pipe to place the fly near
    const nearbyPipes = pipes.filter(pipe => 
        pipe.position > gameWidth * 0.3 && pipe.position < gameWidth * 0.9
    );
    
    if (nearbyPipes.length === 0) {
        // If no suitable pipes, generate a random fly instead
        generateRandomFly();
        return;
    }
    
    const targetPipe = nearbyPipes[Math.floor(Math.random() * nearbyPipes.length)];
    
    // Calculate fly position near the pipe gap
    const topPipeHeight = parseInt(targetPipe.top.style.height);
    const gapStart = topPipeHeight;
    const gapEnd = topPipeHeight + pipeGap;
    
    // Place fly in challenging but reachable position
    // Added more randomness to the X position
    const flyX = targetPipe.position + (pipeWidth / 2) + (Math.random() - 0.5) * 80;
    const flyY = gapStart + (pipeGap * 0.1) + Math.random() * (pipeGap * 0.8);
    
    // Occasionally add vertical randomness that places flies outside the exact pipe gap
    if (Math.random() < 0.3) {
        // Add some vertical randomness for harder challenges
        const verticalOffset = (Math.random() - 0.5) * 60;
        // But make sure fly is still reachable
        if (flyY + verticalOffset > 50 && flyY + verticalOffset < gameHeight - 50) {
            const newY = flyY + verticalOffset;
            createFly(flyX, newY);
            return;
        }
    }
    
    createFly(flyX, flyY);
}

// Helper function to generate a completely random fly position
function generateRandomFly() {
    let flyX;
    
    // Sometimes spawn flies from the top or bottom of the screen
    if (Math.random() < 0.3) {
        // Position horizontally along the screen, not just from the right
        flyX = gameWidth * 0.3 + Math.random() * (gameWidth * 0.9);
        
        // Y position: either top or bottom of screen
        const flyY = Math.random() < 0.5 ? 
            20 + Math.random() * 30 : // Top of screen
            gameHeight - 50 - Math.random() * 30; // Bottom of screen
        
        createFly(flyX, flyY);
        return;
    }
    
    // X position: somewhere to the right of the screen with more variation in distance
    flyX = gameWidth + (Math.random() * 150);
    
    // Y position: anywhere in the playable area with less padding (more coverage)
    const minY = 50; // Less padding at top
    const maxY = gameHeight - 50; // Less padding at bottom
    const flyY = minY + Math.random() * (maxY - minY);
    
    // Create the fly
    createFly(flyX, flyY);
}

// Helper function to create a fly at the given position with more variety
function createFly(flyX, flyY) {
    
    // Create fly element
    const flyElement = document.createElement('div');
    flyElement.className = 'fly';
    flyElement.style.left = `${flyX}px`;
    flyElement.style.top = `${flyY}px`;
    
    // Randomly make flies larger/smaller for more visual variety
    // Increased probability from 0.3 to 0.6 to apply size variation more often
    if (Math.random() < 0.6) {
        const sizeVariation = 0.7 + Math.random() * 1.0; // 0.7-1.7x size (wider range)
        flyElement.style.transform = `scale(${sizeVariation})`;
    }
    
    // Occasionally add a slight rotation for more organic look
    if (Math.random() < 0.3) {
        const rotation = (Math.random() - 0.5) * 20; // -10 to +10 degrees
        const currentTransform = flyElement.style.transform || '';
        flyElement.style.transform = `${currentTransform} rotate(${rotation}deg)`;
    }
    
    // Add to game area
    gameArea.appendChild(flyElement);
    
    // Track the fly with increased randomness in parameters
    const fly = {
        element: flyElement,
        x: flyX,
        y: flyY,
        originalX: flyX,
        originalY: flyY,
        buzzOffset: Math.random() * Math.PI * 2, // Random starting phase
        buzzSpeed: 0.15 + Math.random() * 0.25, // Wider range of buzz speeds (0.15-0.4)
        buzzAmplitude: 1.5 + Math.random() * 5, // Wider range of buzz amplitudes (1.5-6.5)
        speedVariation: 0.7 + Math.random() * 0.6, // Wider speed variation (0.7-1.3x)
        changeDirProbability: 0.005 + Math.random() * 0.01, // Random probability of changing direction
        caught: false
    };
    
    flies.push(fly);
    console.log('Generated fly at', flyX, flyY);
}

// Function to move flies with even more natural and random buzzing patterns
function moveFlies() {
    for (let i = flies.length - 1; i >= 0; i--) {
        const fly = flies[i];
        
        if (fly.caught) continue;
        
        // Move fly left with the game scroll, with individual speed variations
        fly.x -= 2.5 * fly.speedVariation; 
        
        // Add more complex buzzing motion with individual fly characteristics
        fly.buzzOffset += fly.buzzSpeed;
        
        // Vertical buzzing with individual amplitude and multi-frequency components
        const primaryBuzz = Math.sin(fly.buzzOffset) * fly.buzzAmplitude;
        const secondaryBuzz = Math.sin(fly.buzzOffset * 2.3) * (fly.buzzAmplitude * 0.3); // Secondary higher frequency
        const buzzY = fly.originalY + primaryBuzz + secondaryBuzz;
        
        // Horizontal buzzing that's independent of vertical with multiple frequencies
        const primaryHBuzz = Math.cos(fly.buzzOffset * 1.5) * (fly.buzzAmplitude * 0.6);
        const secondaryHBuzz = Math.cos(fly.buzzOffset * 3.7) * (fly.buzzAmplitude * 0.2); // Secondary higher frequency
        const buzzX = fly.x + primaryHBuzz + secondaryHBuzz;
        
        // Occasionally change buzz amplitude slightly for more natural movement
        // Increased probability from 0.01 to 0.015 for more frequent variations
        if (Math.random() < 0.015) {
            fly.buzzAmplitude = Math.max(1.5, Math.min(6.5, fly.buzzAmplitude + (Math.random() - 0.5) * 1.8));
        }
        
        // Occasionally change buzz speed slightly
        // Increased probability from 0.01 to 0.015 for more frequent variations
        if (Math.random() < 0.015) {
            fly.buzzSpeed = Math.max(0.1, Math.min(0.45, fly.buzzSpeed + (Math.random() - 0.5) * 0.12));
        }
        
        // Occasionally introduce a vertical drift to change flight path
        // Increased probability from 0.01 to 0.02 for more frequent path changes
        if (Math.random() < 0.02) {
            fly.originalY += (Math.random() - 0.5) * 15; // Increased range from 10 to 15
            
            // But keep flies within reasonable play area
            const minY = 40; // Reduced minimum from 50 to 40
            const maxY = gameHeight - 40; // Reduced minimum from 50 to 40
            if (fly.originalY < minY) fly.originalY = minY;
            if (fly.originalY > maxY) fly.originalY = maxY;
        }
        
        // Occasionally introduce a horizontal drift (flies sometimes speed up or slow down)
        if (Math.random() < 0.01) {
            fly.speedVariation = Math.max(0.6, Math.min(1.4, fly.speedVariation + (Math.random() - 0.5) * 0.2));
        }
        
        // Occasionally flies might briefly reverse direction
        if (fly.changeDirProbability && Math.random() < fly.changeDirProbability) {
            // The fly briefly moves right instead of left
            fly.x += 1.5 * fly.speedVariation;
            
            // But don't let it go off screen to the right
            if (fly.x > gameWidth + 150) {
                fly.x = gameWidth + 150;
            }
        }
        
        // Update position
        fly.y = buzzY;
        fly.element.style.left = `${Math.round(buzzX)}px`;
        fly.element.style.top = `${Math.round(buzzY)}px`;
        
        // Remove fly if it's off screen
        if (fly.x < -20) {
            if (fly.element.parentNode) {
                fly.element.parentNode.removeChild(fly.element);
            }
            flies.splice(i, 1);
        }
    }
}

// Function to extend the frog's tongue
function extendTongue() {
    if (tongueExtended || tongueCooldown) return;
    
    console.log('Extending tongue');
    tongueExtended = true;
    tongueLength = 0;
    
    // Create tongue element if it doesn't exist
    let tongueElement = document.getElementById('tongue');
    if (!tongueElement) {
        tongueElement = document.createElement('div');
        tongueElement.id = 'tongue';
        tongueElement.className = 'tongue';
        
        // Add tongue tip
        const tongueTip = document.createElement('div');
        tongueTip.className = 'tongue-tip';
        tongueElement.appendChild(tongueTip);
        
        gameArea.appendChild(tongueElement);
    }
    
    // Position tongue at frog's mouth - dynamically calculated based on current frog position
    const frogX = 50;
    const defaultFrogY = frogPosition + 15; // Default middle of frog's mouth
    
    // Try to aim the tongue at an approaching fly if possible
    let targetedY = defaultFrogY;
    let bestFly = null;
    let bestScore = Infinity;
    
    // Find the best fly to target
    for (const fly of flies) {
        if (fly.caught) continue;
        
        // Only consider flies that are approaching (to the right of the frog)
        if (fly.x > frogX) {
            // Calculate a "score" for this fly based on how ideal it is to target
            // Lower score = better target
            const horizontalDistance = fly.x - frogX;
            const verticalDistance = Math.abs(fly.y - defaultFrogY);
            
            // We prefer flies that are closer horizontally and well-aligned vertically
            const score = horizontalDistance + (verticalDistance * 2);
            
            if (score < bestScore && horizontalDistance < 200) {
                bestScore = score;
                bestFly = fly;
            }
        }
    }
    
    // If we found a good fly to target, aim at its height
    if (bestFly) {
        // Adjust the tongue position to aim at the fly
        // We limit the adjustment to ensure it still looks like it's coming from the frog
        const targetY = bestFly.y;
        const maxAdjustment = 20; // Maximum pixels to adjust tongue position up or down
        
        // Calculate how much to adjust the tongue position, limited by maxAdjustment
        const idealAdjustment = targetY - defaultFrogY;
        const actualAdjustment = Math.max(-maxAdjustment, Math.min(maxAdjustment, idealAdjustment));
        
        targetedY = defaultFrogY + actualAdjustment;
        console.log(`Targeting fly at Y:${targetY}, adjusting tongue by ${actualAdjustment}px`);
    }
    
    // Set the tongue base anchor point to be at the frog's mouth
    tongueX = frogX + 25; // Adjusted to better align with frog's mouth
    tongueY = targetedY; // Use the targeted Y position
    
    // Show tongue with a slight fade-in effect
    tongueElement.style.display = 'block';
    tongueElement.style.opacity = '1';
    tongueElement.style.left = `${tongueX}px`;
    tongueElement.style.top = `${tongueY}px`;
    tongueElement.style.width = '0px';
    tongueElement.style.height = '8px'; // Match height from CSS
    
    // Store the frog's Y position at time of extension for tracking
    window.tongueStartFrogY = frogPosition;
}

// Function to update tongue position and check for fly collision
function updateTonguePosition() {
    const tongueElement = document.getElementById('tongue');
    if (!tongueElement) {
        // If tongue element disappeared but state is still extended, fix the state
        if (tongueExtended) {
            console.log('Tongue element missing but state is extended. Fixing state.');
            tongueExtended = false;
            tongueLength = 0;
        }
        return;
    }
    
    if (!tongueExtended) {
        // If tongue is not extended according to state but element exists, hide it
        console.log('Tongue element exists but state is not extended. Hiding element.');
        tongueElement.style.display = 'none';
        tongueElement.style.width = '0px';
        return;
    }
    
    // Update tongue position to follow the frog's mouth
    const frogX = 50;
    const frogY = frogPosition + 15; // Middle of frog's mouth
    
    // Update tongue base position
    tongueX = frogX + 25; // Adjusted to better align with frog's mouth
    
    // Calculate how much the frog has moved since tongue was extended
    const frogYMovement = frogPosition - (window.tongueStartFrogY || frogPosition);
    
    // Adjust the tongue Y position to follow the frog's mouth while extended
    // This ensures the tongue stays attached to the frog even when it moves
    if (window.isRetractingTongue) {
        // During retraction, we gradually realign the tongue with the frog's mouth
        // This is handled in startTongueRetraction
    } else {
        // During extension, keep the tongue anchored at the frog's current mouth position
        // but maintain the aiming angle by adjusting the entire tongue
        tongueY += frogYMovement;
        
        // Update the starting position for next frame
        window.tongueStartFrogY = frogPosition;
    }
    
    // Make sure tongue is visible before updating position
    tongueElement.style.display = 'block';
    tongueElement.style.opacity = '1';
    
    // Update tongue position on screen
    tongueElement.style.left = `${tongueX}px`;
    tongueElement.style.top = `${tongueY}px`;
    
    // Extend tongue
    if (tongueLength < maxTongueLength) {
        // Continue extending
        tongueLength += tongueSpeed;
        
        // Cap at max length
        if (tongueLength > maxTongueLength) {
            tongueLength = maxTongueLength;
        }
        
        // Update visual length
        tongueElement.style.width = `${tongueLength}px`;
        
        // Check for fly collision
        checkTongueFlyCollision();
    } else {
        // Reached max length, start retracting
        console.log('Tongue reached maximum length, starting retraction');
        startTongueRetraction();
    }
}

// Function to start tongue retraction with improved reliability and visual feedback
function startTongueRetraction() {
    if (!tongueExtended) {
        console.log('Tried to retract tongue but it was not extended');
        return;
    }
    
    const tongueElement = document.getElementById('tongue');
    if (!tongueElement) {
        console.log('Tongue element not found for retraction. Forcing state cleanup.');
        // Even without element, make sure state is reset
        tongueExtended = false;
        tongueLength = 0;
        tongueCooldown = true;
        
        // Reset cooldown after a short delay
        setTimeout(() => {
            tongueCooldown = false;
            console.log('Tongue cooldown reset after missing element');
        }, 300);
        
        return;
    }
    
    console.log('Starting tongue retraction with smooth animation');
    
    // Set a safety timeout to force reset the tongue if animation gets stuck
    // This ensures that even if something interrupts the animation,
    // the tongue will still reset after a maximum time
    if (window.tongueResetTimeout) {
        clearTimeout(window.tongueResetTimeout);
    }
    
    window.tongueResetTimeout = setTimeout(() => {
        console.log('Safety timeout triggered: forcing tongue reset');
        if (tongueExtended) {
            window.isRetractingTongue = false;
            retractTongue(); // Force complete reset
        }
    }, 500); // 500ms is enough time for the animation to complete naturally
    
    // Use smooth retraction animation for better visual feedback
    // This provides better user feedback when the tongue misses its target
    window.isRetractingTongue = true; // Track retraction in progress
    
    // Define retraction animation using requestAnimationFrame for smoother animation
    const retractStep = () => {
        // Get fresh reference to tongue element in case DOM changed
        const currentTongueElement = document.getElementById('tongue');
        
        // If tongue was removed or state changed externally, bail out and clean up
        if (!currentTongueElement || !tongueExtended || !window.isRetractingTongue) {
            retractTongue(); // Ensure complete cleanup
            return;
        }
        
        if (tongueLength > 0) {
            // Update tongue position to follow the frog during retraction
            const frogX = 50;
            const frogY = frogPosition + 15; // Middle of frog's mouth
            
            // Keep tongue base at frog's mouth
            tongueX = frogX + 25; // Match the position used in extendTongue
            
            // CRITICAL FIX: Update tongueY to follow frog's position
            // Gradually move the tongue Y position back to the frog's mouth position
            // This ensures the tongue stays attached to the frog during retraction
            const targetY = frogY;
            const tongueMoveSpeed = 5; // Speed at which tongue realigns with frog
            
            // Gradually adjust tongue Y towards frog's mouth
            if (Math.abs(tongueY - targetY) > tongueMoveSpeed) {
                if (tongueY > targetY) {
                    tongueY -= tongueMoveSpeed;
                } else {
                    tongueY += tongueMoveSpeed;
                }
            } else {
                tongueY = targetY; // Final alignment when close
            }
            
            // Update visual position
            currentTongueElement.style.left = `${tongueX}px`;
            currentTongueElement.style.top = `${tongueY}px`;
            
            // Retract faster than extension for snappy feel
            tongueLength -= tongueSpeed * 2;
            
            // Ensure we don't go negative
            if (tongueLength < 0) tongueLength = 0;
            
            // Update visual length
            currentTongueElement.style.width = `${tongueLength}px`;
            
            // Continue animating
            requestAnimationFrame(retractStep);
        } else {
            // Tongue fully retracted - complete the retraction process
            window.isRetractingTongue = false;
            
            // Clear the safety timeout since we completed naturally
            if (window.tongueResetTimeout) {
                clearTimeout(window.tongueResetTimeout);
                window.tongueResetTimeout = null;
            }
            
            // Force a full reset as if it hit a fly
            retractTongue();
        }
    };
    
    // Start the animation
    requestAnimationFrame(retractStep);
}

// Function to check collision between tongue and flies
function checkTongueFlyCollision() {
    const tongueEndX = tongueX + tongueLength;
    const tongueEndY = tongueY;
    
    // Get tongue element to verify it exists
    const tongueElement = document.getElementById('tongue');
    if (!tongueElement || !tongueExtended) {
        console.log('Tried to check fly collision but tongue is not properly extended');
        return;
    }
    
    // Check if we're at maximum length - if so, and this is the last check before retraction,
    // we should track that we checked for collision at max length
    if (tongueLength >= maxTongueLength * 0.95) {
        // Set a flag to indicate we've checked at max length
        // This way, if the tongue doesn't hit anything, it will still retract properly
        window.checkedCollisionAtMaxLength = true;
    }
    
    // Visual feedback - change tongue tip color when near a fly
    let isNearFly = false;
    
    for (let i = flies.length - 1; i >= 0; i--) {
        const fly = flies[i];
        
        if (fly.caught) continue;
        
        // Check if tongue tip is near fly
        const distance = Math.sqrt(
            Math.pow(tongueEndX - fly.x, 2) + 
            Math.pow(tongueEndY - fly.y, 2)
        );
        
        // Mark when tongue is getting close to a fly
        if (distance < 30) {
            isNearFly = true;
        }
        
        if (distance < 15) // Collision detection radius
        {
            // Catch the fly!
            fly.caught = true;
            score += 3; // Award 3 points for catching a fly
            scoreElement.textContent = score;
            
            console.log('Fly caught! +3 points. Score:', score);
            
            // Remove fly element
            if (fly.element.parentNode) {
                fly.element.parentNode.removeChild(fly.element);
            }
            flies.splice(i, 1);
            
            // Cancel any ongoing tongue animations
            window.isRetractingTongue = false;
            
            // Retract tongue immediately after catching with visual feedback
            const tongueTip = tongueElement.querySelector('.tongue-tip');
            if (tongueTip) {
                // Make the tongue tip briefly flash when catching a fly
                tongueTip.style.backgroundColor = '#ff9900';
                setTimeout(() => {
                    // Even if retracted, this ensures the next tongue will have the right color
                    const currentTongueTip = document.querySelector('.tongue-tip');
                    if (currentTongueTip) {
                        currentTongueTip.style.backgroundColor = '';
                    }
                }, 100);
            }
            
            // Retract tongue immediately after catching
            retractTongue();
            break;
        }
    }
    
    // Visual feedback for near-misses
    if (isNearFly && tongueElement) {
        const tongueTip = tongueElement.querySelector('.tongue-tip');
        if (tongueTip) {
            tongueTip.style.backgroundColor = '#a2ff95'; // Light green when near a fly
        }
    } else if (tongueElement) {
        const tongueTip = tongueElement.querySelector('.tongue-tip');
        if (tongueTip) {
            tongueTip.style.backgroundColor = ''; // Reset to default
        }
    }
}

// Function to retract the tongue with improved reliability and cleanup
function retractTongue() {
    // Cancel any ongoing retraction animation
    window.isRetractingTongue = false;
    
    // Clear any safety timeout
    if (window.tongueResetTimeout) {
        clearTimeout(window.tongueResetTimeout);
        window.tongueResetTimeout = null;
    }
    
    // Set tongue state variables immediately
    tongueExtended = false;
    tongueLength = 0;
    tongueCooldown = true;
    
    console.log('Complete tongue retraction and reset requested');
    
    // Handle tongue element properly
    handleTongueCleanup();
    
    // Reset any visual effects on the tongue tip
    const tongueTip = document.querySelector('.tongue-tip');
    if (tongueTip) {
        tongueTip.style.backgroundColor = '';
    }
    
    // Reset cooldown after a short delay
    setTimeout(() => {
        tongueCooldown = false;
        console.log('Tongue ready to extend again');
    }, 300); // 300ms cooldown
}

// Helper function to properly clean up tongue element and ensure consistent state
function handleTongueCleanup() {
    // Always remove all tongue elements and start fresh
    // This is the most reliable approach to avoid any state inconsistencies
    document.querySelectorAll('.tongue').forEach(tongue => {
        console.log('Cleaning up tongue element');
        
        // First hide it (less jarring visually)
        tongue.style.display = 'none';
        tongue.style.opacity = '0';
        tongue.style.width = '0px';
        
        // Then remove it completely
        if (tongue.parentNode) {
            tongue.parentNode.removeChild(tongue);
        }
    });
    
    // Create a completely fresh tongue element for next use
    const newTongueElement = document.createElement('div');
    newTongueElement.id = 'tongue';
    newTongueElement.className = 'tongue';
    newTongueElement.style.display = 'none';
    newTongueElement.style.width = '0px';
    newTongueElement.style.opacity = '0';
    
    // Add tongue tip
    const tongueTip = document.createElement('div');
    tongueTip.className = 'tongue-tip';
    newTongueElement.appendChild(tongueTip);
    
    // Add to game area
    if (gameArea) {
        gameArea.appendChild(newTongueElement);
        console.log('Created fresh tongue element');
    } else {
        console.error('Game area not found, cannot create new tongue element');
    }
}

// Function to check for nearby flies and auto-extend tongue with improved detection
function checkForNearbyFliesAndExtendTongue() {
    // Don't auto-extend if tongue is already extended or on cooldown
    if (tongueExtended || tongueCooldown) return;
    
    // Get frog position
    const frogX = 50; // Frog's horizontal position
    const frogY = frogPosition + 20; // Middle of frog
    
    // Find any approaching flies (flies that are moving toward the frog)
    let bestFlyToTarget = null;
    let bestTargetScore = Infinity;
    
    // Check all flies to find approaching ones
    for (const fly of flies) {
        if (fly.caught) continue;
        
        // A fly is approaching if it's to the right of the frog (since flies move left)
        const isApproaching = fly.x > frogX;
        
        if (isApproaching) {
            // Calculate horizontal distance and vertical alignment
            const distanceX = fly.x - frogX;
            const distanceY = Math.abs(fly.y - frogY);
            
            // Skip flies that are too far away horizontally to catch with maxTongueLength
            if (distanceX > maxTongueLength * 1.2) {
                continue;
            }
            
            // Calculate a targeting score - lower is better
            // This scoring system prioritizes:
            // 1. Flies that are closer horizontally
            // 2. Flies that are better aligned vertically
            // 3. Flies that are within tongue's reach
            
            // Higher penalty for vertical misalignment
            const verticalPenalty = distanceY * 3;
            
            // Horizontal distance matters but is less important than vertical alignment
            const horizontalFactor = distanceX * 0.5;
            
            // Combine factors - lower score is better
            const targetScore = verticalPenalty + horizontalFactor;
            
            // Track the best fly to target
            if (targetScore < bestTargetScore) {
                bestTargetScore = targetScore;
                bestFlyToTarget = fly;
            }
        }
    }
    
    // Auto-extend if we have an approaching fly that's a good target
    // Increased detection range but with more sophisticated targeting logic
    if (bestFlyToTarget) {
        const distanceX = bestFlyToTarget.x - frogX;
        const distanceY = Math.abs(bestFlyToTarget.y - frogY);
        
        // Extended vertical tolerance since we've already scored flies based on alignment
        // and we have improved tongue aiming
        if (distanceX < maxTongueLength && distanceY < 80) {
            console.log('Auto-extending tongue for approaching fly. Score:', bestTargetScore);
            extendTongue(); // This will target the best fly
        }
    }
}

// Helper function to show audio status
function updateAudioStatus(status, autoHide = true) {
    const audioStatus = document.getElementById('audio-status');
    if (audioStatus) {
        audioStatus.textContent = status;
        audioStatus.style.display = 'block';
        
        if (autoHide) {
            setTimeout(() => {
                audioStatus.style.display = 'none';
            }, 2000);
        }
    }
}

// Function to move clouds
function moveClouds() {
    if (!window.activeClouds) return;
    
    for (let i = window.activeClouds.length - 1; i >= 0; i--) {
        const cloud = window.activeClouds[i];
        
        if (!cloud || !cloud.parentNode) {
            window.activeClouds.splice(i, 1);
            continue;
        }
        
        const speed = parseFloat(cloud.dataset.speed) || 0.5;
        const currentLeft = parseFloat(cloud.style.left) || 0;
        const newLeft = currentLeft + speed;
        
        cloud.style.left = `${newLeft}px`;
        
        // Remove cloud if it's off screen
        if (newLeft > gameWidth + 150) {
            if (cloud.parentNode) {
                cloud.parentNode.removeChild(cloud);
            }
            window.activeClouds.splice(i, 1);
        }
    }
}

// Create fallback audio using Web Audio API
function createFallbackAudio() {
    console.log('Creating fart sound using Web Audio API...');
    
    if (!audioContext) {
        console.log('No AudioContext available for audio generation');
        return;
    }
    
    try {
        // Create a more realistic fart-like sound using multiple oscillators and noise
        const mainOscillator = audioContext.createOscillator();
        const modulationOscillator = audioContext.createOscillator();
        const modulationGain = audioContext.createGain();
        const mainGain = audioContext.createGain();
        const noiseNode = createNoiseGenerator(audioContext);
        const noiseGain = audioContext.createGain();
        const noiseFilter = audioContext.createBiquadFilter();
        const masterGain = audioContext.createGain();
        
        // Add extreme EQ for even darker tone
        const darkEQ = audioContext.createBiquadFilter();
        darkEQ.type = 'lowshelf';
        darkEQ.frequency.value = 200; // Lower shelf frequency (was 300)
        darkEQ.gain.value = 9; // Boost low frequencies even more (was 6)
        
        const highCut = audioContext.createBiquadFilter();
        highCut.type = 'lowpass';
        highCut.frequency.value = 1200; // Cut high frequencies more aggressively (was 2000)
        highCut.Q.value = 0.9; // Slightly steeper cutoff (was 0.7)
        
        // Add a second lowpass for even more high frequency attenuation
        const ultraCut = audioContext.createBiquadFilter();
        ultraCut.type = 'lowpass';
        ultraCut.frequency.value = 800; // Very aggressive high cut
        ultraCut.Q.value = 0.5;
        
        // Add distortion for realism
        const distortion = audioContext.createWaveShaper();
        
        // Generate random values for this specific fart
        const fartDuration = 0.2 + Math.random() * 0.5; // 0.2-0.7 seconds
        // Further reduce intensity/volume for all fart sounds
        const fartIntensity = 0.08 + Math.random() * 0.12; // 0.08-0.20 volume (further reduced from 0.15-0.4)
        const fartType = Math.floor(Math.random() * 5); // 0-4 different fart types
        
        // Create distortion curve for a more "farty" sound
        function makeDistortionCurve(amount) {
            const k = typeof amount === 'number' ? amount : 50;
            const samples = 44100;
            const curve = new Float32Array(samples);
            const deg = Math.PI / 180;
            
            for (let i = 0; i < samples; ++i) {
                const x = i * 2 / samples - 1;
                curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
            }
            return curve;
        }
        
        distortion.curve = makeDistortionCurve(50);
        distortion.oversample = '4x';
        
        // Connect oscillator setup
        mainOscillator.connect(mainGain);
        modulationOscillator.connect(modulationGain);
        modulationGain.connect(mainOscillator.frequency);
        
        // Connect noise setup with EQ for darker sound
        noiseNode.connect(noiseGain);
        noiseGain.connect(noiseFilter);
        
        // Connect everything through enhanced EQ chain for even darker tone
        mainGain.connect(darkEQ);
        noiseFilter.connect(darkEQ);
        darkEQ.connect(highCut);
        highCut.connect(ultraCut);
        ultraCut.connect(distortion);
        distortion.connect(masterGain);
        masterGain.connect(audioContext.destination);
        
        // Configure the filter for noise - lower frequencies for darker sound
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.setValueAtTime(300 + Math.random() * 600, audioContext.currentTime); // Reduced from 500-1500
        noiseFilter.Q.setValueAtTime(5 + Math.random() * 10, audioContext.currentTime);
        
        // Setup different fart types (with frequencies lowered by ~30% for darker sound)
        switch (fartType) {
            case 0: // Short and high-pitched but more realistic - now extremely dark
                // Create a multi-phase ripping sound with even lower frequencies
                const startFreq = 50 + Math.random() * 15; // Further reduced from 70-90
                mainOscillator.frequency.setValueAtTime(startFreq, audioContext.currentTime);
                
                // Create several rapid frequency drops for the 'pfft' sound
                const segments = 4 + Math.floor(Math.random() * 4); // 4-7 segments
                const segmentTime = fartDuration / segments;
                
                for (let i = 1; i <= segments; i++) {
                    // Each segment drops in frequency - even lower than before
                    const segFreq = startFreq - (i * 7) + (Math.random() * 5); // Further reduced from 10 steps to 7
                    mainOscillator.frequency.exponentialRampToValueAtTime(
                        segFreq, 
                        audioContext.currentTime + (segmentTime * i)
                    );
                    
                    // Add short pauses between segments for the 'ripping' effect - deeper pauses
                    if (i < segments) {
                        mainGain.gain.setValueAtTime(
                            fartIntensity * 0.8, 
                            audioContext.currentTime + (segmentTime * i) - 0.01
                        );
                        mainGain.gain.linearRampToValueAtTime(
                            fartIntensity * 0.2, // Deeper dip (was 0.3)
                            audioContext.currentTime + (segmentTime * i)
                        );
                        mainGain.gain.linearRampToValueAtTime(
                            fartIntensity * 0.8, 
                            audioContext.currentTime + (segmentTime * i) + 0.01
                        );
                    }
                }
                
                // Use triangle wave for darker sound with fewer high harmonics
                mainOscillator.type = 'triangle'; // Changed from square for fewer harmonics
                
                // Add second oscillator with slight detuning for richness - even lower frequencies
                const detunedOsc = audioContext.createOscillator();
                detunedOsc.type = 'square'; // Changed from sawtooth for more fundamental
                detunedOsc.frequency.setValueAtTime(startFreq * 0.5, audioContext.currentTime); // Sub-oscillator now at half frequency
                
                // Have the detuned oscillator follow the same frequency pattern
                for (let i = 1; i <= segments; i++) {
                    const segFreq = startFreq - (i * 7) + (Math.random() * 5);
                    detunedOsc.frequency.exponentialRampToValueAtTime(
                        segFreq * 0.5, // Sub-oscillator follows main at half frequency
                        audioContext.currentTime + (segmentTime * i)
                    );
                }
                
                const detunedGain = audioContext.createGain();
                detunedGain.gain.setValueAtTime(fartIntensity * 0.6, audioContext.currentTime); // Increased from 0.4 for more sub content
                detunedGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + fartDuration);
                
                detunedOsc.connect(detunedGain);
                detunedGain.connect(darkEQ); // Connect to darkEQ for consistent signal path
                detunedOsc.start(audioContext.currentTime);
                detunedOsc.stop(audioContext.currentTime + fartDuration + 0.1);
                
                // Noise for realism with even more reduced high frequency content
                noiseGain.gain.setValueAtTime(fartIntensity * 0.7, audioContext.currentTime);
                noiseFilter.frequency.setValueAtTime(600, audioContext.currentTime); // Further reduced from 900
                noiseFilter.frequency.exponentialRampToValueAtTime(150, audioContext.currentTime + fartDuration); // Further reduced from 200
                
                // Adjust distortion for more realism with emphasis on low harmonics
                distortion.curve = makeDistortionCurve(85); // Further increased from 70 for more low harmonics
                break;
                
            case 1: // Long and bubbly - now extremely dark
                mainOscillator.frequency.setValueAtTime(40 + Math.random() * 15, audioContext.currentTime); // Further reduced from 60-80
                mainOscillator.frequency.exponentialRampToValueAtTime(30, audioContext.currentTime + fartDuration); // Further reduced from 40
                mainOscillator.type = 'triangle';
                
                // Add modulation for bubbling effect - even slower for darker sound
                modulationOscillator.frequency.setValueAtTime(4, audioContext.currentTime); // Further reduced from 6
                modulationGain.gain.setValueAtTime(15, audioContext.currentTime); // Further reduced from 20
                
                // Add sub-harmonic for more bottom end
                const subBubbleOsc = audioContext.createOscillator();
                const subBubbleGain = audioContext.createGain();
                subBubbleOsc.type = 'sine';
                subBubbleOsc.frequency.setValueAtTime(25, audioContext.currentTime);
                subBubbleOsc.frequency.exponentialRampToValueAtTime(20, audioContext.currentTime + fartDuration);
                subBubbleGain.gain.setValueAtTime(fartIntensity * 0.5, audioContext.currentTime);
                subBubbleGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + fartDuration);
                
                subBubbleOsc.connect(subBubbleGain);
                subBubbleGain.connect(darkEQ);
                subBubbleOsc.start(audioContext.currentTime);
                subBubbleOsc.stop(audioContext.currentTime + fartDuration + 0.1);
                
                // Less noise to emphasize the low frequencies
                noiseGain.gain.setValueAtTime(fartIntensity * 0.3, audioContext.currentTime); // Reduced from 0.4
                noiseFilter.frequency.setValueAtTime(300, audioContext.currentTime); // Lower noise filter
                break;
                
            case 2: // Wet and sloppy - now extremely dark
                mainOscillator.frequency.setValueAtTime(50, audioContext.currentTime); // Further reduced from 80
                mainOscillator.frequency.exponentialRampToValueAtTime(20, audioContext.currentTime + fartDuration * 0.7); // Further reduced from 30
                mainOscillator.frequency.exponentialRampToValueAtTime(35, audioContext.currentTime + fartDuration); // Further reduced from 60
                mainOscillator.type = 'triangle'; // Changed from sawtooth for fewer high harmonics
                
                // Add sub-bass layer for extreme depth
                const wetSubOsc = audioContext.createOscillator();
                const wetSubGain = audioContext.createGain();
                wetSubOsc.type = 'sine';
                wetSubOsc.frequency.setValueAtTime(30, audioContext.currentTime);
                wetSubOsc.frequency.exponentialRampToValueAtTime(15, audioContext.currentTime + fartDuration * 0.7);
                wetSubOsc.frequency.exponentialRampToValueAtTime(25, audioContext.currentTime + fartDuration);
                wetSubGain.gain.setValueAtTime(fartIntensity * 0.6, audioContext.currentTime);
                wetSubGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + fartDuration);
                
                wetSubOsc.connect(wetSubGain);
                wetSubGain.connect(darkEQ);
                wetSubOsc.start(audioContext.currentTime);
                wetSubOsc.stop(audioContext.currentTime + fartDuration + 0.1);
                
                noiseGain.gain.setValueAtTime(fartIntensity * 0.6, audioContext.currentTime); // Reduced from 0.7
                noiseFilter.frequency.setValueAtTime(350, audioContext.currentTime); // Further reduced from 550
                distortion.curve = makeDistortionCurve(90); // Increased distortion for more low harmonics
                break;
                
            case 3: // Squeaky but more fart-like - now extremely dark
                mainOscillator.frequency.setValueAtTime(80, audioContext.currentTime); // Further reduced from 120
                // Create a slower "brrrrt" effect with even lower frequency changes
                for (let i = 0; i < 6; i++) {
                    const timePoint = audioContext.currentTime + (fartDuration * i / 6);
                    const freqValue = 50 + Math.random() * 30; // Further reduced from 80-120
                    mainOscillator.frequency.exponentialRampToValueAtTime(freqValue, timePoint);
                }
                mainOscillator.frequency.exponentialRampToValueAtTime(40, audioContext.currentTime + fartDuration); // Further reduced from 60
                mainOscillator.type = 'triangle'; // Changed from sawtooth for fewer high harmonics
                
                // Add modulation for more texture - even slower for darker sound
                modulationOscillator.frequency.setValueAtTime(5, audioContext.currentTime); // Further reduced from 8
                modulationGain.gain.setValueAtTime(10, audioContext.currentTime); // Further reduced from 15
                
                // Add growling sub-layer
                const growlOsc = audioContext.createOscillator();
                const growlGain = audioContext.createGain();
                const growlLFO = audioContext.createOscillator();
                const growlLFOGain = audioContext.createGain();
                
                growlOsc.type = 'sine';
                growlOsc.frequency.setValueAtTime(35, audioContext.currentTime);
                growlGain.gain.setValueAtTime(fartIntensity * 0.5, audioContext.currentTime);
                growlGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + fartDuration);
                
                growlLFO.frequency.setValueAtTime(3, audioContext.currentTime);
                growlLFOGain.gain.setValueAtTime(8, audioContext.currentTime);
                
                growlLFO.connect(growlLFOGain);
                growlLFOGain.connect(growlOsc.frequency);
                growlOsc.connect(growlGain);
                growlGain.connect(darkEQ);
                
                growlLFO.start(audioContext.currentTime);
                growlOsc.start(audioContext.currentTime);
                growlLFO.stop(audioContext.currentTime + fartDuration + 0.1);
                growlOsc.stop(audioContext.currentTime + fartDuration + 0.1);
                
                // Reduce noise component to emphasize the low growl
                noiseGain.gain.setValueAtTime(fartIntensity * 0.4, audioContext.currentTime); // Reduced from 0.6
                noiseFilter.frequency.setValueAtTime(250, audioContext.currentTime); // Further reduced from 400
                
                // Change distortion amount for this type
                distortion.curve = makeDistortionCurve(95); // Further increased from 80 for more low harmonics
                break;
                
            case 4: // Deep and rumbly - now at the extreme depths of darkness
                mainOscillator.frequency.setValueAtTime(25 + Math.random() * 10, audioContext.currentTime); // Further reduced from 40-55
                mainOscillator.frequency.exponentialRampToValueAtTime(20, audioContext.currentTime + fartDuration); // Further reduced from 30
                mainOscillator.type = 'sine'; // Changed from square to sine for purer fundamental
                
                // Add extremely low frequency modulation
                modulationOscillator.frequency.setValueAtTime(2, audioContext.currentTime); // Further reduced from 3
                modulationGain.gain.setValueAtTime(7, audioContext.currentTime); // Further reduced from 10
                
                // Minimal noise to keep focus on ultra-low frequencies
                noiseGain.gain.setValueAtTime(fartIntensity * 0.3, audioContext.currentTime); // Reduced from 0.5
                noiseFilter.frequency.setValueAtTime(200, audioContext.currentTime); // Ultra-low noise filter
                
                // Multi-layer sub-bass for extreme depth
                // Layer 1: Main sub
                const subOsc = audioContext.createOscillator();
                const subGain = audioContext.createGain();
                subOsc.type = 'sine';
                subOsc.frequency.setValueAtTime(20, audioContext.currentTime); // Further reduced from 30
                subOsc.frequency.exponentialRampToValueAtTime(15, audioContext.currentTime + fartDuration); // Further reduced from 20
                subGain.gain.setValueAtTime(fartIntensity * 0.8, audioContext.currentTime); // Increased from 0.6
                subGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + fartDuration);
                
                // Layer 2: Ultra-sub (infrasonic - felt more than heard)
                const ultraSubOsc = audioContext.createOscillator();
                const ultraSubGain = audioContext.createGain();
                ultraSubOsc.type = 'sine';
                ultraSubOsc.frequency.setValueAtTime(15, audioContext.currentTime);
                ultraSubOsc.frequency.exponentialRampToValueAtTime(10, audioContext.currentTime + fartDuration);
                ultraSubGain.gain.setValueAtTime(fartIntensity * 0.9, audioContext.currentTime);
                ultraSubGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + fartDuration);
                
                // Layer 3: Slow pulsing tremolo for extreme rumble effect
                const tremoloOsc = audioContext.createOscillator();
                const tremoloGain = audioContext.createGain();
                const mainOscGain = audioContext.createGain();
                tremoloOsc.frequency.setValueAtTime(1.5, audioContext.currentTime);
                tremoloGain.gain.setValueAtTime(0.6, audioContext.currentTime);
                mainOscGain.gain.setValueAtTime(1.0, audioContext.currentTime);
                
                // Connect tremolo to main oscillator gain
                tremoloOsc.connect(tremoloGain);
                tremoloGain.connect(mainOscGain.gain);
                mainOscillator.disconnect(); // Disconnect from original path
                mainOscillator.connect(mainOscGain);
                mainOscGain.connect(mainGain);
                
                // Connect all sub components
                subOsc.connect(subGain);
                ultraSubOsc.connect(ultraSubGain);
                subGain.connect(darkEQ);
                ultraSubGain.connect(darkEQ);
                
                // Start all oscillators
                subOsc.start(audioContext.currentTime);
                ultraSubOsc.start(audioContext.currentTime);
                tremoloOsc.start(audioContext.currentTime);
                
                // Stop all oscillators
                subOsc.stop(audioContext.currentTime + fartDuration + 0.1);
                ultraSubOsc.stop(audioContext.currentTime + fartDuration + 0.1);
                tremoloOsc.stop(audioContext.currentTime + fartDuration + 0.1);
                break;
        }
        
        // Set volume envelopes - lower overall amplitude
        mainGain.gain.setValueAtTime(0, audioContext.currentTime);
        mainGain.gain.linearRampToValueAtTime(fartIntensity, audioContext.currentTime + 0.01);
        mainGain.gain.setValueAtTime(fartIntensity, audioContext.currentTime + 0.01);
        // Random volume fluctuations
        const fluctuations = 3 + Math.floor(Math.random() * 4);
        const fluctuationTime = fartDuration / fluctuations;
        
        for (let i = 1; i <= fluctuations; i++) {
            const targetGain = fartIntensity * (0.7 + Math.random() * 0.3);
            mainGain.gain.exponentialRampToValueAtTime(
                targetGain, 
                audioContext.currentTime + (fluctuationTime * i)
            );
        }
        mainGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + fartDuration);
        
        // Noise envelope
        noiseGain.gain.setValueAtTime(noiseGain.gain.value, audioContext.currentTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + fartDuration);
        
        // Master gain - further reduced for even lower overall volume
        masterGain.gain.setValueAtTime(0.2, audioContext.currentTime); // Further reduced from 0.4 (originally 0.8)
        
        // Play the sound
        mainOscillator.start(audioContext.currentTime);
        modulationOscillator.start(audioContext.currentTime);
        noiseNode.start(audioContext.currentTime);
        
        mainOscillator.stop(audioContext.currentTime + fartDuration + 0.1);
        modulationOscillator.stop(audioContext.currentTime + fartDuration + 0.1);
        noiseNode.stop(audioContext.currentTime + fartDuration + 0.1);
        
        console.log(`✅ Darker fart (type ${fartType}) played for ${fartDuration.toFixed(2)}s at intensity ${fartIntensity.toFixed(2)}`);
        
    } catch (error) {
        console.error('Web Audio generation failed:', error);
    }
    
    // Helper function to create noise (reusing from the createWebAudioHitSound function)
    function createNoiseGenerator(audioCtx) {
        const bufferSize = 4096;
        let noiseNode = audioCtx.createScriptProcessor(bufferSize, 1, 1);
        
        noiseNode.onaudioprocess = function(e) {
            const output = e.outputBuffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                output[i] = Math.random() * 2 - 1;
            }
        };
        
        // Helper method to make our noise node compatible with other nodes
        noiseNode.start = function() {};
        noiseNode.stop = function(when) {
            setTimeout(() => {
                this.disconnect();
            }, (when - audioCtx.currentTime) * 1000);
        };
        
        return noiseNode;
    }
}

// Play fart sound
function playFartSound() {
    console.log('playFartSound called - using Web Audio API fallback');
    
    if (!audioInitialized) {
        console.log('Audio not initialized, initializing now...');
        initializeAudio();
    }
    
    // Always use fallback audio for consistent performance
    createFallbackAudio();
}

// Create a visual fart cloud effect when Filip farts
function createFartCloud() {
    try {
        // Create fart cloud element
        const fartCloud = document.createElement('div');
        fartCloud.className = 'fart-cloud';
        
        // Position it behind Filip
        const frogRect = frog.getBoundingClientRect();
        const gameAreaRect = gameArea.getBoundingClientRect();
        
        // Calculate position relative to game area
        const frogX = frogRect.left - gameAreaRect.left;
        const frogY = frogRect.top - gameAreaRect.top;
        
        // Generate random values for this specific fart cloud
        const fartType = Math.floor(Math.random() * 5); // 0-4 different fart types, matching sound types
        const cloudSizeVariation = 0.8 + Math.random() * 0.4; // 0.8-1.2 size multiplier
        const cloudRotation = -15 + Math.random() * 30; // -15° to +15° random rotation
        const cloudOpacity = 0.7 + Math.random() * 0.3; // 0.7-1.0 opacity
        const animationDuration = 1.5 + Math.random() * 1.0; // 1.5-2.5s animation
        
        // Position cloud behind and slightly below Filip - vary the position slightly
        const cloudX = frogX - 40 - (Math.random() * 10); // Behind Filip with slight variation
        const cloudY = frogY + 15 + (Math.random() * 10); // Slightly below with variation
        
        // Set cloud style based on fart type
        let width, height;
        switch (fartType) {
            case 0: // Short and high-pitched: small cloud
                width = 50 * cloudSizeVariation;
                height = 35 * cloudSizeVariation;
                break;
            case 1: // Long and bubbly: medium with bubbles
                width = 65 * cloudSizeVariation;
                height = 45 * cloudSizeVariation;
                break;
            case 2: // Wet and sloppy: larger cloud
                width = 70 * cloudSizeVariation;
                height = 50 * cloudSizeVariation;
                break;
            case 3: // Squeaky and high: small elongated cloud
                width = 45 * cloudSizeVariation;
                height = 30 * cloudSizeVariation;
                break;
            case 4: // Deep and rumbly: large wide cloud
                width = 80 * cloudSizeVariation;
                height = 55 * cloudSizeVariation;
                break;
        }
        
        // Set specific animation keyframes for this cloud
        const keyframes = `@keyframes fartCloud${Date.now()} {
            0% { 
                transform: scale(0.2) rotate(${cloudRotation}deg); 
                opacity: ${cloudOpacity}; 
            }
            20% { 
                transform: scale(0.8) rotate(${cloudRotation}deg); 
                opacity: ${cloudOpacity}; 
            }
            100% { 
                transform: scale(1.2) rotate(${cloudRotation + 5 + Math.random() * 10}deg); 
                opacity: 0; 
            }
        }`;
        
        // Add keyframes to document
        const styleSheet = document.createElement('style');
        styleSheet.innerText = keyframes;
        document.head.appendChild(styleSheet);
        
        fartCloud.style.cssText = `
            position: absolute;
            left: ${cloudX}px;
            top: ${cloudY}px;
            width: ${width}px;
            height: ${height}px;
            background-image: url('images/fart-cloud.png');
            background-size: contain;
            background-repeat: no-repeat;
            background-position: center;
            opacity: ${cloudOpacity};
            z-index: 5;
            pointer-events: none;
            transform-origin: center;
            animation: fartCloud${Date.now()} ${animationDuration}s ease-out forwards;
        `;
        
        // Add cloud to game area
        gameArea.appendChild(fartCloud);
        
        // Remove the cloud and style element after animation completes
        setTimeout(() => {
            if (fartCloud && fartCloud.parentNode) {
                fartCloud.parentNode.removeChild(fartCloud);
            }
            if (styleSheet && styleSheet.parentNode) {
                styleSheet.parentNode.removeChild(styleSheet);
            }
        }, animationDuration * 1000 + 100);
        
        console.log(`Fart cloud type ${fartType} created with ${animationDuration.toFixed(1)}s animation`);
        
    } catch (error) {
        console.error('Error creating fart cloud:', error);
    }
}

// Create a hit sound using Web Audio API
function createWebAudioHitSound() {
    console.log('Setting up hit sound using Web Audio API...');
    
    // Create the play function for hit sound
    window.playHitSound = function() {
        if (!audioContext) return Promise.resolve();
        
        try {
            // Create a short, high-pitched sound that sounds like a collision
            const oscillator1 = audioContext.createOscillator();
            const oscillator2 = audioContext.createOscillator();
            const noiseNode = createNoiseGenerator(audioContext);
            const gainNode = audioContext.createGain();
            const noiseGain = audioContext.createGain();
            const filterNode = audioContext.createBiquadFilter();
            
            // Configure the main oscillator
            oscillator1.type = 'triangle';
            oscillator1.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator1.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.2);
            
            // Configure the second oscillator for complexity
            oscillator2.type = 'sine';
            oscillator2.frequency.setValueAtTime(500, audioContext.currentTime);
            oscillator2.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.1);
            
            // Configure the filter
            filterNode.type = 'lowpass';
            filterNode.frequency.setValueAtTime(1000, audioContext.currentTime);
            filterNode.Q.setValueAtTime(5, audioContext.currentTime);
            
            // Set volume envelope for main sound
            gainNode.gain.setValueAtTime(0.6, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);
            
            // Set volume for noise
            noiseGain.gain.setValueAtTime(0.3, audioContext.currentTime);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);
            
            // Connect nodes
            oscillator1.connect(gainNode);
            oscillator2.connect(gainNode);
            noiseNode.connect(noiseGain);
            noiseGain.connect(filterNode);
            filterNode.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // Play the sound
            oscillator1.start(audioContext.currentTime);
            oscillator2.start(audioContext.currentTime);
            noiseNode.start(audioContext.currentTime);
            
            oscillator1.stop(audioContext.currentTime + 0.3);
            oscillator2.stop(audioContext.currentTime + 0.3);
            noiseNode.stop(audioContext.currentTime + 0.3);
            
            console.log('✅ Web Audio hit sound played successfully');
            return Promise.resolve();
        } catch(e) {
            console.error('Failed to create hit sound:', e);
            return Promise.reject(e);
        }
    };
    
    // Helper function to create noise
    function createNoiseGenerator(audioCtx) {
        const bufferSize = 4096;
        let noiseNode = audioCtx.createScriptProcessor(bufferSize, 1, 1);
        
        noiseNode.onaudioprocess = function(e) {
            const output = e.outputBuffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                output[i] = Math.random() * 2 - 1;
            }
        };
        
        // Helper method to make our noise node compatible with other nodes
        noiseNode.start = function() {};
        noiseNode.stop = function(when) {
            setTimeout(() => {
                this.disconnect();
            }, (when - audioCtx.currentTime) * 1000);
        };
        
        return noiseNode;
    }
    
    // Set the hitSound object to have a play method that calls our function
    hitSound = {
        play: function() {
            return window.playHitSound();
        }
    };
}