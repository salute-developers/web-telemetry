import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile } from 'node:fs/promises';
import { glob } from 'glob';

import packageJson from './package.json' with { type: 'json' };

const __dirname = dirname(fileURLToPath(import.meta.url));

async function replaceVersionInFile(filePath, version) {
    try {
        let content = await readFile(filePath, 'utf8');

        if (content.includes('__TELEMETRY_VERSION__')) {
            console.log(`Updating version in ${filePath}`);
            content = content.replace(/__TELEMETRY_VERSION__/g, `${version}`);
            await writeFile(filePath, content, 'utf8');
            return true;
        }

        return false;
    } catch (error) {
        console.error(`Error processing ${filePath}:`, error);
        return false;
    }
}

const { version } = packageJson;

console.log(`Embedding version ${version} into files...`);

const libDir = join(__dirname, 'lib');
const esmDir = join(__dirname, 'esm');

try {
    const libFiles = glob.sync('**/*.js', { cwd: libDir, absolute: true });
    console.log(`Found ${libFiles.length} JS files in lib directory`);

    const esmFiles = glob.sync('**/*.js', { cwd: esmDir, absolute: true });
    console.log(`Found ${esmFiles.length} JS files in esm directory`);

    const allFiles = [...libFiles, ...esmFiles];
    let updatedCount = 0;

    for (const file of allFiles) {
        const updated = await replaceVersionInFile(file, version);

        if (updated) {
            updatedCount++;
        }
    }

    console.log(`Updated version in ${updatedCount} files`);
} catch (error) {
    console.error('Error:', error);
    process.exit(1);
}
