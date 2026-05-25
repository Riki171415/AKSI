import sys
from PIL import Image
from collections import Counter

def get_dominant_colors(image_path, num_colors=5):
    try:
        img = Image.open(image_path)
        img = img.convert('RGBA')
        pixels = list(img.getdata())
        
        # Filter out transparent and pure white/black or near white pixels
        valid_pixels = []
        for r, g, b, a in pixels:
            if a > 200 and not (r > 240 and g > 240 and b > 240) and not (r < 15 and g < 15 and b < 15):
                valid_pixels.append((r, g, b))
                
        # Count colors
        counter = Counter(valid_pixels)
        dominant_colors = counter.most_common(num_colors)
        
        for idx, (color, count) in enumerate(dominant_colors):
            hex_color = '#{:02x}{:02x}{:02x}'.format(*color)
            print(f"Color {idx+1}: {hex_color} (RGB: {color}) - Count: {count}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    get_dominant_colors("logo APCI.png")
