from PIL import Image, ImageDraw, ImageFilter, ImageEnhance
import random
import os

def create_parchment_texture(width, height):
    # Create base parchment color
    img = Image.new('RGB', (width, height), (225, 206, 154))
    draw = ImageDraw.Draw(img)
    
    # Add noise for texture
    for x in range(width):
        for y in range(height):
            noise = random.randint(-15, 15)
            pixel = img.getpixel((x, y))
            new_color = tuple(max(0, min(255, v + noise)) for v in pixel)
            img.putpixel((x, y), new_color)
    
    # Add some darker spots and stains
    for _ in range(20):
        x = random.randint(0, width-1)
        y = random.randint(0, height-1)
        radius = random.randint(5, 20)
        opacity = random.randint(20, 60)
        draw.ellipse((x-radius, y-radius, x+radius, y+radius), 
                    fill=(139, 69, 19, opacity))
    
    return img

def draw_path(draw, width, height):
    # Draw dotted path
    points = []
    x, y = width // 4, height // 4
    for _ in range(6):
        points.append((x, y))
        x += random.randint(-30, 30)
        y += random.randint(20, 40)
    
    # Draw dotted line
    for i in range(len(points)-1):
        x1, y1 = points[i]
        x2, y2 = points[i+1]
        steps = 10
        for t in range(steps):
            if t % 2 == 0:
                dot_x = x1 + (x2 - x1) * t / steps
                dot_y = y1 + (y2 - y1) * t / steps
                draw.ellipse((dot_x-2, dot_y-2, dot_x+2, dot_y+2), fill=(139, 69, 19))
    
    # Draw X marks the spot
    last_x, last_y = points[-1]
    draw.line((last_x-10, last_y-10, last_x+10, last_y+10), fill=(139, 69, 19), width=3)
    draw.line((last_x-10, last_y+10, last_x+10, last_y-10), fill=(139, 69, 19), width=3)

def create_treasure_map(width=200, height=300):
    # Create parchment background
    img = create_parchment_texture(width, height)
    draw = ImageDraw.Draw(img)
    
    # Draw compass rose
    compass_x, compass_y = width - 40, 40
    compass_size = 20
    draw.ellipse((compass_x-compass_size, compass_y-compass_size, 
                  compass_x+compass_size, compass_y+compass_size), 
                 outline=(139, 69, 19), width=2)
    
    # Draw compass points
    points = ['N', 'E', 'S', 'W']
    positions = [(0, -15), (15, 0), (0, 15), (-15, 0)]
    for point, pos in zip(points, positions):
        draw.text((compass_x + pos[0], compass_y + pos[1]), point, 
                 fill=(139, 69, 19))
    
    # Draw path and X
    draw_path(draw, width, height)
    
    # Add some mountains and trees
    for _ in range(5):
        x = random.randint(0, width-1)
        y = random.randint(0, height-1)
        draw.polygon([(x, y), (x-15, y+20), (x+15, y+20)], 
                    outline=(139, 69, 19))
    
    # Apply some filters for aged look
    img = img.filter(ImageFilter.SMOOTH)
    enhancer = ImageEnhance.Contrast(img)
    img = enhancer.enhance(0.9)
    
    # Save the image
    img.save('treasure_map.png', 'PNG')

if __name__ == '__main__':
    create_treasure_map() 