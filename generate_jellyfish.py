import numpy as np
from PIL import Image, ImageDraw
import colorsys

def create_jellyfish(color, size=64):
    # Create a transparent background
    image = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    
    # Convert color names to highly saturated RGB values
    color_map = {
        'pink': (255, 20, 147),    # Deep pink
        'blue': (0, 128, 255),     # Bright blue
        'purple': (147, 0, 255),   # Vibrant purple
        'green': (0, 255, 128),    # Bright green
        'yellow': (255, 223, 0)    # Golden yellow
    }
    
    base_color = color_map[color]
    
    # Create more saturated variations of the base color
    h, s, v = colorsys.rgb_to_hsv(base_color[0]/255, base_color[1]/255, base_color[2]/255)
    s = min(1.0, s * 1.3)  # Increase saturation by 30%
    rgb = colorsys.hsv_to_rgb(h, s, v)
    main_color = tuple(int(x * 255) for x in rgb) + (255,)  # Add alpha channel
    
    # Draw the jellyfish body (bell)
    bell_radius = size // 3
    center = size // 2
    draw.ellipse((center - bell_radius, center - bell_radius * 1.2,
                  center + bell_radius, center + bell_radius * 0.8),
                 fill=main_color)
    
    # Draw tentacles
    num_tentacles = 6
    tentacle_length = size // 2
    for i in range(num_tentacles):
        angle = (i / num_tentacles) * np.pi
        x1 = center + bell_radius * 0.8 * np.cos(angle)
        y1 = center + bell_radius * 0.6
        x2 = center + (bell_radius * 0.6) * np.cos(angle)
        y2 = y1 + tentacle_length * 0.8
        draw.line([(x1, y1), (x2, y2)], fill=main_color, width=3)
    
    # Add highlights
    highlight_color = tuple(min(255, c + 50) for c in base_color[:3]) + (100,)
    draw.ellipse((center - bell_radius//2, center - bell_radius//2,
                  center + bell_radius//2, center),
                 fill=highlight_color)
    
    return image

# Generate jellyfish for each color
colors = ['pink', 'blue', 'purple', 'green', 'yellow']
for color in colors:
    img = create_jellyfish(color)
    img.save(f'assets/{color}_jellyfish.png') 