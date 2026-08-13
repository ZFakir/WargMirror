import os
import re

client_dir = r"C:\Users\Father Fakir\WARG-Platform\client"

# Function to replace href for a specific id, regardless of order
def update_nav(content, nav_id, new_href):
    # Case 1: id comes before href
    pattern1 = r'(<a[^>]*?id="' + nav_id + r'"[^>]*?href=")[^"]+(")'
    content = re.sub(pattern1, r'\g<1>' + new_href + r'\g<2>', content)
    
    # Case 2: href comes before id
    pattern2 = r'(<a[^>]*?href=")[^"]+("[^>]*?id="' + nav_id + r'")'
    content = re.sub(pattern2, r'\g<1>' + new_href + r'\g<2>', content)
    
    return content

html_files = [f for f in os.listdir(client_dir) if f.endswith('.html')]

for filename in html_files:
    filepath = os.path.join(client_dir, filename)
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    
    content = update_nav(content, 'nav-discover', 'home.html')
    content = update_nav(content, 'nav-library', 'catalogue.html')
    content = update_nav(content, 'nav-studio', 'catalogue.html')
    content = update_nav(content, 'nav-creator-studio', 'studio.html')
    content = update_nav(content, 'nav-account', 'user-profile.html')
    content = update_nav(content, 'nav-settings', 'user-profile.html#settings')
    
    # Manage friends link
    content = re.sub(r'(<a[^>]*?href=")#[^"]*friends(")', r'\1user-profile.html#friends\2', content)
    
    # Update game links (from cards) on home and catalogue
    if filename in ['home.html', 'catalogue.html']:
        # They might be <a href="..." class="game-card"> or something similar
        content = re.sub(r'(<a[^>]*?href=")(?:#game|[^"]*game\.html?)("[^>]*?class="[^"]*game-card[^"]*")', r'\1game.html\2', content)

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated nav items in {filename}")
