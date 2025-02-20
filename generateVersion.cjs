const fs = require('fs');

let version = '';

const packageVersion = fs.readFileSync('./package.json', 'utf8');
const packageInfo = JSON.parse(packageVersion);

version = packageInfo.version;
