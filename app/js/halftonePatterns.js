/**
 * @file This file contains the core logic for generating various halftone patterns.
 * It acts as a controller, selecting the appropriate pattern-drawing function
 * based on user configuration and applying it to the image data.
 */

/**
 * A class responsible for generating different types of halftone patterns.
 * It uses a helper method `applyRotatedGrid` to centralize the complex
 * grid rotation logic, ensuring consistent behavior across all grid-based patterns.
 */
class HalftonePatterns {
  /**
   * Initializes the HalftonePatterns class and its dependency, AdvancedPatterns.
   */
  constructor() {
    /**
     * An instance of the AdvancedPatterns class for generating complex patterns.
     * @type {AdvancedPatterns}
     */
    this.advancedPatterns = new AdvancedPatterns();
  }

  /**
   * A powerful helper function that applies a core drawing function to a rotated grid.
   * This centralizes the logic for calculating rotated coordinates over a grid,
   * which is used by most classic and some advanced patterns.
   * @param {CanvasRenderingContext2D} ctx - The canvas context to draw on.
   * @param {number[]} values - The array of image intensity values (0-1) for each pixel.
   * @param {number} width - The canvas width.
   * @param {number} height - The canvas height.
   * @param {object} config - The processing configuration object.
   * @param {number} config.angle - The rotation angle for the grid in degrees.
   * @param {number} config.spacing - The spacing between grid points in pixels.
   * @param {function(CanvasRenderingContext2D, number, number, number, object): string} coreDrawFn - The specific function to call for each point on the grid. It's responsible for drawing one shape and returning its SVG representation.
   * @returns {string} The aggregated SVG content for all drawn elements.
   */
  applyRotatedGrid(ctx, values, width, height, config, coreDrawFn) {
    let svg = '';
    const { angle, spacing } = config;

    const angleRad = (angle * Math.PI) / 180;
    const cosA = Math.cos(angleRad);
    const sinA = Math.sin(angleRad);
    // The diagonal is used to ensure the rotated grid covers the entire canvas.
    const diagonal = Math.sqrt(width * width + height * height);

    for (let yGrid = -diagonal / 2; yGrid < diagonal / 2; yGrid += spacing) {
      for (let xGrid = -diagonal / 2; xGrid < diagonal / 2; xGrid += spacing) {
        // Rotate the grid point's coordinates to find its position on the canvas.
        const rotX = xGrid * cosA - yGrid * sinA + width / 2;
        const rotY = xGrid * sinA + yGrid * cosA + height / 2;

        // Only draw if the rotated point is within the canvas bounds.
        if (rotX >= 0 && rotX < width && rotY >= 0 && rotY < height) {
          const pixelX = Math.floor(rotX);
          const pixelY = Math.floor(rotY);
          const idx = pixelY * width + pixelX;
          const intensity = values[idx] || 0;

          const elementSvg = coreDrawFn(ctx, rotX, rotY, intensity, config);
          if (elementSvg) {
            svg += elementSvg;
          }
        }
      }
    }
    return svg;
  }

  /**
   * The main pattern generation function. It sets up the canvas and dispatches
   * to the appropriate pattern-specific method based on the `type`.
   * @param {string} type - The type of pattern to generate (e.g., 'circle', 'voronoi').
   * @param {string} channel - The color channel being processed (e.g., 'cyan').
   * @param {number[]} values - The array of image intensity values.
   * @param {number} width - The canvas width.
   * @param {number} height - The canvas height.
   * @param {object} config - The configuration object for the pattern.
   * @param {HTMLCanvasElement} canvas - The canvas element to draw on.
   * @returns {string} The complete SVG string for the generated channel pattern.
   */
  generatePattern(type, channel, values, width, height, config, canvas) {
    const ctx = canvas.getContext('2d');
    canvas.width = width;
    canvas.height = height;

    const color = config.color;
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.clearRect(0, 0, width, height);

    let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
    svg += `<rect width="100%" height="100%" fill="white"/>`;
    svg += `<g fill="${color}" stroke="${color}">`;

    switch (type) {
      case 'circle':
        svg += this.generateCirclePattern(ctx, values, width, height, config);
        break;
      case 'square':
        svg += this.generateSquarePattern(ctx, values, width, height, config);
        break;
      case 'diamond':
        svg += this.generateDiamondPattern(ctx, values, width, height, config);
        break;
      case 'concentric':
        svg += this.applyRotatedGrid(ctx, values, width, height, config, this.advancedPatterns.drawConcentric.bind(this.advancedPatterns));
        break;
      case 'spiral':
        svg += this.applyRotatedGrid(ctx, values, width, height, config, this.advancedPatterns.drawSpiral.bind(this.advancedPatterns));
        break;
      case 'hexagonal':
        svg += this.applyRotatedGrid(ctx, values, width, height, config, this.advancedPatterns.drawHexagon.bind(this.advancedPatterns));
        break;
      case 'wave':
        svg += this.applyRotatedGrid(ctx, values, width, height, config, this.advancedPatterns.drawWave.bind(this.advancedPatterns));
        break;
      case 'flowfield':
        const gradients = this.advancedPatterns.calculateGradientField(values, width, height);
        const drawFnWithGradients = (ctx, x, y, intensity, cfg) => this.advancedPatterns.drawFlowField(ctx, x, y, intensity, cfg, gradients, width);
        svg += this.applyRotatedGrid(ctx, values, width, height, config, drawFnWithGradients);
        break;
      case 'voronoi':
        svg += this.advancedPatterns.generateVoronoiPattern(ctx, values, width, height, config);
        break;
      case 'line':
        svg += this.generateLinePattern(ctx, values, width, height, config);
        break;
      case 'crosshatch':
        svg += this.generateCrosshatchPattern(ctx, values, width, height, config);
        break;
      case 'stochastic':
        svg += this.generateStochasticPattern(ctx, values, width, height, config);
        break;
      case 'stipple':
        svg += this.generateStipplePattern(ctx, values, width, height, config);
        break;
      default:
        svg += this.generateCirclePattern(ctx, values, width, height, config);
    }

    svg += '</g></svg>';
    return svg;
  }

  /**
   * Generates a classic circular dot halftone pattern.
   * Each point on the grid is rendered as a circle whose radius is proportional to the image intensity.
   * This method uses the `applyRotatedGrid` helper.
   * @param {CanvasRenderingContext2D} ctx - The canvas rendering context.
   * @param {number[]} values - The array of image intensity values (0-1).
   * @param {number} width - The width of the canvas.
   * @param {number} height - The height of the canvas.
   * @param {object} config - The processing configuration object.
   * @returns {string} The aggregated SVG content for the generated circles.
   */
  generateCirclePattern(ctx, values, width, height, config) {
    return this.applyRotatedGrid(ctx, values, width, height, config, (ctx, x, y, intensity, config) => {
      const radius = (config.dotSize / 2) * intensity;
      if (radius > 0.5) {
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        if (config.renderStyle === 'stroke') {
          ctx.lineWidth = config.strokeWidth;
          ctx.stroke();
          return `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${radius.toFixed(2)}" fill="none" stroke="currentColor" stroke-width="${config.strokeWidth.toFixed(2)}"/>`;
        } else {
          ctx.fill();
          return `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${radius.toFixed(2)}"/>`;
        }
      }
      return '';
    });
  }

  /**
   * Generates a square dot halftone pattern.
   * Each point on the grid is rendered as a square whose size is proportional to the image intensity.
   * This method uses the `applyRotatedGrid` helper.
   * @param {CanvasRenderingContext2D} ctx - The canvas rendering context.
   * @param {number[]} values - The array of image intensity values (0-1).
   * @param {number} width - The width of the canvas.
   * @param {number} height - The height of the canvas.
   * @param {object} config - The processing configuration object.
   * @returns {string} The aggregated SVG content for the generated squares.
   */
  generateSquarePattern(ctx, values, width, height, config) {
    return this.applyRotatedGrid(ctx, values, width, height, config, (ctx, x, y, intensity, config) => {
      const size = config.dotSize * intensity;
      if (size > 0.5) {
        const half = size / 2;
        if (config.renderStyle === 'stroke') {
          ctx.lineWidth = config.strokeWidth;
          ctx.strokeRect(x - half, y - half, size, size);
          return `<rect x="${(x - half).toFixed(2)}" y="${(y - half).toFixed(2)}" width="${size.toFixed(2)}" height="${size.toFixed(2)}" fill="none" stroke="currentColor" stroke-width="${config.strokeWidth.toFixed(2)}"/>`;
        } else {
          ctx.fillRect(x - half, y - half, size, size);
          return `<rect x="${(x - half).toFixed(2)}" y="${(y - half).toFixed(2)}" width="${size.toFixed(2)}" height="${size.toFixed(2)}"/>`;
        }
      }
      return '';
    });
  }

  /**
   * Generates a diamond-shaped dot halftone pattern.
   * Each point on the grid is rendered as a square rotated by 45 degrees.
   * This method uses the `applyRotatedGrid` helper.
   * @param {CanvasRenderingContext2D} ctx - The canvas rendering context.
   * @param {number[]} values - The array of image intensity values (0-1).
   * @param {number} width - The width of the canvas.
   * @param {number} height - The height of the canvas.
   * @param {object} config - The processing configuration object.
   * @returns {string} The aggregated SVG content for the generated diamonds.
   */
  generateDiamondPattern(ctx, values, width, height, config) {
    return this.applyRotatedGrid(ctx, values, width, height, config, (ctx, x, y, intensity, config) => {
      const size = config.dotSize * intensity;
      if (size > 0.5) {
        const half = size / 2;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.PI / 4);

        const svgX = (-half).toFixed(2);
        const svgY = (-half).toFixed(2);
        const svgSize = size.toFixed(2);
        let svgTransform = `transform="rotate(45 ${x.toFixed(2)} ${y.toFixed(2)})"`;

        if (config.renderStyle === 'stroke') {
          ctx.lineWidth = config.strokeWidth;
          ctx.strokeRect(-half, -half, size, size);
          ctx.restore();
          return `<rect x="${svgX}" y="${svgY}" width="${svgSize}" height="${svgSize}" fill="none" stroke="currentColor" stroke-width="${config.strokeWidth.toFixed(2)}" ${svgTransform}/>`;
        } else {
          ctx.fillRect(-half, -half, size, size);
          ctx.restore();
          return `<rect x="${svgX}" y="${svgY}" width="${svgSize}" height="${svgSize}" ${svgTransform}/>`;
        }
      }
      return '';
    });
  }

  /**
   * Generates a line screen pattern.
   * This pattern uses its own grid logic to handle two separate angles: the grid angle and the line angle.
   * @param {CanvasRenderingContext2D} ctx - The canvas rendering context.
   * @param {number[]} values - The array of image intensity values (0-1).
   * @param {number} width - The width of the canvas.
   * @param {number} height - The height of the canvas.
   * @param {object} config - The processing configuration object.
   * @returns {string} The aggregated SVG content for the generated lines.
   */
  generateLinePattern(ctx, values, width, height, config) {
    let svg = '';
    const { dotSize, spacing, angle, lineAngle, renderStyle, strokeWidth } = config;
    const angleRad = (angle * Math.PI) / 180;
    const lineAngleRad = (lineAngle * Math.PI) / 180;
    const diagonal = Math.sqrt(width * width + height * height);

    for (let yGrid = -diagonal / 2; yGrid < diagonal / 2; yGrid += spacing) {
      for (let xGrid = -diagonal / 2; xGrid < diagonal / 2; xGrid += spacing) {
        const rotX = xGrid * Math.cos(angleRad) - yGrid * Math.sin(angleRad) + width / 2;
        const rotY = xGrid * Math.sin(angleRad) + yGrid * Math.cos(angleRad) + height / 2;

        if (rotX >= 0 && rotX < width && rotY >= 0 && rotY < height) {
          const idx = Math.floor(rotY) * width + Math.floor(rotX);
          const intensity = values[idx] || 0;
          const calculatedLineWidth = dotSize * intensity;
          const finalLineWidth = renderStyle === 'stroke' ? strokeWidth : calculatedLineWidth;

          if (finalLineWidth > 0.2) {
            const lineLength = spacing * 0.8;
            const dx = Math.cos(lineAngleRad) * lineLength / 2;
            const dy = Math.sin(lineAngleRad) * lineLength / 2;

            ctx.lineWidth = finalLineWidth;
            ctx.beginPath();
            ctx.moveTo(rotX - dx, rotY - dy);
            ctx.lineTo(rotX + dx, rotY + dy);
            ctx.stroke();
            svg += `<line x1="${(rotX - dx).toFixed(2)}" y1="${(rotY - dy).toFixed(2)}" x2="${(rotX + dx).toFixed(2)}" y2="${(rotY + dy).toFixed(2)}" stroke-width="${finalLineWidth.toFixed(2)}" stroke="currentColor"/>`;
          }
        }
      }
    }
    return svg;
  }

  /**
   * Generates a crosshatch pattern.
   * In dark areas, it draws two perpendicular sets of lines. In lighter areas, only one.
   * @param {CanvasRenderingContext2D} ctx - The canvas rendering context.
   * @param {number[]} values - The array of image intensity values (0-1).
   * @param {number} width - The width of the canvas.
   * @param {number} height - The height of the canvas.
   * @param {object} config - The processing configuration object.
   * @returns {string} The aggregated SVG content for the generated lines.
   */
  generateCrosshatchPattern(ctx, values, width, height, config) {
    let svg = '';
    const { spacing, angle, renderStyle, strokeWidth } = config;
    ctx.lineWidth = renderStyle === 'stroke' ? strokeWidth : 1;
    const finalStrokeWidth = renderStyle === 'stroke' ? strokeWidth : 1;

    for (let y = 0; y < height; y += spacing) {
      for (let x = 0; x < width; x += spacing) {
        const idx = y * width + x;
        const intensity = values[idx] || 0;

        if (intensity > 0.1) {
          const lineLength = spacing * 0.7;
          const numLines = Math.floor(intensity * 4) + 1;

          for (let i = 0; i < numLines; i++) {
            const offset = (i - numLines / 2) * 2;
            const angle1Rad = (45 + angle) * Math.PI / 180;
            const angle2Rad = (-45 + angle) * Math.PI / 180;

            const dx1 = Math.cos(angle1Rad) * lineLength / 2;
            const dy1 = Math.sin(angle1Rad) * lineLength / 2;
            ctx.beginPath();
            ctx.moveTo(x - dx1 + offset, y - dy1);
            ctx.lineTo(x + dx1 + offset, y + dy1);
            ctx.stroke();
            svg += `<line x1="${(x - dx1 + offset).toFixed(2)}" y1="${(y - dy1).toFixed(2)}" x2="${(x + dx1 + offset).toFixed(2)}" y2="${(y + dy1).toFixed(2)}" stroke-width="${finalStrokeWidth}"/>`;

            if (intensity > 0.5) {
              const dx2 = Math.cos(angle2Rad) * lineLength / 2;
              const dy2 = Math.sin(angle2Rad) * lineLength / 2;
              ctx.beginPath();
              ctx.moveTo(x - dx2, y - dy2 - offset);
              ctx.lineTo(x + dx2, y + dy2 - offset);
              ctx.stroke();
              svg += `<line x1="${(x - dx2).toFixed(2)}" y1="${(y - dy2 - offset).toFixed(2)}" x2="${(x + dx2).toFixed(2)}" y2="${(y + dy2 - offset).toFixed(2)}" stroke-width="${finalStrokeWidth}"/>`;
            }
          }
        }
      }
    }
    return svg;
  }

  /**
   * Generates a stochastic (randomized) dot pattern.
   * Dots are placed randomly, with the probability of a dot appearing being higher in darker areas.
   * This logic was reverted to match the original implementation for functional parity.
   * @param {CanvasRenderingContext2D} ctx - The canvas rendering context.
   * @param {number[]} values - The array of image intensity values (0-1).
   * @param {number} width - The width of the canvas.
   * @param {number} height - The height of the canvas.
   * @param {object} config - The processing configuration object.
   * @returns {string} The aggregated SVG content for the generated circles.
   */
  generateStochasticPattern(ctx, values, width, height, config) {
    const { dotSize, spacing, randomness, renderStyle, strokeWidth } = config;
    let svg = '';
    let seed = 12345;
    const random = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    const baseSpacing = spacing * (1 - randomness / 200);
    for (let y = 0; y < height; y += baseSpacing) {
      for (let x = 0; x < width; x += baseSpacing) {
        const randomX = x + (random() - 0.5) * spacing * randomness / 100;
        const randomY = y + (random() - 0.5) * spacing * randomness / 100;
        if (randomX >= 0 && randomX < width && randomY >= 0 && randomY < height) {
          const pixelX = Math.floor(randomX);
          const pixelY = Math.floor(randomY);
          const idx = pixelY * width + pixelX;
          const intensity = values[idx] || 0;
          if (random() < intensity) {
            const radius = dotSize / 4 + (random() * dotSize / 4);
            ctx.beginPath();
            ctx.arc(randomX, randomY, radius, 0, Math.PI * 2);
            if (renderStyle === 'stroke') {
              ctx.lineWidth = strokeWidth;
              ctx.stroke();
              svg += `<circle cx="${randomX.toFixed(2)}" cy="${randomY.toFixed(2)}" r="${radius.toFixed(2)}" fill="none" stroke="currentColor" stroke-width="${strokeWidth.toFixed(2)}"/>`;
            } else {
              ctx.fill();
              svg += `<circle cx="${randomX.toFixed(2)}" cy="${randomY.toFixed(2)}" r="${radius.toFixed(2)}"/>`;
            }
          }
        }
      }
    }
    return svg;
  }

  /**
   * Generates a stipple pattern, another form of random dot distribution.
   * This implementation adds a second, smaller set of dots in darker areas to increase density.
   * @param {CanvasRenderingContext2D} ctx - The canvas rendering context.
   * @param {number[]} values - The array of image intensity values (0-1).
   * @param {number} width - The width of the canvas.
   * @param {number} height - The height of the canvas.
   * @param {object} config - The processing configuration object.
   * @returns {string} The aggregated SVG content for the generated circles.
   */
  generateStipplePattern(ctx, values, width, height, config) {
    const { dotSize, spacing, renderStyle, strokeWidth } = config;
    let svg = '';
    const stippleSpacing = spacing / 2;
    for (let y = 0; y < height; y += stippleSpacing) {
      for (let x = 0; x < width; x += stippleSpacing) {
        const idx = y * width + x;
        const intensity = values[idx] || 0;
        if (Math.random() < intensity) {
          const radius = dotSize / 6 + (Math.random() * dotSize / 6);
          const offsetX = (Math.random() - 0.5) * stippleSpacing / 2;
          const offsetY = (Math.random() - 0.5) * stippleSpacing / 2;
          const dotX = x + offsetX;
          const dotY = y + offsetY;
          ctx.beginPath();
          ctx.arc(dotX, dotY, radius, 0, Math.PI * 2);
          if (renderStyle === 'stroke') {
            ctx.lineWidth = strokeWidth;
            ctx.stroke();
            svg += `<circle cx="${dotX.toFixed(2)}" cy="${dotY.toFixed(2)}" r="${radius.toFixed(2)}" fill="none" stroke="currentColor" stroke-width="${strokeWidth.toFixed(2)}"/>`;
          } else {
            ctx.fill();
            svg += `<circle cx="${dotX.toFixed(2)}" cy="${dotY.toFixed(2)}" r="${radius.toFixed(2)}"/>`;
          }
        }
        if (intensity > 0.3 && Math.random() < intensity * 0.5) {
          const smallRadius = dotSize / 12;
          const offsetX = (Math.random() - 0.5) * stippleSpacing;
          const offsetY = (Math.random() - 0.5) * stippleSpacing;
          const smallDotX = x + offsetX;
          const smallDotY = y + offsetY;
          if (smallDotX >= 0 && smallDotX < width && smallDotY >= 0 && smallDotY < height) {
            ctx.beginPath();
            ctx.arc(smallDotX, smallDotY, smallRadius, 0, Math.PI * 2);
            if (renderStyle === 'stroke') {
              ctx.lineWidth = strokeWidth;
              ctx.stroke();
              svg += `<circle cx="${smallDotX.toFixed(2)}" cy="${smallDotY.toFixed(2)}" r="${smallRadius.toFixed(2)}" fill="none" stroke="currentColor" stroke-width="${strokeWidth.toFixed(2)}"/>`;
            } else {
              ctx.fill();
              svg += `<circle cx="${smallDotX.toFixed(2)}" cy="${smallDotY.toFixed(2)}" r="${smallRadius.toFixed(2)}"/>`;
            }
          }
        }
      }
    }
    return svg;
  }

  /**
   * Returns the standard, industry-accepted screen angles for CMYK printing.
   * These specific angles (15, 75, 0, 45) are chosen to minimize moiré patterns
   * when the color channels are overlaid.
   * @returns {{cyan: number, magenta: number, yellow: number, black: number}} An object with the angle for each channel.
   */
  getStandardAngles() {
    return {
      cyan: 15,
      magenta: 75,
      yellow: 0,
      black: 45
    };
  }
}

window.HalftonePatterns = HalftonePatterns;