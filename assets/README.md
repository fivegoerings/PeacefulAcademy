# Icon Assets for Peaceful Academy

This directory contains all the icon assets for the Peaceful Academy homeschool records application.

## Files

### Main Icons
- `icon.svg` - Master SVG icon (512x512) with education-themed design
- `icon-192.png` - 192x192 PNG for PWA
- `icon-256.png` - 256x256 PNG for PWA  
- `icon-384.png` - 384x384 PNG for PWA
- `icon-512.png` - 512x512 PNG for PWA (maskable)

### Favicon Files (in root directory)
- `favicon.svg` - SVG favicon (32x32)
- `favicon.ico` - ICO favicon (32x32) - placeholder
- `apple-touch-icon.png` - Apple touch icon (180x180) - placeholder

## Icon Design

The icon features:
- **Book**: Represents education and learning
- **Graduation Cap**: Symbolizes academic achievement
- **Peaceful Elements**: Small leaves representing the "peaceful" nature
- **Color Scheme**: 
  - Background: Dark navy (`#0b1226`)
  - Primary: Green (`#22c55e`) 
  - Secondary: Cyan (`#06b6d4`)
  - Accent: Gold (`#f59e0b`) and Red (`#ef4444`)

## Generating PNG Icons

To regenerate the PNG icons from the SVG:

1. Install dependencies:
   ```bash
   npm install sharp
   ```

2. Run the generator:
   ```bash
   node generate-icons.js
   ```

This will create all the PNG icons in the correct sizes.

## Usage

The icons are referenced in:
- `manifest.webmanifest` - PWA icons
- `index.html` - Favicon references
- `admin/index.html` - Admin favicon references

## Notes

- The current PNG files may need regeneration for optimal quality
- The favicon.ico and apple-touch-icon.png files are currently SVG placeholders
- For production, convert these to proper binary formats using online tools or image editors
