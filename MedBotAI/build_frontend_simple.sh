#!/bin/bash

echo "Building MedBot AI Frontend with simplified approach..."
cd "$(dirname "$0")/static"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

echo "Creating a simplified build..."

# Create dist directory
mkdir -p dist

# Copy public files
cp -r public/* dist/ 2>/dev/null || :

# Create a simplified bundle using esbuild directly
npx esbuild src/main.jsx --bundle --outfile=dist/assets/index.js --loader:.js=jsx --loader:.jsx=jsx --loader:.css=css --format=esm --target=es2015 --minify

# Create a simple HTML file that includes the bundle
cat > dist/index.html << EOF
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <link rel="icon" type="image/svg+xml" href="/favicon.ico" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>MedBot AI</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@3.3.0/dist/tailwind.min.css" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/assets/index.js"></script>
</body>
</html>
EOF

echo "Simplified build completed!"

# Copy the dist folder to the Flask static folder
mkdir -p ../static/dist
cp -r dist/* ../static/dist/

echo "Frontend build files copied to Flask static folder" 