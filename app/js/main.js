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

    this.initializeEventListeners();
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
    const controls = [
      { id: 'dotSize',    display: 'dotSizeValue',    suffix: 'px' },
      { id: 'spacing',    display: 'spacingValue',    suffix: 'px' },
      { id: 'lineAngle',  display: 'lineAngleValue',  suffix: '°' },
      { id: 'randomness', display: 'randomnessValue', suffix: '%' },
      { id: 'contrast',   display: 'contrastValue',   suffix: '%' }
    ];

    controls.forEach(control => {
      const element = document.getElementById(control.id);
      const display = document.getElementById(control.display);
      if (element && display) {
        element.addEventListener('input', (e) => {
          display.textContent = e.target.value + control.suffix;
        });
      }
    });

    const patternType = document.getElementById('patternType');
    if (patternType) {
      patternType.addEventListener('change', this.updateControlVisibility.bind(this));
      this.updateControlVisibility(); // Initial call to set correct state
    }
  }

  /**
   * Shows or hides certain controls based on the selected pattern type.
   * For example, 'Line Angle' is only relevant for line-based patterns.
   */
  updateControlVisibility() {
    const patternType = document.getElementById('patternType').value;
    const lineAngleGroup = document.getElementById('lineAngle').closest('.control-group');
    const randomnessGroup = document.getElementById('randomness').closest('.control-group');

    if (lineAngleGroup) {
      const isVisible = ['line', 'crosshatch', 'wave'].includes(patternType);
      lineAngleGroup.style.display = isVisible ? 'block' : 'none';
    }
    if (randomnessGroup) {
      const isVisible = ['stochastic', 'stipple', 'voronoi'].includes(patternType);
      randomnessGroup.style.display = isVisible ? 'block' : 'none';
    }

    this.showPatternTip(patternType);
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
    return {
      patternType: document.getElementById('patternType').value,
      dotSize: parseInt(document.getElementById('dotSize').value, 10),
      spacing: parseInt(document.getElementById('spacing').value, 10),
      lineAngle: parseInt(document.getElementById('lineAngle').value, 10),
      randomness: parseInt(document.getElementById('randomness').value, 10),
      contrast: parseInt(document.getElementById('contrast').value, 10),
      useAngleOffset: document.getElementById('angleOffset').checked,
      colors: {
        cyan: document.getElementById('cyanColor').value,
        magenta: document.getElementById('magentaColor').value,
        yellow: document.getElementById('yellowColor').value,
        black: document.getElementById('blackColor').value
      }
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

        const cmykData = rgbToCmyk(imageData.data, imageData.width, imageData.height, config.contrast);
        const angles = config.useAngleOffset ? this.patterns.getStandardAngles() : { cyan: 0, magenta: 0, yellow: 0, black: 0 };

        this.generateChannelHalftones(cmykData, angles, config);
        this.generateCombinedPreview();
        this.logAndDisplayProcessingStats();

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
   * Generates the halftone pattern for each CMYK channel individually.
   * @param {object} cmykData - The separated CMYK channel data.
   * @param {object} angles - The screen angles for each channel.
   * @param {object} config - The main processing configuration.
   */
  generateChannelHalftones(cmykData, angles, config) {
    const channels = ['cyan', 'magenta', 'yellow', 'black'];
    const channelDataMap = { cyan: cmykData.c, magenta: cmykData.m, yellow: cmykData.y, black: cmykData.k };

    channels.forEach(channel => {
      const channelConfig = { ...config, angle: angles[channel] || 0 };
      const svg = this.patterns.generatePattern(
        config.patternType,
        channel,
        channelDataMap[channel],
        this.uploadedImage.width,
        this.uploadedImage.height,
        channelConfig
      );
      this.exporter.storeSVG(channel, svg);
    });
  }

  /**
   * Renders the combined, multi-color halftone preview by overlaying the individual channel canvases.
   */
  generateCombinedPreview() {
    const canvas = document.getElementById('combinedCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = this.uploadedImage.width;
    canvas.height = this.uploadedImage.height;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'multiply';

    ['cyan', 'magenta', 'yellow', 'black'].forEach(channel => {
      const sourceCanvas = document.getElementById(`${channel}Canvas`);
      if (sourceCanvas) {
        ctx.drawImage(sourceCanvas, 0, 0);
      }
    });

    this.exporter.generateCombinedSVG(canvas.width, canvas.height);
  }

  /**
   * Gathers plotting statistics, logs them to the console, and displays them in the UI.
   */
  logAndDisplayProcessingStats() {
    const channels = ['cyan', 'magenta', 'yellow', 'black'];
    let totalElements = 0;
    let totalEstimatedTime = 0;
    console.log('=== Processing Statistics ===');

    channels.forEach(channel => {
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