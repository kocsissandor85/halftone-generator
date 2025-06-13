/**
 * SVG export utilities with optimization
 */

class SVGExporter {
  constructor() {
    this.svgData = {};
  }

  /**
   * Store SVG data for a channel
   */
  storeSVG(channel, svg) {
    this.svgData[channel] = svg;
  }

  /**
   * Download SVG file
   */
  downloadSVG(channel) {
    const svg = this.svgData[channel];
    if (!svg) {
      console.error(`No SVG data found for channel: ${channel}`);
      return;
    }

    const optimizedSVG = this.optimizeSVG(svg);
    const blob = new Blob([optimizedSVG], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `halftone-${channel}-${new Date().getTime()}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Generate combined SVG from all channels
   */
  generateCombinedSVG(width, height, channels = ['cyan', 'magenta', 'yellow', 'black']) {
    let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
    svg += `<rect width="${width}" height="${height}" fill="white"/>`;

    // Add each channel as a group with blend mode
    channels.forEach((channel, index) => {
      const channelSvg = this.svgData[channel];
      if (channelSvg) {
        const channelColor = document.getElementById(channel + 'Color').value;
        svg += `<g style="mix-blend-mode: multiply;" opacity="0.8">`;

        // Extract elements from channel SVG (skip the wrapper)
        const elements = this.extractSVGElements(channelSvg);
        svg += elements.replace(/fill="[^"]*"/g, `fill="${channelColor}"`);

        svg += '</g>';
      }
    });

    svg += '</svg>';
    this.svgData.combined = svg;
    return svg;
  }

  /**
   * Extract SVG elements from a complete SVG string
   */
  extractSVGElements(svgString) {
    const match = svgString.match(/<g fill="[^"]*">(.*?)<\/g>/s);
    return match ? match[1] : '';
  }

  /**
   * Optimize SVG by removing redundant attributes and rounding coordinates
   */
  optimizeSVG(svg) {
    return svg
      .replace(/(\d+\.\d{3,})/g, (match) => parseFloat(match).toFixed(2))
      .replace(/\s+/g, ' ')
      .replace(/>\s+</g, '><')
      .trim();
  }

  /**
   * Export to HPGL format (basic implementation)
   */
  exportToHPGL(channel) {
    const svg = this.svgData[channel];
    if (!svg) return null;

    let hpgl = 'IN;SP1;'; // Initialize, select pen 1

    // Extract circles and convert to HPGL
    const circles = svg.match(/<circle[^>]+>/g) || [];
    circles.forEach(circle => {
      const cx = parseFloat(circle.match(/cx="([^"]+)"/)?.[1] || 0);
      const cy = parseFloat(circle.match(/cy="([^"]+)"/)?.[1] || 0);
      const r = parseFloat(circle.match(/r="([^"]+)"/)?.[1] || 0);

      // Convert to HPGL coordinates (typically 1016 units per inch)
      const hpglX = Math.round(cx * 40);
      const hpglY = Math.round(cy * 40);
      const hpglR = Math.round(r * 40);

      hpgl += `PU${hpglX},${hpglY};CI${hpglR};`;
    });

    // Extract lines and convert to HPGL
    const lines = svg.match(/<line[^>]+>/g) || [];
    lines.forEach(line => {
      const x1 = parseFloat(line.match(/x1="([^"]+)"/)?.[1] || 0);
      const y1 = parseFloat(line.match(/y1="([^"]+)"/)?.[1] || 0);
      const x2 = parseFloat(line.match(/x2="([^"]+)"/)?.[1] || 0);
      const y2 = parseFloat(line.match(/y2="([^"]+)"/)?.[1] || 0);

      const hpglX1 = Math.round(x1 * 40);
      const hpglY1 = Math.round(y1 * 40);
      const hpglX2 = Math.round(x2 * 40);
      const hpglY2 = Math.round(y2 * 40);

      hpgl += `PU${hpglX1},${hpglY1};PD${hpglX2},${hpglY2};`;
    });

    hpgl += 'PU;'; // Pen up at end
    return hpgl;
  }

  /**
   * Download HPGL file
   */
  downloadHPGL(channel) {
    const hpgl = this.exportToHPGL(channel);
    if (!hpgl) {
      console.error(`No HPGL data generated for channel: ${channel}`);
      return;
    }

    const blob = new Blob([hpgl], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `halftone-${channel}-${new Date().getTime()}.hpgl`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Generate plotting statistics
   */
  getPlottingStats(channel) {
    const svg = this.svgData[channel];
    if (!svg) return null;

    const circles = (svg.match(/<circle/g) || []).length;
    const lines = (svg.match(/<line/g) || []).length;
    const polygons = (svg.match(/<polygon/g) || []).length;
    const rects = (svg.match(/<rect/g) || []).length - 1; // Subtract background rect

    return {
      circles,
      lines,
      polygons,
      rectangles: rects,
      totalElements: circles + lines + polygons + rects,
      estimatedPlotTime: this.estimatePlotTime(circles, lines, polygons, rects)
    };
  }

  /**
   * Estimate plotting time (rough calculation)
   */
  estimatePlotTime(circles, lines, polygons, rects) {
    // Rough estimates in seconds
    const circleTime = circles * 0.5; // 0.5 seconds per circle
    const lineTime = lines * 0.1; // 0.1 seconds per line
    const polygonTime = polygons * 0.3; // 0.3 seconds per polygon
    const rectTime = rects * 0.2; // 0.2 seconds per rectangle

    const totalSeconds = circleTime + lineTime + polygonTime + rectTime;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.round(totalSeconds % 60);

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Export all channels as a ZIP file (requires JSZip library)
   */
  async downloadAllChannels() {
    // This would require JSZip library
    // For now, download individually
    const channels = ['cyan', 'magenta', 'yellow', 'black'];
    channels.forEach(channel => {
      if (this.svgData[channel]) {
        setTimeout(() => this.downloadSVG(channel), 100 * channels.indexOf(channel));
      }
    });
  }
}

// Export for use in main.js
window.SVGExporter = SVGExporter;