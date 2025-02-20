const fs = require('fs');
const path = require('path');

const packageVersion = fs.readFileSync('./package.json', 'utf8');
const packageInfo = JSON.parse(packageVersion);

global.__WEB_TELEMETRY_VERSION__ = packageInfo.version;
