// Generate a 32x32 favicon.ico as a simple PNG data URL saved to public/
import fs from 'fs';

// Create a minimal 16x16 P crown icon as a base64 PNG
// Since we can't use canvas in Node without deps, create a simple SVG favicon instead
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" fill="#0a0a16"/>
  <text x="4" y="24" font-size="24" fill="#ffcc44" font-family="serif">P</text>
  <rect x="2" y="26" width="28" height="3" fill="#ffcc44"/>
</svg>`;

fs.writeFileSync('public/favicon.svg', svg);
console.log('Generated public/favicon.svg');
