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
                playActualSound();
            }).catch(error => {
                console.error('Failed to resume audio context:', error);
                
                // Fallback to HTML5 audio
                tryHtmlAudioFallback();
            });
        } else {
            playActualSound();
        }
    } catch (e) {
        console.error(`Failed to play ${type} sound:`, e);
        
        // Try HTML5 audio as a last resort
        tryHtmlAudioFallback();
    }
    
    // Main sound playing function
    function playActualSound() {
        if (type === 'fart') {
            try {
                // Only try realistic fart sound if we have a working audio context
                if (audioContext && audioContext.state === 'running') {
                    playRealisticFartSound(fartType);
                } else {
                    // Fall back to HTML5 audio immediately if no audio context
                    tryHtmlAudioFallback();
                }
            } catch (innerError) {
                console.error(`Error in realistic sound generation: ${innerError}`);
                // Fall back to HTML5 audio
                tryHtmlAudioFallback();
            }
        } else if (type === 'hit') {
            playSimpleHitSound();
        }
        
        console.log(`${type} sound played successfully`);
    }
    
    // Last resort fallback using HTML5 Audio
    function tryHtmlAudioFallback() {
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
                        tryStandardAudio();
                    });
                    return; // Exit if we've started the play attempt
                }
            }
            
            // Fall through to standard audio if alt audio not available
            tryStandardAudio();
            
        } catch (e) {
            console.error('Error in HTML5 audio fallback:', e);
        }
        
        function tryStandardAudio() {
            // Create a fresh audio element to avoid abort errors
            const freshAudio = new Audio();
            
            if (type === 'fart') {
                console.log('Trying HTML5 Audio fallback for fart sound');
                freshAudio.src = 'sounds/fart.mp3';
                freshAudio.volume = 0.8;
                freshAudio.play().catch(e => console.log('Fresh audio fallback failed:', e));
            } else if (type === 'hit') {
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
    // Create multiple fart bubble components - fewer bubbles for more realism
    const numBubbles = 3 + Math.floor(Math.random() * 3); // 3-5 bubbles
    const bubbleTime = duration / (numBubbles + 1.5); // Increase spacing
    
    // Create master gain with higher initial volume for wetness
    const masterGain = audioContext.createGain();
    masterGain.gain.setValueAtTime(0.75, now); // Slightly lower volume
    masterGain.gain.exponentialRampToValueAtTime(0.01, now + duration + 0.2);
    
    // Create compressor for that "squished" sound
    const compressor = audioContext.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-24, now);
    compressor.knee.setValueAtTime(15, now); // Less extreme compression knee
    compressor.ratio.setValueAtTime(12, now);
    compressor.attack.setValueAtTime(0.002, now); // Faster attack
    compressor.release.setValueAtTime(0.15, now); // Faster release
    
    // Create primary brown noise - deeper for wet character
    const bufferSize = 2 * audioContext.sampleRate;
    const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
        // Browner noise formula (more bass content)
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + (0.015 * white)) / 1.015; // Browner coefficient
        lastOut = output[i];
        output[i] *= 4.0; // More amplification for presence
    }
    
    // Noise source for the "wet/airy" component
    const noise = audioContext.createBufferSource();
    noise.buffer = noiseBuffer;
    
    // Create a second noise layer for texture
    const textureBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const textureOutput = textureBuffer.getChannelData(0);
    
    // Create a mix of pink and white noise for texture
    for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        // Pink noise has more mid-range energy
        textureOutput[i] = white * (1 - (i/bufferSize) * 0.15);
    }
    
    const textureNoise = audioContext.createBufferSource();
    textureNoise.buffer = textureBuffer;
    
    // Primary filter for the base noise - less resonant
    const noiseFilter = audioContext.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(600, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(120, now + duration);
    noiseFilter.Q.setValueAtTime(1.5, now); // Much less resonance to avoid "boing"
    
    // Add low shelf boost for wetness
    const lowShelfFilter = audioContext.createBiquadFilter();
    lowShelfFilter.type = 'lowshelf';
    lowShelfFilter.frequency.value = 200;
    lowShelfFilter.gain.value = 8;
    
    // Add a "squelchy" formant filter - avoid high Q values that cause ringing
    const formantFilter = audioContext.createBiquadFilter();
    formantFilter.type = 'peaking';
    formantFilter.frequency.value = 700;
    formantFilter.Q.value = 2; // Lower Q to avoid resonant "boing"
    formantFilter.gain.value = 6;
    
    // Create wobble LFO for overall movement
    const wobbleLFO = audioContext.createOscillator();
    wobbleLFO.type = 'sine';
    wobbleLFO.frequency.setValueAtTime(3.0 + Math.random() * 2.0, now);
    
    // Slower, irregular modulation for more natural movement
    const modLFO1 = audioContext.createOscillator();
    modLFO1.type = 'triangle'; // More natural modulation
    modLFO1.frequency.setValueAtTime(2.5 + Math.random() * 1.5, now); // Much slower
    
    const modLFO2 = audioContext.createOscillator();
    modLFO2.type = 'sine'; 
    modLFO2.frequency.setValueAtTime(7.2 + Math.random() * 2, now); // Second modulation source
    
    const modGain1 = audioContext.createGain();
    modGain1.gain.setValueAtTime(80, now); // Less extreme modulation depth
    
    const modGain2 = audioContext.createGain();
    modGain2.gain.setValueAtTime(40, now);
    
    // Connect modulation sources
    modLFO1.connect(modGain1);
    modGain1.connect(formantFilter.frequency);
    
    modLFO2.connect(modGain2);
    modGain2.connect(noiseFilter.frequency);
    
    // Configure wobble LFO to add subtle movement to the filter
    const wobbleGain = audioContext.createGain();
    wobbleGain.gain.setValueAtTime(60, now);
    wobbleLFO.connect(wobbleGain);
    wobbleGain.connect(lowShelfFilter.frequency);
    
    // More natural envelope for the noise
    const noiseGain = audioContext.createGain();
    noiseGain.gain.setValueAtTime(0.01, now);
    noiseGain.gain.linearRampToValueAtTime(0.5, now + 0.04); // Fast initial attack
    
    // Create intermediate level changes for more realism
    const segments = 2 + Math.floor(Math.random() * 2); // 2-3 segments
    const segmentTime = duration / segments;
    
    for (let i = 0; i < segments; i++) {
        const segStart = now + (i * segmentTime);
        noiseGain.gain.linearRampToValueAtTime(
            0.4 - (i * 0.1), // Gradually decrease volume
            segStart + (segmentTime * 0.3)
        );
        noiseGain.gain.linearRampToValueAtTime(
            0.25 - (i * 0.07),
            segStart + (segmentTime * 0.7)
        );
    }
    
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + duration);
    
    // Texture noise gain
    const textureGain = audioContext.createGain();
    textureGain.gain.setValueAtTime(0.01, now);
    textureGain.gain.linearRampToValueAtTime(0.2, now + 0.05);
    textureGain.gain.exponentialRampToValueAtTime(0.01, now + duration * 0.7);
    
    // For bubble sounds, use filtered noise instead of oscillators
    // This creates more realistic "plop" sounds instead of "boing" tones
    for (let i = 0; i < numBubbles; i++) {
        const bubbleStart = now + (i * bubbleTime) + (Math.random() * 0.03); // Add jitter
        const bubbleDuration = 0.06 + (Math.random() * 0.05); // Short bubbles
        
        // Create bubble filter (bandpass for targeted "plop" sound)
        const bubbleFilter = audioContext.createBiquadFilter();
        bubbleFilter.type = 'bandpass';
        const baseFreq = 180 + (Math.random() * 120); // Lower frequencies
        bubbleFilter.frequency.setValueAtTime(baseFreq * 1.5, bubbleStart);
        bubbleFilter.frequency.exponentialRampToValueAtTime(baseFreq * 0.7, bubbleStart + bubbleDuration);
        bubbleFilter.Q.setValueAtTime(1 + Math.random() * 1.5, bubbleStart); // Lower resonance
        
        // Create resonant "body" for plop sound
        const plopFilter = audioContext.createBiquadFilter();
        plopFilter.type = 'lowshelf';
        plopFilter.frequency.setValueAtTime(baseFreq * 0.7, bubbleStart);
        plopFilter.gain.setValueAtTime(10, bubbleStart);
        
        // Random pan for spatial effect
        const panner = audioContext.createStereoPanner();
        panner.pan.setValueAtTime((Math.random() * 0.4) - 0.2, bubbleStart);
        
        // Create envelope for bubble (sharp attack, quick decay)
        const bubbleGain = audioContext.createGain();
        bubbleGain.gain.setValueAtTime(0.01, bubbleStart);
        bubbleGain.gain.linearRampToValueAtTime(0.2 + (Math.random() * 0.15), bubbleStart + 0.02);
        bubbleGain.gain.exponentialRampToValueAtTime(0.01, bubbleStart + bubbleDuration);
        
        // Create bubble noise source (clone the main noise for efficiency)
        const bubbleNoise = audioContext.createBufferSource();
        bubbleNoise.buffer = noiseBuffer;
        
        // Connect bubble path with filters first
        bubbleNoise.connect(bubbleFilter);
        bubbleFilter.connect(plopFilter);
        plopFilter.connect(bubbleGain);
        bubbleGain.connect(panner);
        panner.connect(masterGain);
        
        // Schedule bubble noise burst
        bubbleNoise.start(bubbleStart);
        bubbleNoise.stop(bubbleStart + bubbleDuration);
    }
    
    // Add wet "slosh" element halfway through
    if (Math.random() > 0.4) {
        const sloshTime = now + (duration * 0.4) + (Math.random() * 0.1);
        const sloshDuration = 0.15 + (Math.random() * 0.1);
        
        // Create slosh filter
        const sloshFilter = audioContext.createBiquadFilter();
        sloshFilter.type = 'lowpass';
        sloshFilter.frequency.setValueAtTime(800, sloshTime);
        sloshFilter.frequency.exponentialRampToValueAtTime(300, sloshTime + sloshDuration);
        sloshFilter.Q.value = 1.5; // Lower Q to avoid springiness
        
        // Slosh gain envelope
        const sloshGain = audioContext.createGain();
        sloshGain.gain.setValueAtTime(0.01, sloshTime);
        sloshGain.gain.linearRampToValueAtTime(0.3, sloshTime + 0.03);
        sloshGain.gain.exponentialRampToValueAtTime(0.01, sloshTime + sloshDuration);
        
        // Create slosh noise
        const sloshNoise = audioContext.createBufferSource();
        sloshNoise.buffer = noiseBuffer;
        
        sloshNoise.connect(sloshFilter);
        sloshFilter.connect(sloshGain);
        sloshGain.connect(masterGain);
        
        sloshNoise.start(sloshTime);
        sloshNoise.stop(sloshTime + sloshDuration);
    }
    
    // Main routing - simpler signal path with less resonance
    noise.connect(noiseFilter);
    noiseFilter.connect(lowShelfFilter);
    lowShelfFilter.connect(formantFilter);
    formantFilter.connect(noiseGain);
    noiseGain.connect(masterGain);
    
    // Add texture noise layer
    textureNoise.connect(textureGain);
    textureGain.connect(masterGain);
    
    // Final output path with compression for "wetness"
    masterGain.connect(compressor);
    compressor.connect(audioContext.destination);
    
    // Start the continuous components
    modLFO1.start(now);
    modLFO1.stop(now + duration);
    
    modLFO2.start(now);
    modLFO2.stop(now + duration);
    
    wobbleLFO.start(now);
    wobbleLFO.stop(now + duration);
    
    noise.start(now);
    noise.stop(now + duration);
    
    textureNoise.start(now);
    textureNoise.stop(now + duration);
    
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
    masterGain.gain.setValueAtTime(0.5, now);
    masterGain.gain.exponentialRampToValueAtTime(0.01, now + duration + 0.1);
    
    // Add strong compression for that tight, pressurized sound
    const compressor = audioContext.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-24);
    compressor.knee.setValueAtTime(4);
    compressor.ratio.setValueAtTime(12);
    compressor.attack.setValueAtTime(0.002);
    compressor.release.setValueAtTime(0.05);
    
    // Create primary brown noise component (all farts need some noise component)
    const brownBufferSize = 2 * audioContext.sampleRate;
    const brownNoiseBuffer = audioContext.createBuffer(1, brownBufferSize, audioContext.sampleRate);
    const brownOutput = brownNoiseBuffer.getChannelData(0);
    
    let brownLastOut = 0.0;
    for (let i = 0; i < brownBufferSize; i++) {
        const white = Math.random() * 2 - 1;
        brownOutput[i] = (brownLastOut + (0.02 * white)) / 1.02;
        brownLastOut = brownOutput[i];
        brownOutput[i] *= 3.0;
    }
    
    const brownNoise = audioContext.createBufferSource();
    brownNoise.buffer = brownNoiseBuffer;
    
    // Bandpass filter to create "friction" character instead of pure tone
    const frictionFilter = audioContext.createBiquadFilter();
    frictionFilter.type = 'bandpass';
    frictionFilter.frequency.value = 2500;
    frictionFilter.Q.value = 2.5;
    
    // Add a subtle formant filter for more "organic" quality
    const formantFilter = audioContext.createBiquadFilter();
    formantFilter.type = 'peaking';
    formantFilter.frequency.value = 1800;
    formantFilter.Q.value = 5;
    formantFilter.gain.value = 15;
    
    // For the squeaky component, use filtered noise rather than a pure oscillator
    // This creates a more airy, friction-based sound like real squeaky farts
    const squeakFilter = audioContext.createBiquadFilter();
    squeakFilter.type = 'bandpass';
    squeakFilter.Q.value = 8;
    
    // Make the center frequency move in a more organic pattern
    // Start higher, move down, then back up slightly (typical squeaky fart pattern)
    squeakFilter.frequency.setValueAtTime(3000, now);
    squeakFilter.frequency.exponentialRampToValueAtTime(1800, now + duration * 0.6);
    squeakFilter.frequency.exponentialRampToValueAtTime(2200, now + duration);
    
    // Modulate the frequency with irregular patterns for realism
    const modLFO = audioContext.createOscillator();
    modLFO.type = 'sawtooth'; // Creates more organic movement
    modLFO.frequency.setValueAtTime(15, now);
    modLFO.frequency.linearRampToValueAtTime(8, now + duration);
    
    const modGain = audioContext.createGain();
    modGain.gain.setValueAtTime(300, now);
    modGain.gain.linearRampToValueAtTime(100, now + duration);
    
    modLFO.connect(modGain);
    modGain.connect(squeakFilter.frequency);
    
    // Create a more complex envelope for the squeak
    const squeakGain = audioContext.createGain();
    squeakGain.gain.setValueAtTime(0.01, now);
    squeakGain.gain.linearRampToValueAtTime(0.2, now + 0.02);
    
    // Add 2-3 "pulses" to the squeak for a more realistic sound
    const pulses = 2 + Math.floor(Math.random() * 2);
    const pulseLength = duration / (pulses + 0.5);
    
    for (let i = 0; i < pulses; i++) {
        const pulseTime = now + (i * pulseLength);
        squeakGain.gain.linearRampToValueAtTime(0.3, pulseTime);
        squeakGain.gain.exponentialRampToValueAtTime(0.1, pulseTime + (pulseLength * 0.7));
    }
    
    squeakGain.gain.exponentialRampToValueAtTime(0.01, now + duration);
    
    // Add low-end air movement noise for body
    const airFilter = audioContext.createBiquadFilter();
    airFilter.type = 'lowpass';
    airFilter.frequency.value = 300;
    
    const airGain = audioContext.createGain();
    airGain.gain.setValueAtTime(0.05, now);
    airGain.gain.linearRampToValueAtTime(0.15, now + 0.1);
    masterGain.gain.exponentialRampToValueAtTime(0.01, now + duration + 0.2);
    
    // More moderate compression for that "splat" character
    const splatCompressor = audioContext.createDynamicsCompressor();
    splatCompressor.threshold.setValueAtTime(-18, now);
    splatCompressor.knee.setValueAtTime(8, now); // Gentler knee for smoother sound
    splatCompressor.ratio.setValueAtTime(12, now); // Reduced from 20 to 12
    splatCompressor.attack.setValueAtTime(0.002, now); // Slightly slower attack for less punch
    splatCompressor.release.setValueAtTime(0.12, now);
    
    // Mix of noise types for a more organic explosion
    const burstBufferSize = 2 * audioContext.sampleRate;
    
    // Create brown noise for the initial "burst" character
    const burstNoiseBuffer = audioContext.createBuffer(1, burstBufferSize, audioContext.sampleRate);
    const burstOutput = burstNoiseBuffer.getChannelData(0);
    
    let burstLastOut = 0.0;
    for (let i = 0; i < burstBufferSize; i++) {
        // Brown noise with extra low-end emphasis
        const white = Math.random() * 2 - 1;
        burstOutput[i] = (burstLastOut + (0.015 * white)) / 1.015;
        burstLastOut = burstOutput[i];
        burstOutput[i] *= 2.5; // Reduced from 5.0 to 2.5 for less harshness
    }
    
    // Create noise burst with a sharp attack
    const burstNoise = audioContext.createBufferSource();
    burstNoise.buffer = burstNoiseBuffer;
    
    // Moderate "splat" filter with less boost
    const splatFilter = audioContext.createBiquadFilter();
    splatFilter.type = 'lowshelf';
    splatFilter.frequency.value = 150;
    splatFilter.gain.value = 12; // Reduced from 20 to 12 for less extreme bass
    
    // Add some mid-range presence for the "wet" character
    const wetFilter = audioContext.createBiquadFilter();
    wetFilter.type = 'peaking';
    wetFilter.frequency.value = 800;
    wetFilter.Q.value = 1.5; // Reduced for less resonance
    wetFilter.gain.value = 6; // Reduced from 8 to 6
    
    // More moderate envelope for the initial explosion
    const explosionGain = audioContext.createGain();
    explosionGain.gain.setValueAtTime(0.01, now);
    explosionGain.gain.linearRampToValueAtTime(0.65, now + 0.015); // Reduced peak from 1.0 to 0.65
    explosionGain.gain.exponentialRampToValueAtTime(0.3, now + 0.06); // Reduced from 0.4 to 0.3
    explosionGain.gain.exponentialRampToValueAtTime(0.15, now + 0.12); // Reduced from 0.2 to 0.15
    explosionGain.gain.exponentialRampToValueAtTime(0.01, now + duration);
    
    // Add some "spray" noise for that messy character (toned down)
    const sprayNoiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const sprayOutput = sprayNoiseBuffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
        // Add slight pink noise characteristic to reduce harshness
        sprayOutput[i] = (Math.random() * 2 - 1) * (1 - (i/bufferSize) * 0.2);
    }
    
    const sprayNoise = audioContext.createBufferSource();
    sprayNoise.buffer = sprayNoiseBuffer;
    
    // Add a bandpass instead of highpass for less harsh noise
    const sprayFilter = audioContext.createBiquadFilter();
    sprayFilter.type = 'bandpass';
    sprayFilter.frequency.value = 2000; // Lower from 3000 to 2000
    sprayFilter.Q.value = 0.7; // Slightly higher Q for more focused sound
    
    const sprayGain = audioContext.createGain();
    sprayGain.gain.setValueAtTime(0.01, now);
    sprayGain.gain.linearRampToValueAtTime(0.1, now + 0.02); // Reduced from 0.2 to 0.1
    sprayGain.gain.exponentialRampToValueAtTime(0.03, now + 0.1); // Reduced from 0.05 to 0.03
    sprayGain.gain.exponentialRampToValueAtTime(0.01, now + duration * 0.4); // Shorter duration
    
    // Add bubbling aftermath with random bubble pops
    const numBubbles = 3 + Math.floor(Math.random() * 4); // 3-6 bubbles
    
    for (let i = 0; i < numBubbles; i++) {
        // Start bubbles after the initial explosion
        const bubbleStart = now + 0.05 + (Math.random() * duration * 0.6);
        const bubbleDuration = 0.05 + (Math.random() * 0.05);
        
        // Each bubble has a random frequency
        const bubble = audioContext.createOscillator();
        bubble.type = 'sine';
        const baseFreq = 80 + (Math.random() * 120);
        
        // Quick pitch drop for bubble pop effect
        bubble.frequency.setValueAtTime(baseFreq, bubbleStart);
        bubble.frequency.exponentialRampToValueAtTime(baseFreq * 0.6, bubbleStart + bubbleDuration);
        
        // Add envelope for bubble
        const bubbleGain = audioContext.createGain();
        bubbleGain.gain.setValueAtTime(0.01, bubbleStart);
        bubbleGain.gain.linearRampToValueAtTime(0.1 + (Math.random() * 0.2), bubbleStart + 0.01);
        bubbleGain.gain.exponentialRampToValueAtTime(0.01, bubbleStart + bubbleDuration);
        
        // Connect bubble
        bubble.connect(bubbleGain);
        bubbleGain.connect(masterGain);
        
        // Schedule bubble
        bubble.start(bubbleStart);
        bubble.stop(bubbleStart + bubbleDuration);
    }
    
    // Low frequency rumbling aftermath - deeper and more powerful
    const rumble = audioContext.createOscillator();
    rumble.type = 'sawtooth'; // More harmonics for a richer rumble
    rumble.frequency.setValueAtTime(40, now + 0.03); // Lower frequency for deeper rumble
    rumble.frequency.exponentialRampToValueAtTime(25, now + duration);
    
    // Lowpass filter the oscillator for smoother rumble
    const rumbleFilter = audioContext.createBiquadFilter();
    rumbleFilter.type = 'lowpass';
    rumbleFilter.frequency.value = 120;
    rumbleFilter.Q.value = 1;
    
    // Dynamic envelope for the rumble
    const rumbleGain = audioContext.createGain();
    rumbleGain.gain.setValueAtTime(0.01, now + 0.03);
    rumbleGain.gain.linearRampToValueAtTime(0.5, now + 0.08); // Stronger rumble
    rumbleGain.gain.exponentialRampToValueAtTime(0.01, now + duration);
    
    // Connect audio paths
    burstNoise.connect(splatFilter);
    splatFilter.connect(wetFilter);
    wetFilter.connect(explosionGain);
    explosionGain.connect(masterGain);
    
    sprayNoise.connect(sprayFilter);
    sprayFilter.connect(sprayGain);
    sprayGain.connect(masterGain);
    
    rumble.connect(rumbleFilter);
    rumbleFilter.connect(rumbleGain);
    rumbleGain.connect(masterGain);
    
    // Connect to the initial compressor, not the splatCompressor
    masterGain.connect(compressor);
    compressor.connect(audioContext.destination);
    
    // Start components
    burstNoise.start(now);
    burstNoise.stop(now + duration);
    sprayNoise.start(now);
    sprayNoise.stop(now + duration);
    rumble.start(now + 0.03);
    rumble.stop(now + duration);
}

// Creates a deep rumbling fart - the classic "tuba" fart (toned down version)
function createRumblingFart(duration, now) {
    const masterGain = audioContext.createGain();
    masterGain.gain.setValueAtTime(0.55, now); // Reduced from 0.8 to 0.55
    masterGain.gain.exponentialRampToValueAtTime(0.01, now + duration + 0.3);
    
    // Add compression for rich tone with gentler settings
    const compressor = audioContext.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-22, now); // Slightly lower threshold for smoother compression
    compressor.knee.setValueAtTime(8, now); // Wider knee for more gradual compression
    compressor.ratio.setValueAtTime(8, now); // Lower ratio for less aggressive compression
    compressor.attack.setValueAtTime(0.008, now); // Slightly slower attack
    compressor.release.setValueAtTime(0.15, now); // Slightly longer release
    
    // Create ultra-deep brown noise (lowest frequency content)
    const bufferSize = 2 * audioContext.sampleRate;
    const deepNoiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const deepOutput = deepNoiseBuffer.getChannelData(0);
    
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
        // Even lower coefficient for the deepest possible rumble
        const white = Math.random() * 2 - 1;
        deepOutput[i] = (lastOut + (0.008 * white)) / 1.008; // Ultra-deep brown noise
        lastOut = deepOutput[i];
        deepOutput[i] *= 3.0; // Reduced from 7.0 to 3.0 - much less amplification
    }
    
    const deepNoise = audioContext.createBufferSource();
    deepNoise.buffer = deepNoiseBuffer;
    
    // Create additional noise layer for realistic texture
    const textureNoiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const textureOutput = textureNoiseBuffer.getChannelData(0);
    
    lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
        // Mix of brown and pink noise for natural sound
        const white = Math.random() * 2 - 1;
        // Brown noise component
        const brown = (lastOut + (0.02 * white)) / 1.02;
        lastOut = brown;
        // Mix with some pink noise - use softer mix and less white noise
        textureOutput[i] = (brown * 0.85) + (white * 0.15 * (1 - (i/bufferSize) * 0.3));
        textureOutput[i] *= 1.8; // Reduced from 3.0 to 1.8
    }
    
    const textureNoise = audioContext.createBufferSource();
    textureNoise.buffer = textureNoiseBuffer;
    
    // Very low frequency filter for the base rumble - extremely low cutoff
    const subRumbleFilter = audioContext.createBiquadFilter();
    subRumbleFilter.type = 'lowpass';
    subRumbleFilter.frequency.setValueAtTime(80, now); // Even lower cutoff
    subRumbleFilter.frequency.exponentialRampToValueAtTime(40, now + duration);
    subRumbleFilter.Q.value = 0.7; // Less resonance for more natural sound
    
    // Add moderate low shelf for sub-bass emphasis (reduced)
    const subBassFilter = audioContext.createBiquadFilter();
    subBassFilter.type = 'lowshelf';
    subBassFilter.frequency.value = 100;
    subBassFilter.gain.value = 8; // Reduced from 15 to 8
    
    // Add warm mid frequencies for "body" (reduced)
    const bodyFilter = audioContext.createBiquadFilter();
    bodyFilter.type = 'peaking';
    bodyFilter.frequency.value = 250;
    bodyFilter.Q.value = 1; // Reduced from 2 to 1
    bodyFilter.gain.value = 4; // Reduced from 6 to 4
    
    // Create slow, organic modulation for the rumble
    const rumbleLFO1 = audioContext.createOscillator();
    rumbleLFO1.type = 'sine';
    rumbleLFO1.frequency.value = 2.5; // Very slow modulation
    
    const rumbleLFO2 = audioContext.createOscillator();
    rumbleLFO2.type = 'sine';
    rumbleLFO2.frequency.value = 5.8; // Slightly faster secondary modulation
    
    const rumbleLFOGain1 = audioContext.createGain();
    rumbleLFOGain1.gain.value = 25; // Moderate modulation depth
    
    const rumbleLFOGain2 = audioContext.createGain();
    rumbleLFOGain2.gain.value = 15; // Less depth for secondary modulation
    
    // Connect LFOs to filter frequency for organic movement
    rumbleLFO1.connect(rumbleLFOGain1);
    rumbleLFOGain1.connect(subRumbleFilter.frequency);
    
    rumbleLFO2.connect(rumbleLFOGain2);
    rumbleLFOGain2.connect(subRumbleFilter.frequency);
    
    // Gain envelope for primary rumble - more organic variations with reduced intensity
    const rumbleGain = audioContext.createGain();
    rumbleGain.gain.setValueAtTime(0.01, now);
    rumbleGain.gain.linearRampToValueAtTime(0.5, now + 0.18); // Reduced peak from 0.8 to 0.5 with slower attack
    
    // Create realistic pulsing effect in the rumble - fewer, slower, gentler pulses
    const pulses = 2 + Math.floor(Math.random() * 2); // 2-3 pulses (reduced)
    const pulseInterval = duration / pulses;
    
    for (let i = 0; i < pulses; i++) {
        // Make pulses more organic with varied timing
        const pulseTime = now + (i * pulseInterval) + (Math.random() * 0.05); 
        const pulseIntensity = 0.45 + Math.random() * 0.15; // Reduced intensity to 0.45-0.6 range
        const valleyIntensity = 0.25 + Math.random() * 0.1; // Reduced valley to 0.25-0.35 range
        
        rumbleGain.gain.linearRampToValueAtTime(pulseIntensity, pulseTime);
        rumbleGain.gain.linearRampToValueAtTime(valleyIntensity, pulseTime + pulseInterval * 0.6);
    }
    
    rumbleGain.gain.exponentialRampToValueAtTime(0.01, now + duration);
    
    // Add deep sub-bass oscillator for fundamental frequency
    const subBassOsc = audioContext.createOscillator();
    subBassOsc.type = 'sine'; // Pure sine for clean sub-bass
    subBassOsc.frequency.setValueAtTime(35, now); // Ultra-low frequency
    subBassOsc.frequency.linearRampToValueAtTime(30, now + duration); // Not quite as low
    
    // Sub-bass with gentler dynamics
    const subBassGain = audioContext.createGain();
    subBassGain.gain.setValueAtTime(0.01, now);
    subBassGain.gain.linearRampToValueAtTime(0.2, now + 0.25); // Reduced from 0.35 to 0.2
    
    // Match sub-bass pulses to main rumble with reduced intensity
    for (let i = 0; i < pulses; i++) {
        const pulseTime = now + (i * pulseInterval) + (Math.random() * 0.05);
        subBassGain.gain.linearRampToValueAtTime(0.2, pulseTime); // Reduced from 0.35 to 0.2
        subBassGain.gain.linearRampToValueAtTime(0.1, pulseTime + pulseInterval * 0.6); // Reduced from 0.2 to 0.1
    }
    
    subBassGain.gain.exponentialRampToValueAtTime(0.01, now + duration);
    
    // Add occasional "gurgle" elements for character
    const numGurgles = 1 + Math.floor(Math.random() * 2); // 1-2 gurgles 
    for (let i = 0; i < numGurgles; i++) {
        const gurgleTime = now + 0.2 + (Math.random() * (duration - 0.3));
        const gurgleDuration = 0.1 + (Math.random() * 0.15);
        
        // Create bubbling effect
        const gurgle = audioContext.createOscillator();
        gurgle.type = 'triangle';
        gurgle.frequency.setValueAtTime(180 + Math.random() * 80, gurgleTime);
        gurgle.frequency.exponentialRampToValueAtTime(100, gurgleTime + gurgleDuration);
        
        const gurgleFilter = audioContext.createBiquadFilter();
        gurgleFilter.type = 'lowpass';
        gurgleFilter.frequency.value = 400;
        gurgleFilter.Q.value = 1;
        
        const gurgleGain = audioContext.createGain();
        gurgleGain.gain.setValueAtTime(0.01, gurgleTime);
        gurgleGain.gain.linearRampToValueAtTime(0.15, gurgleTime + 0.03);
        gurgleGain.gain.exponentialRampToValueAtTime(0.01, gurgleTime + gurgleDuration);
        
        gurgle.connect(gurgleFilter);
        gurgleFilter.connect(gurgleGain);
        gurgleGain.connect(masterGain);
        
        gurgle.start(gurgleTime);
        gurgle.stop(gurgleTime + gurgleDuration);
    }
    
    // Connect audio pathways
    deepNoise.connect(subRumbleFilter);
    subRumbleFilter.connect(subBassFilter);
    subBassFilter.connect(bodyFilter);
    bodyFilter.connect(rumbleGain);
    rumbleGain.connect(masterGain);
    
    textureNoise.connect(bodyFilter);
    
    subBassOsc.connect(subBassGain);
    subBassGain.connect(masterGain);
    
    masterGain.connect(compressor);
    compressor.connect(audioContext.destination);
    
    // Start components
    deepNoise.start(now);
    deepNoise.stop(now + duration);
    
    textureNoise.start(now);
    textureNoise.stop(now + duration);
    
    rumbleLFO1.start(now);
    rumbleLFO1.stop(now + duration);
    
    rumbleLFO2.start(now);
    rumbleLFO2.stop(now + duration);
    
    subBassOsc.start(now);
    subBassOsc.stop(now + duration);
}

// The original fart sound implementation as a fallback
function createDefaultFart(duration, now) {
    // Create multiple fart bubble components
    const numBubbles = 3 + Math.floor(Math.random() * 3); // 3-5 bubbles
    const bubbleTime = duration / (numBubbles + 1);
    
    // Create master gain
    const masterGain = audioContext.createGain();
    masterGain.gain.setValueAtTime(0.7, now);
    masterGain.gain.exponentialRampToValueAtTime(0.01, now + duration + 0.2);
    
    // Create compressor for that "squished" sound
    const compressor = audioContext.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-24, now);
    compressor.knee.setValueAtTime(30, now);
    compressor.ratio.setValueAtTime(12, now);
    compressor.attack.setValueAtTime(0.003, now);
    compressor.release.setValueAtTime(0.25, now);
    
    // Create multiple lowpass filters for the "whoosh" component
    const lowpassFilters = [];
    
    // Create brown noise (deeper than white noise)
    const bufferSize = 2 * audioContext.sampleRate;
    const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
        // Brown noise formula
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = output[i];
        output[i] *= 3.5; // Amplify it
    }
    
    // Noise source for the "airy/wet" component
    const noise = audioContext.createBufferSource();
    noise.buffer = noiseBuffer;
    
    // Primary filter for the noise (basic tone shaping)
    const noiseFilter = audioContext.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(800, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(80, now + duration);
    noiseFilter.Q.setValueAtTime(5, now);
    
    // Create resonant filters for "wet" character
    const resonantFilter1 = audioContext.createBiquadFilter();
    resonantFilter1.type = 'peaking';
    resonantFilter1.frequency.setValueAtTime(250, now);
    resonantFilter1.Q.setValueAtTime(10, now);
    resonantFilter1.gain.setValueAtTime(15, now);
    
    const resonantFilter2 = audioContext.createBiquadFilter();
    resonantFilter2.type = 'peaking';
    resonantFilter2.frequency.setValueAtTime(400, now);
    resonantFilter2.Q.setValueAtTime(8, now);
    resonantFilter2.gain.setValueAtTime(10, now);
    
    // Wobble filter for the "bubbling" effect
    const wobbleFilter = audioContext.createBiquadFilter();
    wobbleFilter.type = 'peaking';
    wobbleFilter.Q.setValueAtTime(20, now);
    wobbleFilter.gain.setValueAtTime(15, now);
    
    // Wobble LFO
    const wobbleLFO = audioContext.createOscillator();
    wobbleLFO.type = 'sine';
    wobbleLFO.frequency.setValueAtTime(5 + Math.random() * 3, now);
    
    const wobbleGain = audioContext.createGain();
    wobbleGain.gain.setValueAtTime(250, now);
    
    // Connect wobble modulation
    wobbleLFO.connect(wobbleGain);
    wobbleGain.connect(wobbleFilter.frequency);
    wobbleFilter.frequency.setValueAtTime(300, now);
    
    // Gain node for the noise
    const noiseGain = audioContext.createGain();
    noiseGain.gain.setValueAtTime(0.01, now);
    noiseGain.gain.linearRampToValueAtTime(0.6, now + 0.05);
    noiseGain.gain.exponentialRampToValueAtTime(0.2, now + duration * 0.6);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + duration);
    
    // For each bubble in the fart, create a quick frequency ramp
    for (let i = 0; i < numBubbles; i++) {
        const bubbleStart = now + (i * bubbleTime);
        const bubbleDuration = bubbleTime * 0.6;
        
        // Create bubble oscillator (tight, short burst)
        const bubble = audioContext.createOscillator();
        bubble.type = 'sine';
        
        // Each bubble has a random frequency
        const baseFreq = 100 + (Math.random() * 150);
        bubble.frequency.setValueAtTime(baseFreq, bubbleStart);
        bubble.frequency.exponentialRampToValueAtTime(baseFreq * 0.5, bubbleStart + bubbleDuration);
        
        // Random pan for spatial effect
        const panner = audioContext.createStereoPanner();
        panner.pan.setValueAtTime((Math.random() * 0.4) - 0.2, bubbleStart); // Slight random pan
        
        // Create envelope for bubble volume
        const bubbleGain = audioContext.createGain();
        bubbleGain.gain.setValueAtTime(0.01, bubbleStart);
        bubbleGain.gain.exponentialRampToValueAtTime(0.3 + (Math.random() * 0.2), bubbleStart + 0.01);
        bubbleGain.gain.exponentialRampToValueAtTime(0.01, bubbleStart + bubbleDuration);
        
        // Connect bubble path
        bubble.connect(bubbleGain);
        bubbleGain.connect(panner);
        panner.connect(masterGain);
        
        // Schedule bubble start/stop
        bubble.start(bubbleStart);
        bubble.stop(bubbleStart + bubbleDuration);
    }
    
    // Create "vibrating trumpet" effect for the end of the fart
    if (Math.random() > 0.6) { // Only sometimes for variety
        const trumpet = audioContext.createOscillator();
        trumpet.type = 'sawtooth';
        
        const trumpetFilter = audioContext.createBiquadFilter();
        trumpetFilter.type = 'lowpass';
        trumpetFilter.frequency.setValueAtTime(800, now + duration * 0.7);
        trumpetFilter.frequency.exponentialRampToValueAtTime(200, now + duration);
        trumpetFilter.Q.setValueAtTime(3, now);
        
        const trumpetGain = audioContext.createGain();
        trumpetGain.gain.setValueAtTime(0.01, now + duration * 0.7);
        trumpetGain.gain.exponentialRampToValueAtTime(0.15, now + duration * 0.75);
        trumpetGain.gain.exponentialRampToValueAtTime(0.01, now + duration);
        
        // Fast LFO for "lip flapping" effect
        const trumpetLFO = audioContext.createOscillator();
        trumpetLFO.type = 'triangle';
        trumpetLFO.frequency.setValueAtTime(25 + Math.random() * 10, now);
        
        const trumpetLFOGain = audioContext.createGain();
        trumpetLFOGain.gain.setValueAtTime(50, now);
        
        trumpetLFO.connect(trumpetLFOGain);
        trumpetLFOGain.connect(trumpet.detune);
        
        trumpet.frequency.setValueAtTime(120, now + duration * 0.7);
        trumpet.frequency.exponentialRampToValueAtTime(70, now + duration);
        
        trumpet.connect(trumpetFilter);
        trumpetFilter.connect(trumpetGain);
        trumpetGain.connect(masterGain);
        
        trumpetLFO.start(now + duration * 0.7);
        trumpetLFO.stop(now + duration);
        trumpet.start(now + duration * 0.7);
        trumpet.stop(now + duration);
    }
    
    // Main routing
    noise.connect(noiseFilter);
    noiseFilter.connect(resonantFilter1);
    resonantFilter1.connect(resonantFilter2);
    resonantFilter2.connect(wobbleFilter);
    wobbleFilter.connect(noiseGain);
    noiseGain.connect(masterGain);
    
    // Final output path with compression for "wetness"
    masterGain.connect(compressor);
    compressor.connect(audioContext.destination);
    
    // Start the continuous components
    wobbleLFO.start(now);
    wobbleLFO.stop(now + duration);
    noise.start(now);
    noise.stop(now + duration);
    
    return duration;
}

// Helper function to prepare all audio elements for better compatibility
function prepareAllAudioElements() {
    console.log("Preparing all audio elements");
    
    // Don't call load() on audio elements as it can interfere with playback
    // Just ensure they are ready
    if (fartSound) {
        fartSound.muted = false;
        fartSound.volume = 0.8;
    }
    if (hitSound) {
        hitSound.muted = false;
        hitSound.volume = 0.8;
    }
}

// Create a visual fart cloud when the frog flaps
function createFartCloud() {
    try {
        // Limit number of simultaneous fart clouds
        const maxClouds = 3;
        const existingClouds = document.querySelectorAll('.fart-cloud').length;
        
        if (existingClouds >= maxClouds) {
            // Remove oldest cloud if at limit
            const oldestCloud = document.querySelector('.fart-cloud');
            if (oldestCloud && oldestCloud.parentNode) {
                oldestCloud.parentNode.removeChild(oldestCloud);
            }
        }
        
        // Create the cloud element
        const fartCloud = document.createElement('div');
        fartCloud.className = 'fart-cloud';
        
        // Avoid getBoundingClientRect() which causes layout thrashing
        // Use direct position values instead
        const cloudLeft = 40; // Position it right behind the frog
        const cloudTop = frogPosition + 15; // Slightly below center of frog
        
        // Set cloud position
        fartCloud.style.left = `${cloudLeft}px`;
        fartCloud.style.top = `${cloudTop}px`;
        
        // Add fart type-specific styling based on the current fart type
        const currentFartType = window.currentFartType || 'short_wet';
        
        // Match cloud style to fart sound type
        if (currentFartType === 'squeaky') {
            fartCloud.classList.add('squeaky');
        } else if (currentFartType === 'explosive') {
            fartCloud.classList.add('explosive');
        } else if (currentFartType === 'short_wet') {
            fartCloud.classList.add('wet');
        } else if (currentFartType === 'long_rippling') {
            fartCloud.classList.add('rippling');
        } else if (currentFartType === 'deep_rumble') {
            fartCloud.classList.add('rumble');
        }
        
        // Add the cloud to the game area
        gameArea.appendChild(fartCloud);
        
        // Remove the cloud after animation completes
        const animationDuration = getAnimationDurationForType(currentFartType);
        setTimeout(() => {
            if (fartCloud.parentNode) {
                fartCloud.parentNode.removeChild(fartCloud);
            }
        }, animationDuration);
        
    } catch (e) {
        console.error('Error creating fart cloud:', e);
    }
}

// Helper function to get animation duration based on fart type
function getAnimationDurationForType(fartType) {
    switch (fartType) {
        case 'squeaky': return 600; // 0.6s
        case 'explosive': return 1000; // 1s
        case 'short_wet': return 1200; // 1.2s
        case 'long_rippling': return 1500; // 1.5s
        case 'deep_rumble': return 1300; // 1.3s
        default: return 1000; // Default 1s
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
