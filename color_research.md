# Dark Mode Color Palette Research

## Material Design Guidelines

### Key Principles:
1. **Base surface color: #121212** (very dark gray, not pure black)
2. **Text opacity levels** (white on dark):
   - High-emphasis: 87% opacity (rgba(255, 255, 255, 0.87))
   - Medium-emphasis: 60% opacity (rgba(255, 255, 255, 0.60))
   - Disabled: 38% opacity (rgba(255, 255, 255, 0.38))
3. **Minimum contrast: 15.8:1** for body text on dark surfaces
4. **Error color: #CF6679** (soft red)
5. **Elevation**: Lighter surfaces for elevated elements (cards, dialogs)

### Why This Works:
- **Pure black (#000000) causes eye strain** due to extreme contrast
- **Dark gray (#121212) reduces halation effect** (light bleeding)
- **Reduced opacity for text** creates comfortable reading experience
- **Desaturated colors** are easier on eyes in dark mode

## Recommended Palette for VC Simulator:

### Backgrounds:
- **Main background**: #0d1117 (GitHub dark - slightly blue-tinted)
- **Card/Surface**: #161b22 (elevated surface)
- **Elevated surface**: #21262d (hover states, modals)

### Text:
- **Primary text**: rgba(255, 255, 255, 0.87) - #ffffff with 87% opacity
- **Secondary text**: rgba(255, 255, 255, 0.60) - #ffffff with 60% opacity
- **Muted text**: rgba(255, 255, 255, 0.45) - #ffffff with 45% opacity

### Borders:
- **Subtle borders**: rgba(255, 255, 255, 0.1) - barely visible
- **Medium borders**: rgba(255, 255, 255, 0.15) - more defined

### Accent Colors (desaturated for dark mode):
- **Primary (blue)**: #58a6ff (GitHub blue - softer than bright blue)
- **Success (green)**: #3fb950 (muted green)
- **Warning (yellow)**: #d29922 (muted gold)
- **Error (red)**: #f85149 (soft red)
- **Purple (charts)**: #a371f7 (muted purple)

### Chart Colors (vibrant but not harsh):
- Use desaturated versions of colors
- Avoid pure saturated colors (#ff0000, #00ff00, etc.)
- Prefer colors with lower saturation (50-70% instead of 100%)
