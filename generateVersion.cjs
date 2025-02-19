const fs = require('fs');
const path = require('path');

const packageVersion = fs.readFileSync('./package.json', 'utf8');

const packageInfo = JSON.parse(packageVersion);

const context = `// Этот файл сгенерирован автоматически
export const version = '${packageInfo.version}';
`;

fs.writeFileSync(path.resolve(__dirname, './src/version.ts'), context);
