/**
 * @file Web Worker for off-thread halftone pattern generation.
 * This worker handles the CPU-intensive tasks of color separation and
 * pattern rendering to prevent the main UI thread from freezing.
 */

// Import necessary scripts for processing.
// The order is important: advancedPatterns must be available for halftonePatterns.
importScripts('colorUtils.js', 'advancedPatterns.js', 'halftonePatterns.js');

/**
 * The main instance of the pattern generator class.
 * This is instantiated once when the worker loads.
 * @type {HalftonePatterns}
 */
const patterns = new HalftonePatterns();

/**
 * Handles incoming messages from the main thread.
 * This is the entry point for starting a processing job.
 * @param {MessageEvent} e - The event object containing the data.
 * @param {object} e.data - The data sent from the main thread.
 * @param {object} e.data.config - The processing configuration.
 * @param {ImageData} e.data.imageData - The image pixel data to process.
 */
onmessage = function(e) {
  const { config, imageData } = e.data;
  const { width, height } = imageData;

  // 1. Perform color separation based on the selected mode
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
      const cmyk = rgbToCmyk(imageData.data, width, height, config.contrast);
      channelData = { cyan: cmyk.c, magenta: cmyk.m, yellow: cmyk.y, black: cmyk.k };
      break;
  }

  // 2. Generate the halftone pattern for each channel
  config.channelNames.forEach(channel => {
    // Use OffscreenCanvas for rendering without a DOM element
    const offscreenCanvas = new OffscreenCanvas(width, height);

    const channelConfig = {
      ...config,
      angle: config.angles[channel] || 0,
      color: config.colors[channel]
    };

    // Generate the pattern, which returns SVG and draws to the offscreen canvas
    const svg = patterns.generatePattern(
      config.patternType,
      channel,
      channelData[channel],
      width,
      height,
      channelConfig,
      offscreenCanvas // Pass the offscreen canvas instead of a DOM canvas
    );

    // 3. Convert the rendered canvas to an ImageBitmap for efficient transfer
    const imageBitmap = offscreenCanvas.transferToImageBitmap();

    // 4. Post the results for this channel back to the main thread
    // The ImageBitmap is transferred, not copied, which is very fast.
    postMessage({
      channel: channel,
      svg: svg,
      imageBitmap: imageBitmap
    }, [imageBitmap]);
  });
};