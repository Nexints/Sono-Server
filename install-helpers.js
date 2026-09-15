const fs = require('fs');
const path = require('path');

function hasPackageFiles(dirPath) {
    if (!fs.existsSync(dirPath)) return false;
    try {
        const files = fs.readdirSync(dirPath);
        return files.some(file => {
            const ext = path.extname(file).toLowerCase();
            return ext === '.scp' || ext === '.zip';
        });
    } catch (e) {
        return false;
    }
}

function hasLevelConfigurations(dirPath) {
    if (!fs.existsSync(dirPath)) return false;
    try {
        const items = fs.readdirSync(dirPath);
        for (const item of items) {
            const fullSubPath = path.join(dirPath, item);
            if (fs.statSync(fullSubPath).isDirectory()) {
                if (fs.existsSync(path.join(fullSubPath, 'item.json'))) {
                    return true; 
                }
            }
        }
        return false;
    } catch (e) {
        return false;
    }
}

function cleanBuildTargets(SOURCE_DIR, TEMP_EXTRACT_DIR, packPath) {
    const pathsToClear = [SOURCE_DIR, TEMP_EXTRACT_DIR, packPath];
    pathsToClear.forEach(dirPath => {
        if (fs.existsSync(dirPath)) {
            try {
                fs.rmSync(dirPath, { recursive: true, force: true });
                console.log(`✅ Scrubbed built directory footprint: ${path.basename(dirPath)}`);
            } catch (e) {
                console.error(`⚠️ Failed to remove folder ${dirPath}:`, e.message);
            }
        }
    });
}

/**
 * NEW HELPER: Dynamically lists folder slugs sitting inside the engines pool
 */
function getAvailableEngines(ENGINES_POOL_DIR) {
    if (!fs.existsSync(ENGINES_POOL_DIR)) return [];
    try {
        return fs.readdirSync(ENGINES_POOL_DIR).filter(item => 
            fs.statSync(path.join(ENGINES_POOL_DIR, item)).isDirectory()
        );
    } catch (e) {
        return [];
    }
}

module.exports = {
    hasPackageFiles,
    hasLevelConfigurations,
    cleanBuildTargets,
    getAvailableEngines
};