/**
 * Advanced halftone pattern generators with new pattern types
 * (CORRECTED to properly extend the original, working rotation logic to all grid-based patterns)
 */

class HalftonePatterns {
  constructor() {
    this.patterns = {};
    this.advancedPatterns = new AdvancedPatterns();
  }

  // --- NEW: A reusable function that implements the ORIGINAL rotation logic ---
  /**
   * Applies a core drawing function to a rotated grid.
   * This contains the exact rotation logic from the original working patterns.
   * @param {CanvasRenderingContext2D} ctx - The canvas context.
   * @param {Array<number>} values - The image intensity values.
   * @param {number} width - Canvas width.
   * @param {number} height - Canvas height.
   * @param {object} config - The processing configuration.
   * @param {function} coreDrawFn - The function to call for each point on the grid. It receives (ctx, x, y, intensity, config).
   * @returns {string} The generated SVG for the elements.
   */
  applyRotatedGrid(ctx, values, width, height, config, coreDrawFn) {
    let svg = '';
    const { angle, spacing } = config;

    const angleRad = (angle * Math.PI) / 180;
    const cosA = Math.cos(angleRad);
    const sinA = Math.sin(angleRad);
    const diagonal = Math.sqrt(width * width + height * height);

    for (let yGrid = -diagonal / 2; yGrid < diagonal / 2; yGrid += spacing) {
      for (let xGrid = -diagonal / 2; xGrid < diagonal / 2; xGrid += spacing) {
        // For each point on the grid, calculate its rotated position on the canvas
        const rotX = xGrid * cosA - yGrid * sinA + width / 2;
        const rotY = xGrid * sinA + yGrid * cosA + height / 2;

        // Check if the rotated point is within the visible canvas area
        if (rotX >= 0 && rotX < width && rotY >= 0 && rotY < height) {
          const pixelX = Math.floor(rotX);
          const pixelY = Math.floor(rotY);
          const idx = pixelY * width + pixelX;
          const intensity = values[idx] || 0;

          // Call the specific drawing function for the pattern
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
   * Generate halftone pattern based on type
   */
  generatePattern(type, channel, values, width, height, config) {
    const canvas = document.getElementById(channel + 'Canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = width;
    canvas.height = height;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);

    const color = document.getElementById(channel + 'Color').value;
    ctx.fillStyle = color;
    ctx.strokeStyle = color;

    let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
    svg += `<rect width="width" height="height" fill="white"/>`;
    svg += `<g fill="${color}" stroke="${color}">`;

    // --- REFACTORED: The switch now uses the applyRotatedGrid helper for supported patterns ---
    switch (type) {
      // Grid-based patterns that now use the universal rotation logic
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
        svg += this.applyRotatedGrid(ctx, values, width, height, config, this.advancedPatterns.drawFlowField.bind(this.advancedPatterns));
        break;

      // Patterns with their own unique logic (rotation not applicable or already included)
      case 'line':
        svg += this.generateLinePattern(ctx, values, width, height, config);
        break;
      case 'crosshatch':
        svg += this.generateCrosshatchPattern(ctx, values, width, height, config);
        break;

      // Non-grid patterns left untouched as requested
      case 'stochastic':
        svg += this.generateStochasticPattern(ctx, values, width, height, config);
        break;
      case 'stipple':
        svg += this.generateStipplePattern(ctx, values, width, height, config);
        break;
      case 'voronoi':
        svg += this.advancedPatterns.generateVoronoiPattern(ctx, values, width, height, config);
        break;
      case 'fractal':
        svg += this.advancedPatterns.generateFractalPattern(ctx, values, width, height, config);
        break;

      default:
        svg += this.generateCirclePattern(ctx, values, width, height, config);
    }

    svg += '</g></svg>';
    return svg;
  }

  // --- REFACTORED: Classic patterns now use the helper, ensuring identical output but with cleaner code ---
  generateCirclePattern(ctx, values, width, height, config) {
    return this.applyRotatedGrid(ctx, values, width, height, config, (ctx, x, y, intensity, config) => {
      const { dotSize } = config;
      const radius = (dotSize / 2) * intensity;
      if (radius > 0.5) {
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        return `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${radius.toFixed(2)}"/>`;
      }
      return '';
    });
  }

  generateSquarePattern(ctx, values, width, height, config) {
    return this.applyRotatedGrid(ctx, values, width, height, config, (ctx, x, y, intensity, config) => {
      const { dotSize } = config;
      const size = dotSize * intensity;
      if (size > 0.5) {
        const half = size / 2;
        ctx.fillRect(x - half, y - half, size, size);
        return `<rect x="${(x - half).toFixed(2)}" y="${(y - half).toFixed(2)}" width="${size.toFixed(2)}" height="${size.toFixed(2)}"/>`;
      }
      return '';
    });
  }

  generateDiamondPattern(ctx, values, width, height, config) {
    return this.applyRotatedGrid(ctx, values, width, height, config, (ctx, x, y, intensity, config) => {
      const { dotSize } = config;
      const size = dotSize * intensity;
      if (size > 0.5) {
        const half = size / 2;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-half, -half, size, size);
        ctx.restore();

        const points = [
          `${x},${y - half}`,
          `${x + half},${y}`,
          `${x},${y + half}`,
          `${x - half},${y}`
        ].join(' ');
        return `<polygon points="${points}" transform="rotate(-45 ${x.toFixed(2)} ${y.toFixed(2)})"/>`;
      }
      return '';
    });
  }

  // --- Patterns with custom logic remain the same ---
  generateLinePattern(ctx, values, width, height, config) {
    const { dotSize, spacing, angle, lineAngle } = config;
    let svg = '';
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
          const lineWidth = dotSize * intensity;

          if (lineWidth > 0.2) {
            const lineLength = spacing * 0.8;
            const dx = Math.cos(lineAngleRad) * lineLength / 2;
            const dy = Math.sin(lineAngleRad) * lineLength / 2;

            ctx.lineWidth = lineWidth;
            ctx.beginPath();
            ctx.moveTo(rotX - dx, rotY - dy);
            ctx.lineTo(rotX + dx, rotY + dy);
            ctx.stroke();

            svg += `<line x1="${(rotX - dx).toFixed(2)}" y1="${(rotY - dy).toFixed(2)}" x2="${(rotX + dx).toFixed(2)}" y2="${(rotY + dy).toFixed(2)}" stroke-width="${lineWidth.toFixed(2)}" stroke="currentColor"/>`;
          }
        }
      }
    }
    return svg;
  }

  // (The rest of the file: crosshatch, stochastic, stipple, getStandardAngles, etc. remain unchanged from your original)
  // ... [UNCHANGED CODE] ...
  generateCrosshatchPattern(ctx, values, width, height, config) {
    const { dotSize, spacing, angle } = config;
    let svg = '';

    ctx.lineWidth = 1;

    for (let y = 0; y < height; y += spacing) {
      for (let x = 0; x < width; x += spacing) {
        const idx = y * width + x;
        const intensity = values[idx] || 0;

        if (intensity > 0.1) {
          const lineLength = spacing * 0.7;
          const numLines = Math.floor(intensity * 4) + 1;

          for (let i = 0; i < numLines; i++) {
            const offset = (i - numLines/2) * 2;
            const angle1 = 45 + angle;
            const angle2 = -45 + angle;

            // First diagonal
            const dx1 = Math.cos(angle1 * Math.PI / 180) * lineLength / 2;
            const dy1 = Math.sin(angle1 * Math.PI / 180) * lineLength / 2;

            ctx.beginPath();
            ctx.moveTo(x - dx1 + offset, y - dy1 + offset);
            ctx.lineTo(x + dx1 + offset, y + dy1 + offset);
            ctx.stroke();

            svg += `<line x1="${(x - dx1 + offset).toFixed(2)}" y1="${(y - dy1 + offset).toFixed(2)}" x2="${(x + dx1 + offset).toFixed(2)}" y2="${(y + dy1 + offset).toFixed(2)}" stroke-width="1" stroke="currentColor"/>`;

            if (intensity > 0.5) {
              // Second diagonal for darker areas
              const dx2 = Math.cos(angle2 * Math.PI / 180) * lineLength / 2;
              const dy2 = Math.sin(angle2 * Math.PI / 180) * lineLength / 2;

              ctx.beginPath();
              ctx.moveTo(x - dx2 + offset, y - dy2 + offset);
              ctx.lineTo(x + dx2 + offset, y + dy2 + offset);
              ctx.stroke();

              svg += `<line x1="${(x - dx2 + offset).toFixed(2)}" y1="${(y - dy2 + offset).toFixed(2)}" x2="${(x + dx2 + offset).toFixed(2)}" y2="${(y + dy2 + offset).toFixed(2)}" stroke-width="1" stroke="currentColor"/>`;
            }
          }
        }
      }
    }
    return svg;
  }

  generateStochasticPattern(ctx, values, width, height, config) {
    const { dotSize, spacing, randomness } = config;
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
            ctx.fill();
            svg += `<circle cx="${randomX.toFixed(2)}" cy="${randomY.toFixed(2)}" r="${radius.toFixed(2)}"/>`;
          }
        }
      }
    }
    return svg;
  }

  generateStipplePattern(ctx, values, width, height, config) {
    const { dotSize, spacing } = config;
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
          ctx.fill();
          svg += `<circle cx="${dotX.toFixed(2)}" cy="${dotY.toFixed(2)}" r="${radius.toFixed(2)}"/>`;
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
            ctx.fill();
            svg += `<circle cx="${smallDotX.toFixed(2)}" cy="${smallDotY.toFixed(2)}" r="${smallRadius.toFixed(2)}"/>`;
          }
        }
      }
    }
    return svg;
  }

  getStandardAngles() {
    return {
      cyan: 15,
      magenta: 75,
      yellow: 0,
      black: 45
    };
  }

  mapIntensity(intensity, curve = 'linear') {
    switch (curve) {
      case 'linear':
        return intensity;
      case 'gamma':
        return Math.pow(intensity, 1.4);
      case 'contrast':
        return intensity < 0.5 ? 2 * intensity * intensity : 1 - 2 * (1 - intensity) * (1 - intensity);
      default:
        return intensity;
    }
  }
}

window.HalftonePatterns = HalftonePatterns;