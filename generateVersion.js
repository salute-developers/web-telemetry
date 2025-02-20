import { readFileSync } from 'node:fs';

export let version = '';

const packageVersion = readFileSync('./package.json', 'utf8');
const packageInfo = JSON.parse(packageVersion);

version = packageInfo.version;
