const fs = require('fs');
const path = require('path');

function ensureLocalized(value) {
    if (typeof value === 'string') {
        return { "en": value };
    }
    return value || { "en": "" };
}

function findFileInDir(dir, filename) {
    if (!fs.existsSync(dir)) return null;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            const found = findFileInDir(fullPath, filename);
            if (found) return found;
        } else if (file === filename) {
            return fullPath;
        }
    }
    return null;
}

module.exports = {
    ensureLocalized,
    findFileInDir
};