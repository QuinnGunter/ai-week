/**
 * Mini Presenter
 * Lightweight camera input handler for the floating nav
 * Provides video frames from the camera device
 */

class MiniPresenter {
    constructor() {
        this.videoElement = null;
        this.stream = null;
        this.isMuted = false;
        this.isInitialized = false;
        this.frameCallbacks = [];
    }

    /**
     * Initialize camera input
     */
    async init() {
        try {
            // Create hidden video element for camera stream
            this.videoElement = document.createElement('video');
            this.videoElement.autoplay = true;
            this.videoElement.playsInline = true;
            this.videoElement.muted = true;
            this.videoElement.style.display = 'none';
            document.body.appendChild(this.videoElement);

            // Get camera stream
            await this.startCamera();
            this.isInitialized = true;
        } catch (error) {
            console.error('MiniPresenter: Failed to initialize:', error);
            throw error;
        }
    }

    /**
     * Start camera stream
     */
    async startCamera() {
        try {
            // Get saved camera device if available
            const deviceId = this.getSavedCameraDevice();

            const constraints = {
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    frameRate: { ideal: 30 }
                },
                audio: false
            };

            // Use specific device if saved
            if (deviceId) {
                constraints.video.deviceId = { exact: deviceId };
            }

            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.videoElement.srcObject = this.stream;

            // Wait for video to be ready
            await new Promise((resolve) => {
                this.videoElement.onloadedmetadata = () => {
                    this.videoElement.play();
                    resolve();
                };
            });
        } catch (error) {
            console.error('MiniPresenter: Failed to start camera:', error);
            // Try again without specific device
            if (error.name === 'NotFoundError' || error.name === 'OverconstrainedError') {
                this.stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: { ideal: 640 }, height: { ideal: 480 } },
                    audio: false
                });
                this.videoElement.srcObject = this.stream;
            } else {
                throw error;
            }
        }
    }

    /**
     * Get saved camera device ID
     */
    getSavedCameraDevice() {
        try {
            if (typeof gHybrid !== 'undefined' && gHybrid.userDefaults) {
                return gHybrid.userDefaults.get('selectedCameraDeviceId');
            }
            return localStorage.getItem('selectedCameraDeviceId');
        } catch (e) {
            return null;
        }
    }

    /**
     * Get the video element for rendering
     */
    getVideoElement() {
        return this.videoElement;
    }

    /**
     * Get video dimensions
     */
    getDimensions() {
        if (!this.videoElement) {
            return { width: 640, height: 480 };
        }
        return {
            width: this.videoElement.videoWidth || 640,
            height: this.videoElement.videoHeight || 480
        };
    }

    /**
     * Mute the camera (stop sending frames but keep stream alive)
     */
    mute() {
        this.isMuted = true;
        if (this.stream) {
            this.stream.getVideoTracks().forEach(track => {
                track.enabled = false;
            });
        }
    }

    /**
     * Unmute the camera
     */
    unmute() {
        this.isMuted = false;
        if (this.stream) {
            this.stream.getVideoTracks().forEach(track => {
                track.enabled = true;
            });
        }
    }

    /**
     * Check if camera is muted
     */
    isCameraMuted() {
        return this.isMuted;
    }

    /**
     * Register callback for frame updates
     */
    onFrame(callback) {
        this.frameCallbacks.push(callback);
    }

    /**
     * Remove frame callback
     */
    offFrame(callback) {
        const index = this.frameCallbacks.indexOf(callback);
        if (index > -1) {
            this.frameCallbacks.splice(index, 1);
        }
    }

    /**
     * Get capture stream for virtual camera output
     */
    getCaptureStream(frameRate = 30) {
        if (!this.videoElement) {
            return null;
        }
        // Note: This would be used if we need to output to virtual camera
        // from the floating nav canvas
        return null;
    }

    /**
     * Cleanup resources
     */
    destroy() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        if (this.videoElement) {
            this.videoElement.srcObject = null;
            this.videoElement.remove();
            this.videoElement = null;
        }
        this.frameCallbacks = [];
        this.isInitialized = false;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MiniPresenter;
}
