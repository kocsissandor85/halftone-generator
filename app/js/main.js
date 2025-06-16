/**
 * @file This is the main entry point for the Halftone Plotter application.
 * It initializes the application, handles user interactions, and orchestrates
 * the image processing pipeline.
 */

// NOTE: The worker needs direct access to these scripts, so they are not bundled here
// but loaded via `importScripts` in worker.js. We assume the classes are available
// in the global scope for the main thread as well.

/**
 * The main class for the Halftone application. It encapsulates all core
 * functionality, including UI event handling, state management, and coordinating
 * the different modules.
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
     * @type {Object<string, {imageBitmap: ImageBitmap}>}
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
    const resetBtn = document.getElementById('resetBtn');

    // --- File Upload Listeners ---
    uploadArea.addEventListener('click', () => fileInput.click());
    uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
    uploadArea.addEventListener('dragleave', this.handleDragLeave.bind(this));
    uploadArea.addEventListener('drop', this.handleDrop.bind(this));
    fileInput.addEventListener('change', this.handleFileSelect.bind(this));

    // --- Main Action Listeners ---
    processBtn.addEventListener('click', this.processImage.bind(this));
    resetBtn.addEventListener('click', this.resetApp.bind(this));

    // --- Worker Message Listener ---
    this.worker.onmessage = this.handleWorkerMessage.bind(this);
    this.worker.onerror = (e) => {
      console.error('Error from worker:', e);
      alert(`An error occurred in the processing worker: ${e.message}`);
      this.setProcessingState(false);
    };

    // --- Control Panel Listeners ---
    this.setupControlListeners();
    this.setupViewToggles();
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
        display.textContent = (control.fixed ? parseFloat(element.value).toFixed(control.fixed) : element.value) + control.suffix;
      }
    });

    const uiAffectingControls = ['patternType', 'colorMode', 'angleOffset', 'paperSize'];
    uiAffectingControls.forEach(id => {
      document.getElementById(id).addEventListener('change', this.updateUIForCurrentSettings.bind(this));
    });
    document.querySelectorAll('input[name="renderStyle"]').forEach(radio => {
      radio.addEventListener('change', this.updateUIForCurrentSettings.bind(this));
    });

    document.getElementById('paletteBtn').addEventListener('click', this.applyHarmoniousPalette.bind(this));
    document.getElementById('resetColorsBtn').addEventListener('click', this.resetDefaultColors.bind(this));
  }

  /**
   * Sets up listeners for the Result/Compare view toggle in the results panel.
   */
  setupViewToggles() {
    document.querySelectorAll('input[name="viewMode"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        const isCompare = e.target.value === 'compare';
        document.getElementById('resultView').classList.toggle('hidden', isCompare);
        document.getElementById('compareView').classList.toggle('hidden', !isCompare);
      });
    });
  }

  /**
   * Updates the visibility and content of UI elements based on current settings in the sidebar.
   */
  updateUIForCurrentSettings() {
    const patternType = document.getElementById('patternType').value;
    const colorMode = document.getElementById('colorMode').value;
    const renderStyle = document.querySelector('input[name="renderStyle"]:checked').value;
    const useStandardAngles = document.getElementById('angleOffset').checked;

    document.getElementById('lineAngle').closest('.control-group').style.display = ['line', 'crosshatch', 'wave'].includes(patternType) ? 'block' : 'none';
    document.getElementById('randomnessGroup').style.display = ['stochastic', 'stipple', 'voronoi'].includes(patternType) ? 'block' : 'none';

    document.getElementById('strokeWidthGroup').style.display = renderStyle === 'stroke' ? 'block' : 'none';

    const numChannels = { monochrome: 1, duotone: 2, tritone: 3, cmyk: 4 }[colorMode];
    const colorLabels = {
      monochrome: ['Key'], duotone: ['Tone 1 (Dark)', 'Tone 2 (Light)'],
      tritone: ['Shadows', 'Midtones', 'Highlights'], cmyk: ['Cyan', 'Magenta', 'Yellow', 'Black']
    };
    const uiChannelIds = ['cyan', 'magenta', 'yellow', 'black'];

    document.getElementById('color-card-title').textContent = `${colorMode.charAt(0).toUpperCase() + colorMode.slice(1)} Colors`;

    for (let i = 0; i < 4; i++) {
      const channelId = uiChannelIds[i];
      document.getElementById(`color-group-${channelId}`).style.display = i < numChannels ? 'block' : 'none';
      if (i < numChannels) {
        document.getElementById(`color-label-${channelId}`).textContent = colorLabels[colorMode][i];
      }
    }

    const customAnglesGroup = document.getElementById('customAnglesGroup');
    customAnglesGroup.classList.toggle('hidden', useStandardAngles);

    if (!useStandardAngles) {
      const angleLabels = {
        monochrome: ['Key Angle'], duotone: ['Tone 1 Angle', 'Tone 2 Angle'],
        tritone: ['Shadows Angle', 'Midtones Angle', 'Highlights Angle'], cmyk: ['Cyan Angle', 'Magenta Angle', 'Yellow Angle', 'Black Angle']
      };
      for (let i = 0; i < 4; i++) {
        const angleGroupId = `angle-group-${uiChannelIds[i]}`;
        const group = document.getElementById(angleGroupId);
        group.style.display = i < numChannels ? 'block' : 'none';
        if (i < numChannels) {
          document.getElementById(`angle-label-${uiChannelIds[i]}`).textContent = angleLabels[colorMode][i];
        }
      }
    }
  }

  /**
   * Applies a random harmonious palette to the color pickers and re-processes the image if one is loaded.
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
    if (this.uploadedImage) {
      this.processImage();
    }
  }

  /**
   * Resets the color pickers to the default CMYK values and re-processes if an image is loaded.
   */
  resetDefaultColors() {
    document.getElementById('cyanColor').value = '#00ffff';
    document.getElementById('magentaColor').value = '#ff00ff';
    document.getElementById('yellowColor').value = '#ffff00';
    document.getElementById('blackColor').value = '#000000';
    if (this.uploadedImage) {
      this.processImage();
    }
  }

  /**
   * Resets the entire application to its initial state, ready for a new image upload.
   */
  resetApp() {
    this.uploadedImage = null;
    this.workerResults = {};

    document.getElementById('resultsContainer').classList.add('hidden');
    document.getElementById('uploadContainer').classList.remove('hidden');
    document.getElementById('processBtn').disabled = true;

    // Clear the file input so the same file can be re-uploaded
    document.getElementById('fileInput').value = '';

    // Reset view toggle to default
    const resultViewRadio = document.querySelector('input[name="viewMode"][value="result"]');
    if(resultViewRadio) resultViewRadio.checked = true;
    document.getElementById('resultView').classList.remove('hidden');
    document.getElementById('compareView').classList.add('hidden');
  }

  // --- Drag and Drop and File Handlers ---
  handleDragOver(e) { e.preventDefault(); e.stopPropagation(); document.getElementById('uploadArea').classList.add('dragover'); }
  handleDragLeave(e) { e.preventDefault(); e.stopPropagation(); document.getElementById('uploadArea').classList.remove('dragover'); }
  handleDrop(e) {
    e.preventDefault(); e.stopPropagation();
    document.getElementById('uploadArea').classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) this.handleFile(e.dataTransfer.files[0]);
  }
  handleFileSelect(e) { if (e.target.files.length > 0) this.handleFile(e.target.files[0]); }

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
        document.getElementById('processBtn').disabled = false;
        document.getElementById('uploadContainer').classList.add('hidden');
        document.getElementById('resultsContainer').classList.remove('hidden');
        this.displayOriginalImage(); // Display original image for compare view
        this.autoAdjustSpacing();
        this.processImage(); // Automatically process the image on first upload
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
    let suggestedSpacing = 12;
    if (imageArea > 1000000) suggestedSpacing = 15;
    else if (imageArea < 400000) suggestedSpacing = 8;
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
      monochrome: ['key'], duotone: ['tone1', 'tone2'],
      tritone: ['shadows', 'midtones', 'highlights'], cmyk: ['cyan', 'magenta', 'yellow', 'black']
    }[colorMode];
    for (let i = 0; i < numChannels; i++) {
      const genericName = genericChannelNames[i];
      colors[genericName] = document.getElementById(`${uiChannelIds[i]}Color`).value;
      channelNames.push(genericName);
    }
    const useAngleOffset = document.getElementById('angleOffset').checked;
    let angles;
    if (useAngleOffset) {
      const standardAngles = { cyan: 15, magenta: 75, yellow: 0, black: 45 };
      const modeAngles = {
        monochrome: { key: 45 }, duotone: { tone1: 75, tone2: 15 },
        tritone: { shadows: 75, midtones: 15, highlights: 0 }, cmyk: standardAngles
      };
      angles = modeAngles[colorMode];
    } else {
      angles = {};
      const uiAngleIds = ['angleCyan', 'angleMagenta', 'angleYellow', 'angleBlack'];
      channelNames.forEach((name, i) => {
        angles[name] = parseInt(document.getElementById(uiAngleIds[i]).value, 10) || 0;
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
      colors: colors, channelNames: channelNames, angles: angles,
      paperSize: document.getElementById('paperSize').value,
    };
  }

  /**
   * The main orchestration method that delegates the heavy work to a Web Worker.
   */
  processImage() {
    if (!this.uploadedImage) {
      alert('Please upload an image first.');
      return;
    }
    const config = this.getProcessingConfig();
    this.setProcessingState(true);
    setTimeout(() => {
      const imageData = this.getImageData();
      if (!imageData) {
        this.setProcessingState(false);
        return;
      }
      this.workerResults = {};
      this.expectedWorkerResults = config.channelNames.length;
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
    this.exporter.storeSVG(channel, svg);
    this.workerResults[channel] = { imageBitmap };

    // Ensure a hidden canvas exists for this channel and draw the bitmap to it.
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
      const config = this.getProcessingConfig();
      this.generateCombinedPreview(config.channelNames, config.colors);
      this.setProcessingState(false);
    }
  }

  /**
   * Updates the UI to indicate whether the application is currently processing.
   * @param {boolean} isProcessing - True if processing has started, false if it has finished.
   */
  setProcessingState(isProcessing) {
    const processBtn = document.getElementById('processBtn');
    const loadingOverlay = document.getElementById('loadingOverlay');
    processBtn.disabled = isProcessing;
    loadingOverlay.classList.toggle('hidden', !isProcessing);

    // For styling purposes, you might want to add a class to the sidebar
    document.querySelector('.sidebar').classList.toggle('processing', isProcessing);

    if (isProcessing) {
      processBtn.classList.add('loading');
      processBtn.innerHTML = 'Processing...';
    } else {
      processBtn.classList.remove('loading');
      processBtn.innerHTML = '<span class="btn-icon">⚡</span> Process Image';
    }
  }

  /**
   * Displays the original uploaded image on the canvas used for comparison.
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
    const canvases = [
      document.getElementById('combinedCanvas'),
      document.getElementById('combinedCanvas-compare')
    ];
    canvases.forEach(canvas => {
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      canvas.width = this.uploadedImage.width;
      canvas.height = this.uploadedImage.height;
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'multiply';
      channelNames.forEach(channel => {
        const sourceCanvas = document.getElementById(`${channel}Canvas`);
        if (sourceCanvas) ctx.drawImage(sourceCanvas, 0, 0);
      });
      ctx.globalCompositeOperation = 'source-over'; // Reset composite mode
    });
    this.exporter.generateCombinedSVG(canvases[0].width, canvases[0].height, channelNames, colors);
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
});