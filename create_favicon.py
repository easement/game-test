from PIL import Image, ImageDraw
import os

def create_favicon():
    # Create a 32x32 image with transparency
    img = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Draw a gem shape
    # Define gem points
    points = [
        (16, 2),   # top
        (30, 12),  # right top
        (24, 28),  # right bottom
        (8, 28),   # left bottom
        (2, 12),   # left top
    ]
    
    # Draw the gem shape
    draw.polygon(points, fill=(147, 0, 211, 255))  # Purple fill
    
    # Add highlight
    highlight_points = [
        (16, 2),
        (30, 12),
        (24, 16),
        (16, 12),
        (8, 16)
    ]
    draw.polygon(highlight_points, fill=(200, 100, 255, 200))
    
    # Save as ICO file
    if not os.path.exists('favicon.ico'):
        img.save('favicon.ico', format='ICO', sizes=[(32, 32)])

if __name__ == '__main__':
    create_favicon() 