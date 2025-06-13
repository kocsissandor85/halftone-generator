/**
 * Color conversion utilities
 */

/**
 * Convert RGB to CMYK
 * @param {Uint8ClampedArray} data - Image data array
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @param {number} contrast - Contrast adjustment (50-200, default 100)
 * @returns {Object} CMYK channels
 */
function rgbToCmyk(data, width, height, contrast = 100) {
  const c = [], m = [], y = [], k = [];
  const contrastFactor = contrast / 100;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i] / 255;
    let g = data[i + 1] / 255;
    let b = data[i + 2] / 255;

    // Apply contrast adjustment
    r = Math.max(0, Math.min(1, (r - 0.5) * contrastFactor + 0.5));
    g = Math.max(0, Math.min(1, (g - 0.5) * contrastFactor + 0.5));
    b = Math.max(0, Math.min(1, (b - 0.5) * contrastFactor + 0.5));

    const k_val = 1 - Math.max(r, g, b);
    const c_val = k_val < 1 ? (1 - r - k_val) / (1 - k_val) : 0;
    const m_val = k_val < 1 ? (1 - g - k_val) / (1 - k_val) : 0;
    const y_val = k_val < 1 ? (1 - b - k_val) / (1 - k_val) : 0;

    c.push(Math.max(0, Math.min(1, c_val)));
    m.push(Math.max(0, Math.min(1, m_val)));
    y.push(Math.max(0, Math.min(1, y_val)));
    k.push(Math.max(0, Math.min(1, k_val)));
  }

  return { c, m, y, k };
}

/**
 * Convert hex color to RGB
 * @param {string} hex - Hex color string
 * @returns {Object} RGB values
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
 * Get luminance of a color for visibility calculations
 * @param {number} r - Red component (0-255)
 * @param {number} g - Green component (0-255)
 * @param {number} b - Blue component (0-255)
 * @returns {number} Luminance value
 */
function getLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}