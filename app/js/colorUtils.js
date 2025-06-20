/**
 * @file This file contains utility functions for color conversions,
 * specifically for converting from the screen-based RGB color model
 * to the print-based CMYK color model or other multi-tone separations.
 */

/**
 * Converts image data from RGB to CMYK color space.
 * This is a fundamental step for simulating print-style color separation.
 * @param {Uint8ClampedArray} data - The flat array of pixel data from a canvas, in [R,G,B,A, R,G,B,A, ...] format.
 * @param {number} width - The width of the image.
 * @param {number} height - The height of the image.
 * @param {number} [contrast=100] - A contrast adjustment factor (50-200). 100 means no change.
 * @returns {{c: number[], m: number[], y: number[], k: number[]}} An object containing four arrays,
 * one for each CMYK channel, with values normalized between 0 and 1.
 */
function rgbToCmyk(data, width, height, contrast = 100) {
  const c = [], m = [], y = [], k = [];
  const contrastFactor = contrast / 100.0;

  for (let i = 0; i < data.length; i += 4) {
    // Normalize RGB values to be between 0 and 1.
    let r = data[i] / 255;
    let g = data[i + 1] / 255;
    let b = data[i + 2] / 255;

    // Apply contrast adjustment.
    // This formula increases the distance from the midpoint (0.5).
    r = Math.max(0, Math.min(1, (r - 0.5) * contrastFactor + 0.5));
    g = Math.max(0, Math.min(1, (g - 0.5) * contrastFactor + 0.5));
    b = Math.max(0, Math.min(1, (b - 0.5) * contrastFactor + 0.5));

    // Basic conversion from RGB to CMYK.
    // K (Key/Black) is the darkest of the three RGB values, inverted.
    const k_val = 1 - Math.max(r, g, b);

    // C, M, and Y are calculated based on the remaining color after black has been removed.
    // The (1 - k_val) denominator prevents division by zero for pure black.
    const c_val = (k_val < 1) ? (1 - r - k_val) / (1 - k_val) : 0;
    const m_val = (k_val < 1) ? (1 - g - k_val) / (1 - k_val) : 0;
    const y_val = (k_val < 1) ? (1 - b - k_val) / (1 - k_val) : 0;

    // Push the clamped values to their respective channel arrays.
    c.push(Math.max(0, Math.min(1, c_val)));
    m.push(Math.max(0, Math.min(1, m_val)));
    y.push(Math.max(0, Math.min(1, y_val)));
    k.push(Math.max(0, Math.min(1, k_val)));
  }

  return { c, m, y, k };
}

/**
 * Converts image data from RGB to a single grayscale channel.
 * @param {Uint8ClampedArray} data - The flat array of pixel data [R,G,B,A,...].
 * @param {number} contrast - A contrast adjustment factor (50-200).
 * @returns {number[]} An array of intensity values (0-1), where 1 is dark.
 */
function rgbToGrayscale(data, contrast) {
  const gray = [];
  const contrastFactor = contrast / 100.0;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i] / 255;
    let g = data[i + 1] / 255;
    let b = data[i + 2] / 255;

    // Apply contrast
    r = Math.max(0, Math.min(1, (r - 0.5) * contrastFactor + 0.5));
    g = Math.max(0, Math.min(1, (g - 0.5) * contrastFactor + 0.5));
    b = Math.max(0, Math.min(1, (b - 0.5) * contrastFactor + 0.5));

    // Standard luminance calculation
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    // Invert luminance so that 1.0 is black and 0.0 is white.
    gray.push(1.0 - luminance);
  }
  return gray;
}

/**
 * Separates an image into 2 (duotone) or 3 (tritone) intensity channels based on luminance.
 * This allows for mapping shadows, midtones, and highlights to different colors.
 * @param {Uint8ClampedArray} data - The flat array of pixel data [R,G,B,A,...].
 * @param {number} numTones - The number of channels to create (2 or 3).
 * @param {number} contrast - A contrast adjustment factor (50-200).
 * @returns {Object.<string, number[]>} An object containing the separated tone channels, e.g., { tone1: [...], tone2: [...] }.
 */
function rgbToMultiTone(data, numTones, contrast) {
  const channels = {};
  for (let i = 1; i <= numTones; i++) {
    channels[`tone${i}`] = [];
  }

  const grayscale = rgbToGrayscale(data, contrast); // Note: rgbToGrayscale inverts luminance.

  for (let i = 0; i < grayscale.length; i++) {
    const intensity = grayscale[i]; // 0=white, 1=black

    if (numTones === 2) { // Duotone
      // Tone 1 for darks, Tone 2 for lights.
      channels.tone1.push(Math.sqrt(intensity));
      channels.tone2.push(1.0 - Math.sqrt(1.0 - intensity));
    } else if (numTones === 3) { // Tritone
      // Tone 1 for darks, Tone 2 for midtones, Tone 3 for lights
      const mid = Math.sin(intensity * Math.PI); // Peaks in the middle (intensity=0.5)
      channels.tone1.push(intensity);          // Strongest in darks
      channels.tone2.push(mid);                // Strongest in midtones
      channels.tone3.push(1.0 - intensity);    // Strongest in lights
    }
  }
  return channels;
}

/**
 * Converts a hex color string (e.g., "#FF0000") to an RGB object.
 * @param {string} hex - The hex color string. Can optionally start with '#'.
 * @returns {{r: number, g: number, b: number}|null} An object with r, g, b properties (0-255), or null if the hex string is invalid.
 */
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * Calculates the relative luminance of an RGB color.
 * This can be used to determine the perceived brightness of a color, for example,
 * to decide if text on a colored background should be black or white.
 * @param {number} r - The red component (0-255).
 * @param {number} g - The green component (0-255).
 * @param {number} b - The blue component (0-255).
 * @returns {number} The luminance value, from 0 (black) to 1 (white).
 */
function getLuminance(r, g, b) {
  // Formula from WCAG 2.0 for calculating relative luminance.
  const [rs, gs, bs] = [r, g, b].map(c => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}