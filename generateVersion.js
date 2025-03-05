import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const packageVersion = await fs.readFile('./package.json', 'utf8');

const packageInfo = JSON.parse(packageVersion);

const context = `// Этот файл сгенерирован автоматически
export const version = '${packageInfo.version}';
`;

await fs.writeFile(path.resolve(__dirname, 'version.js'), context);
