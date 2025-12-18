export default class GestureController {
    constructor(onScrollUpdate) {
        this.onScrollUpdate = onScrollUpdate;
        this.videoElement = null;
        this.hands = null;
        this.camera = null;
        this.isActive = false;
        
        // Debug elements
        this.debugMode = false; // Disable debug for production
        this.debugCanvas = null;
        this.debugCtx = null;
        this.statusElement = null;
        
        this.init();
    }

    async init() {
        // Create hidden video element
        this.videoElement = document.createElement('video');
        this.videoElement.style.display = 'none';
        // Critical for mobile browsers:
        this.videoElement.setAttribute('playsinline', '');
        this.videoElement.setAttribute('webkit-playsinline', '');
        this.videoElement.autoplay = true;
        this.videoElement.muted = true;
        document.body.appendChild(this.videoElement);

        // Setup Debug UI
        if (this.debugMode) {
            this.createDebugUI();
            
            // Check for Secure Context
            if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
                this.updateStatus('ERROR: Camera requires HTTPS or localhost!');
                return;
            }
        }

        // Initialize MediaPipe Hands
        this.hands = new window.Hands({locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }});

        this.hands.setOptions({
            maxNumHands: 1,
            modelComplexity: 1, // Use Full model for better accuracy
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        this.hands.onResults(this.onResults.bind(this));

        // Initialize Camera using native getUserMedia
        try {
            this.updateStatus('Requesting Camera Access...');
            
            const constraints = {
                video: {
                    facingMode: 'user',
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                }
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.videoElement.srcObject = stream;
            
            // Wait for video to load
            await new Promise((resolve) => {
                this.videoElement.onloadedmetadata = () => {
                    this.videoElement.play();
                    resolve();
                };
            });

            this.isActive = true;
            this.updateStatus('Camera Active. Starting Processing...');
            
            // Hide loading screen
            const loading = document.getElementById('loading');
            if (loading) loading.style.opacity = '0';

            // Start processing loop
            this.processVideo();

        } catch (err) {
            console.error('Error starting camera:', err);
            this.updateStatus('Camera Error: ' + err.name + ' - ' + err.message);
        }
    }

    async processVideo() {
        if (!this.isActive) return;

        try {
            if (this.videoElement.readyState >= 2) {
                await this.hands.send({image: this.videoElement});
            }
        } catch (err) {
            console.error('Processing error:', err);
        }

        // Loop
        requestAnimationFrame(this.processVideo.bind(this));
    }

    createDebugUI() {
        // Debug Canvas (Small preview in corner)
        this.debugCanvas = document.createElement('canvas');
        this.debugCanvas.width = 320;
        this.debugCanvas.height = 240;
        this.debugCanvas.style.position = 'fixed';
        this.debugCanvas.style.bottom = '10px';
        this.debugCanvas.style.right = '10px';
        this.debugCanvas.style.zIndex = '1000';
        this.debugCanvas.style.border = '2px solid rgba(255, 255, 255, 0.5)';
        this.debugCanvas.style.borderRadius = '8px';
        this.debugCanvas.style.backgroundColor = '#000';
        document.body.appendChild(this.debugCanvas);
        
        this.debugCtx = this.debugCanvas.getContext('2d');

        // Status Text
        this.statusElement = document.createElement('div');
        this.statusElement.style.position = 'fixed';
        this.statusElement.style.bottom = '260px';
        this.statusElement.style.right = '10px';
        this.statusElement.style.color = '#00ff00';
        this.statusElement.style.fontFamily = 'monospace';
        this.statusElement.style.fontSize = '14px';
        this.statusElement.style.backgroundColor = 'rgba(0,0,0,0.7)';
        this.statusElement.style.padding = '5px';
        this.statusElement.style.zIndex = '1000';
        this.statusElement.innerText = 'Initializing...';
        document.body.appendChild(this.statusElement);
    }

    updateStatus(msg) {
        if (this.statusElement) {
            this.statusElement.innerText = msg;
        }
        console.log('[Gesture]', msg);
    }

    onResults(results) {
        // Draw debug view
        if (this.debugMode && this.debugCtx) {
            this.debugCtx.save();
            this.debugCtx.clearRect(0, 0, this.debugCanvas.width, this.debugCanvas.height);
            this.debugCtx.drawImage(results.image, 0, 0, this.debugCanvas.width, this.debugCanvas.height);
            
            if (results.multiHandLandmarks) {
                for (const landmarks of results.multiHandLandmarks) {
                    window.drawConnectors(this.debugCtx, landmarks, window.HAND_CONNECTIONS,
                                   {color: '#00FF00', lineWidth: 2});
                    window.drawLandmarks(this.debugCtx, landmarks,
                                   {color: '#FF0000', lineWidth: 1});
                }
            }
            this.debugCtx.restore();
        }

        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const landmarks = results.multiHandLandmarks[0];
            
            // Use Index Finger Tip (Landmark 8) for tracking
            // Y coordinate is normalized [0, 1] (0 is top, 1 is bottom)
            const indexFingerTip = landmarks[8];
            
            // Invert Y because usually "up" (0) means scroll up (0 progress)
            // and "down" (1) means scroll down (1 progress)
            // But let's map it directly: Top of screen = 2025, Bottom = 2026
            let y = indexFingerTip.y;
            
            // Add some buffer/deadzone at edges
            // Map 0.2-0.8 to 0-1 to make it easier to reach extremes
            const rawY = y;
            y = (y - 0.2) / 0.6;
            y = Math.max(0, Math.min(1, y));

            if (this.debugMode) {
                this.updateStatus(`Hand Detected\nRaw Y: ${rawY.toFixed(2)}\nProgress: ${y.toFixed(2)}`);
            }

            // Call the callback
            this.onScrollUpdate(y);
        } else {
            if (this.debugMode) {
                this.updateStatus('Camera Active. No Hand Detected.');
            }
        }
    }
}
