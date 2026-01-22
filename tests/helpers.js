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

// Export for documentation purposes
const HELPERS = {
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
  getOpenWidget
};
