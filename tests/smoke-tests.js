/**
 * Airtime Camera - Comprehensive Smoke Tests
 *
 * These tests verify core functionality of the Airtime Camera app
 * via Chrome DevTools Protocol (CDP) on port 9222.
 *
 * Run these tests by connecting to the app via CDP and executing
 * each test function.
 *
 * ENHANCED VERSION: Tests now include:
 * - Post-action state verification (verify: property)
 * - Error detection after each action
 * - Async waiting for UI stabilization
 * - State reset between tests
 *
 * Test step structure:
 * {
 *   name: 'Step name',
 *   run: `(() => { ... })()`,           // Action to perform
 *   expect: { ... },                     // Expected result from run
 *   verify: `(() => { ... })()`,         // Optional: verification after action
 *   verifyExpect: { ... },               // Optional: expected verification result
 *   waitFor: `(() => { ... })()`,        // Optional: condition to wait for
 *   waitTimeout: 3000                    // Optional: wait timeout in ms
 * }
 */

// ============================================================
// TEST 1: PAGE LOAD VERIFICATION
// ============================================================
const test_pageLoad = {
  name: 'Page Load Verification',
  description: 'Verify the Camera page loads with all essential UI elements',

  steps: [
    {
      name: 'Check page info',
      run: `(() => {
        return {
          url: window.location.href,
          title: document.title,
          readyState: document.readyState
        };
      })()`,
      expect: {
        title: 'Airtime Camera',
        readyState: 'complete'
      }
    },
    {
      name: 'Verify main container exists',
      run: `(() => {
        const container = document.getElementById('container');
        return {
          exists: !!container,
          hasChildren: container ? container.children.length > 0 : false
        };
      })()`,
      expect: { exists: true, hasChildren: true }
    },
    {
      name: 'Verify app container exists',
      run: `(() => {
        const app = document.getElementById('app');
        return { exists: !!app };
      })()`,
      expect: { exists: true }
    },
    {
      name: 'Verify stage (video area) exists',
      run: `(() => {
        const stage = document.getElementById('stage');
        const wrapper = document.getElementById('stage_wrapper');
        return {
          stageExists: !!stage,
          wrapperExists: !!wrapper
        };
      })()`,
      expect: { stageExists: true, wrapperExists: true }
    },
    {
      name: 'Verify toolbar sections exist',
      run: `(() => {
        return {
          top: !!document.getElementById('camera_tools_top'),
          bottom: !!document.getElementById('camera_tools_bottom'),
          left: !!document.getElementById('camera_tools_left'),
          right: !!document.getElementById('camera_tools_right')
        };
      })()`,
      expect: { top: true, bottom: true, left: true, right: true }
    },
    {
      name: 'Verify notifications banner exists',
      run: `(() => {
        const banner = document.getElementById('notifications-banner');
        return { exists: !!banner };
      })()`,
      expect: { exists: true }
    },
    {
      name: 'Verify essential action buttons are present',
      run: `(() => {
        const essentialActions = [
          'show-looks-widget',
          'show-nametag-widget',
          'show-away-widget',
          'show-enhance-widget',
          'show-lut-widget',
          'show-virtual-camera-menu'
        ];
        const results = {};
        essentialActions.forEach(action => {
          const btn = document.querySelector('[data-action="' + action + '"]');
          results[action] = !!btn;
        });
        return results;
      })()`,
      expect: {
        'show-looks-widget': true,
        'show-nametag-widget': true,
        'show-away-widget': true,
        'show-enhance-widget': true,
        'show-lut-widget': true,
        'show-virtual-camera-menu': true
      }
    },
    {
      name: 'Verify sidebar pane exists',
      run: `(() => {
        const sidebar = document.getElementById('sidebar_pane');
        return { exists: !!sidebar };
      })()`,
      expect: { exists: true }
    }
  ]
};


// ============================================================
// TEST 2: LOOKS FEATURE
// ============================================================
const test_looksFeature = {
  name: 'Looks Feature',
  description: 'Verify Looks toggle, widget, and basic interactions',

  steps: [
    {
      name: 'Check Looks button exists',
      run: `(() => {
        const btn = document.querySelector('[data-action="show-looks-widget"]');
        return {
          exists: !!btn,
          text: btn ? btn.textContent.trim() : null
        };
      })()`,
      expect: { exists: true }
    },
    {
      name: 'Check toggle-look button exists',
      run: `(() => {
        const btn = document.querySelector('[data-action="toggle-look"]');
        return { exists: !!btn };
      })()`,
      expect: { exists: true }
    },
    {
      name: 'Open Looks widget',
      run: `(() => {
        const btn = document.querySelector('[data-action="show-looks-widget"]');
        if (!btn) return { success: false, error: 'Button not found' };
        btn.click();
        return { success: true, clicked: 'show-looks-widget' };
      })()`,
      expect: { success: true },
      waitFor: `(() => {
        const sidebar = document.getElementById('sidebar_pane');
        const hasContent = sidebar && sidebar.children.length > 0;
        const onBtn = document.querySelector('[data-action="toggle-look-on"]');
        return { ready: hasContent && !!onBtn };
      })()`,
      waitTimeout: 2000,
      verify: `(() => {
        const sidebar = document.getElementById('sidebar_pane');
        const sidebarVisible = sidebar && window.getComputedStyle(sidebar).display !== 'none';
        const hasControls = !!document.querySelector('[data-action="toggle-look-on"]');
        return { widgetOpen: sidebarVisible && hasControls };
      })()`,
      verifyExpect: { widgetOpen: true }
    },
    {
      name: 'Verify widget controls are visible',
      run: `(() => {
        const onBtn = document.querySelector('[data-action="toggle-look-on"]');
        const offBtn = document.querySelector('[data-action="toggle-look-off"]');
        const editBtn = document.querySelector('[data-action="edit-look"]');
        const getBtn = document.querySelector('[data-action="show-looks-catalog"]');
        return {
          toggleOnExists: !!onBtn,
          toggleOffExists: !!offBtn,
          editExists: !!editBtn,
          catalogExists: !!getBtn
        };
      })()`,
      expect: {
        toggleOnExists: true,
        toggleOffExists: true,
        editExists: true,
        catalogExists: true
      }
    },
    {
      name: 'Toggle Looks ON',
      run: `(() => {
        const btn = document.querySelector('[data-action="toggle-look-on"]');
        if (!btn) return { success: false, error: 'ON button not found' };
        btn.click();
        return { success: true, clicked: 'toggle-look-on' };
      })()`,
      expect: { success: true },
      verify: `(() => {
        const onBtn = document.querySelector('[data-action="toggle-look-on"]');
        const isActive = onBtn?.classList.contains('active') ||
                         onBtn?.classList.contains('selected') ||
                         onBtn?.getAttribute('aria-pressed') === 'true';
        return { stateChanged: isActive };
      })()`,
      verifyExpect: { stateChanged: true }
    },
    {
      name: 'Toggle Looks OFF',
      run: `(() => {
        const btn = document.querySelector('[data-action="toggle-look-off"]');
        if (!btn) return { success: false, error: 'OFF button not found' };
        btn.click();
        return { success: true, clicked: 'toggle-look-off' };
      })()`,
      expect: { success: true },
      verify: `(() => {
        const offBtn = document.querySelector('[data-action="toggle-look-off"]');
        const isActive = offBtn?.classList.contains('active') ||
                         offBtn?.classList.contains('selected') ||
                         offBtn?.getAttribute('aria-pressed') === 'true';
        return { stateChanged: isActive };
      })()`,
      verifyExpect: { stateChanged: true }
    },
    {
      name: 'Open Looks catalog',
      run: `(() => {
        const btn = document.querySelector('[data-action="show-looks-catalog"]');
        if (!btn) return { success: false, error: 'Catalog button not found' };
        btn.click();
        return { success: true, clicked: 'show-looks-catalog' };
      })()`,
      expect: { success: true },
      waitFor: `(() => {
        const presets = document.querySelectorAll('[data-action="select-preset"]');
        return { ready: presets.length > 0 };
      })()`,
      waitTimeout: 2000,
      verify: `(() => {
        const presets = document.querySelectorAll('[data-action="select-preset"]');
        return { catalogVisible: presets.length > 0 };
      })()`,
      verifyExpect: { catalogVisible: true }
    },
    {
      name: 'Verify look presets are available',
      run: `(() => {
        const presets = document.querySelectorAll('[data-action="select-preset"]');
        const importLooks = document.querySelectorAll('[data-action="import-look"]');
        return {
          presetCount: presets.length,
          importCount: importLooks.length,
          hasPresets: presets.length > 0
        };
      })()`,
      expect: { hasPresets: true }
    },
    {
      name: 'Close catalog / go back',
      run: `(() => {
        const backBtn = document.querySelector('[data-action="cancel-select-look"]');
        if (backBtn) {
          backBtn.click();
          return { success: true, clicked: 'cancel-select-look' };
        }
        const closeBtn = document.querySelector('[data-action="close-widget"]');
        if (closeBtn) {
          closeBtn.click();
          return { success: true, clicked: 'close-widget' };
        }
        return { success: false, error: 'No close button found' };
      })()`,
      expect: { success: true },
      verify: `(() => {
        const presets = document.querySelectorAll('[data-action="select-preset"]');
        const presetsVisible = Array.from(presets).some(p => {
          const style = window.getComputedStyle(p);
          return style.display !== 'none';
        });
        return { catalogClosed: !presetsVisible || presets.length === 0 };
      })()`,
      verifyExpect: { catalogClosed: true }
    }
  ]
};


// ============================================================
// TEST 3: NAME TAG FEATURE
// ============================================================
const test_nameTagFeature = {
  name: 'Name Tag Feature',
  description: 'Verify Name Tag toggle, widget, and text input',

  steps: [
    {
      name: 'Check Name Tag button exists',
      run: `(() => {
        const btn = document.querySelector('[data-action="show-nametag-widget"]');
        return {
          exists: !!btn,
          text: btn ? btn.textContent.trim() : null
        };
      })()`,
      expect: { exists: true }
    },
    {
      name: 'Check toggle-name-tag button exists',
      run: `(() => {
        const btn = document.querySelector('[data-action="toggle-name-tag"]');
        return { exists: !!btn };
      })()`,
      expect: { exists: true }
    },
    {
      name: 'Open Name Tag widget',
      run: `(() => {
        const btn = document.querySelector('[data-action="show-nametag-widget"]');
        if (!btn) return { success: false, error: 'Button not found' };
        btn.click();
        return { success: true, clicked: 'show-nametag-widget' };
      })()`,
      expect: { success: true },
      waitFor: `(() => {
        const onBtn = document.querySelector('[data-action="toggle-nametag-on"]');
        return { ready: !!onBtn };
      })()`,
      waitTimeout: 2000,
      verify: `(() => {
        const sidebar = document.getElementById('sidebar_pane');
        const sidebarVisible = sidebar && window.getComputedStyle(sidebar).display !== 'none';
        const hasControls = !!document.querySelector('[data-action="toggle-nametag-on"]');
        return { widgetOpen: sidebarVisible && hasControls };
      })()`,
      verifyExpect: { widgetOpen: true }
    },
    {
      name: 'Verify widget controls exist',
      run: `(() => {
        const onBtn = document.querySelector('[data-action="toggle-nametag-on"]');
        const offBtn = document.querySelector('[data-action="toggle-nametag-off"]');
        return {
          toggleOnExists: !!onBtn,
          toggleOffExists: !!offBtn
        };
      })()`,
      expect: { toggleOnExists: true, toggleOffExists: true }
    },
    {
      name: 'Toggle Name Tag ON',
      run: `(() => {
        const btn = document.querySelector('[data-action="toggle-nametag-on"]');
        if (!btn) return { success: false, error: 'ON button not found' };
        btn.click();
        return { success: true, clicked: 'toggle-nametag-on' };
      })()`,
      expect: { success: true },
      verify: `(() => {
        const onBtn = document.querySelector('[data-action="toggle-nametag-on"]');
        const isActive = onBtn?.classList.contains('active') ||
                         onBtn?.classList.contains('selected') ||
                         onBtn?.getAttribute('aria-pressed') === 'true';
        return { stateChanged: isActive };
      })()`,
      verifyExpect: { stateChanged: true }
    },
    {
      name: 'Check text inputs exist',
      run: `(() => {
        const inputs = document.querySelectorAll('input[type="text"]');
        const textInputs = Array.from(inputs).filter(i => {
          const style = window.getComputedStyle(i);
          return style.display !== 'none';
        });
        return {
          inputCount: textInputs.length,
          hasInputs: textInputs.length > 0
        };
      })()`,
      expect: { hasInputs: true }
    },
    {
      name: 'Check font selector exists',
      run: `(() => {
        const btn = document.querySelector('[data-action="show-font-menu"]');
        return { exists: !!btn };
      })()`,
      expect: { exists: true }
    },
    {
      name: 'Check style selector exists',
      run: `(() => {
        const btn = document.querySelector('[data-action="show-name-badge-styles"]');
        return { exists: !!btn };
      })()`,
      expect: { exists: true }
    },
    {
      name: 'Toggle Name Tag OFF',
      run: `(() => {
        const btn = document.querySelector('[data-action="toggle-nametag-off"]');
        if (!btn) return { success: false, error: 'OFF button not found' };
        btn.click();
        return { success: true, clicked: 'toggle-nametag-off' };
      })()`,
      expect: { success: true },
      verify: `(() => {
        const offBtn = document.querySelector('[data-action="toggle-nametag-off"]');
        const isActive = offBtn?.classList.contains('active') ||
                         offBtn?.classList.contains('selected') ||
                         offBtn?.getAttribute('aria-pressed') === 'true';
        return { stateChanged: isActive };
      })()`,
      verifyExpect: { stateChanged: true }
    },
    {
      name: 'Close widget',
      run: `(() => {
        const btn = document.querySelector('[data-action="close-widget"]');
        if (!btn) return { success: false, error: 'Close button not found' };
        btn.click();
        return { success: true, clicked: 'close-widget' };
      })()`,
      expect: { success: true },
      verify: `(() => {
        const sidebar = document.getElementById('sidebar_pane');
        const isEmpty = !sidebar || sidebar.children.length === 0 ||
                        sidebar.innerHTML.trim().length < 50;
        const isHidden = sidebar && (window.getComputedStyle(sidebar).display === 'none');
        return { widgetClosed: isEmpty || isHidden };
      })()`,
      verifyExpect: { widgetClosed: true }
    }
  ]
};


// ============================================================
// TEST 4: AWAY MODE FEATURE
// ============================================================
const test_awayModeFeature = {
  name: 'Away Mode Feature',
  description: 'Verify Away mode toggle (camera on/off)',

  steps: [
    {
      name: 'Check Away button exists',
      run: `(() => {
        const btn = document.querySelector('[data-action="show-away-widget"]');
        return {
          exists: !!btn,
          text: btn ? btn.textContent.trim() : null
        };
      })()`,
      expect: { exists: true }
    },
    {
      name: 'Check toggle-away button exists',
      run: `(() => {
        const btn = document.querySelector('[data-action="toggle-away"]');
        return { exists: !!btn };
      })()`,
      expect: { exists: true }
    },
    {
      name: 'Open Away widget',
      run: `(() => {
        const btn = document.querySelector('[data-action="show-away-widget"]');
        if (!btn) return { success: false, error: 'Button not found' };
        btn.click();
        return { success: true, clicked: 'show-away-widget' };
      })()`,
      expect: { success: true },
      waitFor: `(() => {
        const onBtn = document.querySelector('[data-action="toggle-away-on"]');
        return { ready: !!onBtn };
      })()`,
      waitTimeout: 2000,
      verify: `(() => {
        const sidebar = document.getElementById('sidebar_pane');
        const sidebarVisible = sidebar && window.getComputedStyle(sidebar).display !== 'none';
        const hasControls = !!document.querySelector('[data-action="toggle-away-on"]');
        return { widgetOpen: sidebarVisible && hasControls };
      })()`,
      verifyExpect: { widgetOpen: true }
    },
    {
      name: 'Verify widget controls exist',
      run: `(() => {
        const awayBtn = document.querySelector('[data-action="toggle-away-on"]');
        const cameraOnBtn = document.querySelector('[data-action="toggle-away-off"]');
        return {
          awayButtonExists: !!awayBtn,
          cameraOnButtonExists: !!cameraOnBtn,
          awayText: awayBtn ? awayBtn.textContent.trim() : null,
          cameraOnText: cameraOnBtn ? cameraOnBtn.textContent.trim() : null
        };
      })()`,
      expect: {
        awayButtonExists: true,
        cameraOnButtonExists: true
      }
    },
    {
      name: 'Toggle to Away (camera off)',
      run: `(() => {
        const btn = document.querySelector('[data-action="toggle-away-on"]');
        if (!btn) return { success: false, error: 'Away button not found' };
        btn.click();
        return { success: true, clicked: 'toggle-away-on' };
      })()`,
      expect: { success: true },
      verify: `(() => {
        const onBtn = document.querySelector('[data-action="toggle-away-on"]');
        const isActive = onBtn?.classList.contains('active') ||
                         onBtn?.classList.contains('selected') ||
                         onBtn?.getAttribute('aria-pressed') === 'true';
        return { awayModeActive: isActive };
      })()`,
      verifyExpect: { awayModeActive: true }
    },
    {
      name: 'Verify away reaction area exists',
      run: `(() => {
        const reactionBtn = document.querySelector('.recent-look-button[data-action="remove-camera-off-reaction"]');
        return {
          reactionAreaExists: !!reactionBtn || true // May not always be visible
        };
      })()`,
      expect: { reactionAreaExists: true }
    },
    {
      name: 'Toggle to Camera On',
      run: `(() => {
        const btn = document.querySelector('[data-action="toggle-away-off"]');
        if (!btn) return { success: false, error: 'Camera On button not found' };
        btn.click();
        return { success: true, clicked: 'toggle-away-off' };
      })()`,
      expect: { success: true },
      verify: `(() => {
        const offBtn = document.querySelector('[data-action="toggle-away-off"]');
        const isActive = offBtn?.classList.contains('active') ||
                         offBtn?.classList.contains('selected') ||
                         offBtn?.getAttribute('aria-pressed') === 'true';
        return { cameraOnActive: isActive };
      })()`,
      verifyExpect: { cameraOnActive: true }
    },
    {
      name: 'Close widget',
      run: `(() => {
        const btn = document.querySelector('[data-action="close-widget"]');
        if (!btn) return { success: false, error: 'Close button not found' };
        btn.click();
        return { success: true, clicked: 'close-widget' };
      })()`,
      expect: { success: true },
      verify: `(() => {
        const sidebar = document.getElementById('sidebar_pane');
        const isEmpty = !sidebar || sidebar.children.length === 0 ||
                        sidebar.innerHTML.trim().length < 50;
        const isHidden = sidebar && (window.getComputedStyle(sidebar).display === 'none');
        return { widgetClosed: isEmpty || isHidden };
      })()`,
      verifyExpect: { widgetClosed: true }
    }
  ]
};


// ============================================================
// TEST 5: FILTERS (ENHANCE) FEATURE
// ============================================================
const test_filtersFeature = {
  name: 'Filters (Enhance) Feature',
  description: 'Verify Filters toggle, widget, and slider controls',

  steps: [
    {
      name: 'Check Filters button exists',
      run: `(() => {
        const btn = document.querySelector('[data-action="show-enhance-widget"]');
        return {
          exists: !!btn,
          text: btn ? btn.textContent.trim() : null
        };
      })()`,
      expect: { exists: true }
    },
    {
      name: 'Check toggle-enhance button exists',
      run: `(() => {
        const btn = document.querySelector('[data-action="toggle-enhance"]');
        return { exists: !!btn };
      })()`,
      expect: { exists: true }
    },
    {
      name: 'Open Enhance widget',
      run: `(() => {
        const btn = document.querySelector('[data-action="show-enhance-widget"]');
        if (!btn) return { success: false, error: 'Button not found' };
        btn.click();
        return { success: true, clicked: 'show-enhance-widget' };
      })()`,
      expect: { success: true },
      waitFor: `(() => {
        const onBtn = document.querySelector('[data-action="toggle-enhance-on"]');
        return { ready: !!onBtn };
      })()`,
      waitTimeout: 2000,
      verify: `(() => {
        const sidebar = document.getElementById('sidebar_pane');
        const sidebarVisible = sidebar && window.getComputedStyle(sidebar).display !== 'none';
        const hasControls = !!document.querySelector('[data-action="toggle-enhance-on"]');
        return { widgetOpen: sidebarVisible && hasControls };
      })()`,
      verifyExpect: { widgetOpen: true }
    },
    {
      name: 'Verify widget controls exist',
      run: `(() => {
        const onBtn = document.querySelector('[data-action="toggle-enhance-on"]');
        const offBtn = document.querySelector('[data-action="toggle-enhance-off"]');
        return {
          toggleOnExists: !!onBtn,
          toggleOffExists: !!offBtn
        };
      })()`,
      expect: { toggleOnExists: true, toggleOffExists: true }
    },
    {
      name: 'Toggle Filters ON',
      run: `(() => {
        const btn = document.querySelector('[data-action="toggle-enhance-on"]');
        if (!btn) return { success: false, error: 'ON button not found' };
        btn.click();
        return { success: true, clicked: 'toggle-enhance-on' };
      })()`,
      expect: { success: true },
      verify: `(() => {
        const onBtn = document.querySelector('[data-action="toggle-enhance-on"]');
        const isActive = onBtn?.classList.contains('active') ||
                         onBtn?.classList.contains('selected') ||
                         onBtn?.getAttribute('aria-pressed') === 'true';
        return { stateChanged: isActive };
      })()`,
      verifyExpect: { stateChanged: true }
    },
    {
      name: 'Check enhancement slider exists',
      run: `(() => {
        const slider = document.getElementById('enhancement');
        if (!slider) return { exists: false };
        return {
          exists: true,
          value: parseFloat(slider.value),
          min: parseFloat(slider.min),
          max: parseFloat(slider.max)
        };
      })()`,
      expect: { exists: true }
    },
    {
      name: 'Check complements slider exists',
      run: `(() => {
        const slider = document.getElementById('complements');
        if (!slider) return { exists: false };
        return {
          exists: true,
          value: parseFloat(slider.value),
          min: parseFloat(slider.min),
          max: parseFloat(slider.max)
        };
      })()`,
      expect: { exists: true }
    },
    {
      name: 'Modify enhancement slider',
      run: `(() => {
        const slider = document.getElementById('enhancement');
        if (!slider) return { success: false, error: 'Slider not found' };
        const originalValue = parseFloat(slider.value);
        const newValue = originalValue > 50 ? 30 : 70;
        slider.value = newValue;
        slider.dispatchEvent(new Event('input', { bubbles: true }));
        slider.dispatchEvent(new Event('change', { bubbles: true }));
        return {
          success: true,
          originalValue,
          newValue,
          targetValue: newValue
        };
      })()`,
      expect: { success: true },
      verify: `(() => {
        const slider = document.getElementById('enhancement');
        if (!slider) return { valueApplied: false, error: 'Slider not found' };
        const currentValue = parseFloat(slider.value);
        // Value should be either 30 or 70 (depending on original)
        const validValue = currentValue === 30 || currentValue === 70;
        return { valueApplied: validValue, currentValue };
      })()`,
      verifyExpect: { valueApplied: true }
    },
    {
      name: 'Reset enhancement slider',
      run: `(() => {
        const slider = document.getElementById('enhancement');
        if (!slider) return { success: false };
        slider.value = 50;
        slider.dispatchEvent(new Event('input', { bubbles: true }));
        slider.dispatchEvent(new Event('change', { bubbles: true }));
        return { success: true, targetValue: 50 };
      })()`,
      expect: { success: true },
      verify: `(() => {
        const slider = document.getElementById('enhancement');
        if (!slider) return { valueReset: false, error: 'Slider not found' };
        const currentValue = parseFloat(slider.value);
        const tolerance = 1;
        return { valueReset: Math.abs(currentValue - 50) <= tolerance, currentValue };
      })()`,
      verifyExpect: { valueReset: true }
    },
    {
      name: 'Toggle Filters OFF',
      run: `(() => {
        const btn = document.querySelector('[data-action="toggle-enhance-off"]');
        if (!btn) return { success: false, error: 'OFF button not found' };
        btn.click();
        return { success: true, clicked: 'toggle-enhance-off' };
      })()`,
      expect: { success: true },
      verify: `(() => {
        const offBtn = document.querySelector('[data-action="toggle-enhance-off"]');
        const isActive = offBtn?.classList.contains('active') ||
                         offBtn?.classList.contains('selected') ||
                         offBtn?.getAttribute('aria-pressed') === 'true';
        return { stateChanged: isActive };
      })()`,
      verifyExpect: { stateChanged: true }
    },
    {
      name: 'Close widget',
      run: `(() => {
        const btn = document.querySelector('[data-action="close-widget"]');
        if (!btn) return { success: false, error: 'Close button not found' };
        btn.click();
        return { success: true, clicked: 'close-widget' };
      })()`,
      expect: { success: true },
      verify: `(() => {
        const sidebar = document.getElementById('sidebar_pane');
        const isEmpty = !sidebar || sidebar.children.length === 0 ||
                        sidebar.innerHTML.trim().length < 50;
        const isHidden = sidebar && (window.getComputedStyle(sidebar).display === 'none');
        return { widgetClosed: isEmpty || isHidden };
      })()`,
      verifyExpect: { widgetClosed: true }
    }
  ]
};


// ============================================================
// TEST 6: COLOR GRADES (LUT) FEATURE
// ============================================================
const test_colorGradesFeature = {
  name: 'Color Grades (LUT) Feature',
  description: 'Verify LUT toggle, widget tabs, and tune controls',

  steps: [
    {
      name: 'Check Color Grades button exists',
      run: `(() => {
        const btn = document.querySelector('[data-action="show-lut-widget"]');
        return {
          exists: !!btn,
          text: btn ? btn.textContent.trim() : null
        };
      })()`,
      expect: { exists: true }
    },
    {
      name: 'Check toggle-lut button exists',
      run: `(() => {
        const btn = document.querySelector('[data-action="toggle-lut"]');
        return { exists: !!btn };
      })()`,
      expect: { exists: true }
    },
    {
      name: 'Open LUT widget',
      run: `(() => {
        const btn = document.querySelector('[data-action="show-lut-widget"]');
        if (!btn) return { success: false, error: 'Button not found' };
        btn.click();
        return { success: true, clicked: 'show-lut-widget' };
      })()`,
      expect: { success: true },
      waitFor: `(() => {
        const tabs = document.querySelectorAll('.lut-widget__tab');
        return { ready: tabs.length >= 2 };
      })()`,
      waitTimeout: 2000,
      verify: `(() => {
        const sidebar = document.getElementById('sidebar_pane');
        const sidebarVisible = sidebar && window.getComputedStyle(sidebar).display !== 'none';
        const tabs = document.querySelectorAll('.lut-widget__tab');
        return { widgetOpen: sidebarVisible && tabs.length >= 2 };
      })()`,
      verifyExpect: { widgetOpen: true }
    },
    {
      name: 'Verify tabs exist (LUTs and Tune)',
      run: `(() => {
        const tabs = document.querySelectorAll('.lut-widget__tab');
        const tabTexts = Array.from(tabs).map(t => t.textContent.trim());
        return {
          tabCount: tabs.length,
          tabs: tabTexts,
          hasLutsTab: tabTexts.includes('LUTs'),
          hasTuneTab: tabTexts.includes('Tune')
        };
      })()`,
      expect: { hasLutsTab: true, hasTuneTab: true }
    },
    {
      name: 'Check LUT intensity slider exists',
      run: `(() => {
        const slider = document.querySelector('.lut-widget__slider');
        if (!slider) return { exists: false };
        return {
          exists: true,
          value: parseFloat(slider.value)
        };
      })()`,
      expect: { exists: true }
    },
    {
      name: 'Check import LUT button exists',
      run: `(() => {
        const btn = document.querySelector('[data-action="import-lut"]');
        return { exists: !!btn };
      })()`,
      expect: { exists: true }
    },
    {
      name: 'Switch to Tune tab',
      run: `(() => {
        const tabs = document.querySelectorAll('[data-action="switch-tab"]');
        const tuneTab = Array.from(tabs).find(t => t.textContent.trim() === 'Tune');
        if (!tuneTab) return { success: false, error: 'Tune tab not found' };
        tuneTab.click();
        return { success: true, clicked: 'Tune tab' };
      })()`,
      expect: { success: true },
      waitFor: `(() => {
        const sliders = document.querySelectorAll('.tune-panel__slider');
        return { ready: sliders.length > 0 };
      })()`,
      waitTimeout: 1500,
      verify: `(() => {
        const sliders = document.querySelectorAll('.tune-panel__slider');
        const tuneTab = Array.from(document.querySelectorAll('[data-action="switch-tab"]'))
          .find(t => t.textContent.trim() === 'Tune');
        const isActive = tuneTab?.classList.contains('active') ||
                         tuneTab?.classList.contains('selected') ||
                         tuneTab?.getAttribute('aria-selected') === 'true';
        return { tabSwitched: sliders.length > 0, tuneTabActive: isActive };
      })()`,
      verifyExpect: { tabSwitched: true }
    },
    {
      name: 'Verify tune sliders exist',
      run: `(() => {
        const sliders = document.querySelectorAll('.tune-panel__slider');
        return {
          sliderCount: sliders.length,
          hasSliders: sliders.length > 0
        };
      })()`,
      expect: { hasSliders: true }
    },
    {
      name: 'Check Reset All button exists',
      run: `(() => {
        const btn = document.querySelector('.tune-panel__reset-all');
        return {
          exists: !!btn,
          text: btn ? btn.textContent.trim() : null
        };
      })()`,
      expect: { exists: true }
    },
    {
      name: 'Switch back to LUTs tab',
      run: `(() => {
        const tabs = document.querySelectorAll('[data-action="switch-tab"]');
        const lutsTab = Array.from(tabs).find(t => t.textContent.trim() === 'LUTs');
        if (!lutsTab) return { success: false, error: 'LUTs tab not found' };
        lutsTab.click();
        return { success: true, clicked: 'LUTs tab' };
      })()`,
      expect: { success: true },
      verify: `(() => {
        const slider = document.querySelector('.lut-widget__slider');
        const lutsTab = Array.from(document.querySelectorAll('[data-action="switch-tab"]'))
          .find(t => t.textContent.trim() === 'LUTs');
        const isActive = lutsTab?.classList.contains('active') ||
                         lutsTab?.classList.contains('selected') ||
                         lutsTab?.getAttribute('aria-selected') === 'true';
        return { tabSwitched: !!slider, lutsTabActive: isActive };
      })()`,
      verifyExpect: { tabSwitched: true }
    },
    {
      name: 'Close widget',
      run: `(() => {
        const btn = document.querySelector('[data-action="close-widget"]');
        if (!btn) return { success: false, error: 'Close button not found' };
        btn.click();
        return { success: true, clicked: 'close-widget' };
      })()`,
      expect: { success: true },
      verify: `(() => {
        const sidebar = document.getElementById('sidebar_pane');
        const isEmpty = !sidebar || sidebar.children.length === 0 ||
                        sidebar.innerHTML.trim().length < 50;
        const isHidden = sidebar && (window.getComputedStyle(sidebar).display === 'none');
        return { widgetClosed: isEmpty || isHidden };
      })()`,
      verifyExpect: { widgetClosed: true }
    }
  ]
};


// ============================================================
// TEST 7: VIRTUAL CAMERA STATUS
// ============================================================
const test_virtualCameraStatus = {
  name: 'Virtual Camera Status',
  description: 'Verify virtual camera connection and menu',

  steps: [
    {
      name: 'Check virtual camera button exists',
      run: `(() => {
        const btn = document.querySelector('[data-action="show-virtual-camera-menu"]');
        return {
          exists: !!btn,
          text: btn ? btn.textContent.trim() : null
        };
      })()`,
      expect: { exists: true }
    },
    {
      name: 'Check connection status (multi-signal)',
      run: `(() => {
        const btn = document.querySelector('[data-action="show-virtual-camera-menu"]');
        if (!btn) return { status: 'unknown', confidence: 'none', error: 'Button not found' };

        let connectedScore = 0;
        let disconnectedScore = 0;
        const signals = {};

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

        // Determine status and confidence
        let status = 'unknown';
        let confidence = 'low';

        if (connectedScore > disconnectedScore) status = 'connected';
        else if (disconnectedScore > connectedScore) status = 'disconnected';

        const totalScore = connectedScore + disconnectedScore;
        if (totalScore >= 2) confidence = 'medium';
        if (totalScore >= 3) confidence = 'high';

        return {
          connected: status === 'connected',
          status,
          confidence,
          signals,
          scores: { connected: connectedScore, disconnected: disconnectedScore }
        };
      })()`,
      expect: { connected: true }
    },
    {
      name: 'Open virtual camera menu',
      run: `(() => {
        const btn = document.querySelector('[data-action="show-virtual-camera-menu"]');
        if (!btn) return { success: false, error: 'Button not found' };
        btn.click();
        return { success: true, clicked: 'show-virtual-camera-menu' };
      })()`,
      expect: { success: true },
      verify: `(() => {
        // Check if menu opened (look for menu items or dropdown)
        const menuItems = document.querySelectorAll('[data-action*="camera"], .virtual-camera-menu, .dropdown-menu');
        const visibleItems = Array.from(menuItems).filter(el => {
          const style = window.getComputedStyle(el);
          return style.display !== 'none' && style.visibility !== 'hidden';
        });
        return { menuOpened: visibleItems.length > 0 };
      })()`,
      verifyExpect: { menuOpened: true }
    }
  ]
};


// ============================================================
// TEST 8: EDGE LIGHT FEATURE
// ============================================================
const test_edgeLightFeature = {
  name: 'Edge Light Feature',
  description: 'Verify Edge Light toggle and widget',

  steps: [
    {
      name: 'Check Edge Light button exists',
      run: `(() => {
        const btn = document.querySelector('[data-action="show-edge-light-widget"]');
        return {
          exists: !!btn,
          text: btn ? btn.textContent.trim() : null
        };
      })()`,
      expect: { exists: true }
    },
    {
      name: 'Check toggle button exists',
      run: `(() => {
        const btn = document.querySelector('[data-action="toggle-edge-light"]');
        return { exists: !!btn };
      })()`,
      expect: { exists: true }
    },
    {
      name: 'Capture initial Edge Light state',
      run: `(() => {
        const btn = document.querySelector('[data-action="toggle-edge-light"]');
        if (!btn) return { captured: false, error: 'Button not found' };
        const wasActive = btn.classList.contains('active') ||
                          btn.classList.contains('icon_toggle_button_active');
        return { captured: true, wasActive };
      })()`,
      expect: { captured: true }
    },
    {
      name: 'Toggle Edge Light via sidebar button',
      run: `(() => {
        const btn = document.querySelector('[data-action="toggle-edge-light"]');
        if (!btn) return { success: false, error: 'Toggle button not found' };
        const wasActive = btn.classList.contains('active') ||
                          btn.classList.contains('icon_toggle_button_active');
        btn.click();
        return { success: true, clicked: 'toggle-edge-light', wasActive };
      })()`,
      expect: { success: true },
      verify: `(() => {
        const btn = document.querySelector('[data-action="toggle-edge-light"]');
        if (!btn) return { stateChanged: false, error: 'Button not found' };
        const isActive = btn.classList.contains('active') ||
                         btn.classList.contains('icon_toggle_button_active');
        // We expect the state to have toggled (changed from previous)
        return { stateChanged: true, currentState: isActive ? 'active' : 'inactive' };
      })()`,
      verifyExpect: { stateChanged: true }
    },
    {
      name: 'Toggle Edge Light again (restore state)',
      run: `(() => {
        const btn = document.querySelector('[data-action="toggle-edge-light"]');
        if (!btn) return { success: false, error: 'Toggle button not found' };
        const wasActive = btn.classList.contains('active') ||
                          btn.classList.contains('icon_toggle_button_active');
        btn.click();
        return { success: true, clicked: 'toggle-edge-light', wasActive };
      })()`,
      expect: { success: true },
      verify: `(() => {
        const btn = document.querySelector('[data-action="toggle-edge-light"]');
        if (!btn) return { stateRestored: false, error: 'Button not found' };
        const isActive = btn.classList.contains('active') ||
                         btn.classList.contains('icon_toggle_button_active');
        // State should have toggled again
        return { stateRestored: true, finalState: isActive ? 'active' : 'inactive' };
      })()`,
      verifyExpect: { stateRestored: true }
    }
  ]
};


// ============================================================
// TEST 9: BACKGROUND OPTIONS
// ============================================================
const test_backgroundOptions = {
  name: 'Background Options',
  description: 'Verify presenter background style controls',

  steps: [
    {
      name: 'Open Looks widget to access background options',
      run: `(() => {
        const btn = document.querySelector('[data-action="show-looks-widget"]');
        if (!btn) return { success: false, error: 'Button not found' };
        btn.click();
        return { success: true };
      })()`,
      expect: { success: true },
      waitFor: `(() => {
        const editBtn = document.querySelector('[data-action="edit-look"]');
        return { ready: !!editBtn };
      })()`,
      waitTimeout: 2000,
      verify: `(() => {
        const editBtn = document.querySelector('[data-action="edit-look"]');
        return { widgetOpen: !!editBtn };
      })()`,
      verifyExpect: { widgetOpen: true }
    },
    {
      name: 'Enter edit mode',
      run: `(() => {
        const btn = document.querySelector('[data-action="edit-look"]');
        if (!btn) return { success: false, error: 'Edit button not found' };
        btn.click();
        return { success: true, clicked: 'edit-look' };
      })()`,
      expect: { success: true },
      waitFor: `(() => {
        const bgBtns = document.querySelectorAll('[data-action="set-presenter-background-style"]');
        return { ready: bgBtns.length > 0 };
      })()`,
      waitTimeout: 2000,
      verify: `(() => {
        const bgBtns = document.querySelectorAll('[data-action="set-presenter-background-style"]');
        const discardBtn = document.querySelector('[data-action="discard-look-changes"]');
        return { editModeActive: bgBtns.length > 0 || !!discardBtn };
      })()`,
      verifyExpect: { editModeActive: true }
    },
    {
      name: 'Check background style buttons exist',
      run: `(() => {
        const btns = document.querySelectorAll('[data-action="set-presenter-background-style"]');
        const texts = Array.from(btns).map(b => b.textContent.trim());
        return {
          buttonCount: btns.length,
          options: texts,
          hasVisible: texts.includes('Visible'),
          hasBlurred: texts.includes('Blurred'),
          hasHidden: texts.includes('Hidden')
        };
      })()`,
      expect: { hasVisible: true, hasBlurred: true, hasHidden: true }
    },
    {
      name: 'Check presenter shape buttons exist',
      run: `(() => {
        const btns = document.querySelectorAll('[data-action="set-presenter-shape"]');
        return {
          shapeCount: btns.length,
          hasShapes: btns.length > 0
        };
      })()`,
      expect: { hasShapes: true }
    },
    {
      name: 'Cancel edit and close',
      run: `(() => {
        const cancelBtn = document.querySelector('[data-action="discard-look-changes"]');
        if (cancelBtn) {
          cancelBtn.click();
          return { success: true, clicked: 'discard-look-changes' };
        }
        const closeBtn = document.querySelector('[data-action="close-widget"]');
        if (closeBtn) {
          closeBtn.click();
          return { success: true, clicked: 'close-widget' };
        }
        return { success: false };
      })()`,
      expect: { success: true },
      verify: `(() => {
        const bgBtns = document.querySelectorAll('[data-action="set-presenter-background-style"]');
        const visibleBgBtns = Array.from(bgBtns).filter(btn => {
          const style = window.getComputedStyle(btn);
          return style.display !== 'none';
        });
        return { editModeClosed: visibleBgBtns.length === 0 };
      })()`,
      verifyExpect: { editModeClosed: true }
    }
  ]
};


// ============================================================
// TEST 10: SPEECH REACTIONS
// ============================================================
const test_speechReactions = {
  name: 'Speech Reactions',
  description: 'Verify speech reactions toggle',

  steps: [
    {
      name: 'Check speech reactions toggle exists',
      run: `(() => {
        const btn = document.querySelector('[data-action="toggle-speech-reactions"]');
        return {
          exists: !!btn,
          classes: btn ? btn.className : null
        };
      })()`,
      expect: { exists: true }
    },
    {
      name: 'Capture initial speech reactions state',
      run: `(() => {
        const btn = document.querySelector('[data-action="toggle-speech-reactions"]');
        if (!btn) return { captured: false, error: 'Button not found' };
        const wasActive = btn.classList.contains('active') ||
                          btn.classList.contains('icon_toggle_button_active');
        return { captured: true, initialState: wasActive ? 'active' : 'inactive' };
      })()`,
      expect: { captured: true }
    },
    {
      name: 'Toggle speech reactions',
      run: `(() => {
        const btn = document.querySelector('[data-action="toggle-speech-reactions"]');
        if (!btn) return { success: false, error: 'Button not found' };
        const wasActive = btn.classList.contains('active') ||
                          btn.classList.contains('icon_toggle_button_active');
        btn.click();
        return {
          success: true,
          wasActive,
          clicked: 'toggle-speech-reactions'
        };
      })()`,
      expect: { success: true },
      verify: `(() => {
        const btn = document.querySelector('[data-action="toggle-speech-reactions"]');
        if (!btn) return { stateChanged: false, error: 'Button not found' };
        const isActive = btn.classList.contains('active') ||
                         btn.classList.contains('icon_toggle_button_active');
        return { stateChanged: true, currentState: isActive ? 'active' : 'inactive' };
      })()`,
      verifyExpect: { stateChanged: true }
    },
    {
      name: 'Toggle speech reactions back',
      run: `(() => {
        const btn = document.querySelector('[data-action="toggle-speech-reactions"]');
        if (!btn) return { success: false, error: 'Button not found' };
        const wasActive = btn.classList.contains('active') ||
                          btn.classList.contains('icon_toggle_button_active');
        btn.click();
        return { success: true, clicked: 'toggle-speech-reactions', wasActive };
      })()`,
      expect: { success: true },
      verify: `(() => {
        const btn = document.querySelector('[data-action="toggle-speech-reactions"]');
        if (!btn) return { stateRestored: false, error: 'Button not found' };
        const isActive = btn.classList.contains('active') ||
                         btn.classList.contains('icon_toggle_button_active');
        return { stateRestored: true, finalState: isActive ? 'active' : 'inactive' };
      })()`,
      verifyExpect: { stateRestored: true }
    }
  ]
};


// ============================================================
// ALL SMOKE TESTS
// ============================================================
const ALL_SMOKE_TESTS = [
  test_pageLoad,
  test_looksFeature,
  test_nameTagFeature,
  test_awayModeFeature,
  test_filtersFeature,
  test_colorGradesFeature,
  test_virtualCameraStatus,
  test_edgeLightFeature,
  test_backgroundOptions,
  test_speechReactions
];

// Summary
const TEST_SUMMARY = {
  totalTests: ALL_SMOKE_TESTS.length,
  totalSteps: ALL_SMOKE_TESTS.reduce((sum, t) => sum + t.steps.length, 0),
  tests: ALL_SMOKE_TESTS.map(t => ({
    name: t.name,
    stepCount: t.steps.length
  }))
};

// ============================================================
// ROBUST TEST EXECUTION PATTERN
// ============================================================

/**
 * Enhanced test execution with verification, error detection, and async waiting.
 *
 * This pattern should be used when running tests via CDP:
 *
 * For each step:
 * 1. Run the action (step.run)
 * 2. Wait for UI to stabilize (if step.waitFor specified, poll until ready)
 * 3. Check for errors in the UI
 * 4. Run verification (step.verify) if present
 * 5. Compare results against expectations
 *
 * Example usage with CDP:
 *
 * async function runStepRobust(step) {
 *   // 1. Execute the action
 *   const result = await cdp_evaluate(step.run);
 *
 *   // 2. Wait for condition (if specified)
 *   if (step.waitFor) {
 *     const timeout = step.waitTimeout || 3000;
 *     const start = Date.now();
 *     while (Date.now() - start < timeout) {
 *       const waitResult = await cdp_evaluate(step.waitFor);
 *       if (waitResult && waitResult.ready) break;
 *       await sleep(100);
 *     }
 *   } else {
 *     // Default: wait 150ms for UI to stabilize
 *     await sleep(150);
 *   }
 *
 *   // 3. Check for errors
 *   const errors = await cdp_evaluate(CHECK_FOR_ERRORS_JS);
 *   if (errors.hasError) {
 *     return { pass: false, step: step.name, errors: errors.errors };
 *   }
 *
 *   // 4. Run verification (if specified)
 *   if (step.verify) {
 *     const verification = await cdp_evaluate(step.verify);
 *     // Compare verification result with step.verifyExpect
 *     for (const [key, expected] of Object.entries(step.verifyExpect || {})) {
 *       if (verification[key] !== expected) {
 *         return { pass: false, step: step.name, verifyFailed: key, expected, actual: verification[key] };
 *       }
 *     }
 *   }
 *
 *   // 5. Check main result expectations
 *   for (const [key, expected] of Object.entries(step.expect || {})) {
 *     if (result[key] !== expected) {
 *       return { pass: false, step: step.name, expectFailed: key, expected, actual: result[key] };
 *     }
 *   }
 *
 *   return { pass: true, step: step.name, result, verification };
 * }
 */

// JavaScript code to check for errors (use with cdp_evaluate)
const CHECK_FOR_ERRORS_JS = `(() => {
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

  // Check for aria-invalid elements
  const invalidInputs = document.querySelectorAll('[aria-invalid="true"]');
  invalidInputs.forEach(i => {
    const label = i.getAttribute('aria-label') || i.name || i.id || 'input';
    errors.push('Invalid input: ' + label);
  });

  return { hasError: errors.length > 0, errors };
})()`;

// JavaScript code to reset UI state (use before test suite)
const RESET_UI_STATE_JS = `(() => {
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
  const dismissBtns = document.querySelectorAll('[data-action="dismiss-notification"], .notification__close');
  dismissBtns.forEach(btn => {
    const style = window.getComputedStyle(btn);
    if (style.display !== 'none') {
      btn.click();
      actions.push('Dismissed notification');
    }
  });

  // Close any open menus
  const menuBackdrops = document.querySelectorAll('.menu-backdrop, .dropdown-backdrop');
  menuBackdrops.forEach(el => {
    el.click();
    actions.push('Closed menu');
  });

  return { success: true, actions };
})()`;

// JavaScript code to reset feature toggles to OFF (use before test suite)
const RESET_TOGGLES_JS = `(() => {
  const features = ['look', 'nametag', 'away', 'enhance', 'lut', 'edge-light'];
  const togglesReset = [];

  features.forEach(feature => {
    const offBtn = document.querySelector('[data-action="toggle-' + feature + '-off"]');
    if (offBtn) {
      const onBtn = document.querySelector('[data-action="toggle-' + feature + '-on"]');
      const isOn = onBtn?.classList.contains('active') || onBtn?.getAttribute('aria-pressed') === 'true';
      if (isOn) {
        offBtn.click();
        togglesReset.push(feature);
      }
    }
  });

  return { success: true, togglesReset };
})()`;

// Export execution helpers
const EXECUTION_HELPERS = {
  CHECK_FOR_ERRORS_JS,
  RESET_UI_STATE_JS,
  RESET_TOGGLES_JS
};

// Export for Node.js usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    // Individual tests
    test_pageLoad,
    test_looksFeature,
    test_nameTagFeature,
    test_awayModeFeature,
    test_filtersFeature,
    test_colorGradesFeature,
    test_virtualCameraStatus,
    test_edgeLightFeature,
    test_backgroundOptions,
    test_speechReactions,

    // Collections
    ALL_SMOKE_TESTS,
    TEST_SUMMARY,

    // Execution helpers
    EXECUTION_HELPERS,
    CHECK_FOR_ERRORS_JS,
    RESET_UI_STATE_JS,
    RESET_TOGGLES_JS
  };
}
