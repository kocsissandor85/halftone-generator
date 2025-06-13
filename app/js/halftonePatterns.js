/**
 * Advanced halftone pattern generators
 */

class HalftonePatterns {
  constructor() {
    this.patterns = {};
  }

  /**
   * Generate halftone pattern based on type
   */
  generatePattern(type, channel, values, width, height, config) {
    const canvas = document.getElementById(channel + 'Canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = width;
    canvas.height = height;

    // Clear canvas
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);

    const color = document.getElementById(channel + 'Color').value;
    ctx.fillStyle = color;

    // Create SVG
    let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
    svg += `<rect width="${width}" height="${height}" fill="white"/>`;
    svg += `<g fill="${color}">`;

    // Generate pattern based on type
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
    }

    svg += '</g></svg>';
    return svg;
  }

  /**
   * Original circle pattern (classic halftone dots)
   */
  generateCirclePattern(ctx, values, width, height, config) {
    const { dotSize, spacing, angle } = config;
    let svg = '';

    const angleRad = (angle * Math.PI) / 180;
    const diagonal = Math.sqrt(width * width + height * height);

    for (let y = -diagonal/2; y < diagonal/2; y += spacing) {
      for (let x = -diagonal/2; x < diagonal/2; x += spacing) {
        const rotX = x * Math.cos(angleRad) - y * Math.sin(angleRad) + width/2;
        const rotY = x * Math.sin(angleRad) + y * Math.cos(angleRad) + height/2;

        if (rotX >= 0 && rotX < width && rotY >= 0 && rotY < height) {
          const pixelX = Math.floor(rotX);
          const pixelY = Math.floor(rotY);
          const idx = pixelY * width + pixelX;
          const intensity = values[idx] || 0;
          const radius = (dotSize / 2) * intensity;

          if (radius > 0.5) {
            ctx.beginPath();
            ctx.arc(rotX, rotY, radius, 0, Math.PI * 2);
            ctx.fill();
            svg += `<circle cx="${rotX.toFixed(2)}" cy="${rotY.toFixed(2)}" r="${radius.toFixed(2)}"/>`;
          }
        }
      }
    }
    return svg;
  }

  /**
   * Square dot pattern
   */
  generateSquarePattern(ctx, values, width, height, config) {
    const { dotSize, spacing, angle } = config;
    let svg = '';

    const angleRad = (angle * Math.PI) / 180;
    const diagonal = Math.sqrt(width * width + height * height);

    for (let y = -diagonal/2; y < diagonal/2; y += spacing) {
      for (let x = -diagonal/2; x < diagonal/2; x += spacing) {
        const rotX = x * Math.cos(angleRad) - y * Math.sin(angleRad) + width/2;
        const rotY = x * Math.sin(angleRad) + y * Math.cos(angleRad) + height/2;

        if (rotX >= 0 && rotX < width && rotY >= 0 && rotY < height) {
          const pixelX = Math.floor(rotX);
          const pixelY = Math.floor(rotY);
          const idx = pixelY * width + pixelX;
          const intensity = values[idx] || 0;
          const size = dotSize * intensity;

          if (size > 0.5) {
            const half = size / 2;
            ctx.fillRect(rotX - half, rotY - half, size, size);
            svg += `<rect x="${(rotX - half).toFixed(2)}" y="${(rotY - half).toFixed(2)}" width="${size.toFixed(2)}" height="${size.toFixed(2)}"/>`;
          }
        }
      }
    }
    return svg;
  }

  /**
   * Diamond dot pattern
   */
  generateDiamondPattern(ctx, values, width, height, config) {
    const { dotSize, spacing, angle } = config;
    let svg = '';

    const angleRad = (angle * Math.PI) / 180;
    const diagonal = Math.sqrt(width * width + height * height);

    for (let y = -diagonal/2; y < diagonal/2; y += spacing) {
      for (let x = -diagonal/2; x < diagonal/2; x += spacing) {
        const rotX = x * Math.cos(angleRad) - y * Math.sin(angleRad) + width/2;
        const rotY = x * Math.sin(angleRad) + y * Math.cos(angleRad) + height/2;

        if (rotX >= 0 && rotX < width && rotY >= 0 && rotY < height) {
          const pixelX = Math.floor(rotX);
          const pixelY = Math.floor(rotY);
          const idx = pixelY * width + pixelX;
          const intensity = values[idx] || 0;
          const size = dotSize * intensity;

          if (size > 0.5) {
            const half = size / 2;
            // Draw diamond as rotated square
            ctx.save();
            ctx.translate(rotX, rotY);
            ctx.rotate(Math.PI / 4);
            ctx.fillRect(-half, -half, size, size);
            ctx.restore();

            // SVG diamond as polygon
            const points = [
              `${rotX},${rotY - half}`,
              `${rotX + half},${rotY}`,
              `${rotX},${rotY + half}`,
              `${rotX - half},${rotY}`
            ].join(' ');
            svg += `<polygon points="${points}"/>`;
          }
        }
      }
    }
    return svg;
  }

  /**
   * Line screen pattern
   */
  generateLinePattern(ctx, values, width, height, config) {
    const { dotSize, spacing, angle, lineAngle } = config;
    let svg = '';

    const lineAngleRad = (lineAngle * Math.PI) / 180;
    const screenAngleRad = (angle * Math.PI) / 180;

    // Generate lines based on intensity
    for (let y = 0; y < height; y += spacing) {
      for (let x = 0; x < width; x += spacing) {
        const idx = y * width + x;
        const intensity = values[idx] || 0;
        const lineWidth = dotSize * intensity;

        if (lineWidth > 0.2) {
          const lineLength = spacing * 0.8;

          // Calculate line endpoints
          const dx = Math.cos(lineAngleRad) * lineLength / 2;
          const dy = Math.sin(lineAngleRad) * lineLength / 2;

          ctx.lineWidth = lineWidth;
          ctx.beginPath();
          ctx.moveTo(x - dx, y - dy);
          ctx.lineTo(x + dx, y + dy);
          ctx.stroke();

          svg += `<line x1="${(x - dx).toFixed(2)}" y1="${(y - dy).toFixed(2)}" x2="${(x + dx).toFixed(2)}" y2="${(y + dy).toFixed(2)}" stroke-width="${lineWidth.toFixed(2)}" stroke="currentColor"/>`;
        }
      }
    }
    return svg;
  }

  /**
   * Crosshatch pattern
   */
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

  /**
   * Stochastic (random) pattern
   */
  generateStochasticPattern(ctx, values, width, height, config) {
    const { dotSize, spacing, randomness } = config;
    let svg = '';

    // Set random seed for consistent results
    let seed = 12345;
    const random = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    const baseSpacing = spacing * (1 - randomness / 200);

    for (let y = 0; y < height; y += baseSpacing) {
      for (let x = 0; x < width; x += baseSpacing) {
        // Add randomness to position
        const randomX = x + (random() - 0.5) * spacing * randomness / 100;
        const randomY = y + (random() - 0.5) * spacing * randomness / 100;

        if (randomX >= 0 && randomX < width && randomY >= 0 && randomY < height) {
          const pixelX = Math.floor(randomX);
          const pixelY = Math.floor(randomY);
          const idx = pixelY * width + pixelX;
          const intensity = values[idx] || 0;

          // Random threshold for stochastic effect
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

  /**
   * Stipple pattern (artistic dots)
   */
  generateStipplePattern(ctx, values, width, height, config) {
    const { dotSize, spacing } = config;
    let svg = '';

    // Denser sampling for stippling
    const stippleSpacing = spacing / 2;

    for (let y = 0; y < height; y += stippleSpacing) {
      for (let x = 0; x < width; x += stippleSpacing) {
        const idx = y * width + x;
        const intensity = values[idx] || 0;

        // Multiple chance checks for different dot sizes
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

        // Add smaller dots for lighter areas
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

  /**
   * Get standard CMYK screen angles
   */
  getStandardAngles() {
    return {
      cyan: 15,
      magenta: 75,
      yellow: 0,
      black: 45
    };
  }

  /**
   * Apply intensity mapping for better contrast
   */
  mapIntensity(intensity, curve = 'linear') {
    switch (curve) {
      case 'linear':
        return intensity;
      case 'gamma':
        return Math.pow(intensity, 1.4);
      case 'contrast':
        return intensity < 0.5 ?
          2 * intensity * intensity :
          1 - 2 * (1 - intensity) * (1 - intensity);
      default:
        return intensity;
    }
  }
}

// Export for use in main.js
window.HalftonePatterns = HalftonePatterns;