const fs = require('fs');
const path = require('path');

const filePath = path.join(
  __dirname,
  '..',
  'node_modules',
  'next',
  'dist',
  'export',
  'index.js'
);

if (!fs.existsSync(filePath)) {
  process.exit(0);
}

const original = fs.readFileSync(filePath, 'utf8');

if (original.includes('function hideFunctionProperties(value, seen = new WeakSet())')) {
  process.exit(0);
}

const helperNeedle = 'class ExportError extends Error {';
const helperInsert = `function hideFunctionProperties(value, seen = new WeakSet()) {\n    if (!value || (typeof value !== "object" && typeof value !== "function") || seen.has(value)) {\n        return;\n    }\n    seen.add(value);\n    for (const key of Object.keys(value)) {\n        const current = value[key];\n        if (typeof current === "function") {\n            Object.defineProperty(value, key, {\n                value: current,\n                enumerable: false,\n                configurable: true,\n                writable: true\n            });\n            continue;\n        }\n        hideFunctionProperties(current, seen);\n    }\n}\n\nclass ExportError extends Error {`;

let next = original.replace(helperNeedle, helperInsert);
if (next === original) {
  console.error('patch-next-export-workers: helper insertion point not found');
  process.exit(1);
}

const callNeedle = `    if (typeof nextConfig.exportPathMap !== 'function') {\n        nextConfig.exportPathMap = async (defaultMap)=>{\n            return defaultMap;\n        };\n    }\n`;
const callInsert = `    if (typeof nextConfig.exportPathMap !== 'function') {\n        nextConfig.exportPathMap = async (defaultMap)=>{\n            return defaultMap;\n        };\n    }\n    hideFunctionProperties(nextConfig);\n`;

next = next.replace(callNeedle, callInsert);
if (next === original || next === helperInsert) {
  console.error('patch-next-export-workers: config sanitization insertion point not found');
  process.exit(1);
}

fs.writeFileSync(filePath, next, 'utf8');
