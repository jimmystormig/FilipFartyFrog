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

// Sound effects
const fartSound = document.getElementById('fart-sound');
const hitSound = document.getElementById('hit-sound');

// Create audio context for fallback sound playing
let audioContext;
window.audioInitialized = false; // Flag to track if audio has been initialized
window.audioUnlocked = false;   // Global audio unlock flag

// Initialize audio later after user interaction
function initializeAudio() {
    if (window.audioInitialized) return;
    
    try {
        // Fix for browsers that require user interaction to initialize AudioContext
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        audioContext = new AudioContext();
        console.log("AudioContext initialized");
        window.audioInitialized = true;
        
    } catch (e) {
        console.error("Web Audio API not supported:", e);
    }
}

// Game dimensions
gameWidth = gameArea.clientWidth;
gameHeight = gameArea.clientHeight;

// Set initial frog position
updateFrogPosition();
console.log("Frog initialized at position:", frogPosition);

// Check if audio elements are loaded properly
console.log("Fart sound element:", fartSound ? "Loaded" : "Not loaded");
console.log("Hit sound element:", hitSound ? "Loaded" : "Not loaded");

if (fartSound) {
    fartSound.oncanplaythrough = () => console.log("Fart sound can play through");
    fartSound.onerror = (e) => console.error("Error loading fart sound:", e);
}

if (hitSound) {
    hitSound.oncanplaythrough = () => console.log("Hit sound can play through");
    hitSound.onerror = (e) => console.error("Error loading hit sound:", e);
}

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

// Add listeners to unlock audio on first interaction
document.addEventListener('keydown', unlockAudio);
document.addEventListener('touchstart', unlockAudio, { passive: false });
document.addEventListener('click', unlockAudio);

gameArea.addEventListener('touchstart', unlockAudio, { passive: false });
gameArea.addEventListener('click', unlockAudio);

// Try to unlock audio immediately when the page is loaded (in case user has already interacted)
window.addEventListener('load', () => {
    setTimeout(unlockAudio, 100);
});

// Also try on page visibility change (when user returns to tab)
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        console.log('Page became visible, checking audio status');
        // Only try to unlock if audio isn't already working
        if (!window.audioUnlocked || window.audioFailed) {
            console.log('Attempting to unlock audio on visibility change');
            window.audioFailed = false; // Reset failed flag
            setTimeout(() => {
                unlockAudio();
            }, 100);
        }
    }
});

// Try to unlock audio immediately when the page is loaded
window.addEventListener('load', () => {
    setTimeout(unlockAudio, 100);
});

// Function to unlock audio context on user interaction
function unlockAudio() {
    console.log('Attempting to unlock audio...');
    
    // Initialize audio context on user interaction
    initializeAudio();
    
    // Track if we've successfully unlocked audio
    if (window.audioUnlocked) {
        return; // Already unlocked, no need to try again
    }
    
    // Immediately unmute all audio elements and set volume
    if (fartSound) {
        fartSound.muted = false;
        fartSound.volume = 0.8;
    }
    if (hitSound) {
        hitSound.muted = false;
        hitSound.volume = 0.8;
    }
    const silentSound = document.getElementById('silent-sound');
    if (silentSound) {
        silentSound.muted = false;
        silentSound.volume = 0.01;
    }
    
    // Resume audio context if it exists and is suspended
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
            console.log('AudioContext resumed successfully');
            window.audioUnlocked = true;
        }).catch(error => {
            console.error('Error resuming AudioContext:', error);
        });
    } else {
        // Mark as unlocked - we'll test it when we actually try to play
        window.audioUnlocked = true;
        console.log('Audio setup complete, ready to play');
    }
}

// This function ensures audio works by triggering all methods of sound playback
function ensureAudioWorks() {
    // Track attempts to avoid excessive logging
    if (!window.audioUnlockAttempts) {
        window.audioUnlockAttempts = 1;
    } else {
        window.audioUnlockAttempts++;
        // Limit number of attempts to avoid console spam
        if (window.audioUnlockAttempts > 5) return;
    }
    
    console.log(`Attempting to ensure audio works (attempt ${window.audioUnlockAttempts})`);
    
    // Make sure all audio elements are unmuted
    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach(audio => {
        if (audio) audio.muted = false;
    });
    
    // Try using alternating silent sounds to keep audio context active
    const silentSound = document.getElementById('silent-sound');
    const silentSound2 = document.getElementById('silent-sound-2');
    
    if (silentSound && !window.silentSoundPlaying) {
        silentSound.muted = false;
        silentSound.volume = 0.01;
        silentSound.loop = true;
        silentSound.play().then(() => {
            console.log('Silent sound playing');
            window.silentSoundPlaying = true;
        }).catch(e => {
            console.log('Silent sound play failed:', e);
            
            // Try the alternate silent sound
            if (silentSound2) {
                silentSound2.muted = false;
                silentSound2.volume = 0.01;
                silentSound2.loop = true;
                silentSound2.play().catch(e2 => {
                    console.log('Backup silent sound failed too:', e2);
                });
            }
        });
    }
    
    // Try to ensure audio context is running
    unlockAudio();
    
    // Resume AudioContext if it exists
    if (audioContext) {
        if (audioContext.state === 'suspended') {
            audioContext.resume().then(() => {
                console.log('AudioContext resumed in ensureAudioWorks');
                playTestTone();
            }).catch(e => {
                console.error('Failed to resume AudioContext:', e);
            });
        } else {
            playTestTone();
        }
    }
    
    // Play a test tone with Web Audio API
    function playTestTone() {
        if (!audioContext || audioContext.state !== 'running') return;
        
        try {
            // Create a very short beep using the audio context
            const oscillator = audioContext.createOscillator();
            const gain = audioContext.createGain();
            
            // Set extremely low volume
            gain.gain.value = 0.01;
            
            // Make a brief inaudible sound
            oscillator.frequency.value = 1;
            oscillator.connect(gain);
            gain.connect(audioContext.destination);
            
            // Play for just 1ms
            oscillator.start();
            setTimeout(() => {
                oscillator.stop();
                console.log('Web Audio API test sound completed');
            }, 1);
        } catch (e) {
            console.error('Error playing test sound with Web Audio API:', e);
        }
    }
    
    // If other methods fail, try HTML5 Audio API with data URI
    if (!window.fartSoundUnlocked && !window.hitSoundUnlocked) {
        try {
            // Create a temporary audio element with an ultra-short sound
            const temp = new Audio();
            temp.src = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjEwLjEwMAAAAAAAAAAAAAAA//tAwAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABEgD///////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAX/////AAAAAAAAAAAAAAAAAAAA';
            temp.volume = 0.01;
            temp.play().then(() => {
                console.log('Temporary HTML5 audio played successfully');
                setTimeout(() => {
                    temp.pause();
                    window.htmlAudioWorks = true;
                }, 50);
            }).catch(e => {
                console.error('HTML5 Audio test failed:', e);
            });
        } catch (e) {
            console.error('Error creating temporary audio:', e);
        }
    }
}

// Prepare all audio elements for better performance and reliability
function prepareAllAudioElements() {
    console.log('Preparing all audio elements...');
    
    // Prepare main audio elements
    const fartSound = document.getElementById('fart-sound');
    const hitSound = document.getElementById('hit-sound');
    
    if (fartSound) {
        try {
            fartSound.volume = 0.8;
            fartSound.preload = 'auto';
            fartSound.load(); // Force reload
            console.log('Fart sound element prepared');
        } catch (e) {
            console.log('Error preparing fart sound:', e);
        }
    }
    
    if (hitSound) {
        try {
            hitSound.volume = 0.8;
            hitSound.preload = 'auto';
            hitSound.load(); // Force reload
            console.log('Hit sound element prepared');
        } catch (e) {
            console.log('Error preparing hit sound:', e);
        }
    }
    
    // Create additional audio elements that are referenced in the code but don't exist in HTML
    createAdditionalAudioElements();
}

// Create additional audio elements that are referenced in the code
function createAdditionalAudioElements() {
    // Create silent sound element for audio unlocking
    if (!document.getElementById('silent-sound')) {
        const silentSound = document.createElement('audio');
        silentSound.id = 'silent-sound';
        silentSound.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA='; // Empty WAV
        silentSound.preload = 'auto';
        silentSound.volume = 0.01;
        document.body.appendChild(silentSound);
        console.log('Created silent-sound element');
    }
    
    // Create second silent sound element
    if (!document.getElementById('silent-sound-2')) {
        const silentSound2 = document.createElement('audio');
        silentSound2.id = 'silent-sound-2';
        silentSound2.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA='; // Empty WAV
        silentSound2.preload = 'auto';
        silentSound2.volume = 0.01;
        document.body.appendChild(silentSound2);
        console.log('Created silent-sound-2 element');
    }
    
    // Create alternative fart sound element for fallback
    if (!document.getElementById('alt-fart-sound')) {
        const altFartSound = document.createElement('audio');
        altFartSound.id = 'alt-fart-sound';
        altFartSound.src = 'sounds/fart.mp3';
        altFartSound.preload = 'auto';
        altFartSound.volume = 0.5;
        document.body.appendChild(altFartSound);
        console.log('Created alt-fart-sound element');
    }
    
    // Create audio status element if it doesn't exist
    if (!document.getElementById('audio-status')) {
        const audioStatus = document.createElement('div');
        audioStatus.id = 'audio-status';
        audioStatus.style.cssText = 'position: absolute; top: 50px; left: 10px; color: lime; font-size: 12px; background: rgba(0,0,0,0.8); padding: 3px 6px; border-radius: 3px; font-family: monospace; z-index: 999; display: none;';
        document.body.appendChild(audioStatus);
        console.log('Created audio-status element');
    }
}

// Initialize game
function init() {
    // Cancel any existing animation frame to prevent multiple loops
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    
    // Immediately attempt to unlock audio on game start
    unlockAudio();
    
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
    
    // Clear UI elements
    scoreElement.textContent = score;
    if (highScoreElement) {
        highScoreElement.textContent = `Best: ${highScore}`;
    }
    startMessage.classList.add('hidden');
    gameOverMessage.classList.add('hidden');
    
    // Remove all existing pipes and dynamic clouds to clean up the DOM
    document.querySelectorAll('.pipe').forEach(pipe => pipe.remove());
    document.querySelectorAll('.cloud:not(.cloud-1):not(.cloud-2):not(.cloud-3):not(.cloud-4):not(.cloud-5):not(.cloud-6)').forEach(cloud => {
        if (cloud.parentNode) cloud.parentNode.removeChild(cloud);
    });
    
    // Try to unlock audio during game initialization
    unlockAudio();
    
    // Initialize audio context if not already done
    initializeAudio();
    
    // Enhanced audio preparation
    prepareAllAudioElements();
    
    // Reset any audio failure flags
    window.audioFailed = false;
    
    // Show initial audio status
    updateAudioStatus('Sound: Initializing...', false);
    
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
    if (hitSound && window.hitSoundUnlocked) {
        hitSound.currentTime = 0;
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
    if (highScoreElement) {
        highScoreElement.textContent = `Best: ${highScore}`;
        if (isNewHighScore) {
            console.log("NEW HIGH SCORE:", highScore);
            // Update the final high score display too
            if (finalHighScoreElement) {
                finalHighScoreElement.textContent = highScore;
            }
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
    
    // Move pipes
    movePipes();
    
    // Check collisions
    if (checkCollisions()) {
        endGame();
        return;
    }
    
    // Move clouds
    moveClouds();
    
    // Continue the loop
    animationFrameId = requestAnimationFrame(gameLoop);
}

// Move the dynamic clouds
function moveClouds() {
    // Skip cloud movement on very low FPS to maintain game performance
    if (window.lastFrameDuration > 60) return;
    
    // Initialize cloud tracking array if it doesn't exist
    if (!window.activeClouds) window.activeClouds = [];
    
    // Move clouds with manual animation
    for (let i = window.activeClouds.length - 1; i >= 0; i--) {
        const cloud = window.activeClouds[i];
        if (!cloud || !cloud.parentNode) {
            window.activeClouds.splice(i, 1);
            continue;
        }
        
        // Get current position and move it
        const currentLeft = parseInt(cloud.style.left || "-150");
        const speed = parseFloat(cloud.dataset.speed || "0.3");
        
        // Move cloud by its speed
        const newPosition = currentLeft + speed;
        cloud.style.transform = `translateX(${newPosition}px) translateZ(0)`;
        
        // Check if cloud has moved off-screen to the right
        if (newPosition > gameWidth + 150) {
            // Remove cloud from DOM and array
            cloud.parentNode.removeChild(cloud);
            window.activeClouds.splice(i, 1);
        }
        
        // Clean up old clouds by age (2 minutes max)
        const creationTime = parseInt(cloud.dataset.creationTime || "0");
        if (Date.now() - creationTime > 120000) {
            if (cloud.parentNode) cloud.parentNode.removeChild(cloud);
            window.activeClouds.splice(i, 1);
        }
    }
}

// Handle key press (space bar)
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
    }
}

// Make the frog flap/fart
function flap() {
    // Upward velocity
    velocity = -9.5;
    
    // Track flap count for effect frequency
    if (window.flapCount === undefined) window.flapCount = 0;
    window.flapCount++;
    
    // Always unlock audio on flap
    unlockAudio();
    
    // Play all effects immediately
    playFartSound();
    createFartCloud();
    
    // Add flap animation (visual feedback is important)
    frog.classList.add('flap');
    setTimeout(() => {
        frog.classList.remove('flap');
    }, 200);
}

// Play fart sound with random pitch
function playFartSound() {
    console.log('Playing realistic fart sound');
    
    // Skip sound if we know audio isn't working
    if (window.audioFailed) {
        console.log("Audio previously failed, skipping fart sound");
        return;
    }
    
    // Ensure audio is unmuted and volume is set before attempting to play
    if (fartSound) {
        // First, ensure the audio is in a good state
        try {
            // If it's currently playing, pause it first to avoid conflicts
            if (!fartSound.paused) {
                fartSound.pause();
            }
            // Reset to beginning
            fartSound.currentTime = 0;
            fartSound.muted = false;
            fartSound.volume = 0.8;
            
            // Try to play immediately - this is the most direct approach
            const playPromise = fartSound.play();
            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        console.log('Fart sound played successfully');
                        window.audioUnlocked = true;
                    })
                    .catch(error => {
                        console.error('Fart sound play failed:', error);
                        if (error.name === 'NotAllowedError') {
                            console.log('Audio blocked by browser policy - need user interaction');
                            window.audioUnlocked = false;
                        } else if (error.name === 'AbortError') {
                            console.log('Audio play was aborted - will try again next time');
                            // Don't mark as failed for AbortError
                        } else {
                            console.log('Audio failed with error:', error.name);
                            window.audioFailed = true;
                        }
                    });
            }
        } catch (e) {
            console.error('Error preparing audio for play:', e);
        }
    }
    
    // Use our enhanced custom-made fart sound for more realistic effect
    let currentFartType = '';
    
    // Select a random type of fart for variety
    // Use a weighted random selection to reduce frequency of explosive farts
    const fartTypes = ['short_wet', 'long_rippling', 'squeaky', 'deep_rumble', 'short_wet', 'long_rippling', 'explosive'];
    currentFartType = fartTypes[Math.floor(Math.random() * fartTypes.length)];
    
    // Store the fart type in a global variable so the fart cloud can match it
    window.currentFartType = currentFartType;
    
    console.log(`Selected fart type: ${currentFartType}`);
    
    // Fallback: Play the fart sound using our enhanced Web Audio API implementation
    playFallbackSound('fart', currentFartType);
}

// Fallback sound method using Web Audio API for more realistic sounds
function playFallbackSound(type, fartType = '') {
    console.log(`Playing sound: ${type}${fartType ? ', type: ' + fartType : ''}`);
    
    // Try to initialize audio if not already done
    initializeAudio();
    
    // Skip sound if audio context isn't available
    if (!audioContext) {
        console.log('Audio context not available, trying to unlock audio');
        unlockAudio();
        return;
    }
    
    try {
        // Resume audio context if it's suspended (browser requirement)
        if (audioContext.state === 'suspended') {
            console.log('Audio context suspended, trying to resume');
            const resumePromise = audioContext.resume();
            
            resumePromise.then(() => {
                console.log('AudioContext resumed, now playing sound');
                playActualSound(type, fartType);
            }).catch(error => {
                console.error('Failed to resume audio context:', error);
                
                // Fallback to HTML5 audio
                tryHtmlAudioFallback(type);
            });
        } else {
            playActualSound(type, fartType);
        }
    } catch (e) {
        console.error(`Failed to play ${type} sound:`, e);
        
        // Try HTML5 audio as a last resort
        tryHtmlAudioFallback(type);
    }
    
    // Main sound playing function
    function playActualSound(soundType, soundFartType) {
        if (soundType === 'fart') {
            try {
                // Only try realistic fart sound if we have a working audio context
                if (audioContext && audioContext.state === 'running') {
                    playRealisticFartSound(soundFartType);
                } else {
                    // Fall back to HTML5 audio immediately if no audio context
                    tryHtmlAudioFallback(soundType);
                }
            } catch (innerError) {
                console.error(`Error in realistic sound generation: ${innerError}`);
                // Fall back to HTML5 audio
                tryHtmlAudioFallback(soundType);
            }
        } else if (soundType === 'hit') {
            playSimpleHitSound();
        }
        
        console.log(`${soundType} sound played successfully`);
    }
    
    // Last resort fallback using HTML5 Audio
    function tryHtmlAudioFallback(soundType) {
        try {
            // Try using alternative audio element first which may avoid AbortError
            const altAudio = document.getElementById('alt-fart-sound');
            if (altAudio) {
                console.log('Trying alternative audio element');
                
                // Reset the audio element
                altAudio.muted = false;
                altAudio.currentTime = 0;
                altAudio.volume = 0.5;
                
                // Play with error handling
                const altPromise = altAudio.play();
                if (altPromise) {
                    altPromise.then(() => {
                        console.log('Alternative audio played successfully');
                    }).catch(e => {
                        console.log('Alternative audio failed:', e);
                        // Continue with standard approach
                        tryStandardAudio(soundType);
                    });
                    return; // Exit if we've started the play attempt
                }
            }
            
            // Fall through to standard audio if alt audio not available
            tryStandardAudio(soundType);
            
        } catch (e) {
            console.error('Error in HTML5 audio fallback:', e);
        }
        
        function tryStandardAudio(soundType) {
            // Create a fresh audio element to avoid abort errors
            const freshAudio = new Audio();
            
            if (soundType === 'fart') {
                console.log('Trying HTML5 Audio fallback for fart sound');
                freshAudio.src = 'sounds/fart.mp3';
                freshAudio.volume = 0.8;
                freshAudio.play().catch(e => console.log('Fresh audio fallback failed:', e));
            } else if (soundType === 'hit') {
                console.log('Trying HTML5 Audio fallback for hit sound');
                freshAudio.src = 'sounds/hit.mp3';
                freshAudio.volume = 0.8;
                freshAudio.play().catch(e => console.log('Fresh hit sound failed:', e));
            }
        }
    }
}

// Simple hit sound function for fallback
function playSimpleHitSound() {
    console.log("Playing simple hit sound");
    if (hitSound) {
        try {
            hitSound.currentTime = 0;
            hitSound.volume = 0.8;
            hitSound.play().catch(e => console.log('Simple hit sound failed:', e));
        } catch (e) {
            console.error('Error with simple hit sound:', e);
        }
    }
}

// Generate a super realistic fart sound using multiple oscillators, noise and filters
function playRealisticFartSound(providedFartType = '') {
    console.log("Playing super realistic fart sound");
    
    // Create different types of farts for variety
    const fartTypes = [
        'short_wet',     // Short with wet bubble sounds
        'long_rippling', // Long rippling with vibrato
        'squeaky',       // High pitched squeaky sound
        'explosive',     // Loud initial burst followed by decay
        'deep_rumble'    // Low frequency rumble sound
    ];
    
    // Use provided fart type or randomly select one
    const fartType = providedFartType && fartTypes.includes(providedFartType) 
        ? providedFartType 
        : fartTypes[Math.floor(Math.random() * fartTypes.length)];
    
    console.log(`Using fart type: ${fartType}`);
    
    // Store the selected fart type globally for visual effects to use
    window.currentFartType = fartType;
    
    const now = audioContext.currentTime;
    let duration;
    
    // Determine parameters based on fart type
    switch(fartType) {
        case 'short_wet':
            duration = 0.3 + Math.random() * 0.2;
            createWetFart(duration, now);
            break;
        case 'long_rippling':
            duration = 0.8 + Math.random() * 0.4;
            createRipplingFart(duration, now);
            break;
        case 'squeaky':
            duration = 0.3 + Math.random() * 0.3;
            createSqueakyFart(duration, now);
            break;
        case 'explosive':
            duration = 0.4 + Math.random() * 0.2; // Slightly reduced duration
            createExplosiveFart(duration, now);
            break;
        case 'deep_rumble':
            duration = 0.6 + Math.random() * 0.4;
            createRumblingFart(duration, now);
            break;
        default:
            // Fallback to original implementation
            duration = 0.4 + Math.random() * 0.5;
            createDefaultFart(duration, now);
    }
    
    return duration;
}

// Helper function to show audio status
function updateAudioStatus(status, autoHide = true) {
    const statusElement = document.getElementById('audio-status');
    if (statusElement) {
        statusElement.textContent = status;
        statusElement.style.display = 'block';
        
        // Apply status-specific styling
        if (status.includes('Ready')) {
            statusElement.style.background = 'rgba(0,100,0,0.5)';
        } else if (status.includes('Failed')) {
            statusElement.style.background = 'rgba(150,0,0,0.5)';
        } else {
            statusElement.style.background = 'rgba(0,0,0,0.3)';
        }
        
        if (autoHide) {
            setTimeout(() => {
                statusElement.style.opacity = '0';
                statusElement.style.transition = 'opacity 1s';
                
                setTimeout(() => {
                    statusElement.style.display = 'none';
                    statusElement.style.opacity = '1';
                    statusElement.style.transition = '';
                }, 1000);
            }, 3000);
        }
    }
}

// Creates a wet sounding fart with bubbles
function createWetFart(duration, now) {
    const masterGain = audioContext.createGain();
    masterGain.gain.setValueAtTime(0.7, now);
    masterGain.gain.exponentialRampToValueAtTime(0.01, now + duration + 0.15);
    
    // Gentle compression for natural dynamics while preserving wetness
    const compressor = audioContext.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-20, now);
    compressor.knee.setValueAtTime(10, now);
    compressor.ratio.setValueAtTime(8, now);
    compressor.attack.setValueAtTime(0.003, now);
    compressor.release.setValueAtTime(0.1, now);
    
    // Create realistic wet gas base with multiple oscillators
    const baseFreq = 120 + Math.random() * 80; // 120-200 Hz for wet character
    
    // Primary wet oscillator - triangle wave for softer attack
    const wetOsc = audioContext.createOscillator();
    wetOsc.type = 'triangle';
    wetOsc.frequency.setValueAtTime(baseFreq, now);
    wetOsc.frequency.exponentialRampToValueAtTime(baseFreq * 0.6, now + duration); // Pitch drops
    
    // Secondary harmonic for wetness character
    const harmonic = audioContext.createOscillator();
    harmonic.type = 'sawtooth';
    harmonic.frequency.setValueAtTime(baseFreq * 0.7, now);
    harmonic.frequency.exponentialRampToValueAtTime(baseFreq * 0.4, now + duration);
    
    // Create wet bubble texture using filtered noise
    const bufferSize = 2 * audioContext.sampleRate;
    const wetNoiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const wetNoiseData = wetNoiseBuffer.getChannelData(0);
    
    // Generate brown noise for wet gas texture
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        wetNoiseData[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = wetNoiseData[i];
        wetNoiseData[i] *= 3.5;
    }
    
    const wetNoise = audioContext.createBufferSource();
    wetNoise.buffer = wetNoiseBuffer;
    wetNoise.loop = true;
    
    // Wet character filter - bandpass for liquid-like sound
    const wetFilter = audioContext.createBiquadFilter();
    wetFilter.type = 'bandpass';
    wetFilter.frequency.setValueAtTime(300, now);
    wetFilter.frequency.exponentialRampToValueAtTime(150, now + duration);
    wetFilter.Q.value = 2.5; // Resonant for wet character
    
    // Add low-frequency "plop" component
    const plopOsc = audioContext.createOscillator();
    plopOsc.type = 'sine';
    plopOsc.frequency.setValueAtTime(80, now);
    plopOsc.frequency.exponentialRampToValueAtTime(45, now + duration * 0.6);
    
    // Create "splash" modulation for wet character
    const splashLFO = audioContext.createOscillator();
    splashLFO.type = 'sine';
    splashLFO.frequency.value = 8 + Math.random() * 4; // 8-12 Hz modulation
    
    const splashGain = audioContext.createGain();
    splashGain.gain.value = 0.2; // Subtle modulation
    
    // Main wet oscillator gain with realistic envelope
    const wetGain = audioContext.createGain();
    wetGain.gain.setValueAtTime(0.01, now);
    wetGain.gain.exponentialRampToValueAtTime(0.6, now + 0.05); // Quick wet attack
    wetGain.gain.linearRampToValueAtTime(0.4, now + duration * 0.4); // Sustain
    wetGain.gain.exponentialRampToValueAtTime(0.01, now + duration); // Natural decay
    
    // Harmonic gain
    const harmonicGain = audioContext.createGain();
    harmonicGain.gain.setValueAtTime(0.01, now);
    harmonicGain.gain.exponentialRampToValueAtTime(0.3, now + 0.08);
    harmonicGain.gain.exponentialRampToValueAtTime(0.01, now + duration);
    
    // Plop gain with sharp attack and quick decay
    const plopGain = audioContext.createGain();
    plopGain.gain.setValueAtTime(0.01, now);
    plopGain.gain.exponentialRampToValueAtTime(0.4, now + 0.03);
    plopGain.gain.exponentialRampToValueAtTime(0.01, now + duration * 0.7);
    
    // Wet noise gain
    const wetNoiseGain = audioContext.createGain();
    wetNoiseGain.gain.setValueAtTime(0.01, now);
    wetNoiseGain.gain.exponentialRampToValueAtTime(0.35, now + 0.04);
    wetNoiseGain.gain.exponentialRampToValueAtTime(0.01, now + duration);
    
    // Create 2-4 distinct "bubble pops" for wet character
    const numPops = 2 + Math.floor(Math.random() * 3); // 2-4 pops
    const popSpacing = duration / (numPops + 1);
    
    for (let i = 0; i < numPops; i++) {
        const popTime = now + (i * popSpacing) + (Math.random() * 0.02);
        const popDuration = 0.04 + Math.random() * 0.03;
        
        // Create bubble pop oscillator
        const popOsc = audioContext.createOscillator();
        popOsc.type = 'triangle';
        const popFreq = 200 + Math.random() * 150; // 200-350 Hz
        popOsc.frequency.setValueAtTime(popFreq, popTime);
        popOsc.frequency.exponentialRampToValueAtTime(popFreq * 0.5, popTime + popDuration);
        
        // Pop filter for liquid character
        const popFilter = audioContext.createBiquadFilter();
        popFilter.type = 'lowpass';
        popFilter.frequency.value = 600;
        popFilter.Q.value = 1.5;
        
        // Sharp pop envelope
        const popGainNode = audioContext.createGain();
        popGainNode.gain.setValueAtTime(0.01, popTime);
        popGainNode.gain.exponentialRampToValueAtTime(0.3 + Math.random() * 0.2, popTime + 0.01);
        popGainNode.gain.exponentialRampToValueAtTime(0.01, popTime + popDuration);
        
        // Random stereo positioning for realism
        const popPanner = audioContext.createStereoPanner();
        popPanner.pan.value = (Math.random() - 0.5) * 0.4;
        
        popOsc.connect(popFilter);
        popFilter.connect(popGainNode);
        popGainNode.connect(popPanner);
        popPanner.connect(masterGain);
        
        popOsc.start(popTime);
        popOsc.stop(popTime + popDuration);
    }
    
    // Add occasional "squelch" for extra wetness
    if (Math.random() > 0.5) {
        const squelchTime = now + duration * 0.3 + Math.random() * (duration * 0.4);
        const squelchDuration = 0.08 + Math.random() * 0.05;
        
        const squelchOsc = audioContext.createOscillator();
        squelchOsc.type = 'sawtooth';
        squelchOsc.frequency.setValueAtTime(400, squelchTime);
        squelchOsc.frequency.exponentialRampToValueAtTime(180, squelchTime + squelchDuration);
        
        const squelchFilter = audioContext.createBiquadFilter();
        squelchFilter.type = 'bandpass';
        squelchFilter.frequency.value = 350;
        squelchFilter.Q.value = 3;
        
        const squelchGainNode = audioContext.createGain();
        squelchGainNode.gain.setValueAtTime(0.01, squelchTime);
        squelchGainNode.gain.exponentialRampToValueAtTime(0.25, squelchTime + 0.02);
        squelchGainNode.gain.exponentialRampToValueAtTime(0.01, squelchTime + squelchDuration);
        
        squelchOsc.connect(squelchFilter);
        squelchFilter.connect(squelchGainNode);
        squelchGainNode.connect(masterGain);
        
        squelchOsc.start(squelchTime);
        squelchOsc.stop(squelchTime + squelchDuration);
    }
    
    // Connect splash modulation
    splashLFO.connect(splashGain);
    splashGain.connect(wetGain.gain);
    
    // Connect main components
    wetOsc.connect(wetGain);
    wetGain.connect(masterGain);
    
    harmonic.connect(harmonicGain);
    harmonicGain.connect(masterGain);
    
    plopOsc.connect(plopGain);
    plopGain.connect(masterGain);
    
    wetNoise.connect(wetFilter);
    wetFilter.connect(wetNoiseGain);
    wetNoiseGain.connect(masterGain);
    
    masterGain.connect(compressor);
    compressor.connect(audioContext.destination);
    
    // Start all components
    wetOsc.start(now);
    wetOsc.stop(now + duration);
    
    harmonic.start(now);
    harmonic.stop(now + duration);
    
    plopOsc.start(now);
    plopOsc.stop(now + duration);
    
    wetNoise.start(now);
    wetNoise.stop(now + duration);
    
    splashLFO.start(now);
    splashLFO.stop(now + duration);
    
    return duration;
}

// Creates a rippling fart with more vibrato
function createRipplingFart(duration, now) {
    const masterGain = audioContext.createGain();
    masterGain.gain.setValueAtTime(0.7, now);
    masterGain.gain.exponentialRampToValueAtTime(0.01, now + duration + 0.2);
    
    const compressor = audioContext.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-24, now);
    compressor.knee.setValueAtTime(30, now);
    compressor.ratio.setValueAtTime(12, now);
    compressor.attack.setValueAtTime(0.003, now);
    compressor.release.setValueAtTime(0.25, now);
    
    // Create brown noise (browner than before for more authentic flatulence)
    const bufferSize = 2 * audioContext.sampleRate;
    const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + (0.015 * white)) / 1.015;
        lastOut = output[i];
        output[i] *= 4.0; // More amplification for stronger presence
    }
    
    const noise = audioContext.createBufferSource();
    noise.buffer = noiseBuffer;
    
    // Lowshelf filter to boost bass frequencies for a more gassy sound
    const lowShelf = audioContext.createBiquadFilter();
    lowShelf.type = 'lowshelf';
    lowShelf.frequency.value = 150;
    lowShelf.gain.value = 10;
    
    // Lowpass filter with less resonance - more airy and less "boing"
    const wobbleFilter = audioContext.createBiquadFilter();
    wobbleFilter.type = 'lowpass';
    wobbleFilter.Q.setValueAtTime(3, now); // Much less resonance to avoid "boing"
    wobbleFilter.frequency.setValueAtTime(250, now); // Lower basic frequency
    
    // Slower LFO for more natural modulation
    const wobbleLFO = audioContext.createOscillator();
    wobbleLFO.type = 'sine'; // Sine for smoother modulation
    wobbleLFO.frequency.setValueAtTime(8 + Math.random() * 5, now); // Slower, more natural rate
    
    const wobbleGain = audioContext.createGain();
    wobbleGain.gain.setValueAtTime(140, now); // Less extreme wobble
    
    wobbleLFO.connect(wobbleGain);
    wobbleGain.connect(wobbleFilter.frequency);
    
    // Noise gain with more natural envelope
    const noiseGain = audioContext.createGain();
    noiseGain.gain.setValueAtTime(0.01, now);
    noiseGain.gain.linearRampToValueAtTime(0.6, now + 0.05);
    
    // Create multiple small "puffs" for realism
    const puffCount = 5 + Math.floor(Math.random() * 6); // 5-10 puffs
    const puffInterval = duration / puffCount;
    
    for (let i = 0; i < puffCount; i++) {
        const puffTime = now + (i * puffInterval);
        const puffIntensity = 0.4 + (Math.random() * 0.3); // Random intensity between 0.4-0.7
        noiseGain.gain.linearRampToValueAtTime(puffIntensity, puffTime);
        noiseGain.gain.linearRampToValueAtTime(puffIntensity * 0.5, puffTime + (puffInterval * 0.6));
    }
    
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + duration);
    
    // Add some short "crackling" components for texture
    for (let i = 0; i < 4; i++) {
        const crackleTime = now + (Math.random() * duration * 0.8);
        const crackleDuration = 0.02 + Math.random() * 0.03;
        
        const crackleFilter = audioContext.createBiquadFilter();
        crackleFilter.type = 'bandpass';
        crackleFilter.frequency.value = 1500 + (Math.random() * 2000);
        crackleFilter.Q.value = 2;
        
        const crackleGain = audioContext.createGain();
        crackleGain.gain.setValueAtTime(0.001, crackleTime);
        crackleGain.gain.linearRampToValueAtTime(0.05 + (Math.random() * 0.1), crackleTime + 0.005);
        crackleGain.gain.exponentialRampToValueAtTime(0.001, crackleTime + crackleDuration);
        
        const crackleNoise = audioContext.createBufferSource();
        crackleNoise.buffer = noiseBuffer;
        
        crackleNoise.connect(crackleFilter);
        crackleFilter.connect(crackleGain);
        crackleGain.connect(masterGain);
        
        crackleNoise.start(crackleTime);
        crackleNoise.stop(crackleTime + crackleDuration);
    }
    
    // Route audio
    noise.connect(lowShelf);
    lowShelf.connect(wobbleFilter);
    wobbleFilter.connect(noiseGain);
    noiseGain.connect(masterGain);
    masterGain.connect(compressor);
    compressor.connect(audioContext.destination);
    
    // Start components
    wobbleLFO.start(now);
    wobbleLFO.stop(now + duration);
    noise.start(now);
    noise.stop(now + duration);
}

// Creates a squeaky high-pitched fart with friction character (not boing-like)
function createSqueakyFart(duration, now) {
    const masterGain = audioContext.createGain();
    masterGain.gain.setValueAtTime(0.6, now);
    masterGain.gain.exponentialRampToValueAtTime(0.01, now + duration + 0.1);
    
    // Moderate compression for punch but not overly tight
    const compressor = audioContext.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-22, now);
    compressor.knee.setValueAtTime(8, now);
    compressor.ratio.setValueAtTime(6, now);
    compressor.attack.setValueAtTime(0.002, now);
    compressor.release.setValueAtTime(0.05, now);
    
    // === BASE FART FOUNDATION (BROWN NOISE) ===
    // All farts need a brown noise base for that gassy character
    const brownBufferSize = 2 * audioContext.sampleRate;
    const brownNoiseBuffer = audioContext.createBuffer(1, brownBufferSize, audioContext.sampleRate);
    const brownOutput = brownNoiseBuffer.getChannelData(0);
    
    let brownLastOut = 0.0;
    for (let i = 0; i < brownBufferSize; i++) {
        const white = Math.random() * 2 - 1;
        brownOutput[i] = (brownLastOut + (0.02 * white)) / 1.02;
        brownLastOut = brownOutput[i];
        brownOutput[i] *= 2.5; // Moderate amplitude
    }
    
    const brownNoise = audioContext.createBufferSource();
    brownNoise.buffer = brownNoiseBuffer;
    
    // Low-pass the brown noise for the basic fart body
    const fartBodyFilter = audioContext.createBiquadFilter();
    fartBodyFilter.type = 'lowpass';
    fartBodyFilter.frequency.setValueAtTime(400, now);
    fartBodyFilter.frequency.exponentialRampToValueAtTime(200, now + duration);
    fartBodyFilter.Q.setValueAtTime(0.7, now);
    
    const fartBodyGain = audioContext.createGain();
    fartBodyGain.gain.setValueAtTime(0.4, now);
    fartBodyGain.gain.exponentialRampToValueAtTime(0.1, now + duration);
    
    // === SQUEAKY COMPONENT ON TOP ===
    // High-pitched component that rides on top of the fart base
    const squeakOsc = audioContext.createOscillator();
    squeakOsc.type = 'sawtooth'; // More harmonics for richer squeak
    
    // Lower frequency range - still squeaky but more fart-like
    const baseFreq = 600 + Math.random() * 400; // 600-1000Hz
    squeakOsc.frequency.setValueAtTime(baseFreq, now);
    squeakOsc.frequency.exponentialRampToValueAtTime(baseFreq * 0.6, now + duration);
    
    // Add vibrato for that wobbly squeaky character
    const vibratoLFO = audioContext.createOscillator();
    vibratoLFO.type = 'sine';
    vibratoLFO.frequency.setValueAtTime(12 + Math.random() * 8, now);
    
    const vibratoGain = audioContext.createGain();
    vibratoGain.gain.setValueAtTime(80 + Math.random() * 60, now);
    
    vibratoLFO.connect(vibratoGain);
    vibratoGain.connect(squeakOsc.frequency);
    
    // Bandpass filter to make it more nasal/squeaky
    const squeakFilter = audioContext.createBiquadFilter();
    squeakFilter.type = 'bandpass';
    squeakFilter.frequency.setValueAtTime(800, now);
    squeakFilter.frequency.exponentialRampToValueAtTime(500, now + duration);
    squeakFilter.Q.setValueAtTime(4, now);
    
    const squeakGain = audioContext.createGain();
    squeakGain.gain.setValueAtTime(0.01, now);
    squeakGain.gain.linearRampToValueAtTime(0.3, now + 0.02);
    
    // Add some bursts to the squeak for realism
    const numSqueakBursts = 2 + Math.floor(Math.random() * 2);
    const squeakBurstInterval = duration / (numSqueakBursts + 1);
    
    for (let i = 0; i < numSqueakBursts; i++) {
        const burstTime = now + (i + 0.5) * squeakBurstInterval;
        squeakGain.gain.linearRampToValueAtTime(0.4 + Math.random() * 0.2, burstTime);
        squeakGain.gain.exponentialRampToValueAtTime(0.15, burstTime + 0.05);
    }
    
    squeakGain.gain.exponentialRampToValueAtTime(0.01, now + duration);
    
    // === MID-RANGE RESONANCE ===
    // Add some mid-frequency resonance typical of gas passing through tight spaces
    const resonanceOsc = audioContext.createOscillator();
    resonanceOsc.type = 'triangle';
    resonanceOsc.frequency.setValueAtTime(220, now);
    resonanceOsc.frequency.exponentialRampToValueAtTime(160, now + duration);
    
    const resonanceFilter = audioContext.createBiquadFilter();
    resonanceFilter.type = 'peaking';
    resonanceFilter.frequency.setValueAtTime(300, now);
    resonanceFilter.Q.setValueAtTime(3, now);
    resonanceFilter.gain.setValueAtTime(8, now);
    
    const resonanceGain = audioContext.createGain();
    resonanceGain.gain.setValueAtTime(0.15, now);
    resonanceGain.gain.exponentialRampToValueAtTime(0.01, now + duration);
    
    // === HIGH-FREQUENCY AIR HISS ===
    // Filtered noise for the "air escaping" component
    const airNoise = audioContext.createBufferSource();
    airNoise.buffer = brownNoiseBuffer; // Reuse the brown noise buffer
    
    const airFilter = audioContext.createBiquadFilter();
    airFilter.type = 'highpass';
    airFilter.frequency.setValueAtTime(1500, now);
    airFilter.Q.setValueAtTime(0.5, now);
    
    const airGain = audioContext.createGain();
    airGain.gain.setValueAtTime(0.1, now);
    airGain.gain.exponentialRampToValueAtTime(0.01, now + duration);
    
    // === LOW-END RUMBLE (REDUCED) ===
    // Keep some low-end but much less than other fart types
    const lowRumble = audioContext.createOscillator();
    lowRumble.type = 'sine';
    lowRumble.frequency.setValueAtTime(60, now);
    lowRumble.frequency.exponentialRampToValueAtTime(40, now + duration);
    
    const rumbleGain = audioContext.createGain();
    rumbleGain.gain.setValueAtTime(0.1, now);
    rumbleGain.gain.exponentialRampToValueAtTime(0.01, now + duration);
    
    // === CONNECTIONS ===
    // Brown noise fart body
    brownNoise.connect(fartBodyFilter);
    fartBodyFilter.connect(fartBodyGain);
    fartBodyGain.connect(masterGain);
    
    // Squeaky component
    squeakOsc.connect(squeakFilter);
    squeakFilter.connect(squeakGain);
    squeakGain.connect(masterGain);
    
    // Mid-range resonance
    resonanceOsc.connect(resonanceFilter);
    resonanceFilter.connect(resonanceGain);
    resonanceGain.connect(masterGain);
    
    // Air hiss
    airNoise.connect(airFilter);
    airFilter.connect(airGain);
    airGain.connect(masterGain);
    
    // Low rumble
    lowRumble.connect(rumbleGain);
    rumbleGain.connect(masterGain);
    
    // Final output
    masterGain.connect(compressor);
    compressor.connect(audioContext.destination);
    
    // === START ALL COMPONENTS ===
    brownNoise.start(now);
    brownNoise.stop(now + duration);
    
    squeakOsc.start(now);
    squeakOsc.stop(now + duration);
    
    vibratoLFO.start(now);
    vibratoLFO.stop(now + duration);
    
    resonanceOsc.start(now);
    resonanceOsc.stop(now + duration);
    
    airNoise.start(now);
    airNoise.stop(now + duration);
    
    lowRumble.start(now);
    lowRumble.stop(now + duration);
}

// Creates an explosive fart - sharp attack, loud, quick decay
function createExplosiveFart(duration, now) {
    const masterGain = audioContext.createGain();
    masterGain.gain.setValueAtTime(0.75, now);
    masterGain.gain.exponentialRampToValueAtTime(0.01, now + duration + 0.1);
    
    // Moderate compression for punch without over-processing
    const compressor = audioContext.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-18, now);
    compressor.knee.setValueAtTime(8, now);
    compressor.ratio.setValueAtTime(8, now);
    compressor.attack.setValueAtTime(0.002, now);
    compressor.release.setValueAtTime(0.06, now);
    
    // Create realistic explosive gas burst - lower frequency for realism
    const burstFreq = 100 + Math.random() * 80; // 100-180 Hz (more realistic range)
    
    // Primary gas burst oscillator - triangle for more natural attack
    const burstOsc = audioContext.createOscillator();
    burstOsc.type = 'triangle';
    burstOsc.frequency.setValueAtTime(burstFreq, now);
    burstOsc.frequency.exponentialRampToValueAtTime(burstFreq * 0.4, now + duration); // Dramatic pitch drop
    
    // Secondary harmonic for richness
    const harmonic = audioContext.createOscillator();
    harmonic.type = 'sawtooth';
    harmonic.frequency.setValueAtTime(burstFreq * 0.7, now);
    harmonic.frequency.exponentialRampToValueAtTime(burstFreq * 0.3, now + duration);
    
    // Deep sub-bass for the explosive "thump"
    const subBass = audioContext.createOscillator();
    subBass.type = 'sine';
    subBass.frequency.setValueAtTime(45, now);
    subBass.frequency.exponentialRampToValueAtTime(25, now + duration);
    
    // Create realistic gas texture with brown noise
    const bufferSize = 2 * audioContext.sampleRate;
    const gasNoiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const gasNoiseData = gasNoiseBuffer.getChannelData(0);
    
    // Generate brown noise for natural gas sound
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        gasNoiseData[i] = (lastOut + (0.03 * white)) / 1.03;
        lastOut = gasNoiseData[i];
        gasNoiseData[i] *= 3.5;
    }
    
    const gasNoise = audioContext.createBufferSource();
    gasNoise.buffer = gasNoiseBuffer;
    
    // Create initial "pop" burst
    const popOsc = audioContext.createOscillator();
    popOsc.type = 'sine';
    popOsc.frequency.setValueAtTime(200, now);
    popOsc.frequency.exponentialRampToValueAtTime(80, now + 0.08);
    
    // Gas release filter - bandpass for realistic gas character
    const gasFilter = audioContext.createBiquadFilter();
    gasFilter.type = 'bandpass';
    gasFilter.frequency.setValueAtTime(300, now);
    gasFilter.frequency.exponentialRampToValueAtTime(120, now + duration);
    gasFilter.Q.value = 2.5; // Resonant for gas-like quality
    
    // Add wet/bubble character filter
    const bubbleFilter = audioContext.createBiquadFilter();
    bubbleFilter.type = 'lowpass';
    bubbleFilter.frequency.setValueAtTime(600, now);
    bubbleFilter.frequency.exponentialRampToValueAtTime(200, now + duration);
    bubbleFilter.Q.value = 1.8;
    
    // Explosive attack envelope - ultra-sharp for burst effect
    const burstGain = audioContext.createGain();
    burstGain.gain.setValueAtTime(0.01, now);
    burstGain.gain.exponentialRampToValueAtTime(0.8, now + 0.01); // Instant attack
    burstGain.gain.exponentialRampToValueAtTime(0.3, now + 0.05); // Quick initial decay
    burstGain.gain.exponentialRampToValueAtTime(0.01, now + duration); // Gradual fade
    
    // Harmonic gain
    const harmonicGain = audioContext.createGain();
    harmonicGain.gain.setValueAtTime(0.01, now);
    harmonicGain.gain.exponentialRampToValueAtTime(0.4, now + 0.02);
    harmonicGain.gain.exponentialRampToValueAtTime(0.01, now + duration * 0.7);
    
    // Sub-bass gain - strong initial thump
    const subBassGain = audioContext.createGain();
    subBassGain.gain.setValueAtTime(0.01, now);
    subBassGain.gain.exponentialRampToValueAtTime(0.7, now + 0.015);
    subBassGain.gain.exponentialRampToValueAtTime(0.01, now + duration * 0.6);
    
    // Gas noise gain
    const gasNoiseGain = audioContext.createGain();
    gasNoiseGain.gain.setValueAtTime(0.01, now);
    gasNoiseGain.gain.exponentialRampToValueAtTime(0.5, now + 0.008);
    gasNoiseGain.gain.exponentialRampToValueAtTime(0.01, now + duration * 0.6);
    
    // Initial pop gain - very sharp burst
    const popGain = audioContext.createGain();
    popGain.gain.setValueAtTime(0.01, now);
    popGain.gain.exponentialRampToValueAtTime(0.6, now + 0.005);
    popGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
    
    // Add 1-2 secondary "aftershocks" for realism
    const numAfterShocks = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < numAfterShocks; i++) {
        const shockTime = now + 0.1 + (i * 0.15) + (Math.random() * 0.05);
        const shockDuration = 0.06 + Math.random() * 0.04;
        
        const shockOsc = audioContext.createOscillator();
        shockOsc.type = 'triangle';
        const shockFreq = 120 + Math.random() * 60;
        shockOsc.frequency.setValueAtTime(shockFreq, shockTime);
        shockOsc.frequency.exponentialRampToValueAtTime(shockFreq * 0.5, shockTime + shockDuration);
        
        const shockGainNode = audioContext.createGain();
        shockGainNode.gain.setValueAtTime(0.01, shockTime);
        shockGainNode.gain.exponentialRampToValueAtTime(0.3, shockTime + 0.01);
        shockGainNode.gain.exponentialRampToValueAtTime(0.01, shockTime + shockDuration);
        
        shockOsc.connect(shockGainNode);
        shockGainNode.connect(masterGain);
        
        shockOsc.start(shockTime);
        shockOsc.stop(shockTime + shockDuration);
    }
    
    // Connect all components
    burstOsc.connect(burstGain);
    burstGain.connect(masterGain);
    
    harmonic.connect(harmonicGain);
    harmonicGain.connect(masterGain);
    
    subBass.connect(subBassGain);
    subBassGain.connect(masterGain);
    
    popOsc.connect(popGain);
    popGain.connect(masterGain);
    
    gasNoise.connect(gasFilter);
    gasFilter.connect(bubbleFilter);
    bubbleFilter.connect(gasNoiseGain);
    gasNoiseGain.connect(masterGain);
    
    masterGain.connect(compressor);
    compressor.connect(audioContext.destination);
    
    // Start all components
    burstOsc.start(now);
    burstOsc.stop(now + duration);
    
    harmonic.start(now);
    harmonic.stop(now + duration * 0.7);
    
    subBass.start(now);
    subBass.stop(now + duration * 0.6);
    
    popOsc.start(now);
    popOsc.stop(now + 0.08);
    
    gasNoise.start(now);
    gasNoise.stop(now + duration * 0.6);
}

// Creates a deep rumbling fart - the classic low-frequency rumble
function createRumblingFart(duration, now) {
    const masterGain = audioContext.createGain();
    masterGain.gain.setValueAtTime(0.6, now);
    masterGain.gain.exponentialRampToValueAtTime(0.01, now + duration + 0.2);
    
    // Gentle compression for natural dynamics
    const compressor = audioContext.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-18, now);
    compressor.knee.setValueAtTime(6, now);
    compressor.ratio.setValueAtTime(6, now);
    compressor.attack.setValueAtTime(0.01, now);
    compressor.release.setValueAtTime(0.12, now);
    
    // Create realistic deep rumble base with multiple low frequency oscillators
    const baseFreq = 40 + Math.random() * 20; // 40-60 Hz base frequency
    
    // Primary rumble oscillator - the main "engine" of the fart
    const rumbleOsc = audioContext.createOscillator();
    rumbleOsc.type = 'sawtooth'; // Sawtooth for rich harmonics
    rumbleOsc.frequency.setValueAtTime(baseFreq, now);
    rumbleOsc.frequency.exponentialRampToValueAtTime(baseFreq * 0.7, now + duration); // Pitch drops as gas escapes
    
    // Secondary harmonic for richness
    const harmonic2 = audioContext.createOscillator();
    harmonic2.type = 'triangle';
    harmonic2.frequency.setValueAtTime(baseFreq * 1.5, now);
    harmonic2.frequency.exponentialRampToValueAtTime(baseFreq * 1.2, now + duration);
    
    // Sub-bass component for that chest-thumping feeling
    const subBass = audioContext.createOscillator();
    subBass.type = 'sine';
    subBass.frequency.setValueAtTime(25, now); // Very low sub-bass
    subBass.frequency.linearRampToValueAtTime(20, now + duration);
    
    // Create realistic gas bubble texture using filtered noise
    const bufferSize = 2 * audioContext.sampleRate;
    const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    
    // Generate brown noise for natural gas sound
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        noiseData[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = noiseData[i];
        noiseData[i] *= 2.5;
    }
    
    const noiseSource = audioContext.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;
    
    // Filter noise to sound like gas bubbles
    const bubbleFilter = audioContext.createBiquadFilter();
    bubbleFilter.type = 'bandpass';
    bubbleFilter.frequency.setValueAtTime(120, now);
    bubbleFilter.frequency.exponentialRampToValueAtTime(80, now + duration);
    bubbleFilter.Q.value = 3; // Resonant for bubbly character
    
    // Create slow tremolo for natural variation
    const tremoloLFO = audioContext.createOscillator();
    tremoloLFO.type = 'sine';
    tremoloLFO.frequency.value = 3.5 + Math.random() * 2; // 3.5-5.5 Hz variation
    
    const tremoloGain = audioContext.createGain();
    tremoloGain.gain.value = 0.15; // Subtle tremolo depth
    
    // Main rumble gain with realistic envelope
    const rumbleGain = audioContext.createGain();
    rumbleGain.gain.setValueAtTime(0.01, now);
    rumbleGain.gain.exponentialRampToValueAtTime(0.7, now + 0.1); // Quick attack
    rumbleGain.gain.linearRampToValueAtTime(0.6, now + duration * 0.3); // Sustain
    rumbleGain.gain.exponentialRampToValueAtTime(0.01, now + duration); // Natural decay
    
    // Secondary harmonic gain
    const harmonic2Gain = audioContext.createGain();
    harmonic2Gain.gain.setValueAtTime(0.01, now);
    harmonic2Gain.gain.exponentialRampToValueAtTime(0.3, now + 0.15);
    harmonic2Gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
    
    // Sub-bass gain
    const subBassGain = audioContext.createGain();
    subBassGain.gain.setValueAtTime(0.01, now);
    subBassGain.gain.exponentialRampToValueAtTime(0.4, now + 0.2);
    subBassGain.gain.exponentialRampToValueAtTime(0.01, now + duration);
    
    // Noise texture gain
    const noiseGain = audioContext.createGain();
    noiseGain.gain.setValueAtTime(0.01, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.25, now + 0.1);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + duration);
    
    // Create rumbling variations with random modulation
    const numVariations = 2 + Math.floor(Math.random() * 3); // 2-4 rumble variations
    for (let i = 0; i < numVariations; i++) {
        const variationTime = now + 0.2 + (i * (duration - 0.4) / numVariations);
        const intensityVariation = 0.8 + Math.random() * 0.4; // 0.8-1.2 intensity
        
        rumbleGain.gain.linearRampToValueAtTime(0.6 * intensityVariation, variationTime);
        rumbleGain.gain.linearRampToValueAtTime(0.5, variationTime + 0.1);
    }
    
    // Add occasional deep "pops" for realism
    const numPops = Math.floor(Math.random() * 2); // 0-1 pops
    for (let i = 0; i < numPops; i++) {
        const popTime = now + 0.3 + Math.random() * (duration - 0.6);
        const popDuration = 0.05 + Math.random() * 0.03;
        
        const popOsc = audioContext.createOscillator();
        popOsc.type = 'sine';
        popOsc.frequency.setValueAtTime(80, popTime);
        popOsc.frequency.exponentialRampToValueAtTime(45, popTime + popDuration);
        
        const popGain = audioContext.createGain();
        popGain.gain.setValueAtTime(0.01, popTime);
        popGain.gain.exponentialRampToValueAtTime(0.6, popTime + 0.01);
        popGain.gain.exponentialRampToValueAtTime(0.01, popTime + popDuration);
        
        popOsc.connect(popGain);
        popGain.connect(masterGain);
        
        popOsc.start(popTime);
        popOsc.stop(popTime + popDuration);
    }
    
    // Connect tremolo modulation
    tremoloLFO.connect(tremoloGain);
    tremoloGain.connect(rumbleGain.gain);
    
    // Connect all components
    rumbleOsc.connect(rumbleGain);
    rumbleGain.connect(masterGain);
    
    harmonic2.connect(harmonic2Gain);
    harmonic2Gain.connect(masterGain);
    
    subBass.connect(subBassGain);
    subBassGain.connect(masterGain);
    
    noiseSource.connect(bubbleFilter);
    bubbleFilter.connect(noiseGain);
    noiseGain.connect(masterGain);
    
    masterGain.connect(compressor);
    compressor.connect(audioContext.destination);
    
    // Start all components
    rumbleOsc.start(now);
    rumbleOsc.stop(now + duration);
    
    harmonic2.start(now);
    harmonic2.stop(now + duration);
    
    subBass.start(now);
    subBass.stop(now + duration);
    
    noiseSource.start(now);
    noiseSource.stop(now + duration);
    
    tremoloLFO.start(now);
    tremoloLFO.stop(now + duration);
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
        
        // Position cloud behind and slightly below Filip
        const cloudX = frogX - 40; // Behind Filip
        const cloudY = frogY + 20; // Slightly below
        
        fartCloud.style.cssText = `
            position: absolute;
            left: ${cloudX}px;
            top: ${cloudY}px;
            width: 60px;
            height: 40px;
            background-image: url('images/fart-cloud.png');
            background-size: contain;
            background-repeat: no-repeat;
            background-position: center;
            opacity: 0.8;
            z-index: 5;
            pointer-events: none;
            transform-origin: center;
            animation: fartCloudAnimation 1.5s ease-out forwards;
        `;
        
        // Add the animation keyframes if they don't exist
        if (!document.querySelector('#fart-cloud-styles')) {
            const style = document.createElement('style');
            style.id = 'fart-cloud-styles';
            style.textContent = `
                @keyframes fartCloudAnimation {
                    0% {
                        transform: scale(0.3) rotate(-10deg);
                        opacity: 0.9;
                    }
                    30% {
                        transform: scale(1.2) rotate(5deg);
                        opacity: 0.8;
                    }
                    60% {
                        transform: scale(1.5) rotate(-2deg);
                        opacity: 0.6;
                    }
                    100% {
                        transform: scale(2.0) rotate(3deg);
                        opacity: 0;
                    }
                }
                
                .fart-cloud {
                    filter: hue-rotate(0deg);
                }
            `;
            document.head.appendChild(style);
        }
        
        // Add cloud to game area
        gameArea.appendChild(fartCloud);
        
        // Match cloud color/type to the current fart type if available
        if (window.currentFartType) {
            switch (window.currentFartType) {
                case 'explosive':
                    fartCloud.style.filter = 'hue-rotate(20deg) brightness(1.3) contrast(1.2)';
                    fartCloud.style.animation = 'fartCloudAnimation 1.0s ease-out forwards';
                    break;
                case 'deep_rumble':
                    fartCloud.style.filter = 'hue-rotate(40deg) brightness(0.9) sepia(0.3)';
                    fartCloud.style.animation = 'fartCloudAnimation 2.0s ease-out forwards';
                    break;
                case 'short_wet':
                    fartCloud.style.filter = 'hue-rotate(120deg) brightness(1.1) saturate(1.3)';
                    break;
                case 'squeaky':
                    fartCloud.style.filter = 'hue-rotate(200deg) brightness(1.2) saturate(0.8)';
                    fartCloud.style.animation = 'fartCloudAnimation 1.2s ease-out forwards';
                    break;
                case 'long_rippling':
                    fartCloud.style.filter = 'hue-rotate(80deg) brightness(1.0) saturate(1.1)';
                    fartCloud.style.animation = 'fartCloudAnimation 1.8s ease-out forwards';
                    break;
            }
        }
        
        // Remove the cloud after animation completes
        setTimeout(() => {
            if (fartCloud && fartCloud.parentNode) {
                fartCloud.parentNode.removeChild(fartCloud);
            }
        }, 2500);
        
        console.log(`Fart cloud created with type: ${window.currentFartType || 'default'}`);
        
    } catch (error) {
        console.error('Error creating fart cloud:', error);
    }
}

// Initialize the game
function initializeGame() {
    loadHighScore();
    if (highScoreElement) {
        highScoreElement.textContent = `Best: ${highScore}`;
    }
    console.log('Game initialized with high score:', highScore);
}

// Start the game when the page loads
initializeGame();
