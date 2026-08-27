#!/usr/bin/env node
// Run this once after npm install to generate PWA icons from the SVG.
// Requires: npm install -g sharp-cli
// Usage: node generate-icons.js
//
// Or just place your own 192x192 and 512x512 PNGs in public/icons/
// and name them icon-192.png and icon-512.png.

const fs = require('fs')
const path = require('path')

const iconsDir = path.join(__dirname, 'public', 'icons')
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true })

console.log('Place your icon-192.png and icon-512.png in public/icons/')
console.log('Or run: npx pwa-asset-generator public/favicon.svg public/icons')
