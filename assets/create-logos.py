# EAGOWL-POC Logo Generation Script
# This script helps generate all required logo variants from your source logo

import os
import sys
from PIL import Image, ImageDraw, ImageFont

def create_logo_variants(source_path, output_dir):
    """
    Create all required logo variants from source image
    
    Args:
        source_path: Path to source logo file (logo1.png)
        output_dir: Directory to save generated variants
    """
    
    if not os.path.exists(source_path):
        print(f"Error: Source logo not found at {source_path}")
        print("Please place your logo1.png file in the assets directory")
        return False
    
    # Create output directories
    dirs = ['logos', 'icons', 'splash']
    for dir_name in dirs:
        os.makedirs(os.path.join(output_dir, dir_name), exist_ok=True)
    
    try:
        # Open source image
        source_img = Image.open(source_path).convert('RGBA')
        
        # Create color variants
        variants = {
            'color': source_img,  # Original
            'white': create_monochrome(source_img, (255, 255, 255)),
            'black': create_monochrome(source_img, (0, 0, 0))
        }
        
        # Mobile app icons
        print("Creating mobile app icons...")
        create_mobile_icons(variants, output_dir)
        
        # Desktop console icons  
        print("Creating desktop console icons...")
        create_desktop_icons(variants, output_dir)
        
        # Web interface logos
        print("Creating web interface logos...")
        create_web_logos(variants, output_dir)
        
        # Splash screens
        print("Creating splash screens...")
        create_splash_screens(variants, output_dir)
        
        print(f"All logo variants created in {output_dir}")
        return True
        
    except Exception as e:
        print(f"Error processing logo: {e}")
        return False

def create_monochrome(img, color):
    """Create monochrome version with given color"""
    alpha = img.split()[3] if img.mode == 'RGBA' else None
    mono = Image.new('RGBA', img.size, (*color, 255))
    
    if alpha:
        mono.putalpha(alpha)
    
    return mono

def create_mobile_icons(variants, output_dir):
    """Create mobile app icons"""
    
    icon_sizes = [
        ('36', 36),
        ('48', 48), 
        ('72', 72),
        ('96', 96),
        ('144', 144),
        ('192', 192),
        ('512', 512)
    ]
    
    # Android adaptive icon
    adaptive_size = 1024
    adaptive_bg = Image.new('RGBA', (adaptive_size, adaptive_size), (26, 26, 26))  # #1a1a1a
    
    # Resize logo to fit in adaptive icon (with padding)
    logo_size = int(adaptive_size * 0.6)  # 60% of canvas
    logo_resized = variants['color'].resize((logo_size, logo_size), Image.LANCZOS)
    
    # Center logo on adaptive background
    offset = (adaptive_size - logo_size) // 2
    adaptive_bg.paste(logo_resized, (offset, offset), logo_resized)
    adaptive_bg.save(os.path.join(output_dir, 'icons', 'adaptive-icon.png'))
    
    # Regular app icons
    for size_name, size in icon_sizes:
        icon = variants['color'].resize((size, size), Image.LANCZOS)
        icon.save(os.path.join(output_dir, 'icons', f'icon-{size_name}x{size_name}.png'))

def create_desktop_icons(variants, output_dir):
    """Create desktop console icons"""
    
    sizes = [16, 32, 48, 64, 128, 256, 512]
    
    # PNG icons for Linux
    for size in sizes:
        icon = variants['color'].resize((size, size), Image.LANCZOS)
        icon.save(os.path.join(output_dir, 'icons', f'icon_{size}x{size}.png'))
    
    # ICO file for Windows (multi-size)
    create_ico_file(variants['color'], output_dir, sizes)
    
    # ICNS file for macOS (placeholder - would require additional tools)
    # For now, create high-res PNG
    high_res = variants['color'].resize((1024, 1024), Image.LANCZOS)
    high_res.save(os.path.join(output_dir, 'icons', 'icon.icns.png'))

def create_ico_file(img, output_dir, sizes):
    """Create Windows ICO file with multiple sizes"""
    from PIL import Image
    
    icons = []
    for size in sizes:
        if size <= 256:  # ICO max size
            icon = img.resize((size, size), Image.LANCZOS)
            icons.append(icon)
    
    if icons:
        icons[0].save(
            os.path.join(output_dir, 'icons', 'icon.ico'),
            format='ICO',
            sizes=[(i.width, i.height) for i in icons]
        )

def create_web_logos(variants, output_dir):
    """Create web interface logos"""
    
    # Header logo (landscape)
    header_img = variants['color'].resize((400, 100), Image.LANCZOS)
    header_img.save(os.path.join(output_dir, 'logos', 'logo-header.png'))
    
    # Login logo (square)
    login_img = variants['color'].resize((300, 300), Image.LANCZOS)
    login_img.save(os.path.join(output_dir, 'logos', 'logo-login.png'))
    
    # Favicon (multiple sizes in one file)
    favicon_sizes = [16, 32, 48]
    create_ico_file(variants['color'], os.path.join(output_dir, 'logos'), favicon_sizes)
    os.rename(
        os.path.join(output_dir, 'logos', 'icon.ico'),
        os.path.join(output_dir, 'logos', 'favicon.ico')
    )

def create_splash_screens(variants, output_dir):
    """Create mobile splash screens"""
    
    # iOS splash screen (iPhone X/11/12 dimensions)
    splash_width, splash_height = 1242, 2688
    splash_bg = Image.new('RGBA', (splash_width, splash_height), (26, 26, 26))  # Dark background
    
    # Resize logo for splash (smaller than app icon)
    logo_size = int(min(splash_width, splash_height) * 0.2)  # 20% of min dimension
    logo_resized = variants['white'].resize((logo_size, logo_size), Image.LANCZOS)
    
    # Center logo on splash
    offset_x = (splash_width - logo_size) // 2
    offset_y = (splash_height - logo_size) // 2
    
    splash_bg.paste(logo_resized, (offset_x, offset_y), logo_resized)
    splash_bg.save(os.path.join(output_dir, 'splash', 'splash.png'))
    
    # Android splash (more square)
    android_splash = Image.new('RGBA', (1080, 1920), (26, 26, 26))
    android_logo_size = int(1080 * 0.15)  # 15% of width
    android_logo = variants['white'].resize((android_logo_size, android_logo_size), Image.LANCZOS)
    
    android_offset_x = (1080 - android_logo_size) // 2
    android_offset_y = (1920 - android_logo_size) // 2
    
    android_splash.paste(android_logo, (android_offset_x, android_offset_y), android_logo)
    android_splash.save(os.path.join(output_dir, 'splash', 'splash-android.png'))

def main():
    """Main function"""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    assets_dir = script_dir
    
    # Look for logo1.png
    source_path = os.path.join(assets_dir, 'logo1.png')
    
    if not os.path.exists(source_path):
        print("Error: logo1.png not found!")
        print("Please place your EAGOWL-POC logo as 'logo1.png' in the assets directory.")
        print("Required logo specifications:")
        print("  - Format: PNG with transparency")
        print("  - Size: At least 1024x1024 pixels")
        print("  - Colors: Primary green (#00ff88) and white/black variants")
        print("  - Background: Transparent")
        return 1
    
    # Create all variants
    success = create_logo_variants(source_path, assets_dir)
    
    if success:
        print("\nLogo generation completed successfully!")
        print("\nNext steps:")
        print("1. Copy mobile icons to: mobile/app-icons/")
        print("2. Copy desktop icons to: dispatch-console/assets/")
        print("3. Copy web logos to: appropriate web directories")
        print("4. Update app.json and electron-builder configs")
        return 0
    else:
        print("Logo generation failed!")
        return 1

if __name__ == "__main__":
    sys.exit(main())