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
     * Instance of the SVGExporter class for handling file exports.
     * @type {SVGExporter}
     */
    this.exporter = new SVGExporter();

    /**
     * Instance of the ColorManager class for generating harmonious palettes.
     * @type {ColorManager}
     */
    this.colorManager = ColorManager;

    /**
     * The Web Worker for off-thread processing.
     * @type {Worker}
     */
    this.worker = new Worker('js/worker.js');

    /**
     * A store for results coming back from the worker.
     * @type {Object}
     */
    this.workerResults = {};

    /**
     * The number of results expected from the worker for the current job.
     * @type {number}
     */
    this.expectedWorkerResults = 0;


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

    // --- Worker Message Listener ---
    this.worker.onmessage = this.handleWorkerMessage.bind(this);
    this.worker.onerror = (e) => {
      console.error('Error from worker:', e);
      alert(`An error occurred in the processing worker: ${e.message}`);
      this.setProcessingState(false);
    };

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
    const uiAffectingControls = ['patternType', 'colorMode', 'angleOffset', 'paperSize'];
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
    const paperSize = document.getElementById('paperSize').value;

    // 1. Update pattern-specific controls
    const lineAngleGroup = document.getElementById('lineAngle').closest('.control-group');
    const randomnessGroup = document.getElementById('randomness').closest('.control-group');
    if (lineAngleGroup) lineAngleGroup.style.display = ['line', 'crosshatch', 'wave'].includes(patternType) ? 'block' : 'none';
    if (randomnessGroup) randomnessGroup.style.display = ['stochastic', 'stipple', 'voronoi'].includes(patternType) ? 'block' : 'none';
    this.showPatternTip(patternType, paperSize);

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
   * @param {string} paperSize - The value of the selected paper size.
   */
  showPatternTip(patternType, paperSize) {
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
      'flowfield': 'Dots follow image gradients, creating painterly, flowing effects.',
      'paper': 'Paper size setting only affects downloaded files (SVG/HPGL), not the on-screen preview.'
    };

    let tipText = tips[patternType];
    if (!tipText && paperSize && paperSize !== 'image') {
      tipText = tips['paper'];
    }

    if (tipText) {
      const tip = document.createElement('div');
      tip.className = 'pattern-tip';
      tip.textContent = `💡 ${tipText}`;

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
      // We no longer have a patterns instance here, but we can hardcode the standard angles.
      const standardAngles = { cyan: 15, magenta: 75, yellow: 0, black: 45 };
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
      angles: angles,
      paperSize: document.getElementById('paperSize').value,
    };
  }

  /**
   * The main orchestration method that is triggered when the "Process Image" button is clicked.
   * This now delegates the heavy work to a Web Worker.
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
      document.getElementById('previewSection').classList.remove('hidden');
      this.displayOriginalImage();
      const imageData = this.getImageData();
      if (!imageData) {
        this.setProcessingState(false);
        return;
      }

      // Reset worker state for new job
      this.workerResults = {};
      this.expectedWorkerResults = config.channelNames.length;

      // Post the image data and config to the worker.
      // The image data is copied, which is fine for this operation.
      this.worker.postMessage({ config, imageData });

    }, 100);
  }

  /**
   * Handles messages received from the processing worker.
   * @param {MessageEvent} e - The event from the worker.
   * @param {object} e.data - The data payload.
   * @param {string} e.data.channel - The name of the processed channel.
   * @param {string} e.data.svg - The generated SVG string for the channel.
   * @param {ImageBitmap} e.data.imageBitmap - The rendered canvas bitmap for the channel.
   */
  handleWorkerMessage(e) {
    const { channel, svg, imageBitmap } = e.data;

    // Store results
    this.exporter.storeSVG(channel, svg);
    this.workerResults[channel] = { imageBitmap };

    // Ensure a hidden canvas exists for this channel and draw the bitmap to it.
    // This is necessary for the combined preview.
    let canvas = document.getElementById(`${channel}Canvas`);
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = `${channel}Canvas`;
      canvas.style.display = 'none';
      document.body.appendChild(canvas);
    }
    canvas.width = imageBitmap.width;
    canvas.height = imageBitmap.height;
    canvas.getContext('2d').drawImage(imageBitmap, 0, 0);

    // Check if all channels have been processed
    if (Object.keys(this.workerResults).length === this.expectedWorkerResults) {
      const config = this.getProcessingConfig(); // Get latest config for preview
      this.generateCombinedPreview(config.channelNames, config.colors);
      this.logAndDisplayProcessingStats(config.channelNames);
      this.setProcessingState(false);
    }
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

  /**
   * Public method to trigger SVG download.
   * @param {string} channel - The channel name to download.
   */
  downloadSVG(channel) {
    const config = this.getProcessingConfig();
    this.exporter.downloadSVG(channel, config);
  }

  /**
   * Public method to trigger HPGL download.
   * @param {string} channel - The channel name to download.
   */
  downloadHPGL(channel) {
    const config = this.getProcessingConfig();
    this.exporter.downloadHPGL(channel, config);
  }

  /**
   * Public method to trigger download of all channels.
   */
  downloadAllChannels() {
    const config = this.getProcessingConfig();
    this.exporter.downloadAllChannels(config);
  }
}

// --- App Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  window.halftoneApp = new HalftoneApp();
  console.log('Advanced Halftone Plotter Tool Initialized.');
});