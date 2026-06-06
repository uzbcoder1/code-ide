import os
import glob

# Find all tsx files in src directory and subdirectories
files = glob.glob('src/**/*.tsx', recursive=True) + glob.glob('src/**/*.ts', recursive=True)

for file in files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if "http://127.0.0.1:8000" in content:
        # We need to replace string literals with template literals if necessary, or just simple replace.
        # It's safer to just replace the substring and use import.meta.env.VITE_API_URL
        content = content.replace("'http://127.0.0.1:8000", "`${import.meta.env.VITE_API_URL}")
        content = content.replace("http://127.0.0.1:8000", "${import.meta.env.VITE_API_URL}")
        
        with open(file, 'w', encoding='utf-8') as f:
            f.write(content)
            
print("Replaced successfully!")
