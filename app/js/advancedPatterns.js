/**
 * @file Contains advanced pattern generators for creating sophisticated halftone effects.
 * This module provides the logic for complex, non-standard patterns like Voronoi, Flow Fields, and more.
 */

/**
 * A class for generating advanced, non-traditional halftone patterns.
 * This includes generative patterns that often rely on randomness or complex geometric calculations.
 */
class AdvancedPatterns {
  /**
   * Initializes the AdvancedPatterns class and sets up a seeded random number generator
   * for deterministic "randomness", ensuring patterns are reproducible.
   */
  constructor() {
    /**
     * A seeded random number generator function.
     * @type {() => number}
     */
    this.seedRandom = this.createSeededRandom(12345);
  }

  /**
   * Creates a seeded random number generator function.
   * Using a seed ensures that the sequence of "random" numbers is the same every time,
   * which is crucial for reproducible generative art.
   * @param {number} seed - The initial seed for the random number generator.
   * @returns {() => number} A function that returns a new pseudo-random number between 0 and 1 on each call.
   */
  createSeededRandom(seed) {
    return function() {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
  }

  /**
   * Generates a Voronoi cell pattern. The pattern consists of irregular, organic-looking cells
   * where the size and shape are influenced by image intensity.
   * This implementation correctly supports grid rotation.
   * @param {CanvasRenderingContext2D} ctx - The canvas rendering context to draw on.
   * @param {number[]} values - An array of intensity values (0-1) for each pixel.
   * @param {number} width - The width of the canvas.
   * @param {number} height - The height of the canvas.
   * @param {object} config - Configuration object.
   * @param {number} config.dotSize - The base size of the pattern elements.
   * @param {number} config.spacing - The spacing between pattern grid points.
   * @param {number} config.angle - The rotation angle of the underlying grid.
   * @param {string} config.renderStyle - The rendering style ('fill' or 'stroke').
   * @param {number} config.strokeWidth - The width of strokes if renderStyle is 'stroke'.
   * @returns {string} An SVG string containing the generated polygon elements.
   */
  generateVoronoiPattern(ctx, values, width, height, config) {
    const { dotSize, spacing, angle, renderStyle, strokeWidth } = config;
    let svg = '';

    const angleRad = (angle * Math.PI) / 180;
    const cosA = Math.cos(angleRad);
    const sinA = Math.sin(angleRad);
    const diagonal = Math.sqrt(width * width + height * height);

    // Generate seed points on a rotated grid
    const points = [];
    const gridSpacing = spacing * 1.5;
    for (let yGrid = -diagonal / 2; yGrid < diagonal / 2; yGrid += gridSpacing) {
      for (let xGrid = -diagonal / 2; xGrid < diagonal / 2; xGrid += gridSpacing) {
        const jitterX = (this.seedRandom() - 0.5) * spacing * 0.5;
        const jitterY = (this.seedRandom() - 0.5) * spacing * 0.5;

        const rotX = (xGrid + jitterX) * cosA - (yGrid + jitterY) * sinA + width / 2;
        const rotY = (xGrid + jitterX) * sinA + (yGrid + jitterY) * cosA + height / 2;
        points.push({ x: rotX, y: rotY });
      }
    }

    // For each point, create a polygonal cell based on local intensity
    points.forEach(point => {
      if (point.x >= 0 && point.x < width && point.y >= 0 && point.y < height) {
        const pixelX = Math.floor(point.x);
        const pixelY = Math.floor(point.y);
        const idx = pixelY * width + pixelX;
        const intensity = values[idx] || 0;

        if (intensity > 0.05) {
          const numSides = 6;
          const baseRadius = dotSize * intensity;
          let points_str = '';

          // Create a distorted polygon shape
          const pointCoords = [];
          for (let i = 0; i < numSides; i++) {
            const angle = (i / numSides) * Math.PI * 2;
            const radiusVariation = 0.7 + this.seedRandom() * 0.6;
            const radius = baseRadius * radiusVariation;
            const x = point.x + Math.cos(angle) * radius;
            const y = point.y + Math.sin(angle) * radius;
            pointCoords.push({x, y});
            points_str += `${x.toFixed(2)},${y.toFixed(2)} `;
          }

          // Draw the polygon on the canvas
          ctx.beginPath();
          ctx.moveTo(pointCoords[0].x, pointCoords[0].y);
          for (let i = 1; i < pointCoords.length; i++) {
            ctx.lineTo(pointCoords[i].x, pointCoords[i].y);
          }
          ctx.closePath();

          if (renderStyle === 'stroke') {
            ctx.lineWidth = strokeWidth;
            ctx.stroke();
            svg += `<polygon points="${points_str.trim()}" fill="none" stroke="currentColor" stroke-width="${strokeWidth.toFixed(2)}"/>`;
          } else {
            ctx.fill();
            svg += `<polygon points="${points_str.trim()}"/>`;
          }
        }
      }
    });

    return svg;
  }

  /**
   * Draws a set of concentric circles at a given coordinate.
   * The number of rings and max radius are determined by image intensity.
   * @param {CanvasRenderingContext2D} ctx - The canvas rendering context to draw on.
   * @param {number} x - The center x-coordinate.
   * @param {number} y - The center y-coordinate.
   * @param {number} intensity - The local image intensity (0-1).
   * @param {object} config - Configuration object.
   * @param {number} config.dotSize - The base size for calculating max radius.
   * @param {string} config.renderStyle - The rendering style ('fill' or 'stroke').
   * @param {number} config.strokeWidth - The width of strokes.
   * @returns {string} An SVG string containing the generated circle elements.
   */
  drawConcentric(ctx, x, y, intensity, config) {
    const { dotSize, renderStyle, strokeWidth } = config;
    let svg = '';
    if (intensity > 0.1) {
      const maxRadius = dotSize * intensity;
      const numRings = Math.floor(intensity * 4) + 1;
      const calculatedStrokeWidth = Math.max(0.5, maxRadius / numRings * 0.3);
      const finalStrokeWidth = renderStyle === 'stroke' ? strokeWidth : calculatedStrokeWidth;
      ctx.lineWidth = finalStrokeWidth;

      for (let ring = 0; ring < numRings; ring++) {
        const radius = (maxRadius / numRings) * (ring + 1);
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.stroke();
        svg += `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${radius.toFixed(2)}" fill="none" stroke="currentColor" stroke-width="${finalStrokeWidth.toFixed(2)}"/>`;
      }
    }
    return svg;
  }

  /**
   * Draws a spiral at a given coordinate.
   * The tightness and size of the spiral are determined by image intensity.
   * @param {CanvasRenderingContext2D} ctx - The canvas rendering context to draw on.
   * @param {number} x - The center x-coordinate.
   * @param {number} y - The center y-coordinate.
   * @param {number} intensity - The local image intensity (0-1).
   * @param {object} config - Configuration object.
   * @param {number} config.dotSize - The base size for calculating max radius.
   * @param {string} config.renderStyle - The rendering style ('fill' or 'stroke').
   * @param {number} config.strokeWidth - The width of strokes.
   * @returns {string} An SVG string containing the generated path element.
   */
  drawSpiral(ctx, x, y, intensity, config) {
    const { dotSize, renderStyle, strokeWidth } = config;
    if (intensity > 0.1) {
      const maxRadius = dotSize * intensity;
      const turns = intensity * 3 + 1;
      const points = Math.floor(turns * 20);
      let pathData = '';

      ctx.beginPath();
      for (let i = 0; i <= points; i++) {
        const t = i / points;
        const angle = t * turns * Math.PI * 2;
        const radius = t * maxRadius;
        const spiralX = x + Math.cos(angle) * radius;
        const spiralY = y + Math.sin(angle) * radius;
        if (i === 0) {
          pathData += `M${spiralX.toFixed(2)},${spiralY.toFixed(2)}`;
          ctx.moveTo(spiralX, spiralY);
        } else {
          pathData += `L${spiralX.toFixed(2)},${spiralY.toFixed(2)}`;
          ctx.lineTo(spiralX, spiralY);
        }
      }

      const calculatedLineWidth = Math.max(1, intensity * 2);
      const finalLineWidth = renderStyle === 'stroke' ? strokeWidth : calculatedLineWidth;
      ctx.lineWidth = finalLineWidth;
      ctx.stroke();
      return `<path d="${pathData}" fill="none" stroke="currentColor" stroke-width="${finalLineWidth.toFixed(2)}"/>`;
    }
    return '';
  }

  /**
   * Draws a hexagon at a given coordinate.
   * The size of the hexagon is determined by image intensity.
   * @param {CanvasRenderingContext2D} ctx - The canvas rendering context to draw on.
   * @param {number} x - The center x-coordinate.
   * @param {number} y - The center y-coordinate.
   * @param {number} intensity - The local image intensity (0-1).
   * @param {object} config - Configuration object.
   * @param {number} config.dotSize - The base size for calculating hexagon size.
   * @param {string} config.renderStyle - The rendering style ('fill' or 'stroke').
   * @param {number} config.strokeWidth - The width of strokes.
   * @returns {string} An SVG string containing the generated polygon element.
   */
  drawHexagon(ctx, x, y, intensity, config) {
    const { dotSize, renderStyle, strokeWidth } = config;
    if (intensity > 0.05) {
      const hexSize = dotSize * intensity;
      let hexPoints = '';

      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const hx = x + Math.cos(angle) * hexSize;
        const hy = y + Math.sin(angle) * hexSize;
        hexPoints += `${hx.toFixed(2)},${hy.toFixed(2)} `;
        if (i === 0) {
          ctx.moveTo(hx, hy);
        } else {
          ctx.lineTo(hx, hy);
        }
      }
      ctx.closePath();

      if (renderStyle === 'stroke') {
        ctx.lineWidth = strokeWidth;
        ctx.stroke();
        return `<polygon points="${hexPoints.trim()}" fill="none" stroke="currentColor" stroke-width="${strokeWidth.toFixed(2)}"/>`;
      } else {
        ctx.fill();
        return `<polygon points="${hexPoints.trim()}"/>`;
      }
    }
    return '';
  }

  /**
   * Draws a dot displaced by a sine wave.
   * The displacement creates a flowing, wavy pattern across the image.
   * @param {CanvasRenderingContext2D} ctx - The canvas rendering context to draw on.
   * @param {number} x - The original x-coordinate.
   * @param {number} y - The original y-coordinate.
   * @param {number} intensity - The local image intensity (0-1).
   * @param {object} config - Configuration object.
   * @param {number} config.dotSize - The base size of the dot.
   * @param {number} config.lineAngle - The angle that determines the wave direction.
   * @param {number} config.spacing - The spacing that determines the wave length.
   * @param {string} config.renderStyle - The rendering style ('fill' or 'stroke').
   * @param {number} config.strokeWidth - The width of strokes.
   * @returns {string} An SVG string containing the generated circle element.
   */
  drawWave(ctx, x, y, intensity, config) {
    const { dotSize, lineAngle, spacing, renderStyle, strokeWidth } = config;
    if (intensity > 0.1) {
      const waveLength = spacing * 4;
      const angleRad = (lineAngle || 0) * Math.PI / 180;
      const wavePhase = (x * Math.cos(angleRad) - y * Math.sin(angleRad)) / waveLength * Math.PI * 2;

      const amplitude = dotSize * intensity;
      const displacement = Math.sin(wavePhase) * amplitude;
      const dispX = x + displacement * Math.sin(angleRad);
      const dispY = y + displacement * Math.cos(angleRad);
      const dotRadius = Math.max(1, dotSize * intensity * 0.3);

      ctx.beginPath();
      ctx.arc(dispX, dispY, dotRadius, 0, Math.PI * 2);

      if (renderStyle === 'stroke') {
        ctx.lineWidth = strokeWidth;
        ctx.stroke();
        return `<circle cx="${dispX.toFixed(2)}" cy="${dispY.toFixed(2)}" r="${dotRadius.toFixed(2)}" fill="none" stroke="currentColor" stroke-width="${strokeWidth.toFixed(2)}"/>`;
      } else {
        ctx.fill();
        return `<circle cx="${dispX.toFixed(2)}" cy="${dispY.toFixed(2)}" r="${dotRadius.toFixed(2)}"/>`;
      }
    }
    return '';
  }

  /**
   * Draws a short line segment oriented along the image's intensity gradient.
   * This creates a "flow field" or "vector field" effect.
   * @param {CanvasRenderingContext2D} ctx - The canvas rendering context to draw on.
   * @param {number} x - The starting x-coordinate.
   * @param {number} y - The starting y-coordinate.
   * @param {number} intensity - The local image intensity (0-1).
   * @param {object} config - Configuration object.
   * @param {number} config.dotSize - Base size for calculating line length.
   * @param {string} config.renderStyle - The rendering style ('fill' or 'stroke').
   * @param {number} config.strokeWidth - The width of strokes.
   * @param {object[]} gradients - Pre-calculated gradient vectors for the image.
   * @param {number} width - The width of the canvas (for indexing).
   * @returns {string} An SVG string containing the generated line and circle elements.
   */
  drawFlowField(ctx, x, y, intensity, config, gradients, width) {
    const { dotSize, renderStyle, strokeWidth } = config;
    if (intensity > 0.1 && gradients) {
      const idx = Math.floor(y) * width + Math.floor(x);
      if (!gradients[idx]) return '';

      const gradient = gradients[idx];
      const flowLength = dotSize * intensity * 2;
      const endX = x + gradient.x * flowLength;
      const endY = y + gradient.y * flowLength;
      const calculatedLineWidth = Math.max(0.5, intensity * dotSize * 0.3);
      const finalLineWidth = renderStyle === 'stroke' ? strokeWidth : calculatedLineWidth;

      // Draw line
      ctx.lineWidth = finalLineWidth;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      // Draw a small circle at the start point for better visibility
      ctx.beginPath();
      ctx.arc(x, y, finalLineWidth, 0, Math.PI * 2);
      ctx.fill(); // Always fill the start point for this effect

      let lineSVG = `<line x1="${x.toFixed(2)}" y1="${y.toFixed(2)}" x2="${endX.toFixed(2)}" y2="${endY.toFixed(2)}" stroke-width="${finalLineWidth.toFixed(2)}" stroke="currentColor"/>`;
      let circleSVG = `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${finalLineWidth.toFixed(2)}"/>`;
      return lineSVG + circleSVG;
    }
    return '';
  }

  /**
   * Calculates the intensity gradient field for an image using the Sobel operator.
   * This is used by the 'flowfield' pattern to determine the direction of lines.
   * @param {number[]} values - An array of intensity values (0-1) for each pixel.
   * @param {number} width - The width of the image.
   * @param {number} height - The height of the image.
   * @returns {Array<{x: number, y: number}>} An array of normalized gradient vectors.
   */
  calculateGradientField(values, width, height) {
    const gradients = new Array(width * height);

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;

        // Sobel operator for gradient calculation
        const gx =
          -1 * (values[(y - 1) * width + (x - 1)] || 0) +
          -2 * (values[y * width + (x - 1)] || 0) +
          -1 * (values[(y + 1) * width + (x - 1)] || 0) +
          1 * (values[(y - 1) * width + (x + 1)] || 0) +
          2 * (values[y * width + (x + 1)] || 0) +
          1 * (values[(y + 1) * width + (x + 1)] || 0);

        const gy =
          -1 * (values[(y - 1) * width + (x - 1)] || 0) +
          -2 * (values[(y - 1) * width + x] || 0) +
          -1 * (values[(y - 1) * width + (x + 1)] || 0) +
          1 * (values[(y + 1) * width + (x - 1)] || 0) +
          2 * (values[(y + 1) * width + x] || 0) +
          1 * (values[(y + 1) * width + (x + 1)] || 0);

        const magnitude = Math.sqrt(gx * gx + gy * gy);
        // Normalize the gradient vector
        gradients[idx] = magnitude > 0 ? { x: gx / magnitude, y: gy / magnitude } : { x: 0, y: 0 };
      }
    }

    return gradients;
  }
}

// Attach to the global scope to be accessible by other scripts
self.AdvancedPatterns = AdvancedPatterns;