/**
 * Mini Stage
 * Lightweight WebGL/Canvas renderer for the floating nav camera preview
 * Applies looks and effects to the camera feed
 */

class MiniStage {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = null;
        this.presenter = null;
        this.currentLook = null;
        this.isRendering = false;
        this.animationFrameId = null;

        this.initCanvas();
    }

    /**
     * Initialize canvas context
     */
    initCanvas() {
        // Use 2D context for simplicity - can be upgraded to WebGL if needed
        this.ctx = this.canvas.getContext('2d');

        // Set canvas size based on container
        this.resizeCanvas();

        // Handle resize
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    /**
     * Resize canvas to match container
     */
    resizeCanvas() {
        const container = this.canvas.parentElement;
        if (container) {
            const rect = container.getBoundingClientRect();
            this.canvas.width = rect.width * window.devicePixelRatio;
            this.canvas.height = rect.height * window.devicePixelRatio;
            this.canvas.style.width = rect.width + 'px';
            this.canvas.style.height = rect.height + 'px';
        }
    }

    /**
     * Set the presenter (camera input source)
     */
    setPresenter(presenter) {
        this.presenter = presenter;
    }

    /**
     * Apply a look (visual effects) to the rendering
     */
    async applyLook(look) {
        this.currentLook = look;
        // In a full implementation, this would:
        // 1. Parse the look configuration
        // 2. Load any required assets (backgrounds, overlays)
        // 3. Set up shader programs for effects
    }

    /**
     * Start the rendering loop
     */
    startRendering() {
        if (this.isRendering) return;

        this.isRendering = true;
        this.render();
    }

    /**
     * Stop the rendering loop
     */
    stopRendering() {
        this.isRendering = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    /**
     * Main render loop
     */
    render() {
        if (!this.isRendering) return;

        this.drawFrame();

        this.animationFrameId = requestAnimationFrame(() => this.render());
    }

    /**
     * Draw a single frame
     */
    drawFrame() {
        if (!this.ctx || !this.presenter) return;

        const video = this.presenter.getVideoElement();
        if (!video || video.readyState < 2) return;

        const ctx = this.ctx;
        const canvas = this.canvas;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // If camera is muted, show blank/placeholder
        if (this.presenter.isCameraMuted()) {
            this.drawPlaceholder();
            return;
        }

        // Calculate aspect-fill dimensions
        const videoAspect = video.videoWidth / video.videoHeight;
        const canvasAspect = canvas.width / canvas.height;

        let drawWidth, drawHeight, offsetX, offsetY;

        if (videoAspect > canvasAspect) {
            // Video is wider - fit height, crop width
            drawHeight = canvas.height;
            drawWidth = canvas.height * videoAspect;
            offsetX = (canvas.width - drawWidth) / 2;
            offsetY = 0;
        } else {
            // Video is taller - fit width, crop height
            drawWidth = canvas.width;
            drawHeight = canvas.width / videoAspect;
            offsetX = 0;
            offsetY = (canvas.height - drawHeight) / 2;
        }

        // Draw video frame
        ctx.save();

        // Mirror the video horizontally (like a selfie camera)
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);

        ctx.drawImage(video, offsetX, offsetY, drawWidth, drawHeight);

        ctx.restore();

        // Apply look effects if configured
        if (this.currentLook) {
            this.applyLookEffects();
        }
    }

    /**
     * Draw placeholder when camera is muted
     */
    drawPlaceholder() {
        const ctx = this.ctx;
        const canvas = this.canvas;

        // Fill with dark background
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw camera icon (simplified)
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const iconSize = Math.min(canvas.width, canvas.height) * 0.3;

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;

        // Camera body
        ctx.strokeRect(
            centerX - iconSize / 2,
            centerY - iconSize / 3,
            iconSize,
            iconSize * 0.66
        );

        // Lens circle
        ctx.beginPath();
        ctx.arc(centerX, centerY, iconSize * 0.2, 0, Math.PI * 2);
        ctx.stroke();

        // Slash through (camera off indicator)
        ctx.beginPath();
        ctx.moveTo(centerX - iconSize / 2, centerY + iconSize / 3);
        ctx.lineTo(centerX + iconSize / 2, centerY - iconSize / 3);
        ctx.stroke();
    }

    /**
     * Apply visual effects from the current look
     */
    applyLookEffects() {
        if (!this.currentLook) return;

        // This is a simplified implementation
        // A full implementation would handle:
        // - Background replacement
        // - Color filters
        // - Overlays
        // - Borders/frames
        // - etc.

        const ctx = this.ctx;
        const canvas = this.canvas;

        // Example: Apply a simple color overlay if specified in look
        if (this.currentLook.colorOverlay) {
            ctx.fillStyle = this.currentLook.colorOverlay;
            ctx.globalAlpha = this.currentLook.colorOverlayOpacity || 0.1;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.globalAlpha = 1;
        }

        // Example: Apply border if specified
        if (this.currentLook.borderColor) {
            ctx.strokeStyle = this.currentLook.borderColor;
            ctx.lineWidth = this.currentLook.borderWidth || 2;
            ctx.strokeRect(0, 0, canvas.width, canvas.height);
        }
    }

    /**
     * Get the canvas for external use (e.g., virtual camera output)
     */
    getCanvas() {
        return this.canvas;
    }

    /**
     * Get a capture stream from the canvas
     */
    getCaptureStream(frameRate = 30) {
        if (this.canvas.captureStream) {
            return this.canvas.captureStream(frameRate);
        }
        return null;
    }

    /**
     * Take a snapshot of current frame
     */
    takeSnapshot() {
        return this.canvas.toDataURL('image/png');
    }

    /**
     * Cleanup resources
     */
    destroy() {
        this.stopRendering();
        this.presenter = null;
        this.currentLook = null;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MiniStage;
}
