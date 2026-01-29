/**
 * Floating Camera Nav Controller
 * Main controller for the floating always-on-top camera preview window
 */

class FloatingCameraNav {
    constructor() {
        // DOM elements
        this.container = document.getElementById('floating-nav');
        this.collapsedView = document.querySelector('.collapsed-view');
        this.expandedView = document.querySelector('.expanded-view');
        this.cameraToggle = document.getElementById('camera-toggle');
        this.recordBtn = document.getElementById('record-btn');
        this.layoutToggle = document.getElementById('layout-toggle');
        this.previewCanvas = document.getElementById('camera-preview');
        this.previewPlaceholder = document.getElementById('preview-placeholder');

        // State
        this.isExpanded = false;
        this.isHorizontal = true;
        this.isCameraMuted = false;
        this.expandTimer = null;
        this.collapseTimer = null;

        // Components
        this.miniPresenter = null;
        this.miniStage = null;

        this.init();
    }

    async init() {
        this.loadSavedState();
        this.setupEventListeners();
        await this.initializeCamera();
        this.notifyReady();
    }

    /**
     * Load saved state from storage
     */
    loadSavedState() {
        try {
            // Load layout preference
            const savedLayout = this.getStorageItem('floatingNavLayout');
            this.isHorizontal = savedLayout !== 'vertical';
            this.container.classList.add(this.isHorizontal ? 'horizontal' : 'vertical');

            // Load position - handled by native layer
            // Default position is top-left (50, 50)
        } catch (error) {
            console.warn('Failed to load saved state:', error);
            this.container.classList.add('horizontal');
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Hover to expand/collapse
        this.container.addEventListener('mouseenter', () => this.handleMouseEnter());
        this.container.addEventListener('mouseleave', () => this.handleMouseLeave());

        // Click on collapsed view to expand
        this.collapsedView.addEventListener('click', (e) => {
            e.stopPropagation();
            this.expand();
        });

        // Control buttons
        this.cameraToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleCamera();
        });

        this.recordBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.launchRecorder();
        });

        this.layoutToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleLayout();
        });

        // Listen for look changes from camera app
        if (typeof NotificationCenter !== 'undefined') {
            NotificationCenter.default.addObserver('LookDidChange', (look) => {
                this.onLookChanged(look);
            });
        }

        // Listen for window drag end to save position
        window.addEventListener('dragend', () => this.savePosition());
    }

    /**
     * Handle mouse enter - expand after delay
     */
    handleMouseEnter() {
        clearTimeout(this.collapseTimer);
        this.expandTimer = setTimeout(() => this.expand(), 150);
    }

    /**
     * Handle mouse leave - collapse after delay
     */
    handleMouseLeave() {
        clearTimeout(this.expandTimer);
        this.collapseTimer = setTimeout(() => this.collapse(), 300);
    }

    /**
     * Expand the floating nav
     */
    expand() {
        if (this.isExpanded) return;

        this.isExpanded = true;
        this.container.classList.add('expanded');

        // Resize window
        const size = this.isHorizontal
            ? { width: 250, height: 80 }
            : { width: 80, height: 200 };

        this.resizeWindow(size.width, size.height);
    }

    /**
     * Collapse the floating nav
     */
    collapse() {
        if (!this.isExpanded) return;

        this.isExpanded = false;
        this.container.classList.remove('expanded');

        // Resize window back to collapsed size
        this.resizeWindow(50, 50);
    }

    /**
     * Resize the native window
     */
    resizeWindow(width, height) {
        if (typeof resizeTo === 'function') {
            resizeTo(width, height);
        } else if (typeof gHybrid !== 'undefined' && gHybrid.windows) {
            // Alternative method via hybrid bridge
            try {
                gHybrid.windows.current.resizeTo(width, height);
            } catch (e) {
                console.warn('Failed to resize window:', e);
            }
        }
    }

    /**
     * Toggle camera on/off
     */
    toggleCamera() {
        this.isCameraMuted = !this.isCameraMuted;
        this.cameraToggle.classList.toggle('muted', this.isCameraMuted);

        if (this.miniPresenter) {
            if (this.isCameraMuted) {
                this.miniPresenter.mute();
            } else {
                this.miniPresenter.unmute();
            }
        }

        // Show/hide placeholder
        this.previewPlaceholder.classList.toggle('hidden', !this.isCameraMuted);
    }

    /**
     * Launch the screen recorder
     */
    launchRecorder() {
        if (typeof launchScreenRecorder === 'function') {
            launchScreenRecorder();
        } else if (typeof gHybrid !== 'undefined') {
            // Send message to native layer to launch recorder
            try {
                const message = { action: 'launchRecorder' };
                if (typeof mmhmm_nativeCallback === 'function') {
                    mmhmm_nativeCallback('floatingNav', JSON.stringify(message));
                }
            } catch (e) {
                console.warn('Failed to launch recorder:', e);
            }
        }
    }

    /**
     * Toggle between horizontal and vertical layout
     */
    toggleLayout() {
        this.isHorizontal = !this.isHorizontal;

        // Update classes
        this.container.classList.toggle('horizontal', this.isHorizontal);
        this.container.classList.toggle('vertical', !this.isHorizontal);

        // Resize window if expanded
        if (this.isExpanded) {
            const size = this.isHorizontal
                ? { width: 250, height: 80 }
                : { width: 80, height: 200 };
            this.resizeWindow(size.width, size.height);
        }

        // Save preference
        this.setStorageItem('floatingNavLayout', this.isHorizontal ? 'horizontal' : 'vertical');
    }

    /**
     * Initialize camera and rendering
     */
    async initializeCamera() {
        try {
            // Initialize mini presenter (camera input)
            this.miniPresenter = new MiniPresenter();
            await this.miniPresenter.init();

            // Initialize mini stage (rendering)
            this.miniStage = new MiniStage(this.previewCanvas);
            this.miniStage.setPresenter(this.miniPresenter);

            // Load saved look
            await this.loadSavedLook();

            // Hide placeholder when camera is ready
            this.previewPlaceholder.classList.add('hidden');

            // Start rendering
            this.miniStage.startRendering();
        } catch (error) {
            console.error('Failed to initialize camera:', error);
            // Keep placeholder visible
            this.previewPlaceholder.classList.remove('hidden');
        }
    }

    /**
     * Load the last used look from settings
     */
    async loadSavedLook() {
        try {
            const savedLook = this.getStorageItem('lastUsedLook');
            if (savedLook && this.miniStage) {
                await this.miniStage.applyLook(JSON.parse(savedLook));
            }
        } catch (error) {
            console.warn('Failed to load saved look:', error);
        }
    }

    /**
     * Handle look changes from camera app
     */
    onLookChanged(look) {
        if (this.miniStage && look) {
            this.miniStage.applyLook(look);
        }
    }

    /**
     * Save window position
     */
    savePosition() {
        try {
            if (typeof gHybrid !== 'undefined' && gHybrid.windows) {
                const bounds = gHybrid.windows.current.getBounds();
                this.setStorageItem('floatingNavPosition', JSON.stringify(bounds));
            }
        } catch (error) {
            console.warn('Failed to save position:', error);
        }
    }

    /**
     * Notify native layer that we're ready
     */
    notifyReady() {
        if (typeof floatingNavReady === 'function') {
            floatingNavReady();
        }
    }

    /**
     * Storage helpers with fallback
     */
    getStorageItem(key) {
        try {
            // Try SharedUserDefaults first (native bridge)
            if (typeof gHybrid !== 'undefined' && gHybrid.userDefaults) {
                return gHybrid.userDefaults.get(key);
            }
            // Fallback to localStorage
            return localStorage.getItem(key);
        } catch (e) {
            return null;
        }
    }

    setStorageItem(key, value) {
        try {
            // Try SharedUserDefaults first (native bridge)
            if (typeof gHybrid !== 'undefined' && gHybrid.userDefaults) {
                gHybrid.userDefaults.set(key, value);
            }
            // Also save to localStorage as fallback
            localStorage.setItem(key, value);
        } catch (e) {
            console.warn('Failed to save to storage:', e);
        }
    }

    /**
     * Cleanup resources
     */
    destroy() {
        if (this.miniStage) {
            this.miniStage.stopRendering();
        }
        if (this.miniPresenter) {
            this.miniPresenter.destroy();
        }
        clearTimeout(this.expandTimer);
        clearTimeout(this.collapseTimer);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.floatingCameraNav = new FloatingCameraNav();
});

// Cleanup on unload
window.addEventListener('beforeunload', () => {
    if (window.floatingCameraNav) {
        window.floatingCameraNav.destroy();
    }
});
