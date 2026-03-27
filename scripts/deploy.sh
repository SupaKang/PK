#!/bin/bash
echo "Building Pocket Kingdom..."
npx vite build
echo ""
echo "Build complete!"
echo "Deploy the 'dist/' folder to any static hosting service:"
echo "  - Netlify: drag & drop dist/"
echo "  - Vercel: vercel --prod"
echo "  - GitHub Pages: push dist/ to gh-pages branch"
echo ""
echo "Build size:"
ls -lh dist/assets/*.js
echo ""
echo "Game ready at: dist/index.html"
