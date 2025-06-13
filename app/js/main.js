/**
 * @file This is the main entry point for the Halftone Plotter application.
 * It initializes the application, handles user interactions, and orchestrates
 * the image processing pipeline.
 */

/**
 * The main class for the Halftone application. It encapsulates all core
 * functionality, including UI event handling, state management, and coordinating
 * the different modules (patterns, exporter, etc.).
 */
class HalftoneApp {
  /**
   * Initializes the application by setting up properties and event listeners.
   */
  constructor() {
    /**
     * The uploaded image element.
     * @type {HTMLImageElement|null}
     */
    this.uploadedImage = null;

    /**
     * Instance of the HalftonePatterns class for generating patterns.
     * @type {HalftonePatterns}
     */
    this.patterns = new HalftonePatterns();

    /**
     * Instance of the SVGExporter class for handling file exports.
     * @type {SVGExporter}
     */
    this.exporter = new SVGExporter();

    /**
     * Instance of the ColorManager class for generating harmonious palettes.
     * @type {ColorManager}
     */
    this.colorManager = ColorManager;

    this.initializeEventListeners();
    this.updateUIForCurrentSettings();
  }

  /**
   * Binds all necessary event listeners to the DOM elements.
   */
  initializeEventListeners() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const processBtn = document.getElementById('processBtn');

    // --- File Upload Listeners ---
    uploadArea.addEventListener('click', () => fileInput.click());
    uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
    uploadArea.addEventListener('dragleave', this.handleDragLeave.bind(this));
    uploadArea.addEventListener('drop', this.handleDrop.bind(this));
    fileInput.addEventListener('change', this.handleFileSelect.bind(this));

    // --- Main Action Listener ---
    processBtn.addEventListener('click', this.processImage.bind(this));

    // --- Control Panel Listeners ---
    this.setupControlListeners();
  }

  /**
   * Sets up event listeners for all the control inputs (sliders, dropdowns).
   */
  setupControlListeners() {
    const valueDisplayControls = [
      { id: 'dotSize',    display: 'dotSizeValue',    suffix: 'px' },
      { id: 'spacing',    display: 'spacingValue',    suffix: 'px' },
      { id: 'lineAngle',  display: 'lineAngleValue',  suffix: '°' },
      { id: 'randomness', display: 'randomnessValue', suffix: '%' },
      { id: 'contrast',   display: 'contrastValue',   suffix: '%' },
      { id: 'strokeWidth', display: 'strokeWidthValue', suffix: 'px', fixed: 1 },
      // Add new angle sliders here
      { id: 'angleCyan',    display: 'angleCyanValue',    suffix: '°' },
      { id: 'angleMagenta', display: 'angleMagentaValue', suffix: '°' },
      { id: 'angleYellow',  display: 'angleYellowValue',  suffix: '°' },
      { id: 'angleBlack',   display: 'angleBlackValue',   suffix: '°' }
    ];

    valueDisplayControls.forEach(control => {
      const element = document.getElementById(control.id);
      const display = document.getElementById(control.display);
      if (element && display) {
        const updateDisplay = (e) => {
          const value = control.fixed ? parseFloat(e.target.value).toFixed(control.fixed) : e.target.value;
          display.textContent = value + control.suffix;
        };
        element.addEventListener('input', updateDisplay);
        // Set initial display text
        display.textContent = (control.fixed ? parseFloat(element.value).toFixed(control.fixed) : element.value) + control.suffix;
      }
    });

    // Listeners for controls that affect UI visibility
    const uiAffectingControls = ['patternType', 'colorMode', 'angleOffset'];
    uiAffectingControls.forEach(id => {
      document.getElementById(id).addEventListener('change', this.updateUIForCurrentSettings.bind(this));
    });
    document.querySelectorAll('input[name="renderStyle"]').forEach(radio => {
      radio.addEventListener('change', this.updateUIForCurrentSettings.bind(this));
    });

    // Listener for palette and color buttons
    document.getElementById('paletteBtn').addEventListener('click', this.applyHarmoniousPalette.bind(this));
    document.getElementById('resetColorsBtn').addEventListener('click', this.resetDefaultColors.bind(this));
  }

  /**
   * Updates the visibility and content of UI elements based on current settings.
   */
  updateUIForCurrentSettings() {
    const patternType = document.getElementById('patternType').value;
    const colorMode = document.getElementById('colorMode').value;
    const renderStyle = document.querySelector('input[name="renderStyle"]:checked').value;
    const useStandardAngles = document.getElementById('angleOffset').checked;

    // 1. Update pattern-specific controls
    const lineAngleGroup = document.getElementById('lineAngle').closest('.control-group');
    const randomnessGroup = document.getElementById('randomness').closest('.control-group');
    if (lineAngleGroup) lineAngleGroup.style.display = ['line', 'crosshatch', 'wave'].includes(patternType) ? 'block' : 'none';
    if (randomnessGroup) randomnessGroup.style.display = ['stochastic', 'stipple', 'voronoi'].includes(patternType) ? 'block' : 'none';
    this.showPatternTip(patternType);

    // 2. Update render style controls
    document.getElementById('strokeWidthGroup').style.display = renderStyle === 'stroke' ? 'block' : 'none';

    // 3. Update color mode controls
    const numChannels = { monochrome: 1, duotone: 2, tritone: 3, cmyk: 4 }[colorMode];
    const colorLabels = {
      monochrome: ['Key'],
      duotone: ['Tone 1 (Dark)', 'Tone 2 (Light)'],
      tritone: ['Shadows', 'Midtones', 'Highlights'],
      cmyk: ['Cyan', 'Magenta', 'Yellow', 'Black']
    };

    const uiChannelIds = ['cyan', 'magenta', 'yellow', 'black'];

    document.getElementById('color-card-title').textContent = `${colorMode.charAt(0).toUpperCase() + colorMode.slice(1)} Colors`;

    for (let i = 0; i < 4; i++) {
      const channelId = uiChannelIds[i];
      const group = document.getElementById(`color-group-${channelId}`);
      const label = document.getElementById(`color-label-${channelId}`);
      if (i < numChannels) {
        group.style.display = 'block';
        label.textContent = colorLabels[colorMode][i];
      } else {
        group.style.display = 'none';
      }
    }

    // 4. Update custom angle controls
    const customAnglesGroup = document.getElementById('customAnglesGroup');
    customAnglesGroup.classList.toggle('hidden', useStandardAngles);

    if (!useStandardAngles) {
      const angleLabels = {
        monochrome: ['Key Angle'],
        duotone: ['Tone 1 Angle', 'Tone 2 Angle'],
        tritone: ['Shadows Angle', 'Midtones Angle', 'Highlights Angle'],
        cmyk: ['Cyan Angle', 'Magenta Angle', 'Yellow Angle', 'Black Angle']
      };

      for (let i = 0; i < 4; i++) {
        const angleGroupId = `angle-group-${uiChannelIds[i]}`;
        const angleLabelId = `angle-label-${uiChannelIds[i]}`;
        const group = document.getElementById(angleGroupId);
        const label = document.getElementById(angleLabelId);

        if (i < numChannels) {
          group.style.display = 'block';
          label.textContent = angleLabels[colorMode][i];
        } else {
          group.style.display = 'none';
        }
      }
    }
  }

  /**
   * Applies a random harmonious palette to the color pickers and re-processes the image.
   */
  applyHarmoniousPalette() {
    const colorMode = document.getElementById('colorMode').value;
    const numChannels = { monochrome: 1, duotone: 2, tritone: 3, cmyk: 4 }[colorMode];
    const uiChannelIds = ['cyan', 'magenta', 'yellow', 'black'];

    let palette;
    if (colorMode === 'cmyk') {
      const cmykPalette = this.colorManager.getCmykPalette();
      palette = [cmykPalette.c, cmykPalette.m, cmykPalette.y, cmykPalette.k];
    } else {
      palette = this.colorManager.generateProgrammaticPalette(numChannels);
    }

    for (let i = 0; i < numChannels; i++) {
      document.getElementById(`${uiChannelIds[i]}Color`).value = palette[i];
    }

    // If an image has already been processed, re-process with new colors.
    if (this.uploadedImage && !document.getElementById('previewSection').classList.contains('hidden')) {
      this.processImage();
    }
  }

  /**
   * Resets the color pickers to the default CMYK values.
   */
  resetDefaultColors() {
    document.getElementById('cyanColor').value = '#00ffff';
    document.getElementById('magentaColor').value = '#ff00ff';
    document.getElementById('yellowColor').value = '#ffff00';
    document.getElementById('blackColor').value = '#000000';

    if (this.uploadedImage && !document.getElementById('previewSection').classList.contains('hidden')) {
      this.processImage();
    }
  }

  /**
   * Displays a helpful tip related to the currently selected pattern.
   * @param {string} patternType - The value of the selected pattern.
   */
  showPatternTip(patternType) {
    const existingTip = document.querySelector('.pattern-tip');
    if (existingTip) {
      existingTip.remove();
    }

    const tips = {
      'voronoi': 'Creates organic, cell-like patterns. Adjust spacing for cell density.',
      'concentric': 'Generates concentric circles. Larger dot size creates more rings.',
      'spiral': 'Creates spiral patterns. Works best with medium spacing.',
      'hexagonal': 'Efficient hexagonal packing. Great for technical illustrations.',
      'wave': 'Wave distortion pattern. Use line angle to control wave direction.',
      'flowfield': 'Dots follow image gradients, creating painterly, flowing effects.'
    };

    if (tips[patternType]) {
      const tip = document.createElement('div');
      tip.className = 'pattern-tip';
      tip.textContent = `💡 ${tips[patternType]}`;

      const processSection = document.querySelector('.process-section');
      processSection.parentNode.insertBefore(tip, processSection);
    }
  }

  // --- Drag and Drop Handlers ---

  handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    document.getElementById('uploadArea').classList.add('dragover');
  }

  handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    document.getElementById('uploadArea').classList.remove('dragover');
  }

  handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    document.getElementById('uploadArea').classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      this.handleFile(files[0]);
    }
  }

  handleFileSelect(e) {
    if (e.target.files.length > 0) {
      this.handleFile(e.target.files[0]);
    }
  }

  /**
   * Processes the selected file, validates it, and loads it as an image.
   * @param {File} file - The image file to handle.
   */
  handleFile(file) {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (JPG, PNG, GIF).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      this.uploadedImage = new Image();
      this.uploadedImage.onload = () => {
        document.getElementById('controlsSection').classList.remove('hidden');
        document.getElementById('uploadArea').innerHTML = `<img src="${e.target.result}" style="max-width: 100%; max-height: 200px; border-radius: 8px;" alt="Uploaded Image Preview">`;
        this.autoAdjustSpacing();
      };
      this.uploadedImage.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  /**
   * Automatically suggests a 'Spacing' value based on the uploaded image's dimensions.
   */
  autoAdjustSpacing() {
    const imageArea = this.uploadedImage.width * this.uploadedImage.height;
    const spacingElement = document.getElementById('spacing');
    const spacingDisplay = document.getElementById('spacingValue');

    let suggestedSpacing = 12; // Default
    if (imageArea > 1000000) suggestedSpacing = 15; // Large images
    else if (imageArea < 400000) suggestedSpacing = 8; // Small images

    spacingElement.value = suggestedSpacing;
    spacingDisplay.textContent = `${suggestedSpacing}px`;
  }

  /**
   * Gathers all current settings from the control panel into a configuration object.
   * @returns {object} The configuration object for the image processing.
   */
  getProcessingConfig() {
    const colorMode = document.getElementById('colorMode').value;
    const numChannels = { monochrome: 1, duotone: 2, tritone: 3, cmyk: 4 }[colorMode];
    const uiChannelIds = ['cyan', 'magenta', 'yellow', 'black'];

    const colors = {};
    const channelNames = [];
    const genericChannelNames = {
      monochrome: ['key'],
      duotone: ['tone1', 'tone2'],
      tritone: ['shadows', 'midtones', 'highlights'],
      cmyk: ['cyan', 'magenta', 'yellow', 'black']
    }[colorMode];

    for (let i = 0; i < numChannels; i++) {
      const genericName = genericChannelNames[i];
      const colorValue = document.getElementById(`${uiChannelIds[i]}Color`).value;
      colors[genericName] = colorValue;
      channelNames.push(genericName);
    }

    // Determine angles
    const useAngleOffset = document.getElementById('angleOffset').checked;
    let angles;
    if (useAngleOffset) {
      const standardAngles = this.patterns.getStandardAngles();
      const modeAngles = {
        monochrome: { key: 45 },
        duotone: { tone1: 75, tone2: 15 },
        tritone: { shadows: 75, midtones: 15, highlights: 0 },
        cmyk: standardAngles
      };
      angles = modeAngles[colorMode];
    } else {
      angles = {};
      const uiAngleIds = ['angleCyan', 'angleMagenta', 'angleYellow', 'angleBlack'];
      channelNames.forEach((name, i) => {
        const inputId = uiAngleIds[i];
        angles[name] = parseInt(document.getElementById(inputId).value, 10) || 0;
      });
    }

    return {
      patternType: document.getElementById('patternType').value,
      dotSize: parseInt(document.getElementById('dotSize').value, 10),
      spacing: parseInt(document.getElementById('spacing').value, 10),
      lineAngle: parseInt(document.getElementById('lineAngle').value, 10),
      randomness: parseInt(document.getElementById('randomness').value, 10),
      contrast: parseInt(document.getElementById('contrast').value, 10),
      colorMode: colorMode,
      renderStyle: document.querySelector('input[name="renderStyle"]:checked').value,
      strokeWidth: parseFloat(document.getElementById('strokeWidth').value),
      colors: colors,
      channelNames: channelNames,
      angles: angles
    };
  }

  /**
   * The main orchestration method that is triggered when the "Process Image" button is clicked.
   */
  processImage() {
    if (!this.uploadedImage) {
      alert('Please upload an image first.');
      return;
    }

    const config = this.getProcessingConfig();
    this.setProcessingState(true);

    // Use a short timeout to allow the UI to update to the "processing" state.
    setTimeout(() => {
      try {
        document.getElementById('previewSection').classList.remove('hidden');

        this.displayOriginalImage();
        const imageData = this.getImageData();
        if (!imageData) {
          this.setProcessingState(false);
          return;
        };

        // Dynamic color separation
        let channelData;
        switch (config.colorMode) {
          case 'monochrome':
            channelData = { key: rgbToGrayscale(imageData.data, config.contrast) };
            break;
          case 'duotone':
            const duo = rgbToMultiTone(imageData.data, 2, config.contrast);
            channelData = { tone1: duo.tone1, tone2: duo.tone2 };
            break;
          case 'tritone':
            const tri = rgbToMultiTone(imageData.data, 3, config.contrast);
            channelData = { shadows: tri.tone1, midtones: tri.tone2, highlights: tri.tone3 };
            break;
          case 'cmyk':
          default:
            const cmyk = rgbToCmyk(imageData.data, imageData.width, imageData.height, config.contrast);
            channelData = { cyan: cmyk.c, magenta: cmyk.m, yellow: cmyk.y, black: cmyk.k };
            break;
        }

        this.generateChannelHalftones(channelData, config);
        this.generateCombinedPreview(config.channelNames, config.colors);
        this.logAndDisplayProcessingStats(config.channelNames);

      } catch (error) {
        console.error('An error occurred during image processing:', error);
        alert('An error occurred during processing. Please check the console for details or try different settings.');
      } finally {
        this.setProcessingState(false);
      }
    }, 100);
  }

  /**
   * Updates the UI to indicate whether the application is currently processing.
   * @param {boolean} isProcessing - True if processing has started, false if it has finished.
   */
  setProcessingState(isProcessing) {
    const processBtn = document.getElementById('processBtn');
    processBtn.disabled = isProcessing;

    if (isProcessing) {
      processBtn.classList.add('loading');
      processBtn.innerHTML = '<span class="btn-icon"></span> Processing...';
    } else {
      processBtn.classList.remove('loading');
      processBtn.innerHTML = '<span class="btn-icon">⚡</span> Process Image';
    }
  }

  /**
   * Displays the original uploaded image on the preview canvas.
   */
  displayOriginalImage() {
    const originalCanvas = document.getElementById('originalCanvas');
    const ctx = originalCanvas.getContext('2d');
    originalCanvas.width = this.uploadedImage.width;
    originalCanvas.height = this.uploadedImage.height;
    ctx.drawImage(this.uploadedImage, 0, 0);
  }

  /**
   * Extracts pixel data from the uploaded image using a temporary canvas.
   * @returns {ImageData|null} The ImageData object or null on error.
   */
  getImageData() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    canvas.width = this.uploadedImage.width;
    canvas.height = this.uploadedImage.height;
    ctx.drawImage(this.uploadedImage, 0, 0);
    try {
      return ctx.getImageData(0, 0, canvas.width, canvas.height);
    } catch (e) {
      console.error("Could not get image data. The image might be from a different origin (CORS issue).", e);
      alert("Error: Cannot process this image due to browser security restrictions (CORS policy). Please try a different image or host it on the same domain.");
      return null;
    }
  }

  /**
   * Generates the halftone pattern for each color channel individually.
   * @param {Object.<string, number[]>} channelData - The separated channel data.
   * @param {object} config - The main processing configuration.
   */
  generateChannelHalftones(channelData, config) {
    const channelNames = Object.keys(channelData);

    channelNames.forEach(channel => {
      let canvas = document.getElementById(`${channel}Canvas`);
      if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = `${channel}Canvas`;
        canvas.style.display = 'none';
        document.body.appendChild(canvas);
      }

      const channelConfig = {
        ...config,
        angle: config.angles[channel] || 0,
        color: config.colors[channel]
      };

      const svg = this.patterns.generatePattern(
        config.patternType,
        channel,
        channelData[channel],
        this.uploadedImage.width,
        this.uploadedImage.height,
        channelConfig,
        canvas // Pass the canvas to the generator
      );
      this.exporter.storeSVG(channel, svg);
    });
  }

  /**
   * Renders the combined, multi-color halftone preview by overlaying the individual channel canvases.
   * @param {string[]} channelNames - The list of channel names to combine.
   * @param {Object.<string, string>} colors - A map of channel names to hex color codes.
   */
  generateCombinedPreview(channelNames, colors) {
    const canvas = document.getElementById('combinedCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = this.uploadedImage.width;
    canvas.height = this.uploadedImage.height;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'multiply';

    channelNames.forEach(channel => {
      const sourceCanvas = document.getElementById(`${channel}Canvas`);
      if (sourceCanvas) {
        ctx.drawImage(sourceCanvas, 0, 0);
      }
    });

    this.exporter.generateCombinedSVG(canvas.width, canvas.height, channelNames, colors);
  }

  /**
   * Gathers plotting statistics, logs them to the console, and displays them in the UI.
   * @param {string[]} channelNames - The list of channel names to get stats for.
   */
  logAndDisplayProcessingStats(channelNames) {
    let totalElements = 0;
    let totalEstimatedTime = 0;
    console.log('=== Processing Statistics ===');

    channelNames.forEach(channel => {
      const stats = this.exporter.getPlottingStats(channel);
      if (stats) {
        console.log(`${channel.toUpperCase()} Channel:`, stats);
        totalElements += stats.totalElements;
        const [minutes, seconds] = stats.estimatedPlotTime.split(':').map(Number);
        totalEstimatedTime += (minutes * 60) + seconds;
      }
    });

    const totalMinutes = Math.floor(totalEstimatedTime / 60);
    const remainingSeconds = Math.round(totalEstimatedTime % 60);
    const totalTimeStr = `${totalMinutes}:${remainingSeconds.toString().padStart(2, '0')}`;

    console.log('TOTALS:', { elements: totalElements, estimatedPlotTime: totalTimeStr });

    // Display these calculated stats in the UI
    const existingStats = document.querySelector('.processing-stats');
    if (existingStats) {
      existingStats.remove();
    }
    const statsDiv = document.createElement('div');
    statsDiv.className = 'processing-stats';
    statsDiv.innerHTML = `
      <h4>Processing Complete</h4>
      <div>
        <div>
          <div>${totalElements.toLocaleString()}</div>
          <div>Total Elements</div>
        </div>
        <div>
          <div>${totalTimeStr}</div>
          <div>Est. Plot Time</div>
        </div>
      </div>`;
    const previewHeader = document.querySelector('.preview-header');
    previewHeader.parentNode.insertBefore(statsDiv, previewHeader.nextSibling);
  }
}

// --- Global Functions for HTML `onclick` ---
function downloadSVG(channel) {
  window.halftoneApp?.exporter.downloadSVG(channel);
}

function downloadHPGL(channel) {
  window.halftoneApp?.exporter.downloadHPGL(channel);
}

function downloadAllChannels() {
  window.halftoneApp?.exporter.downloadAllChannels();
}


// --- App Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  window.halftoneApp = new HalftoneApp();
  console.log('Advanced Halftone Plotter Tool Initialized.');
});