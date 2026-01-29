#!/usr/bin/env python3
"""
Generate a custom word cloud image for TalentConnect
"""

try:
    from wordcloud import WordCloud
    import matplotlib.pyplot as plt
    from PIL import Image
    import numpy as np
except ImportError:
    print("Installing required packages...")
    import subprocess
    subprocess.check_call(['pip3', 'install', 'wordcloud', 'matplotlib', 'pillow', 'numpy'])
    from wordcloud import WordCloud
    import matplotlib.pyplot as plt
    from PIL import Image
    import numpy as np

# Your custom words with frequencies (higher = larger in cloud)
# Very minimal - just key words
words = {
    'LEADERSHIP': 100,
    'THE WINS': 95,
    'RELENTLESS': 85,
    'VISION': 80,
    'TALENT': 80
}

# Create word cloud with custom colors (just 2 colors - light gray and navy)
def gray_color_func(word, font_size, position, orientation, random_state=None, **kwargs):
    # Just two colors for cleaner look
    colors = [
        '#9CA3AF',  # light gray
        '#1A3A52',  # navy
    ]
    import random
    return random.choice(colors)

# Generate the word cloud
wordcloud = WordCloud(
    width=2000,
    height=1200,
    background_color='white',
    color_func=gray_color_func,
    relative_scaling=0.5,
    min_font_size=60,
    max_font_size=150,
    font_path=None,  # Use default font
    prefer_horizontal=0.8,
    random_state=42,  # For reproducibility
    max_words=15,  # Much fewer words for cleaner look
    repeat=True  # Allow word repetition
).generate_from_frequencies(words)

# Save the image
wordcloud.to_file('/Users/annetaylor/Desktop/atalentconnect/public/wordcloud-custom.png')
print("✓ Custom word cloud generated: public/wordcloud-custom.png")
print("This is 100% original and copyright-free!")
