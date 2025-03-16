from PIL import Image, ImageDraw
import os

def create_jellyfish(color, filename):
    # Create a new image with transparency
    img = Image.new('RGBA', (64, 64), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Color definitions
    colors = {
        'pink': (255, 182, 193, 255),    # Light pink
        'blue': (135, 206, 235, 255),    # Sky blue
        'purple': (216, 191, 216, 255),  # Thistle purple
        'green': (144, 238, 144, 255),   # Light green
        'yellow': (255, 255, 224, 255)   # Light yellow
    }
    
    # Get the base color
    base_color = colors[color]
    
    # Create a slightly darker shade for details
    darker_color = tuple(max(0, c - 40) for c in base_color[:3]) + (255,)
    
    # Draw the jellyfish body (bell)
    bell_points = [
        (32, 15),  # top
        (50, 30),  # right
        (45, 40),  # bottom right
        (19, 40),  # bottom left
        (14, 30),  # left
    ]
    draw.polygon(bell_points, fill=base_color)
    
    # Add some highlights to the bell
    highlight_points = [
        (32, 18),  # top
        (45, 28),  # right
        (42, 35),  # bottom right
        (22, 35),  # bottom left
        (19, 28),  # left
    ]
    highlight_color = tuple(min(255, c + 30) for c in base_color[:3]) + (128,)
    draw.polygon(highlight_points, fill=highlight_color)
    
    # Draw tentacles
    for x in range(22, 43, 5):
        # Wavy tentacles
        for y in range(40, 60, 4):
            offset = 3 * ((y - 40) % 8) / 8
            draw.ellipse([x - 2 + offset, y, x + 2 + offset, y + 3], fill=darker_color)
    
    # Add cute eyes
    draw.ellipse([25, 25, 28, 28], fill=(0, 0, 0, 255))  # Left eye
    draw.ellipse([35, 25, 38, 28], fill=(0, 0, 0, 255))  # Right eye
    
    # Add small white dots for eye highlights
    draw.ellipse([26, 26, 27, 27], fill=(255, 255, 255, 255))  # Left highlight
    draw.ellipse([36, 26, 37, 27], fill=(255, 255, 255, 255))  # Right highlight
    
    # Add a cute smile
    draw.arc([28, 28, 35, 33], 0, 180, fill=(0, 0, 0, 255), width=1)
    
    # Ensure the assets directory exists
    os.makedirs('assets', exist_ok=True)
    
    # Save the image
    img.save(f'assets/{filename}.png')

# Create jellyfish for each color
jellyfish_colors = [
    ('pink', 'pink_jellyfish'),
    ('blue', 'blue_jellyfish'),
    ('purple', 'purple_jellyfish'),
    ('green', 'green_jellyfish'),
    ('yellow', 'yellow_jellyfish')
]

for color, filename in jellyfish_colors:
    create_jellyfish(color, filename)
    print(f"Created {filename}.png") 