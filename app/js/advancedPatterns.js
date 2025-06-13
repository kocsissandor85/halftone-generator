/**
 * Advanced pattern generators for enhanced halftone effects
 * (REFACTORED so that grid-based patterns draw single elements, allowing for rotation)
 */

class AdvancedPatterns {
  constructor() {
    this.seedRandom = this.createSeededRandom(12345);
  }

  createSeededRandom(seed) {
    return function() {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
  }

  // --- REFACTORED: Draws a single concentric circle at given coordinates ---
  drawConcentric(ctx, x, y, intensity, config) {
    const { dotSize } = config;
    let svg = '';
    if (intensity > 0.1) {
      const maxRadius = dotSize * intensity;
      const numRings = Math.floor(intensity * 4) + 1;
      for (let ring = 0; ring < numRings; ring++) {
        const radius = (maxRadius / numRings) * (ring + 1);
        const strokeWidth = Math.max(0.5, maxRadius / numRings * 0.3);
        ctx.lineWidth = strokeWidth;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.stroke();
        svg += `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${radius.toFixed(2)}" fill="none" stroke="currentColor" stroke-width="${strokeWidth.toFixed(2)}"/>`;
      }
    }
    return svg;
  }

  // --- REFACTORED: Draws a single spiral at given coordinates ---
  drawSpiral(ctx, x, y, intensity, config) {
    const { dotSize } = config;
    if (intensity > 0.1) {
      const maxRadius = dotSize * intensity;
      const turns = intensity * 3 + 1;
      const points = Math.floor(turns * 20);
      let pathData = '';
      let canvasPath = [];
      for (let i = 0; i <= points; i++) {
        const t = i / points;
        const angle = t * turns * Math.PI * 2;
        const radius = t * maxRadius;
        const spiralX = x + Math.cos(angle) * radius;
        const spiralY = y + Math.sin(angle) * radius;
        if (i === 0) {
          pathData += `M${spiralX.toFixed(2)},${spiralY.toFixed(2)}`;
          canvasPath.push({ x: spiralX, y: spiralY, type: 'move' });
        } else {
          pathData += `L${spiralX.toFixed(2)},${spiralY.toFixed(2)}`;
          canvasPath.push({ x: spiralX, y: spiralY, type: 'line' });
        }
      }
      ctx.lineWidth = Math.max(1, intensity * 2);
      ctx.beginPath();
      canvasPath.forEach((point) => point.type === 'move' ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y));
      ctx.stroke();
      return `<path d="${pathData}" fill="none" stroke="currentColor" stroke-width="${Math.max(1, intensity * 2).toFixed(2)}"/>`;
    }
    return '';
  }

  // --- REFACTORED: Draws a single hexagon at given coordinates ---
  drawHexagon(ctx, x, y, intensity, config) {
    const { dotSize } = config;
    if (intensity > 0.05) {
      const hexSize = dotSize * intensity;
      let hexPoints = '';
      let firstPoint = null;
      let otherPoints = [];
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const hx = x + Math.cos(angle) * hexSize;
        const hy = y + Math.sin(angle) * hexSize;
        hexPoints += `${hx.toFixed(2)},${hy.toFixed(2)} `;
        if (i === 0) firstPoint = { hx, hy };
        else otherPoints.push({hx, hy});
      }
      ctx.beginPath();
      ctx.moveTo(firstPoint.hx, firstPoint.hy);
      otherPoints.forEach(p => ctx.lineTo(p.hx, p.hy));
      ctx.closePath();
      ctx.fill();
      return `<polygon points="${hexPoints.trim()}"/>`;
    }
    return '';
  }

  // --- REFACTORED: Draws a single wave-displaced dot at given coordinates ---
  drawWave(ctx, x, y, intensity, config) {
    const { dotSize, lineAngle } = config; // Uses lineAngle for wave direction
    if (intensity > 0.1) {
      const waveLength = config.spacing * 4;
      const angleRad = (lineAngle || 0) * Math.PI / 180;
      const wavePhase = (x * Math.cos(angleRad) - y * Math.sin(angleRad)) / waveLength * Math.PI * 2;
      const amplitude = dotSize * intensity;
      const displacement = Math.sin(wavePhase) * amplitude;
      const dispX = x + displacement * Math.sin(angleRad);
      const dispY = y + displacement * Math.cos(angleRad);
      const dotRadius = Math.max(1, dotSize * intensity * 0.3);
      ctx.beginPath();
      ctx.arc(dispX, dispY, dotRadius, 0, Math.PI * 2);
      ctx.fill();
      return `<circle cx="${dispX.toFixed(2)}" cy="${dispY.toFixed(2)}" r="${dotRadius.toFixed(2)}"/>`;
    }
    return '';
  }

  // --- REFACTORED: Draws a single flow-field line at given coordinates ---
  drawFlowField(ctx, x, y, intensity, config, gradients, width) {
    // Note: This pattern is a bit different as it needs pre-calculated gradients
    const { dotSize } = config;
    if (intensity > 0.1 && gradients) {
      const idx = Math.floor(y) * width + Math.floor(x);
      const gradient = gradients[idx];
      if(!gradient) return '';

      const flowLength = dotSize * intensity * 2;
      const endX = x + gradient.x * flowLength;
      const endY = y + gradient.y * flowLength;
      const lineWidth = Math.max(0.5, intensity * dotSize * 0.3);

      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(x, y, lineWidth, 0, Math.PI * 2);
      ctx.fill();

      return `<line x1="${x}" y1="${y}" x2="${endX.toFixed(2)}" y2="${endY.toFixed(2)}" stroke-width="${lineWidth.toFixed(2)}" stroke="currentColor"/><circle cx="${x}" cy="${y}" r="${lineWidth.toFixed(2)}"/>`;
    }
    return '';
  }

  generateVoronoiPattern(ctx, values, width, height, config) {
    const { dotSize, spacing } = config;
    let svg = '';
    const points = [];
    const gridSpacing = spacing * 1.5;
    for (let y = 0; y < height + gridSpacing; y += gridSpacing) {
      for (let x = 0; x < width + gridSpacing; x += gridSpacing) {
        const jitterX = (this.seedRandom() - 0.5) * spacing * 0.5;
        const jitterY = (this.seedRandom() - 0.5) * spacing * 0.5;
        points.push({ x: x + jitterX, y: y + jitterY, id: points.length });
      }
    }
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
          for (let i = 0; i < numSides; i++) {
            const angle = (i / numSides) * Math.PI * 2;
            const radiusVariation = 0.7 + this.seedRandom() * 0.6;
            const radius = baseRadius * radiusVariation;
            const x = point.x + Math.cos(angle) * radius;
            const y = point.y + Math.sin(angle) * radius;
            points_str += `${x.toFixed(2)},${y.toFixed(2)} `;
          }
          ctx.beginPath();
          const firstPoint = points_str.split(' ')[0].split(',');
          ctx.moveTo(parseFloat(firstPoint[0]), parseFloat(firstPoint[1]));
          points_str.trim().split(' ').slice(1).forEach(pointStr => {
            if (pointStr) {
              const [x, y] = pointStr.split(',');
              ctx.lineTo(parseFloat(x), parseFloat(y));
            }
          });
          ctx.closePath();
          ctx.fill();
          svg += `<polygon points="${points_str.trim()}"/>`;
        }
      }
    });
    return svg;
  }

  /**
   * Generate fractal pattern (simplified Sierpinski-like)
   */
  generateFractalPattern(ctx, values, width, height, config) {
    const { dotSize, spacing } = config;
    let svg = '';

    // Generate fractal points using chaos game method
    const iterations = Math.floor((width * height) / (spacing * spacing));

    // Initial triangle vertices
    const vertices = [
      { x: width * 0.5, y: height * 0.1 },
      { x: width * 0.1, y: height * 0.9 },
      { x: width * 0.9, y: height * 0.9 }
    ];

    let currentX = width * 0.5;
    let currentY = height * 0.5;

    for (let i = 0; i < iterations; i++) {
      // Choose random vertex
      const vertex = vertices[Math.floor(this.seedRandom() * 3)];

      // Move halfway to chosen vertex
      currentX = (currentX + vertex.x) / 2;
      currentY = (currentY + vertex.y) / 2;

      // Sample intensity at this point
      if (currentX >= 0 && currentX < width && currentY >= 0 && currentY < height) {
        const pixelX = Math.floor(currentX);
        const pixelY = Math.floor(currentY);
        const idx = pixelY * width + pixelX;
        const intensity = values[idx] || 0;

        if (intensity > 0.1) {
          const dotRadius = Math.max(0.5, dotSize * intensity * 0.5);

          // Canvas drawing
          ctx.beginPath();
          ctx.arc(currentX, currentY, dotRadius, 0, Math.PI * 2);
          ctx.fill();

          svg += `<circle cx="${currentX.toFixed(2)}" cy="${currentY.toFixed(2)}" r="${dotRadius.toFixed(2)}"/>`;
        }
      }
    }

    return svg;
  }

  /**
   * Generate flow field pattern (dots follow image gradients)
   */
  generateFlowFieldPattern(ctx, values, width, height, config) {
    const { dotSize, spacing } = config;
    let svg = '';

    // Calculate gradient field
    const gradients = this.calculateGradientField(values, width, height);
    // Bind the single-draw function with the pre-calculated gradients
    const coreDrawFn = (ctx, x, y, intensity, config) => this.drawFlowField(ctx, x, y, intensity, config, gradients, width);
    // This pattern type is now handled via the main switch in halftonePatterns.js
    // This function is kept for its gradient calculation logic
    return svg;
  }

  /**
   * Calculate gradient field for flow patterns
   */
  calculateGradientField(values, width, height) {
    const gradients = new Array(width * height);

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;

        // Sobel operator
        const gx =
          -1 * (values[(y-1) * width + (x-1)] || 0) +
          -2 * (values[y * width + (x-1)] || 0) +
          -1 * (values[(y+1) * width + (x-1)] || 0) +
          1 * (values[(y-1) * width + (x+1)] || 0) +
          2 * (values[y * width + (x+1)] || 0) +
          1 * (values[(y+1) * width + (x+1)] || 0);

        const gy =
          -1 * (values[(y-1) * width + (x-1)] || 0) +
          -2 * (values[(y-1) * width + x] || 0) +
          -1 * (values[(y-1) * width + (x+1)] || 0) +
          1 * (values[(y+1) * width + (x-1)] || 0) +
          2 * (values[(y+1) * width + x] || 0) +
          1 * (values[(y+1) * width + (x+1)] || 0);

        const magnitude = Math.sqrt(gx * gx + gy * gy);
        gradients[idx] = magnitude > 0 ?
          { x: gx / magnitude, y: gy / magnitude } :
          { x: 0, y: 0 };
      }
    }

    return gradients;
  }
}

window.AdvancedPatterns = AdvancedPatterns;