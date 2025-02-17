const fs = require('fs');
const path = require('path');

const packageVersion = fs.readFileSync('./version.txt', 'utf8').trim();
console.log({packageVersion})

console.log(packageVersion)

const context = `// Этот файл сгенерирован автоматически
export const version = '${packageVersion}';
`;

fs.writeFileSync(path.resolve(__dirname, './src/version.ts'), context);
