from PIL import Image, ImageDraw
import os

# Create assets directory if it doesn't exist
if not os.path.exists('assets'):
    os.makedirs('assets')

# Colors for the gems
colors = {
    'red': (255, 68, 68),
    'blue': (68, 68, 255),
    'green': (68, 255, 68),
    'yellow': (255, 255, 68),
    'purple': (255, 68, 255)
}

size = 64

for name, color in colors.items():
    # Create new image with alpha channel
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Draw gem shape
    points = [
        (size//2, 5),      # top
        (size-5, size//2),  # right
        (size//2, size-5),  # bottom
        (5, size//2)       # left
    ]
    
    # Draw the gem with the base color
    draw.polygon(points, fill=color + (255,))
    
    # Add highlight (simple white triangle in top-left)
    highlight_points = [(15, 15), (25, 15), (15, 25)]
    draw.polygon(highlight_points, fill=(255, 255, 255, 180))
    
    # Save the image
    img.save(f'assets/{name}_gem.png', 'PNG')

print("Gem images have been generated in the assets directory!") 