import pkg from './package.json' with { type: 'json' };

export let packageVersion = '';

packageVersion = pkg.version;
