/**
 * Main application logic
 */

class HalftoneApp {
  constructor() {
    this.uploadedImage = null;
    this.patterns = new HalftonePatterns();
    this.exporter = new SVGExporter();
    this.initializeEventListeners();
  }

  initializeEventListeners() {
    // File upload handlers
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const processBtn = document.getElementById('processBtn');

    uploadArea.addEventListener('click', () => fileInput.click());
    uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
    uploadArea.addEventListener('dragleave', this.handleDragLeave.bind(this));
    uploadArea.addEventListener('drop', this.handleDrop.bind(this));
    fileInput.addEventListener('change', this.handleFileSelect.bind(this));
    processBtn.addEventListener('click', this.processImage.bind(this));

    // Control handlers
    this.setupControlListeners();
  }

  setupControlListeners() {
    const controls = [
      { id: 'dotSize', display: 'dotSizeValue', suffix: 'px' },
      { id: 'spacing', display: 'spacingValue', suffix: 'px' },
      { id: 'lineAngle', display: 'lineAngleValue', suffix: '°' },
      { id: 'randomness', display: 'randomnessValue', suffix: '%' },
      { id: 'contrast', display: 'contrastValue', suffix: '%' }
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

    // Pattern type change handler
    const patternType = document.getElementById('patternType');
    if (patternType) {
      patternType.addEventListener('change', this.updateControlVisibility.bind(this));
      this.updateControlVisibility(); // Initial call
    }
  }

  updateControlVisibility() {
    const patternType = document.getElementById('patternType').value;
    const lineAngleGroup = document.getElementById('lineAngle').closest('.control-group');
    const randomnessGroup = document.getElementById('randomness').closest('.control-group');

    // Show/hide controls based on pattern type
    if (lineAngleGroup) {
      lineAngleGroup.style.display =
        (patternType === 'line' || patternType === 'crosshatch') ? 'flex' : 'none';
    }

    if (randomnessGroup) {
      randomnessGroup.style.display =
        (patternType === 'stochastic' || patternType === 'stipple') ? 'flex' : 'none';
    }
  }

  handleDragOver(e) {
    e.preventDefault();
    document.getElementById('uploadArea').classList.add('dragover');
  }

  handleDragLeave() {
    document.getElementById('uploadArea').classList.remove('dragover');
  }

  handleDrop(e) {
    e.preventDefault();
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

  handleFile(file) {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (JPG, PNG, GIF)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      this.uploadedImage = new Image();
      this.uploadedImage.onload = () => {
        document.getElementById('controlsSection').classList.remove('hidden');
        document.getElementById('uploadArea').innerHTML =
          `<img src="${e.target.result}" style="max-width: 100%; max-height: 200px; border-radius: 4px;">`;
        console.log(`Image loaded: ${this.uploadedImage.width}x${this.uploadedImage.height}`);
      };
      this.uploadedImage.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  getProcessingConfig() {
    return {
      patternType: document.getElementById('patternType').value,
      dotSize: parseInt(document.getElementById('dotSize').value),
      spacing: parseInt(document.getElementById('spacing').value),
      lineAngle: parseInt(document.getElementById('lineAngle').value),
      randomness: parseInt(document.getElementById('randomness').value),
      contrast: parseInt(document.getElementById('contrast').value),
      useAngleOffset: document.getElementById('angleOffset').checked,
      colors: {
        cyan: document.getElementById('cyanColor').value,
        magenta: document.getElementById('magentaColor').value,
        yellow: document.getElementById('yellowColor').value,
        black: document.getElementById('blackColor').value
      }
    };
  }

  processImage() {
    if (!this.uploadedImage) {
      alert('Please upload an image first');
      return;
    }

    const config = this.getProcessingConfig();
    console.log('Processing with config:', config);

    // Show preview section
    document.getElementById('previewSection').classList.remove('hidden');

    // Display original image
    this.displayOriginalImage();

    // Get image data
    const imageData = this.getImageData();
    if (!imageData) return;

    // Convert to CMYK
    const cmykData = rgbToCmyk(
      imageData.data,
      this.uploadedImage.width,
      this.uploadedImage.height,
      config.contrast
    );

    // Define screen angles
    const angles = config.useAngleOffset ?
      this.patterns.getStandardAngles() :
      { cyan: 0, magenta: 0, yellow: 0, black: 0 };

    // Generate halftones for each channel
    this.generateChannelHalftones(cmykData, angles, config);

    // Generate combined preview
    this.generateCombinedPreview();

    // Log processing stats
    this.logProcessingStats();
  }

  displayOriginalImage() {
    const originalCanvas = document.getElementById('originalCanvas');
    const ctx = originalCanvas.getContext('2d');
    originalCanvas.width = this.uploadedImage.width;
    originalCanvas.height = this.uploadedImage.height;
    ctx.drawImage(this.uploadedImage, 0, 0);
  }

  getImageData() {
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = this.uploadedImage.width;
    tempCanvas.height = this.uploadedImage.height;
    tempCtx.drawImage(this.uploadedImage, 0, 0);

    try {
      return tempCtx.getImageData(0, 0, this.uploadedImage.width, this.uploadedImage.height);
    } catch (error) {
      console.error('Error getting image data:', error);
      alert('Error processing image. Please try a different image.');
      return null;
    }
  }

  generateChannelHalftones(cmykData, angles, config) {
    const channels = ['cyan', 'magenta', 'yellow', 'black'];
    const channelData = { cyan: cmykData.c, magenta: cmykData.m, yellow: cmykData.y, black: cmykData.k };

    channels.forEach(channel => {
      const channelConfig = {
        ...config,
        angle: angles[channel] || 0
      };

      const svg = this.patterns.generatePattern(
        config.patternType,
        channel,
        channelData[channel],
        this.uploadedImage.width,
        this.uploadedImage.height,
        channelConfig
      );

      this.exporter.storeSVG(channel, svg);
    });
  }

  generateCombinedPreview() {
    const canvas = document.getElementById('combinedCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = this.uploadedImage.width;
    canvas.height = this.uploadedImage.height;

    // Clear with white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Set composite operation for color mixing
    ctx.globalCompositeOperation = 'multiply';

    // Draw each channel
    const channels = ['cyan', 'magenta', 'yellow', 'black'];
    channels.forEach(channel => {
      const sourceCanvas = document.getElementById(channel + 'Canvas');
      if (sourceCanvas) {
        ctx.drawImage(sourceCanvas, 0, 0);
      }
    });

    // Generate combined SVG
    const combinedSVG = this.exporter.generateCombinedSVG(
      this.uploadedImage.width,
      this.uploadedImage.height
    );
  }

  logProcessingStats() {
    const channels = ['cyan', 'magenta', 'yellow', 'black'];
    channels.forEach(channel => {
      const stats = this.exporter.getPlottingStats(channel);
      if (stats) {
        console.log(`${channel.toUpperCase()} Channel Stats:`, stats);
      }
    });
  }
}

// Global function for download buttons (called from HTML)
function downloadSVG(channel) {
  if (window.halftoneApp && window.halftoneApp.exporter) {
    window.halftoneApp.exporter.downloadSVG(channel);
  }
}

// Global function for HPGL download
function downloadHPGL(channel) {
  if (window.halftoneApp && window.halftoneApp.exporter) {
    window.halftoneApp.exporter.downloadHPGL(channel);
  }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.halftoneApp = new HalftoneApp();
  console.log('Advanced Halftone Plotter Tool initialized');
});