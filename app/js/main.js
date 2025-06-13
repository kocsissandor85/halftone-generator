/**
 * Main application logic with advanced pattern support
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
      const showLineAngle = ['line', 'crosshatch', 'wave'].includes(patternType);
      lineAngleGroup.style.display = showLineAngle ? 'flex' : 'none';
    }

    if (randomnessGroup) {
      const showRandomness = ['stochastic', 'stipple', 'voronoi'].includes(patternType);
      randomnessGroup.style.display = showRandomness ? 'flex' : 'none';
    }

    // Add pattern-specific tips
    this.showPatternTips(patternType);
  }

  showPatternTips(patternType) {
    // Remove existing tips
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
      'fractal': 'Sierpinski triangle-like pattern. Spacing affects fractal density.',
      'flowfield': 'Dots follow image gradients. Creates painterly effects.'
    };

    if (tips[patternType]) {
      const tip = document.createElement('div');
      tip.className = 'pattern-tip';
      tip.style.cssText = `
        background: #e3f2fd;
        border: 1px solid #2196f3;
        border-radius: 4px;
        padding: 10px;
        margin: 10px 0;
        font-size: 14px;
        color: #1976d2;
      `;
      tip.textContent = `💡 ${tips[patternType]}`;

      const controlsSection = document.getElementById('controlsSection');
      const processBtn = document.getElementById('processBtn');
      controlsSection.insertBefore(tip, processBtn);
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

        // Auto-adjust spacing based on image size
        this.autoAdjustSpacing();
      };
      this.uploadedImage.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  autoAdjustSpacing() {
    const imageArea = this.uploadedImage.width * this.uploadedImage.height;
    const spacingElement = document.getElementById('spacing');
    const spacingDisplay = document.getElementById('spacingValue');

    // Suggest spacing based on image size
    let suggestedSpacing;
    if (imageArea > 1000000) { // Large images
      suggestedSpacing = 15;
    } else if (imageArea > 400000) { // Medium images
      suggestedSpacing = 12;
    } else { // Small images
      suggestedSpacing = 8;
    }

    spacingElement.value = suggestedSpacing;
    spacingDisplay.textContent = suggestedSpacing + 'px';
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

    // Show processing indicator
    this.showProcessingIndicator();

    // Small delay to allow UI update
    setTimeout(() => {
      try {
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

        this.hideProcessingIndicator();
      } catch (error) {
        console.error('Processing error:', error);
        alert('Error processing image. Please try different settings.');
        this.hideProcessingIndicator();
      }
    }, 100);
  }

  showProcessingIndicator() {
    const processBtn = document.getElementById('processBtn');
    processBtn.disabled = true;
    processBtn.textContent = 'Processing...';
    processBtn.style.background = '#ccc';
  }

  hideProcessingIndicator() {
    const processBtn = document.getElementById('processBtn');
    processBtn.disabled = false;
    processBtn.textContent = 'Process Image';
    processBtn.style.background = '#2196F3';
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

      try {
        const svg = this.patterns.generatePattern(
          config.patternType,
          channel,
          channelData[channel],
          this.uploadedImage.width,
          this.uploadedImage.height,
          channelConfig
        );

        this.exporter.storeSVG(channel, svg);
      } catch (error) {
        console.error(`Error generating ${channel} channel:`, error);
      }
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
    let totalElements = 0;
    let totalEstimatedTime = 0;

    console.log('=== Processing Statistics ===');

    channels.forEach(channel => {
      const stats = this.exporter.getPlottingStats(channel);
      if (stats) {
        console.log(`${channel.toUpperCase()} Channel:`, {
          circles: stats.circles,
          lines: stats.lines,
          polygons: stats.polygons,
          rectangles: stats.rectangles,
          total: stats.totalElements,
          estimatedTime: stats.estimatedPlotTime
        });

        totalElements += stats.totalElements;
        // Convert time string to seconds for total calculation
        const [minutes, seconds] = stats.estimatedPlotTime.split(':');
        totalEstimatedTime += parseInt(minutes) * 60 + parseInt(seconds);
      }
    });

    const totalMinutes = Math.floor(totalEstimatedTime / 60);
    const remainingSeconds = totalEstimatedTime % 60;

    console.log('TOTALS:', {
      elements: totalElements,
      estimatedPlotTime: `${totalMinutes}:${remainingSeconds.toString().padStart(2, '0')}`
    });

    // Show stats in UI
    this.displayProcessingStats(totalElements, `${totalMinutes}:${remainingSeconds.toString().padStart(2, '0')}`);
  }

  displayProcessingStats(totalElements, totalTime) {
    // Remove existing stats
    const existingStats = document.querySelector('.processing-stats');
    if (existingStats) {
      existingStats.remove();
    }

    const statsDiv = document.createElement('div');
    statsDiv.className = 'processing-stats';
    statsDiv.style.cssText = `
      background: #f5f5f5;
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 15px;
      margin: 20px 0;
      text-align: center;
      font-family: monospace;
    `;

    statsDiv.innerHTML = `
      <h4 style="margin: 0 0 10px 0; color: #333;">Processing Complete</h4>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; text-align: center;">
        <div>
          <div style="font-size: 24px; font-weight: bold; color: #2196F3;">${totalElements.toLocaleString()}</div>
          <div style="color: #666;">Total Elements</div>
        </div>
        <div>
          <div style="font-size: 24px; font-weight: bold; color: #4CAF50;">${totalTime}</div>
          <div style="color: #666;">Est. Plot Time</div>
        </div>
      </div>
    `;

    const previewSection = document.getElementById('previewSection');
    previewSection.insertBefore(statsDiv, previewSection.firstChild);
  }

  // Advanced pattern configuration methods
  getPatternSpecificConfig(patternType, baseConfig) {
    const configs = {
      'voronoi': {
        ...baseConfig,
        // Voronoi works better with slightly larger spacing
        spacing: Math.max(baseConfig.spacing, 10)
      },
      'concentric': {
        ...baseConfig,
        // Concentric patterns need more space between centers
        spacing: baseConfig.spacing * 1.2
      },
      'spiral': {
        ...baseConfig,
        // Spirals work best with medium spacing
        spacing: Math.min(Math.max(baseConfig.spacing, 8), 16)
      },
      'hexagonal': {
        ...baseConfig,
        // Hexagonal packing is naturally efficient
        spacing: baseConfig.spacing * 0.9
      },
      'wave': {
        ...baseConfig,
        // Wave patterns benefit from consistent spacing
        spacing: baseConfig.spacing
      },
      'fractal': {
        ...baseConfig,
        // Fractals need fine spacing for detail
        spacing: Math.max(baseConfig.spacing * 0.8, 6)
      },
      'flowfield': {
        ...baseConfig,
        // Flow fields work better with medium spacing
        spacing: Math.min(Math.max(baseConfig.spacing, 10), 20)
      }
    };

    return configs[patternType] || baseConfig;
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

// Global function for downloading all channels
function downloadAllChannels() {
  if (window.halftoneApp && window.halftoneApp.exporter) {
    window.halftoneApp.exporter.downloadAllChannels();
  }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.halftoneApp = new HalftoneApp();
  console.log('Advanced Halftone Plotter Tool with Advanced Patterns initialized');
  console.log('Available patterns:', [
    'circle', 'square', 'diamond', 'line', 'crosshatch', 'stochastic', 'stipple',
    'voronoi', 'concentric', 'spiral', 'hexagonal', 'wave', 'fractal', 'flowfield'
  ]);
});