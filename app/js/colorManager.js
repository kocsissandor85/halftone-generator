/**
 * @file Contains a utility class for generating and managing color palettes.
 * This includes a large collection of curated CMYK palettes and a programmatic
 * generator for creating harmonious palettes for any number of colors.
 */

class ColorManager {
  /**
   * A large, curated collection of harmonious CMYK-like color palettes.
   * @type {Array<Object.<string, string>>}
   * @private
   */
  static _cmykPalettes = [
    { name: 'Retro Print', c: '#3d9a9c', m: '#d75a8b', y: '#e5c36a', k: '#3a3a3a' },
    { name: 'Vibrant Pop', c: '#00f2ff', m: '#ff00aa', y: '#fff800', k: '#1a1a1a' },
    { name: 'Faded Beach', c: '#88ccee', m: '#f5a9b8', y: '#fef4a7', k: '#6c5c53' },
    { name: 'Forest Tones', c: '#1a936f', m: '#a44a3f', y: '#f3ca40', k: '#272d2d' },
    { name: 'Blueprint', c: '#005f73', m: '#0a9396', y: '#94d2bd', k: '#001219' },
    { name: 'Autumn', c: '#e85d04', m: '#d00000', y: '#ffba08', k: '#370617' },
    { name: 'Sunset', c: '#F79D65', m: '#F4845F', y: '#F27059', k: '#F25C54' },
    { name: 'Ocean Depths', c: '#1B5299', m: '#6290C3', y: '#8EA2C6', k: '#21295C' },
    { name: 'Technoir', c: '#FF42B8', m: '#230A59', y: '#7302A6', k: '#02020A' },
    { name: 'Vintage Comics', c: '#4A90E2', m: '#D0021B', y: '#F8E71C', k: '#000000' },
    { name: 'Sorbet', c: '#FFC8DD', m: '#FFAFCC', y: '#BDE0FE', k: '#A2D2FF' },
    { name: 'Industrial', c: '#585858', m: '#B8B8B8', y: '#D8D8D8', k: '#282828' },
    { name: 'Riso', c: '#FF4C65', m: '#4C95FF', y: '#FFF24C', k: '#2D2D2D' },
    { name: 'Earth & Sky', c: '#A8DADC', m: '#457B9D', y: '#1D3557', k: '#E63946' },
    { name: 'Cyberpunk', c: '#00f0ff', m: '#f000ff', y: '#ffff00', k: '#101010' },
    { name: 'Pastel Dream', c: '#a0c4ff', m: '#bdb2ff', y: '#ffc6ff', k: '#fffffc' },
    { name: 'Hot Metal', c: '#db222a', m: '#ff8c00', y: '#ffee32', k: '#232528' },
    { name: 'Midnight', c: '#03045e', m: '#0077b6', y: '#00b4d8', k: '#023047' },
    { name: 'Candy', c: '#FF8FAB', m: '#FFB3C6', y: '#CDE495', k: '#A1E4B5' },
    { name: 'Muted Rainbow', c: '#e07a5f', m: '#3d405b', y: '#81b29a', k: '#f2cc8f' }
  ];

  /**
   * Retrieves a random harmonious CMYK palette from the predefined list.
   * @returns {{name: string, c: string, m: string, y: string, k: string}} An object with c, m, y, k color properties.
   */
  static getCmykPalette() {
    const randomIndex = Math.floor(Math.random() * this._cmykPalettes.length);
    return this._cmykPalettes[randomIndex];
  }

  /**
   * Generates a palette of a specified size using a programmatic approach.
   * This is great for non-CMYK modes to provide infinite variety.
   * @param {number} numColors - The number of colors to generate (1-4).
   * @returns {string[]} An array of hex color strings.
   */
  static generateProgrammaticPalette(numColors) {
    const baseHue = Math.random();
    const saturation = 0.6 + Math.random() * 0.4;
    const lightness = 0.5 + Math.random() * 0.2;
    const palette = [];

    const toHex = (c) => {
      const hex = Math.round(c).toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    };
    const hslToHex = (h, s, l) => {
      let r, g, b;
      if (s === 0) { r = g = b = l; }
      else {
        const hue2rgb = (p, q, t) => {
          if (t < 0) t += 1;
          if (t > 1) t -= 1;
          if (t < 1/6) return p + (q - p) * 6 * t;
          if (t < 1/2) return q;
          if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
          return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
      }
      return `#${toHex(r * 255)}${toHex(g * 255)}${toHex(b * 255)}`;
    };

    switch (numColors) {
      case 1: // Monochrome
        palette.push(hslToHex(baseHue, 0.1, 0.2)); // Dark, slightly colored
        break;
      case 2: // Duotone - Complementary
        palette.push(hslToHex(baseHue, saturation, lightness - 0.1));
        palette.push(hslToHex((baseHue + 0.5) % 1.0, saturation, lightness + 0.1));
        break;
      case 3: // Tritone - Triadic
        palette.push(hslToHex(baseHue, saturation, lightness));
        palette.push(hslToHex((baseHue + 1/3) % 1.0, saturation, lightness));
        palette.push(hslToHex((baseHue + 2/3) % 1.0, saturation, lightness));
        break;
      case 4: // Tetradic (or other modes)
      default:
        palette.push(hslToHex(baseHue, saturation, lightness));
        palette.push(hslToHex((baseHue + 0.25) % 1.0, saturation, lightness));
        palette.push(hslToHex((baseHue + 0.5) % 1.0, saturation, lightness));
        palette.push(hslToHex((baseHue + 0.75) % 1.0, saturation, lightness));
        break;
    }
    return palette;
  }
}

// Attach to the global scope to be accessible by other scripts
self.ColorManager = ColorManager;