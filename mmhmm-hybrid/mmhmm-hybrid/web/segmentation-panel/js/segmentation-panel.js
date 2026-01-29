let storedInitialData = null;

const presets = {
  // Segmentation presets
  appleVisionHard: {
    model: 'AppleVision Person',
    scoring: 0.3,
    sceneStabilisation: true,
    morphologicalGradient: false,
    jbf: true,
    smoothStep: true
  },
  appleVisionSoft: {
    model: 'AppleVision Person',
    scoring: 0.1,
    sceneStabilisation: true,
    morphologicalGradient: false,
    jbf: false,
    smoothStep: false
  },
  visionTalkHard: {
    model: 'VisionTalk',
    scoring: 0.3,
    sceneStabilisation: true,
    morphologicalGradient: false,
    jbf: true,
    smoothStep: true
  },
  visionTalkSoft: {
    model: 'VisionTalk',
    scoring: 0.1,
    sceneStabilisation: true,
    morphologicalGradient: true,
    dilateRadius: 4.5,
    erodeRadius: 3.5,
    gainPower: 0.5,
    jbf: false,
    smoothStep: false
  },
  
  // Visual Effects presets
  visualSwitchOn: {
    enableHEQ: true,
    drawHistogram: false,
    curtainPosition: 1.0,
    rollingCurtain: false
  },
  visualComparisonMode: {
    enableHEQ: true,
    drawHistogram: false,
    curtainPosition: 0.5,
    rollingCurtain: true,
    rollingCurtainPeriod: 8
  },
  visualSwitchOff: {
    enableHEQ: false
  },
  visualDefaults: {
    enableHEQ: false,
    strength: 0.6,
    temporalSmoothing: 0.7,
    lowerContrastLimit: 0.1463,
    upperContrastLimit: 1.5,
    gamma: 0.6,
    drawHistogram: false,
    curtainPosition: 1.0,
    rollingCurtain: false,
    rollingCurtainPeriod: 8
  }
};

// Function to apply preset settings to UI
function applyPreset(presetName) {
  const preset = presets[presetName];
  if (!preset) {
    return;
  }
  
  // Determine if this is a segmentation preset or visual effects preset
  if (preset.model !== undefined) {
    // Apply model selection
    const modelRadio = document.querySelector(`input[name="model"][value="${preset.model}"]`);
    if (modelRadio) {
      modelRadio.checked = true;
    }
    
    // Apply scoring
    const scoringSlider = document.getElementById('scoring');
    scoringSlider.value = preset.scoring;
    updateSliderValue('scoring');
    
    // Apply scene stabilisation
    document.getElementById('scene-stabilisation').checked = preset.sceneStabilisation;
    
    // Apply morphological gradient settings
    const morphologicalEnable = document.getElementById('morphological-enable');
    morphologicalEnable.checked = preset.morphologicalGradient;
    
    // Show/hide morphological group based on checkbox state
    const morphologicalGroup = document.getElementById('morphological-group');
    if (morphologicalEnable.checked) {
      morphologicalGroup.classList.remove('disabled');
      
      // Set specific morphological settings if available
      if (preset.dilateRadius !== undefined) {
        const dilationSlider = document.getElementById('dilation-radius');
        dilationSlider.value = preset.dilateRadius;
        updateSliderValue('dilation-radius');
      }
      
      if (preset.erodeRadius !== undefined) {
        const erodeSlider = document.getElementById('erode-radius');
        erodeSlider.value = preset.erodeRadius;
        updateSliderValue('erode-radius');
      }
      
      if (preset.gainPower !== undefined) {
        const gainSlider = document.getElementById('gain-power');
        gainSlider.value = preset.gainPower;
        updateSliderValue('gain-power');
      }
    } else {
      morphologicalGroup.classList.add('disabled');
    }
    
    // Apply JB Filter
    document.getElementById('jb-filter').checked = preset.jbf;
    
    // Apply Smooth Step
    document.getElementById('smooth-step').checked = preset.smoothStep;
  } else if (preset.enableHEQ !== undefined) {
    // Apply HEQ enable/disable
    const heqEnable = document.getElementById('enable-heq');
    heqEnable.checked = preset.enableHEQ;
    
    const heqOptions = document.getElementById('heq-options');
    if (heqEnable.checked) {
      heqOptions.classList.remove('disabled');
    } else {
      heqOptions.classList.add('disabled');
    }
    
    // Apply HEQ settings
    if (preset.strength !== undefined) {
      document.getElementById('heq-strength').value = preset.strength;
      updateSliderValue('heq-strength');
    }
    
    if (preset.temporalSmoothing !== undefined) {
      document.getElementById('temporal-smoothing').value = preset.temporalSmoothing;
      updateSliderValue('temporal-smoothing');
    }
    
    if (preset.lowerContrastLimit !== undefined) {
      document.getElementById('lower-contrast-limit').value = preset.lowerContrastLimit;
      updateSliderValue('lower-contrast-limit');
    }
    
    if (preset.upperContrastLimit !== undefined) {
      document.getElementById('upper-contrast-limit').value = preset.upperContrastLimit;
      updateSliderValue('upper-contrast-limit');
    }
    
    if (preset.gamma !== undefined) {
      document.getElementById('gamma').value = preset.gamma;
      updateSliderValue('gamma');
    }
    
    if (preset.drawHistogram !== undefined) {
      document.getElementById('draw-histogram').checked = preset.drawHistogram;
    }
    
    if (preset.curtainPosition !== undefined) {
      document.getElementById('curtain-position').value = preset.curtainPosition;
      updateSliderValue('curtain-position');
    }
    
    if (preset.rollingCurtain !== undefined) {
      document.getElementById('rolling-curtain').checked = preset.rollingCurtain;
    }
    
    if (preset.rollingCurtainPeriod !== undefined) {
      document.getElementById('rolling-curtain-period').value = preset.rollingCurtainPeriod;
      updateSliderValue('rolling-curtain-period');
    }
  }
}

function updateSliderValue(sliderId) {
    const slider = document.getElementById(sliderId);
    const valueDisplay = document.getElementById(`${sliderId}-value`);
    if (slider && valueDisplay) {
        valueDisplay.textContent = parseFloat(slider.value).toFixed(2);
    }
}

function setInitialData(initialData) {
  
  storedInitialData = JSON.parse(JSON.stringify(initialData));
  
  const metalConfig = initialData?.seglib?.metal_config;
  
  if (!metalConfig) {
    console.error('No metal_config found in initialData');
    return;
  }
  
  // Set model selection based on segmentor_type
  const segmentorType = metalConfig.segmentor_type;
  if (segmentorType) {
    let modelValue;
    switch (segmentorType.toLowerCase()) {
      case 'vision_talk':
        modelValue = 'VisionTalk';
        break;
      case 'apple_vision':
        modelValue = 'AppleVision Person';
        break;
      case 'apple_vision_foreground':
        modelValue = 'AppleVision Foreground';
        break;
      default:
        modelValue = 'AppleVision Person'; // Default value
    }
    
    // Select the radio button
    const modelRadio = document.querySelector(`input[name="model"][value="${modelValue}"]`);
    if (modelRadio) {
      modelRadio.checked = true;
    }
  }
  
  // Set scoring (confidence) slider
  if (metalConfig.confidence !== undefined) {
    const scoringSlider = document.getElementById('scoring');
    scoringSlider.value = metalConfig.confidence;
    updateSliderValue('scoring');
  }
  
  // Set scene stabilisation checkbox
  if (metalConfig.enable_scene_stabilisation !== undefined) {
    document.getElementById('scene-stabilisation').checked = metalConfig.enable_scene_stabilisation;
  }
  
  // Set morphological gradient checkbox
  if (metalConfig.enable_morphological_gradient !== undefined) {
    const morphologicalEnable = document.getElementById('morphological-enable');
    morphologicalEnable.checked = metalConfig.enable_morphological_gradient;
    
    // Show/hide the morphological group based on checkbox state
    const morphologicalGroup = document.getElementById('morphological-group');
    if (morphologicalEnable.checked) {
      morphologicalGroup.classList.remove('disabled');
    } else {
      morphologicalGroup.classList.add('disabled');
    }
  }
  
  // Set dilation radius slider
  if (metalConfig.dilate_radius !== undefined) {
    const dilationSlider = document.getElementById('dilation-radius');
    dilationSlider.value = metalConfig.dilate_radius;
    updateSliderValue('dilation-radius');
  }
  
  // Set erode radius slider
  if (metalConfig.erode_radius !== undefined) {
    const erodeSlider = document.getElementById('erode-radius');
    erodeSlider.value = metalConfig.erode_radius;
    updateSliderValue('erode-radius');
  }
  
  // Set gain power slider
  if (metalConfig.gain_power !== undefined) {
    const gainSlider = document.getElementById('gain-power');
    gainSlider.value = metalConfig.gain_power;
    updateSliderValue('gain-power');
  }
  
  // Set JB Filter checkbox
  if (metalConfig.enable_jbf !== undefined) {
    document.getElementById('jb-filter').checked = metalConfig.enable_jbf;
  }
  
  // Set Smooth Step checkbox
  if (metalConfig.enable_smoothstep !== undefined) {
    document.getElementById('smooth-step').checked = metalConfig.enable_smoothstep;
  }
  
  // Set Visual Effects settings from metalConfig
  if (metalConfig) {
    // Set HEQ enable checkbox
    if (metalConfig.enable_heq !== undefined) {
      const heqEnable = document.getElementById('enable-heq');
      heqEnable.checked = metalConfig.enable_heq;
      
      // Show/hide the HEQ options based on checkbox state
      const heqOptions = document.getElementById('heq-options');
      if (heqEnable && heqOptions) {
        if (heqEnable.checked) {
          heqOptions.classList.remove('disabled');
        } else {
          heqOptions.classList.add('disabled');
        }
      }
    }
    
    // Set HEQ config values
    if (metalConfig.heq_config) {
      const heqConfig = metalConfig.heq_config;
      
      if (heqConfig.strength !== undefined) {
        document.getElementById('heq-strength').value = heqConfig.strength;
        updateSliderValue('heq-strength');
      }
      
      if (heqConfig.temporal_smoothing_alpha !== undefined) {
        document.getElementById('temporal-smoothing').value = heqConfig.temporal_smoothing_alpha;
        updateSliderValue('temporal-smoothing');
      }
      
      if (heqConfig.lower_contrast_limit !== undefined) {
        document.getElementById('lower-contrast-limit').value = heqConfig.lower_contrast_limit;
        updateSliderValue('lower-contrast-limit');
      }
      
      if (heqConfig.upper_contrast_limit !== undefined) {
        document.getElementById('upper-contrast-limit').value = heqConfig.upper_contrast_limit;
        updateSliderValue('upper-contrast-limit');
      }
      
      if (heqConfig.gamma !== undefined) {
        document.getElementById('gamma').value = heqConfig.gamma;
        updateSliderValue('gamma');
      }
      
      if (heqConfig.draw_histogram !== undefined) {
        document.getElementById('draw-histogram').checked = heqConfig.draw_histogram;
      }
      
      if (heqConfig.curtain_position !== undefined) {
        document.getElementById('curtain-position').value = heqConfig.curtain_position;
        updateSliderValue('curtain-position');
      }
      
      if (heqConfig.rolling_curtain !== undefined) {
        document.getElementById('rolling-curtain').checked = heqConfig.rolling_curtain;
      }
      
      if (heqConfig.rolling_curtain_period_seconds !== undefined) {
        document.getElementById('rolling-curtain-period').value = heqConfig.rolling_curtain_period_seconds;
        updateSliderValue('rolling-curtain-period');
      }
    }
  }
  
  enableAllElements();
}

function initializeTabNavigation() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  
  console.log("Found tab buttons:", tabButtons.length);
  
  tabButtons.forEach(button => {
    button.addEventListener('click', function() {
      const tabName = this.dataset.tab;
      
      // Update active tab button
      tabButtons.forEach(btn => btn.classList.remove('active'));
      this.classList.add('active');
      
      // Show selected tab content
      tabContents.forEach(content => content.classList.remove('active'));
      const targetTab = document.getElementById(`${tabName}-tab`);
      if (targetTab) {
        targetTab.classList.add('active');
      } else {
        console.error(`Tab content not found: ${tabName}-tab`);
      }
    });
  });
}

function initializeSliders() {
  // Initialize all sliders
  const allSliders = [
    // Segmentation sliders
    'scoring', 'dilation-radius', 'erode-radius', 'gain-power',
    // Visual Effects sliders
    'heq-strength', 'temporal-smoothing', 'lower-contrast-limit',
    'upper-contrast-limit', 'gamma', 'curtain-position', 'rolling-curtain-period'
  ];
  
  allSliders.forEach(slider => {
    updateSliderValue(slider);
    
    // Add event listener for input changes
    const sliderElement = document.getElementById(slider);
    if (sliderElement) {
      sliderElement.addEventListener('input', function() {
        updateSliderValue(slider);
      });
    }
  });
}

function initializeToggles() {
  // Toggle morphological gradient options based on checkbox
  const morphologicalEnable = document.getElementById('morphological-enable');
  const morphologicalGroup = document.getElementById('morphological-group');
  
  if (morphologicalEnable && morphologicalGroup) {
    morphologicalEnable.addEventListener('change', function() {
      if (this.checked) {
        morphologicalGroup.classList.remove('disabled');
      } else {
        morphologicalGroup.classList.add('disabled');
      }
    });
  }
  
  // Toggle HEQ options based on checkbox
  const heqEnable = document.getElementById('enable-heq');
  const heqOptions = document.getElementById('heq-options');
  
  if (heqEnable && heqOptions) {
    heqEnable.addEventListener('change', function() {
      if (this.checked) {
        heqOptions.classList.remove('disabled');
      } else {
        heqOptions.classList.add('disabled');
      }
    });
  }
}

function enableAllElements() {
  const interactiveElements = document.querySelectorAll('button, input, select, textarea, a, [tabindex="-1"]');
  
  interactiveElements.forEach(element => {
    // Skip the specific radio button
    if (element.type === 'radio' && element.name === 'model' && element.value === 'AppleVision Foreground') {
      return;
    }
    
    // Restore original disabled state if it was saved
    if (element.hasAttribute('data-original-disabled')) {
      element.disabled = element.getAttribute('data-original-disabled') === 'true';
      element.removeAttribute('data-original-disabled');
    } else {
      element.disabled = false;
    }
    
    // Restore normal behavior for elements like links
    element.removeAttribute('tabindex');
    element.style.pointerEvents = '';
    element.style.opacity = '';
  });
}

function collectAllSettings() {
  // Get all current values from the UI
  const selectedModel = document.querySelector('input[name="model"]:checked').value;
  const scoring = parseFloat(document.getElementById('scoring').value);
  const sceneStabilisation = document.getElementById('scene-stabilisation').checked;
  
  const morphologicalEnable = document.getElementById('morphological-enable').checked;
  const dilationRadius = parseFloat(document.getElementById('dilation-radius').value);
  const erodeRadius = parseFloat(document.getElementById('erode-radius').value);
  const gainPower = parseFloat(document.getElementById('gain-power').value);
  
  const jbFilter = document.getElementById('jb-filter').checked;
  const smoothStep = document.getElementById('smooth-step').checked;
  
  // Get Visual Effects settings
  const enableHEQ = document.getElementById('enable-heq').checked;
  const heqStrength = parseFloat(document.getElementById('heq-strength').value);
  const temporalSmoothing = parseFloat(document.getElementById('temporal-smoothing').value);
  const lowerContrastLimit = parseFloat(document.getElementById('lower-contrast-limit').value);
  const upperContrastLimit = parseFloat(document.getElementById('upper-contrast-limit').value);
  const gamma = parseFloat(document.getElementById('gamma').value);
  const drawHistogram = document.getElementById('draw-histogram').checked;
  const curtainPosition = parseFloat(document.getElementById('curtain-position').value);
  const rollingCurtain = document.getElementById('rolling-curtain').checked;
  const rollingCurtainPeriod = parseFloat(document.getElementById('rolling-curtain-period').value);
  
  // Map the selected model to segmentor_type
  let segmentorType;
  switch (selectedModel) {
    case 'VisionTalk':
      segmentorType = 'vision_talk';
      break;
    case 'AppleVision Person':
      segmentorType = 'apple_vision';
      break;
    case 'AppleVision Foreground':
      segmentorType = 'apple_vision_foreground';
      break;
    default:
      segmentorType = 'vision_talk';
  }
  
  return {
    segmentor_type: segmentorType,
    segmentation: {
      confidence: scoring,
      enable_scene_stabilisation: sceneStabilisation,
      enable_morphological_gradient: morphologicalEnable,
      dilate_radius: dilationRadius,
      erode_radius: erodeRadius,
      gain_power: gainPower,
      enable_jbf: jbFilter,
      enable_smoothstep: smoothStep
    },
    visual_effects: {
      enable_heq: enableHEQ,
      heq_config: {
        strength: heqStrength,
        temporal_smoothing_alpha: temporalSmoothing,
        lower_contrast_limit: lowerContrastLimit,
        upper_contrast_limit: upperContrastLimit,
        gamma: gamma,
        draw_histogram: drawHistogram,
        curtain_position: curtainPosition,
        rolling_curtain: rollingCurtain,
        rolling_curtain_period_seconds: rollingCurtainPeriod
      }
    }
  };
}

// Initialize tab functionality immediately when the script loads
document.addEventListener('DOMContentLoaded', function() {
  console.log("DOM fully loaded");
  initializeTabNavigation();
});

window.onload = function() {
  initializeSliders();
  
  initializeToggles();
  
  const interactiveElements = document.querySelectorAll('button, input, select, textarea, a, [tabindex]:not([tabindex="-1"])');
  
  interactiveElements.forEach(element => {
    // Store original state if needed later
    if (!element.hasAttribute('data-original-disabled')) {
      element.setAttribute('data-original-disabled', element.disabled);
    }
    
    // Disable the element
    element.disabled = true;
    
    // For elements that don't support disabled attribute (like links)
    element.setAttribute('tabindex', '-1');
    element.style.pointerEvents = 'none';
    element.style.opacity = '0.6';
  });
  
  document.getElementById('preset-apple-hard').addEventListener('click', function() {
    applyPreset('appleVisionHard');
  });
  
  document.getElementById('preset-apple-soft').addEventListener('click', function() {
    applyPreset('appleVisionSoft');
  });
  
  document.getElementById('preset-vision-hard').addEventListener('click', function() {
    applyPreset('visionTalkHard');
  });
  
  document.getElementById('preset-vision-soft').addEventListener('click', function() {
    applyPreset('visionTalkSoft');
  });
  
  // Initialize morphological group according to checkbox state
  const morphologicalEnable = document.getElementById('morphological-enable');
  const morphologicalGroup = document.getElementById('morphological-group');
  
  if (morphologicalEnable && morphologicalGroup) {
    if (morphologicalEnable.checked) {
      morphologicalGroup.classList.remove('disabled');
    } else {
      morphologicalGroup.classList.add('disabled');
    }
  }
  
  // Initialize HEQ options according to checkbox state
  const heqEnable = document.getElementById('enable-heq');
  const heqOptions = document.getElementById('heq-options');
  
  if (heqEnable && heqOptions) {
    if (heqEnable.checked) {
      heqOptions.classList.remove('disabled');
    } else {
      heqOptions.classList.add('disabled');
    }
  }
  
  document.getElementById('preset-switch-on').addEventListener('click', function() {
    applyPreset('visualSwitchOn');
  });

  document.getElementById('preset-comparison-mode').addEventListener('click', function() {
    applyPreset('visualComparisonMode');
  });

  document.getElementById('preset-switch-off').addEventListener('click', function() {
    applyPreset('visualSwitchOff');
  });

  document.getElementById('preset-restore-defaults').addEventListener('click', function() {
    applyPreset('visualDefaults');
  });
  
  if (typeof segmentationPanelCreated === 'function') {
    segmentationPanelCreated();
  }
};

// Apply button click event
document.querySelector('.apply-btn').addEventListener('click', function() {
  if (!storedInitialData) {
    console.error('No initial data available to update');
    return;
  }
  
  // Create a copy of the stored data
  const updatedData = JSON.parse(JSON.stringify(storedInitialData));
  
  // Get all current settings
  const settings = collectAllSettings();
  
  // Update the metal_config in our JSON
  if (updatedData.seglib && updatedData.seglib.metal_config) {
    const metalConfig = updatedData.seglib.metal_config;
    metalConfig.segmentor_type = settings.segmentor_type;
    metalConfig.confidence = settings.segmentation.confidence;
    metalConfig.enable_scene_stabilisation = settings.segmentation.enable_scene_stabilisation;
    metalConfig.enable_morphological_gradient = settings.segmentation.enable_morphological_gradient;
    metalConfig.dilate_radius = settings.segmentation.dilate_radius;
    metalConfig.erode_radius = settings.segmentation.erode_radius;
    metalConfig.gain_power = settings.segmentation.gain_power;
    metalConfig.enable_jbf = settings.segmentation.enable_jbf;
    metalConfig.enable_smoothstep = settings.segmentation.enable_smoothstep;
    
    // Add visual effects settings to metal_config
    metalConfig.enable_heq = settings.visual_effects.enable_heq;
    metalConfig.heq_config = settings.visual_effects.heq_config;
  }
  
  // Convert to JSON string
  const jsonString = JSON.stringify(updatedData, null, 2);
  
  // Provide visual feedback that settings were applied
  const applyBtn = document.querySelector('.apply-btn');
  const originalText = applyBtn.textContent;
  applyBtn.textContent = 'Applied!';
  applyBtn.style.backgroundColor = '#34c759';
  
  setTimeout(() => {
    applyBtn.textContent = originalText;
    applyBtn.style.backgroundColor = '';
  }, 1500);
  
  if (typeof segmentationPanelDataChanged === 'function') {
    segmentationPanelDataChanged(jsonString);
  }
});
