/**
 * Test Helpers for Airtime Camera CDP Testing
 *
 * These helpers provide reusable functions for interacting with
 * the Airtime Camera app via Chrome DevTools Protocol.
 */

/**
 * Click a button by its data-action attribute
 * @param {string} action - The data-action value
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function clickByDataAction(action) {
  return await cdp_evaluate(`
    (() => {
      const btn = document.querySelector('[data-action="${action}"]');
      if (!btn) return { success: false, error: 'Button not found: ${action}' };
      if (btn.classList.contains('hidden')) return { success: false, error: 'Button is hidden: ${action}' };
      btn.click();
      return { success: true };
    })()
  `);
}

/**
 * Check if an element exists and is visible
 * @param {string} selector - CSS selector
 * @returns {Promise<{exists: boolean, visible: boolean, classes?: string}>}
 */
async function checkElement(selector) {
  return await cdp_evaluate(`
    (() => {
      const el = document.querySelector('${selector}');
      if (!el) return { exists: false, visible: false };
      const style = window.getComputedStyle(el);
      const visible = style.display !== 'none' &&
                      style.visibility !== 'hidden' &&
                      !el.classList.contains('hidden');
      return {
        exists: true,
        visible,
        classes: el.className
      };
    })()
  `);
}

/**
 * Get all buttons with their data-action and visibility state
 * @returns {Promise<Array<{action: string, text: string, visible: boolean}>>}
 */
async function getActionButtons() {
  return await cdp_evaluate(`
    (() => {
      return Array.from(document.querySelectorAll('[data-action]')).map(btn => {
        const style = window.getComputedStyle(btn);
        const visible = style.display !== 'none' &&
                        style.visibility !== 'hidden' &&
                        !btn.classList.contains('hidden');
        return {
          action: btn.dataset.action,
          text: btn.textContent.trim().substring(0, 30),
          visible
        };
      });
    })()
  `);
}

/**
 * Get slider value by ID
 * @param {string} sliderId - The slider element ID
 * @returns {Promise<{value: number, min: number, max: number} | null>}
 */
async function getSliderValue(sliderId) {
  return await cdp_evaluate(`
    (() => {
      const slider = document.getElementById('${sliderId}');
      if (!slider) return null;
      return {
        value: parseFloat(slider.value),
        min: parseFloat(slider.min),
        max: parseFloat(slider.max)
      };
    })()
  `);
}

/**
 * Set slider value by ID
 * @param {string} sliderId - The slider element ID
 * @param {number} value - The value to set
 * @returns {Promise<{success: boolean, newValue?: number}>}
 */
async function setSliderValue(sliderId, value) {
  return await cdp_evaluate(`
    (() => {
      const slider = document.getElementById('${sliderId}');
      if (!slider) return { success: false, error: 'Slider not found' };
      slider.value = ${value};
      slider.dispatchEvent(new Event('input', { bubbles: true }));
      slider.dispatchEvent(new Event('change', { bubbles: true }));
      return { success: true, newValue: parseFloat(slider.value) };
    })()
  `);
}

/**
 * Check if a feature toggle is active
 * @param {string} feature - Feature name (look, nametag, away, enhance, lut, edge-light)
 * @returns {Promise<{found: boolean, active: boolean}>}
 */
async function isFeatureActive(feature) {
  return await cdp_evaluate(`
    (() => {
      // Check the toggle button state
      const toggleBtn = document.querySelector('[data-action="toggle-${feature}"]');
      if (toggleBtn) {
        const isActive = toggleBtn.classList.contains('active') ||
                         toggleBtn.classList.contains('icon_toggle_button_active');
        return { found: true, active: isActive };
      }

      // Alternative: check ON/OFF button states
      const onBtn = document.querySelector('[data-action="toggle-${feature}-on"]');
      const offBtn = document.querySelector('[data-action="toggle-${feature}-off"]');
      if (onBtn && offBtn) {
        const onActive = onBtn.classList.contains('active') ||
                         onBtn.getAttribute('aria-pressed') === 'true';
        return { found: true, active: onActive };
      }

      return { found: false, active: false };
    })()
  `);
}

/**
 * Wait for an element to appear
 * @param {string} selector - CSS selector
 * @param {number} timeout - Timeout in ms
 * @returns {Promise<boolean>}
 */
async function waitForElement(selector, timeout = 5000) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    const result = await checkElement(selector);
    if (result.exists && result.visible) return true;
    await new Promise(r => setTimeout(r, 100));
  }
  return false;
}

/**
 * Get page info
 * @returns {Promise<{url: string, title: string, ready: boolean}>}
 */
async function getPageInfo() {
  return await cdp_evaluate(`
    (() => {
      return {
        url: window.location.href,
        title: document.title,
        ready: document.readyState === 'complete'
      };
    })()
  `);
}

/**
 * Get all main UI sections and their visibility
 * @returns {Promise<Object>}
 */
async function getUISections() {
  return await cdp_evaluate(`
    (() => {
      const sections = [
        'container',
        'app',
        'stage',
        'stage_wrapper',
        'workspace',
        'camera_tools_top',
        'camera_tools_bottom',
        'camera_tools_left',
        'camera_tools_right',
        'sidebar_pane',
        'notifications-banner'
      ];

      const result = {};
      sections.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          const style = window.getComputedStyle(el);
          result[id] = {
            exists: true,
            visible: style.display !== 'none' && style.visibility !== 'hidden',
            hasContent: el.innerHTML.trim().length > 0
          };
        } else {
          result[id] = { exists: false, visible: false, hasContent: false };
        }
      });
      return result;
    })()
  `);
}

/**
 * Get virtual camera connection status
 * @returns {Promise<{connected: boolean, statusText: string}>}
 */
async function getVirtualCameraStatus() {
  return await cdp_evaluate(`
    (() => {
      const btn = document.querySelector('[data-action="show-virtual-camera-menu"]');
      if (!btn) return { connected: false, statusText: 'not found' };
      const text = btn.textContent.trim().toLowerCase();
      return {
        connected: text.includes('connected'),
        statusText: text
      };
    })()
  `);
}

/**
 * Open a widget by feature name
 * @param {string} widgetName - Widget name (looks, nametag, away, enhance, lut, edge-light)
 * @returns {Promise<{success: boolean}>}
 */
async function openWidget(widgetName) {
  return await clickByDataAction(`show-${widgetName}-widget`);
}

/**
 * Close any open widget
 * @returns {Promise<{success: boolean}>}
 */
async function closeWidget() {
  return await clickByDataAction('close-widget');
}

/**
 * Get current widget state (which widget is open)
 * @returns {Promise<{openWidget: string | null}>}
 */
async function getOpenWidget() {
  return await cdp_evaluate(`
    (() => {
      const widgets = ['looks', 'nametag', 'away', 'enhance', 'lut', 'edge-light'];
      for (const w of widgets) {
        const widget = document.querySelector('[data-widget="' + w + '"]');
        if (widget && !widget.classList.contains('hidden')) {
          return { openWidget: w };
        }
      }
      // Alternative check - look for visible widget containers
      const sidebar = document.getElementById('sidebar_pane');
      if (sidebar && sidebar.children.length > 0) {
        const visibleChild = Array.from(sidebar.children).find(c => {
          const style = window.getComputedStyle(c);
          return style.display !== 'none';
        });
        if (visibleChild) {
          return { openWidget: visibleChild.className || 'unknown' };
        }
      }
      return { openWidget: null };
    })()
  `);
}

// ============================================================
// ROBUST TESTING HELPERS
// ============================================================

/**
 * Poll until a condition is met or timeout occurs
 * @param {string} conditionJs - JavaScript expression that returns { ready: boolean, ...data }
 * @param {number} timeout - Timeout in ms (default 3000)
 * @param {number} interval - Poll interval in ms (default 100)
 * @returns {Promise<{success: boolean, result?: any, elapsed: number, error?: string}>}
 */
async function waitForCondition(conditionJs, timeout = 3000, interval = 100) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const result = await cdp_evaluate(conditionJs);
    if (result && result.ready) {
      return { success: true, result, elapsed: Date.now() - start };
    }
    await new Promise(r => setTimeout(r, interval));
  }
  return { success: false, error: 'Timeout waiting for condition', elapsed: timeout };
}

/**
 * Wait for UI to stabilize after an action (short delay + check for pending animations)
 * @param {number} minDelay - Minimum wait time in ms (default 150)
 * @returns {Promise<void>}
 */
async function waitForUIStable(minDelay = 150) {
  await new Promise(r => setTimeout(r, minDelay));
  // Optionally wait for animations to complete
  await cdp_evaluate(`
    (() => {
      const animations = document.getAnimations ? document.getAnimations() : [];
      if (animations.length > 0) {
        return Promise.all(animations.map(a => a.finished)).then(() => ({ stable: true }));
      }
      return { stable: true };
    })()
  `);
}

/**
 * Check for errors in the UI after an action
 * @returns {Promise<{hasError: boolean, errors: string[]}>}
 */
async function checkForErrors() {
  return await cdp_evaluate(`
    (() => {
      const errors = [];

      // Check notification banner for error messages
      const banner = document.getElementById('notifications-banner');
      if (banner) {
        const errorNotifs = banner.querySelectorAll('.notification--error, .notification-error, [data-type="error"]');
        errorNotifs.forEach(n => {
          if (n.textContent.trim()) errors.push('Notification: ' + n.textContent.trim());
        });
      }

      // Check for error modals/dialogs
      const errorModals = document.querySelectorAll('.modal--error, .error-modal, [role="alertdialog"]');
      errorModals.forEach(m => {
        const style = window.getComputedStyle(m);
        if (style.display !== 'none' && style.visibility !== 'hidden') {
          errors.push('Modal: ' + m.textContent.trim().substring(0, 100));
        }
      });

      // Check for aria-invalid elements (form validation errors)
      const invalidInputs = document.querySelectorAll('[aria-invalid="true"]');
      invalidInputs.forEach(i => {
        const label = i.getAttribute('aria-label') || i.name || i.id || 'input';
        errors.push('Invalid input: ' + label);
      });

      // Check for elements with error classes
      const errorElements = document.querySelectorAll('.error, .has-error, .is-error');
      errorElements.forEach(e => {
        const style = window.getComputedStyle(e);
        if (style.display !== 'none') {
          errors.push('Error element: ' + (e.className || e.tagName));
        }
      });

      return { hasError: errors.length > 0, errors };
    })()
  `);
}

/**
 * Verify a widget actually opened (sidebar has content and controls are visible)
 * @param {string} widgetType - Widget name (looks, nametag, away, enhance, lut, edge-light)
 * @returns {Promise<{isOpen: boolean, hasControls: boolean, details: object}>}
 */
async function verifyWidgetOpen(widgetType) {
  return await cdp_evaluate(`
    (() => {
      const sidebar = document.getElementById('sidebar_pane');
      if (!sidebar) return { isOpen: false, hasControls: false, details: { error: 'Sidebar not found' } };

      const sidebarStyle = window.getComputedStyle(sidebar);
      const sidebarVisible = sidebarStyle.display !== 'none' && sidebarStyle.visibility !== 'hidden';
      const hasContent = sidebar.children.length > 0 && sidebar.innerHTML.trim().length > 50;

      // Check for widget-specific controls
      const widgetControls = {
        'looks': ['toggle-look-on', 'toggle-look-off', 'edit-look'],
        'nametag': ['toggle-nametag-on', 'toggle-nametag-off'],
        'away': ['toggle-away-on', 'toggle-away-off'],
        'enhance': ['toggle-enhance-on', 'toggle-enhance-off'],
        'lut': ['switch-tab', 'import-lut'],
        'edge-light': ['toggle-edge-light-on', 'toggle-edge-light-off']
      };

      const expectedControls = widgetControls['${widgetType}'] || [];
      const foundControls = expectedControls.filter(action => {
        const el = document.querySelector('[data-action="' + action + '"]');
        if (!el) return false;
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });

      return {
        isOpen: sidebarVisible && hasContent,
        hasControls: foundControls.length > 0,
        details: {
          sidebarVisible,
          hasContent,
          expectedControls: expectedControls.length,
          foundControls: foundControls.length,
          controlsFound: foundControls
        }
      };
    })()
  `);
}

/**
 * Verify a toggle state actually changed
 * @param {string} feature - Feature name (look, nametag, away, enhance, lut, edge-light)
 * @param {boolean} expectedState - Expected state (true = ON, false = OFF)
 * @returns {Promise<{stateMatches: boolean, actualState: boolean, confidence: string, signals: object}>}
 */
async function verifyToggleState(feature, expectedState) {
  return await cdp_evaluate(`
    (() => {
      const signals = {};
      let activeSignals = 0;
      let inactiveSignals = 0;

      // Check ON button state
      const onBtn = document.querySelector('[data-action="toggle-${feature}-on"]');
      if (onBtn) {
        const hasActiveClass = onBtn.classList.contains('active') ||
                               onBtn.classList.contains('selected') ||
                               onBtn.classList.contains('icon_toggle_button_active');
        const ariaPressed = onBtn.getAttribute('aria-pressed') === 'true';
        const ariaSelected = onBtn.getAttribute('aria-selected') === 'true';

        signals.onButton = { hasActiveClass, ariaPressed, ariaSelected };
        if (hasActiveClass || ariaPressed || ariaSelected) activeSignals++;
        else inactiveSignals++;
      }

      // Check OFF button state
      const offBtn = document.querySelector('[data-action="toggle-${feature}-off"]');
      if (offBtn) {
        const hasActiveClass = offBtn.classList.contains('active') ||
                               offBtn.classList.contains('selected') ||
                               offBtn.classList.contains('icon_toggle_button_active');
        const ariaPressed = offBtn.getAttribute('aria-pressed') === 'true';
        const ariaSelected = offBtn.getAttribute('aria-selected') === 'true';

        signals.offButton = { hasActiveClass, ariaPressed, ariaSelected };
        if (hasActiveClass || ariaPressed || ariaSelected) inactiveSignals++;
        else activeSignals++;
      }

      // Check main toggle button (some features use single toggle)
      const toggleBtn = document.querySelector('[data-action="toggle-${feature}"]');
      if (toggleBtn) {
        const hasActiveClass = toggleBtn.classList.contains('active') ||
                               toggleBtn.classList.contains('icon_toggle_button_active');
        signals.toggleButton = { hasActiveClass };
        if (hasActiveClass) activeSignals++;
        else inactiveSignals++;
      }

      // Determine actual state and confidence
      const expectedOn = ${expectedState};
      const actualState = activeSignals > inactiveSignals;
      const stateMatches = actualState === expectedOn;

      let confidence = 'low';
      const totalSignals = activeSignals + inactiveSignals;
      if (totalSignals >= 2) confidence = 'medium';
      if (totalSignals >= 3 && (activeSignals === 0 || inactiveSignals === 0)) confidence = 'high';

      return {
        stateMatches,
        actualState,
        expectedState: expectedOn,
        confidence,
        signals,
        signalCounts: { active: activeSignals, inactive: inactiveSignals }
      };
    })()
  `);
}

/**
 * Verify slider value was applied correctly
 * @param {string} sliderId - Slider element ID
 * @param {number} expectedValue - Expected value
 * @param {number} tolerance - Acceptable tolerance (default 0.01)
 * @returns {Promise<{valueMatches: boolean, actualValue: number, expectedValue: number, difference: number}>}
 */
async function verifySliderValue(sliderId, expectedValue, tolerance = 0.01) {
  return await cdp_evaluate(`
    (() => {
      const slider = document.getElementById('${sliderId}');
      if (!slider) {
        return { valueMatches: false, error: 'Slider not found', sliderId: '${sliderId}' };
      }

      const actualValue = parseFloat(slider.value);
      const expected = ${expectedValue};
      const tol = ${tolerance};
      const difference = Math.abs(actualValue - expected);
      const valueMatches = difference <= tol;

      return {
        valueMatches,
        actualValue,
        expectedValue: expected,
        difference,
        tolerance: tol,
        sliderRange: { min: parseFloat(slider.min), max: parseFloat(slider.max) }
      };
    })()
  `);
}

/**
 * Verify widget actually closed (sidebar is empty or hidden)
 * @returns {Promise<{isClosed: boolean, details: object}>}
 */
async function verifyWidgetClosed() {
  return await cdp_evaluate(`
    (() => {
      const sidebar = document.getElementById('sidebar_pane');
      if (!sidebar) return { isClosed: true, details: { error: 'Sidebar not found' } };

      const style = window.getComputedStyle(sidebar);
      const isHidden = style.display === 'none' || style.visibility === 'hidden';
      const isEmpty = sidebar.children.length === 0 || sidebar.innerHTML.trim().length < 50;

      // Check if any widget-specific controls are still visible
      const widgetControls = sidebar.querySelectorAll('[data-action^="toggle-"]');
      const visibleControls = Array.from(widgetControls).filter(el => {
        const s = window.getComputedStyle(el);
        return s.display !== 'none' && s.visibility !== 'hidden';
      });

      return {
        isClosed: isHidden || isEmpty,
        details: {
          sidebarHidden: isHidden,
          sidebarEmpty: isEmpty,
          visibleControlCount: visibleControls.length
        }
      };
    })()
  `);
}

/**
 * Detect toggle status using multiple signals (more robust than text parsing)
 * @param {string} feature - Feature name
 * @returns {Promise<{status: 'on'|'off'|'unknown', confidence: 'high'|'medium'|'low', signals: object}>}
 */
async function detectToggleStatus(feature) {
  return await cdp_evaluate(`
    (() => {
      const signals = {};
      let onScore = 0;
      let offScore = 0;

      // Signal 1: data-state attribute
      const container = document.querySelector('[data-feature="${feature}"]');
      if (container) {
        const state = container.getAttribute('data-state');
        signals.dataState = state;
        if (state === 'on' || state === 'active' || state === 'enabled') onScore += 2;
        else if (state === 'off' || state === 'inactive' || state === 'disabled') offScore += 2;
      }

      // Signal 2: aria-pressed on toggle buttons
      const onBtn = document.querySelector('[data-action="toggle-${feature}-on"]');
      const offBtn = document.querySelector('[data-action="toggle-${feature}-off"]');
      if (onBtn && offBtn) {
        const onPressed = onBtn.getAttribute('aria-pressed') === 'true';
        const offPressed = offBtn.getAttribute('aria-pressed') === 'true';
        signals.ariaPressed = { on: onPressed, off: offPressed };
        if (onPressed && !offPressed) onScore += 2;
        else if (offPressed && !onPressed) offScore += 2;
      }

      // Signal 3: active/selected classes
      if (onBtn) {
        const onActive = onBtn.classList.contains('active') || onBtn.classList.contains('selected');
        signals.onButtonActive = onActive;
        if (onActive) onScore += 1;
      }
      if (offBtn) {
        const offActive = offBtn.classList.contains('active') || offBtn.classList.contains('selected');
        signals.offButtonActive = offActive;
        if (offActive) offScore += 1;
      }

      // Signal 4: Single toggle button state
      const toggleBtn = document.querySelector('[data-action="toggle-${feature}"]');
      if (toggleBtn) {
        const isActive = toggleBtn.classList.contains('active') ||
                         toggleBtn.classList.contains('icon_toggle_button_active');
        signals.toggleActive = isActive;
        if (isActive) onScore += 1;
        else offScore += 1;
      }

      // Determine status and confidence
      let status = 'unknown';
      let confidence = 'low';
      const totalScore = onScore + offScore;

      if (onScore > offScore) status = 'on';
      else if (offScore > onScore) status = 'off';

      if (totalScore >= 3) confidence = 'medium';
      if (totalScore >= 4 && Math.abs(onScore - offScore) >= 2) confidence = 'high';

      return { status, confidence, signals, scores: { on: onScore, off: offScore } };
    })()
  `);
}

/**
 * Reset UI to clean state (close widgets, dismiss notifications)
 * @returns {Promise<{success: boolean, actions: string[]}>}
 */
async function resetUIState() {
  return await cdp_evaluate(`
    (() => {
      const actions = [];

      // Close any open widget
      const closeBtn = document.querySelector('[data-action="close-widget"]');
      if (closeBtn) {
        const style = window.getComputedStyle(closeBtn);
        if (style.display !== 'none' && style.visibility !== 'hidden') {
          closeBtn.click();
          actions.push('Closed widget');
        }
      }

      // Dismiss any notifications
      const dismissBtns = document.querySelectorAll('[data-action="dismiss-notification"], .notification__close, .notification-dismiss');
      dismissBtns.forEach(btn => {
        const style = window.getComputedStyle(btn);
        if (style.display !== 'none') {
          btn.click();
          actions.push('Dismissed notification');
        }
      });

      // Close any open menus
      const menuBackdrops = document.querySelectorAll('.menu-backdrop, .dropdown-backdrop, [data-action="close-menu"]');
      menuBackdrops.forEach(el => {
        el.click();
        actions.push('Closed menu');
      });

      // Cancel any dialogs
      const cancelBtns = document.querySelectorAll('[data-action="cancel"], [data-action="close-modal"]');
      cancelBtns.forEach(btn => {
        const style = window.getComputedStyle(btn);
        if (style.display !== 'none') {
          btn.click();
          actions.push('Cancelled dialog');
        }
      });

      return { success: true, actions };
    })()
  `);
}

/**
 * Reset all feature toggles to OFF state
 * @returns {Promise<{success: boolean, togglesReset: string[]}>}
 */
async function resetFeatureToggles() {
  return await cdp_evaluate(`
    (() => {
      const features = ['look', 'nametag', 'away', 'enhance', 'lut', 'edge-light'];
      const togglesReset = [];

      features.forEach(feature => {
        // Try OFF button first
        const offBtn = document.querySelector('[data-action="toggle-' + feature + '-off"]');
        if (offBtn) {
          offBtn.click();
          togglesReset.push(feature + ' (off button)');
          return;
        }

        // Try single toggle if it's active
        const toggleBtn = document.querySelector('[data-action="toggle-' + feature + '"]');
        if (toggleBtn) {
          const isActive = toggleBtn.classList.contains('active') ||
                           toggleBtn.classList.contains('icon_toggle_button_active');
          if (isActive) {
            toggleBtn.click();
            togglesReset.push(feature + ' (toggle off)');
          }
        }
      });

      return { success: true, togglesReset };
    })()
  `);
}

/**
 * Get Virtual Camera status using multiple signals (more robust than text parsing)
 * @returns {Promise<{status: 'connected'|'disconnected'|'unknown', confidence: string, signals: object}>}
 */
async function getVirtualCameraStatusRobust() {
  return await cdp_evaluate(`
    (() => {
      const signals = {};
      let connectedScore = 0;
      let disconnectedScore = 0;

      const btn = document.querySelector('[data-action="show-virtual-camera-menu"]');
      if (!btn) {
        return { status: 'unknown', confidence: 'none', signals: { error: 'Button not found' } };
      }

      // Signal 1: Text content
      const text = btn.textContent.trim().toLowerCase();
      signals.text = text;
      if (text.includes('connected') && !text.includes('not connected') && !text.includes('disconnected')) {
        connectedScore += 2;
      } else if (text.includes('disconnected') || text.includes('not connected')) {
        disconnectedScore += 2;
      }

      // Signal 2: CSS classes
      const hasConnectedClass = btn.classList.contains('connected') ||
                                 btn.classList.contains('status-connected') ||
                                 btn.classList.contains('active');
      const hasDisconnectedClass = btn.classList.contains('disconnected') ||
                                    btn.classList.contains('status-disconnected') ||
                                    btn.classList.contains('inactive');
      signals.classes = { connected: hasConnectedClass, disconnected: hasDisconnectedClass };
      if (hasConnectedClass) connectedScore += 1;
      if (hasDisconnectedClass) disconnectedScore += 1;

      // Signal 3: data attributes
      const dataStatus = btn.getAttribute('data-status') || btn.getAttribute('data-connected');
      signals.dataStatus = dataStatus;
      if (dataStatus === 'connected' || dataStatus === 'true') connectedScore += 2;
      else if (dataStatus === 'disconnected' || dataStatus === 'false') disconnectedScore += 2;

      // Signal 4: Icon/indicator elements inside button
      const indicator = btn.querySelector('.status-indicator, .connection-status, [data-status]');
      if (indicator) {
        const indicatorStatus = indicator.getAttribute('data-status') ||
                                 indicator.classList.contains('connected') ? 'connected' :
                                 indicator.classList.contains('disconnected') ? 'disconnected' : null;
        signals.indicator = indicatorStatus;
        if (indicatorStatus === 'connected') connectedScore += 1;
        else if (indicatorStatus === 'disconnected') disconnectedScore += 1;
      }

      // Determine status and confidence
      let status = 'unknown';
      let confidence = 'low';

      if (connectedScore > disconnectedScore) status = 'connected';
      else if (disconnectedScore > connectedScore) status = 'disconnected';

      const totalScore = connectedScore + disconnectedScore;
      if (totalScore >= 2) confidence = 'medium';
      if (totalScore >= 3) confidence = 'high';

      return { status, confidence, signals, scores: { connected: connectedScore, disconnected: disconnectedScore } };
    })()
  `);
}

// Export for documentation purposes
const HELPERS = {
  // Original helpers
  clickByDataAction,
  checkElement,
  getActionButtons,
  getSliderValue,
  setSliderValue,
  isFeatureActive,
  waitForElement,
  getPageInfo,
  getUISections,
  getVirtualCameraStatus,
  openWidget,
  closeWidget,
  getOpenWidget,

  // Robust testing helpers
  waitForCondition,
  waitForUIStable,
  checkForErrors,
  verifyWidgetOpen,
  verifyToggleState,
  verifySliderValue,
  verifyWidgetClosed,
  detectToggleStatus,
  resetUIState,
  resetFeatureToggles,
  getVirtualCameraStatusRobust
};
