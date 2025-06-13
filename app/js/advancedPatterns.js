/**
 * Advanced pattern generators for enhanced halftone effects
 */

class AdvancedPatterns {
  constructor() {
    this.seedRandom = this.createSeededRandom(12345);
  }

  /**
   * Create a seeded random number generator for consistent results
   */
  createSeededRandom(seed) {
    return function() {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
  }

  /**
   * Generate Voronoi cell pattern
   */
  generateVoronoiPattern(ctx, values, width, height, config) {
    const { dotSize, spacing } = config;
    let svg = '';

    // Generate seed points based on spacing
    const points = [];
    const gridSpacing = spacing * 1.5;

    for (let y = 0; y < height + gridSpacing; y += gridSpacing) {
      for (let x = 0; x < width + gridSpacing; x += gridSpacing) {
        // Add some randomness to avoid perfect grid
        const jitterX = (this.seedRandom() - 0.5) * spacing * 0.5;
        const jitterY = (this.seedRandom() - 0.5) * spacing * 0.5;

        points.push({
          x: x + jitterX,
          y: y + jitterY,
          id: points.length
        });
      }
    }

    // For each point, create a cell based on local intensity
    points.forEach(point => {
      if (point.x >= 0 && point.x < width && point.y >= 0 && point.y < height) {
        const pixelX = Math.floor(point.x);
        const pixelY = Math.floor(point.y);
        const idx = pixelY * width + pixelX;
        const intensity = values[idx] || 0;

        if (intensity > 0.05) {
          // Create irregular polygon around point
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

          // Draw on canvas
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
   * Generate concentric circle pattern
   */
  generateConcentricPattern(ctx, values, width, height, config) {
    const { dotSize, spacing } = config;
    let svg = '';

    for (let y = 0; y < height; y += spacing) {
      for (let x = 0; x < width; x += spacing) {
        const idx = y * width + x;
        const intensity = values[idx] || 0;

        if (intensity > 0.1) {
          const maxRadius = dotSize * intensity;
          const numRings = Math.floor(intensity * 4) + 1;

          for (let ring = 0; ring < numRings; ring++) {
            const radius = (maxRadius / numRings) * (ring + 1);
            const strokeWidth = Math.max(0.5, maxRadius / numRings * 0.3);

            // Canvas drawing
            ctx.lineWidth = strokeWidth;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.stroke();

            // SVG
            svg += `<circle cx="${x}" cy="${y}" r="${radius.toFixed(2)}" fill="none" stroke="currentColor" stroke-width="${strokeWidth.toFixed(2)}"/>`;
          }
        }
      }
    }

    return svg;
  }

  /**
   * Generate spiral pattern
   */
  generateSpiralPattern(ctx, values, width, height, config) {
    const { dotSize, spacing } = config;
    let svg = '';

    for (let y = 0; y < height; y += spacing) {
      for (let x = 0; x < width; x += spacing) {
        const idx = y * width + x;
        const intensity = values[idx] || 0;

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

          // Canvas drawing
          ctx.lineWidth = Math.max(1, intensity * 2);
          ctx.beginPath();
          canvasPath.forEach((point, i) => {
            if (point.type === 'move') {
              ctx.moveTo(point.x, point.y);
            } else {
              ctx.lineTo(point.x, point.y);
            }
          });
          ctx.stroke();

          // SVG
          svg += `<path d="${pathData}" fill="none" stroke="currentColor" stroke-width="${Math.max(1, intensity * 2).toFixed(2)}"/>`;
        }
      }
    }

    return svg;
  }

  /**
   * Generate hexagonal grid pattern
   */
  generateHexagonalPattern(ctx, values, width, height, config) {
    const { dotSize, spacing } = config;
    let svg = '';

    const hexHeight = spacing * Math.sqrt(3);
    const hexWidth = spacing * 2;

    for (let row = 0; row < height / hexHeight + 1; row++) {
      for (let col = 0; col < width / hexWidth + 1; col++) {
        const x = col * hexWidth * 0.75;
        const y = row * hexHeight + (col % 2 === 1 ? hexHeight / 2 : 0);

        if (x >= 0 && x < width && y >= 0 && y < height) {
          const pixelX = Math.floor(x);
          const pixelY = Math.floor(y);
          const idx = pixelY * width + pixelX;
          const intensity = values[idx] || 0;

          if (intensity > 0.05) {
            const hexSize = dotSize * intensity;

            // Generate hexagon points
            let hexPoints = '';
            for (let i = 0; i < 6; i++) {
              const angle = (i / 6) * Math.PI * 2;
              const hx = x + Math.cos(angle) * hexSize;
              const hy = y + Math.sin(angle) * hexSize;
              hexPoints += `${hx.toFixed(2)},${hy.toFixed(2)} `;
            }

            // Canvas drawing
            ctx.beginPath();
            const firstHexPoint = hexPoints.split(' ')[0].split(',');
            ctx.moveTo(parseFloat(firstHexPoint[0]), parseFloat(firstHexPoint[1]));

            hexPoints.trim().split(' ').slice(1).forEach(pointStr => {
              if (pointStr) {
                const [hx, hy] = pointStr.split(',');
                ctx.lineTo(parseFloat(hx), parseFloat(hy));
              }
            });
            ctx.closePath();
            ctx.fill();

            svg += `<polygon points="${hexPoints.trim()}"/>`;
          }
        }
      }
    }

    return svg;
  }

  /**
   * Generate wave pattern
   */
  generateWavePattern(ctx, values, width, height, config) {
    const { dotSize, spacing, angle } = config;
    let svg = '';

    const waveLength = spacing * 4;
    const angleRad = (angle || 0) * Math.PI / 180;

    for (let y = 0; y < height; y += spacing / 2) {
      for (let x = 0; x < width; x += spacing / 2) {
        const idx = y * width + x;
        const intensity = values[idx] || 0;

        if (intensity > 0.1) {
          // Calculate wave displacement
          const rotX = x * Math.cos(angleRad) - y * Math.sin(angleRad);
          const wavePhase = (rotX / waveLength) * Math.PI * 2;
          const amplitude = dotSize * intensity;
          const displacement = Math.sin(wavePhase) * amplitude;

          // Apply wave displacement perpendicular to wave direction
          const dispX = x + displacement * Math.sin(angleRad);
          const dispY = y + displacement * Math.cos(angleRad);

          const dotRadius = Math.max(1, dotSize * intensity * 0.3);

          // Canvas drawing
          ctx.beginPath();
          ctx.arc(dispX, dispY, dotRadius, 0, Math.PI * 2);
          ctx.fill();

          svg += `<circle cx="${dispX.toFixed(2)}" cy="${dispY.toFixed(2)}" r="${dotRadius.toFixed(2)}"/>`;
        }
      }
    }

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

    for (let y = spacing; y < height - spacing; y += spacing) {
      for (let x = spacing; x < width - spacing; x += spacing) {
        const idx = y * width + x;
        const intensity = values[idx] || 0;

        if (intensity > 0.1) {
          const gradient = gradients[idx];
          const flowLength = dotSize * intensity * 2;

          // Create flow line
          const endX = x + gradient.x * flowLength;
          const endY = y + gradient.y * flowLength;

          const lineWidth = Math.max(0.5, intensity * dotSize * 0.3);

          // Canvas drawing
          ctx.lineWidth = lineWidth;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(endX, endY);
          ctx.stroke();

          svg += `<line x1="${x}" y1="${y}" x2="${endX.toFixed(2)}" y2="${endY.toFixed(2)}" stroke-width="${lineWidth.toFixed(2)}" stroke="currentColor"/>`;

          // Add dot at start
          ctx.beginPath();
          ctx.arc(x, y, lineWidth, 0, Math.PI * 2);
          ctx.fill();

          svg += `<circle cx="${x}" cy="${y}" r="${lineWidth.toFixed(2)}"/>`;
        }
      }
    }

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

// Export for use in other modules
window.AdvancedPatterns = AdvancedPatterns;