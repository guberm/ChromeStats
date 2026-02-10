# Icon Placeholder

For the app to run properly, you need to add icon files to this directory:

- `icon.png` - Used for the app window and system tray (256x256 recommended)
- `icon.ico` - Used for Windows executable (can be generated from PNG)

## Quick Setup:

You can use any icon you like, or create a simple one using free tools:
- Use https://www.favicon-generator.org/ to convert PNG to ICO
- Or use ImageMagick: `magick convert icon.png -define icon:auto-resize=256,128,64,48,32,16 icon.ico`

For now, the app will work without icons (you may see warnings in console).
