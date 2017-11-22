#!/usr/bin/env node

/**
 * This file updates version in package.js from package.json (provided by semantic-release)
 */

const fs = require('fs');
const path = require('path');
const packageJSON = require(path.join(process.cwd(), './package.json'));
const packageJSPath = path.join(process.cwd(), 'package.js');
const packageJS = fs.readFileSync(packageJSPath, 'utf-8');
fs.writeFileSync(packageJSPath, packageJS.replace('0.0.0-semantic-release', packageJSON.version), 'utf-8');
