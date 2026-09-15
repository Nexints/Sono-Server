const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { SOURCE_DIR, TEMP_EXTRACT_DIR, ENGINES_POOL_DIR } = require('./config.js');
const { debug } = require('./config.js');
const { ensureLocalized, findFileInDir } = require('./utils');

function decompileAsset(resourceObj, targetFilename, targetFolder, lookupSourceDir) {
    if (!resourceObj || !resourceObj.hash) return;
    const hashName = resourceObj.hash;

    const sourceAssetPath = findFileInDir(lookupSourceDir, hashName);

    if (sourceAssetPath) {
        const targetAssetPath = path.join(targetFolder, targetFilename);
        let rawBuffer = fs.readFileSync(sourceAssetPath);

        if (rawBuffer.length > 2 && rawBuffer[0] === 0x1f && rawBuffer[1] === 0x8b) {
            if (debug) console.log(`Decompressing file: ${hashName}`);
            try {
                rawBuffer = zlib.gunzipSync(rawBuffer);
            } catch (err) {
                console.error(`[ERROR] Failed to unzip ${hashName}, copying raw file instead:`, err);
            }
        }

        fs.writeFileSync(targetAssetPath, rawBuffer);
        if (debug) console.log(`[INFO] Decompiled Asset: ${hashName} -> ${targetAssetPath}`);
    } else {
        console.warn(`[WARN] Could not find binary file for hash reference: ${hashName} inside ${lookupSourceDir}`);
    }
}

function decompileAndWriteItem(rawObj, activeCategory, lookupSourceDir, prioritizedEngines = new Set()) {
    let coreItem = rawObj.item || rawObj;

    // ?
    // This code here does literally nothing
    // it's literally just what AI generated
    // useless code btw
    /*
    if (activeCategory === 'engines') {

        const getRealFallback = (categoryName, baseline) => {
            const lookPaths = [
                path.join(SOURCE_DIR, categoryName),
                path.join(process.cwd(), `${categoryName}_pool`),
                TEMP_EXTRACT_DIR,
                lookupSourceDir
            ];

            for (const targetPath of lookPaths) {
                if (fs.existsSync(targetPath)) {
                    try {
                        const folders = fs.readdirSync(targetPath).filter(f => {
                            const stats = fs.statSync(path.join(targetPath, f));
                            // Skip system tracking meta structures or files
                            return stats.isDirectory() && f !== 'sonolus' && f !== 'engines' && f !== 'levels';
                        });
                        if (folders.length > 0) return folders[0];
                    } catch (e) { }
                }
            }
            return baseline;
        };

        // Mutate the reference properties directly inside memory loops safely as strings
        coreItem.skin = coreItem.skin || getRealFallback('skins', "ProSekaFaithful");
        coreItem.background = coreItem.background || getRealFallback('backgrounds', "Nexint-V4-BG-min");
        coreItem.effect = coreItem.effect || getRealFallback('effects', "coconut-next-sekai-1");
        coreItem.particle = coreItem.particle || getRealFallback('particles', "NexintWaterMark");
    }
    */

    // Make sure a title always exists
    // This code should hopefully never run
    if (!coreItem.name && coreItem.title) {
        coreItem.name = typeof coreItem.title === 'string' ? coreItem.title : (coreItem.title.en || 'Next-RUSH-Item');
    }

    // More safety checks
    // This should not run.
    if (!coreItem || !coreItem.name) return false;

    // Sanitize the folder name to replace spaces with dashes
    const sanitizedFolderName = coreItem.name.trim().replace(/\s+/g, '-');

    // Load the engines in the engine pool first.
    if (activeCategory === 'engines' && !lookupSourceDir.toLowerCase().includes(ENGINES_POOL_DIR.toLowerCase())) {
        if (prioritizedEngines.has(sanitizedFolderName.toLowerCase())) {
            if (debug) console.log(`[INFO] Prioritizing ${ENGINES_POOL_DIR}: ${sanitizedFolderName}`);
            return false;
        }
    }

    // Generate the target folder
    const targetFolder = path.join(SOURCE_DIR, activeCategory, sanitizedFolderName);
    fs.mkdirSync(targetFolder, { recursive: true });

    // Configure the correct version
    // uhhh what
    let correctVersion = 4;
    if (['backgrounds', 'playlists', 'posts', 'replays'].includes(activeCategory)) {
        correctVersion = 2;
    } else if (['effects'].includes(activeCategory)) {
        correctVersion = 5;
    } else if (['particles'].includes(activeCategory)) {
        correctVersion = 3;
    } else if (['levels'].includes(activeCategory)) {
        correctVersion = 1;
    }

    // Declare the path of the skins, backgrounds, effects, particles, etc
    const compiledSkinsPath = path.join(SOURCE_DIR, 'skins');
    const compiledBgPath = path.join(SOURCE_DIR, 'backgrounds');
    const compiledEffectsPath = path.join(SOURCE_DIR, 'effects');
    const compiledParticlesPath = path.join(SOURCE_DIR, 'particles');

    const getFallbackFolder = (dirPath, explicitDefault) => {
        if (fs.existsSync(dirPath)) {
            const folders = fs.readdirSync(dirPath);
            // Grab the first available string element from your real compiled folder arrays
            if (folders.length > 0) return folders[0];
        }
        return explicitDefault;
    };

    // Fallback folders
    const fallbackSkin = getFallbackFolder(compiledSkinsPath, "ProSekaFaithful");
    const fallbackBackground = getFallbackFolder(compiledBgPath, "Nexint-V4-BG-min");
    const fallbackEffect = getFallbackFolder(compiledEffectsPath, "coconut-next-sekai-1");
    const fallbackParticle = getFallbackFolder(compiledParticlesPath, "NexintWaterMark");

    // Sanitize the skins (replace spaces with dashes)
    const sanitizedSkin = (coreItem.skin || coreItem.skin_name || fallbackSkin).trim().replace(/\s+/g, '-');
    const sanitizedBackground = (coreItem.background || coreItem.background_name || fallbackBackground).trim().replace(/\s+/g, '-');
    const sanitizedEffect = (coreItem.effect || coreItem.effect_name || fallbackEffect).trim().replace(/\s+/g, '-');
    const sanitizedParticle = (coreItem.particle || coreItem.particle_name || fallbackParticle).trim().replace(/\s+/g, '-');
    const sanitizedEngineReference = (coreItem.engine || "Next-RUSH").trim().replace(/\s+/g, '-');

    // Compile everything together into a cleaned item
    const cleanedItem = {
        version: coreItem.version || correctVersion,
        title: ensureLocalized(coreItem.title),
        subtitle: ensureLocalized(coreItem.subtitle || ""),
        artists: ensureLocalized(coreItem.artists || coreItem.artists_name || rawObj.artists || ""),
        author: ensureLocalized(coreItem.author),
        description: ensureLocalized(rawObj.description || coreItem.description || ""),
        tags: Array.isArray(coreItem.tags) ? coreItem.tags : []
    };

    // Inject more data in the case of engines, levels, etc
    if (activeCategory === 'engines') {
        cleanedItem.skin = sanitizedSkin;
        cleanedItem.background = sanitizedBackground;
        cleanedItem.effect = sanitizedEffect;
        cleanedItem.particle = sanitizedParticle;
    } else if (activeCategory === 'levels') {
        cleanedItem.rating = coreItem.rating || 0;
        cleanedItem.engine = sanitizedEngineReference;
        cleanedItem.useSkin = { useDefault: true, item: "" };
        cleanedItem.useBackground = { useDefault: true, item: "" };
        cleanedItem.useEffect = { useDefault: true, item: "" };
        cleanedItem.useParticle = { useDefault: true, item: "" };
    }

    fs.writeFileSync(
        path.join(targetFolder, 'item.json'),
        JSON.stringify(cleanedItem, null, 4),
        'utf8'
    );
    if (debug) console.log(`[INFO] Created directory for [${activeCategory.toUpperCase()}]: ${sanitizedFolderName} (Forced Version ${correctVersion})`);

    switch (activeCategory) {
        case 'engines':
            if (lookupSourceDir.toLowerCase().includes('engines_pool')) {
                if (debug) console.log(`[INFO] Mapping engine: ${coreItem.name}`);

                decompileAsset({ hash: 'thumbnail.png' }, 'thumbnail.png', targetFolder, lookupSourceDir);
                decompileAsset({ hash: 'engine.json' }, 'data.json', targetFolder, lookupSourceDir);
                decompileAsset({ hash: 'EngineConfiguration' }, 'configuration.json', targetFolder, lookupSourceDir);

                decompileAsset({ hash: 'EnginePlayData' }, 'playData.json', targetFolder, lookupSourceDir);
                decompileAsset({ hash: 'EngineWatchData' }, 'watchData.json', targetFolder, lookupSourceDir);
                decompileAsset({ hash: 'EnginePreviewData' }, 'previewData.json', targetFolder, lookupSourceDir);
                decompileAsset({ hash: 'EngineTutorialData' }, 'tutorialData.json', targetFolder, lookupSourceDir);

                if (fs.existsSync(path.join(lookupSourceDir, 'EngineRom'))) {
                    decompileAsset({ hash: 'EngineRom' }, 'rom.bin', targetFolder, lookupSourceDir);
                }

                if (debug) console.log(`[INFO] Successfully mapped engine: ${coreItem.name}`);
            } else {
                // 📦 HANDLING UPLOAD ARCHIVES
                decompileAsset(coreItem.thumbnail, 'thumbnail.png', targetFolder, lookupSourceDir);
                decompileAsset(coreItem.data, 'data.json', targetFolder, lookupSourceDir);
                decompileAsset(coreItem.configuration, 'configuration.json', targetFolder, lookupSourceDir);

                decompileAsset(coreItem.play, 'playData.json', targetFolder, lookupSourceDir);
                decompileAsset(coreItem.watch, 'watchData.json', targetFolder, lookupSourceDir);
                decompileAsset(coreItem.preview, 'previewData.json', targetFolder, lookupSourceDir);
                decompileAsset(coreItem.tutorial, 'tutorialData.json', targetFolder, lookupSourceDir);
                if (coreItem.rom) decompileAsset(coreItem.rom, 'rom.bin', targetFolder, lookupSourceDir);

                // ✅ THE FIX: Force the written file to update its internal skin mapping property 
                // if it's an upload archive pulling a ghost "ProSekaFaithful" file reference.
                try {
                    const writtenManifestPath = path.join(targetFolder, 'item.json');
                    if (fs.existsSync(writtenManifestPath)) {
                        const existingManifest = JSON.parse(fs.readFileSync(writtenManifestPath, 'utf8'));
                        existingManifest.skin = sanitizedSkin;
                        existingManifest.background = sanitizedBackground;
                        existingManifest.effect = sanitizedEffect;
                        existingManifest.particle = sanitizedParticle;
                        fs.writeFileSync(writtenManifestPath, JSON.stringify(existingManifest, null, 4), 'utf8');
                    }
                } catch (jsonOverrideErr) {
                    console.error(`[ERROR] Failed to force override upload engine parameters:`, jsonOverrideErr.message);
                }
            }
            break;

        case 'skins':
            decompileAsset(coreItem.thumbnail, 'thumbnail.png', targetFolder, lookupSourceDir);
            decompileAsset(coreItem.texture, 'texture.png', targetFolder, lookupSourceDir);
            decompileAsset(coreItem.data, 'data.json', targetFolder, lookupSourceDir);
            break;

        case 'backgrounds':
            decompileAsset(coreItem.thumbnail, 'thumbnail.png', targetFolder, lookupSourceDir);
            decompileAsset(coreItem.image, 'image.png', targetFolder, lookupSourceDir);
            decompileAsset(coreItem.data, 'data.json', targetFolder, lookupSourceDir);

            // ✅ FIX: Only attempt to pull configuration if the source file explicitly includes it
            if (coreItem.configuration) {
                decompileAsset(coreItem.configuration, 'configuration.json', targetFolder, lookupSourceDir);
            }
            break;

        case 'effects':
            decompileAsset(coreItem.thumbnail, 'thumbnail.png', targetFolder, lookupSourceDir);
            decompileAsset(coreItem.data, 'data.json', targetFolder, lookupSourceDir);
            decompileAsset(coreItem.audio, 'audio.zip', targetFolder, lookupSourceDir);
            break;

        case 'particles':
            decompileAsset(coreItem.thumbnail, 'thumbnail.png', targetFolder, lookupSourceDir);
            decompileAsset(coreItem.data, 'data.json', targetFolder, lookupSourceDir);
            decompileAsset(coreItem.texture, 'texture.png', targetFolder, lookupSourceDir);
            break;

        case 'levels':
            if (lookupSourceDir.toLowerCase().includes('levels_pool')) {
                if (debug) console.log(`[INFO] Mapping level: ${coreItem.name}`);

                decompileAsset({ hash: 'jacket.png' }, 'cover.png', targetFolder, lookupSourceDir);
                decompileAsset({ hash: 'music.mp3' }, 'bgm.mp3', targetFolder, lookupSourceDir);

                decompileAsset({ hash: 'level.data' }, 'dataData.json', targetFolder, lookupSourceDir);
                decompileAsset({ hash: 'level.data' }, 'data.json', targetFolder, lookupSourceDir);

                if (fs.existsSync(path.join(lookupSourceDir, 'music_pre.mp3'))) {
                    decompileAsset({ hash: 'music_pre.mp3' }, 'previewData.json', targetFolder, lookupSourceDir);
                    decompileAsset({ hash: 'music_pre.mp3' }, 'preview.mp3', targetFolder, lookupSourceDir);
                }
                if (debug) console.log(`[INFO] Successfully mapped level: ${coreItem.name}`);
            } else {
                const coverObj = coreItem.cover || { hash: 'cover' };
                const bgmObj = coreItem.bgm || { hash: 'bgm' };
                const levelDataObj = coreItem.data || { hash: 'data' };

                decompileAsset(coverObj, 'cover.png', targetFolder, lookupSourceDir);
                decompileAsset(bgmObj, 'bgm.mp3', targetFolder, lookupSourceDir);
                decompileAsset(levelDataObj, 'dataData.json', targetFolder, lookupSourceDir);
                decompileAsset(levelDataObj, 'data.json', targetFolder, lookupSourceDir);

                if (coreItem.preview) {
                    decompileAsset(coreItem.preview, 'previewData.json', targetFolder, lookupSourceDir);
                    decompileAsset(coreItem.preview, 'preview.mp3', targetFolder, lookupSourceDir);
                }
            }
            break;
    }

    // ✅ FIX 3: Track the deduplication cache key using the clean sanitized value
    if (lookupSourceDir.toLowerCase().includes('engines_pool') && activeCategory === 'engines') {
        prioritizedEngines.add(sanitizedFolderName.toLowerCase());
    }

    return true;
}

function processExtractedFiles(currentDir, currentCategory, lookupSourceDir, prioritizedEngines = new Set()) {
    if (!fs.existsSync(currentDir)) return false;
    const files = fs.readdirSync(currentDir);
    let processedAny = false;

    let activeCategory = currentCategory;
    const dirLower = currentDir.toLowerCase();

    const categories = ['engines', 'levels', 'skins', 'backgrounds', 'effects', 'particles', 'playlists', 'posts', 'replays'];
    for (const cat of categories) {
        if (dirLower.endsWith(cat) || dirLower.includes(path.sep + cat + path.sep) || dirLower.endsWith(path.sep + cat)) {
            activeCategory = cat;
            break;
        }
    }

    files.forEach(file => {
        const filePath = path.join(currentDir, file);
        if (fs.statSync(filePath).isDirectory()) {
            const childResult = processExtractedFiles(filePath, activeCategory, lookupSourceDir, prioritizedEngines);
            if (childResult) processedAny = true;
        } else {
            // HASH EXCLUSION: Opens parsing rules for raw level assets inside levels_pool directory trees
            if (file.length === 40 && !lookupSourceDir.toLowerCase().includes('engines_pool')) return;

            // SAFE TARGETED ROOT SKIPPER: 
            // We ONLY skip loose root files if we are actively scanning the unzipped TEMP archive directory.
            // This leaves your engines_pool and levels_pool roots perfectly untouched!
            if (lookupSourceDir.toLowerCase().includes(TEMP_EXTRACT_DIR.toLowerCase())) {
                if (path.resolve(currentDir) == path.resolve(lookupSourceDir, "sonolus")) {
                    if (file === 'info' || file === 'package') return;
                }
            }

            try {
                const rawContent = fs.readFileSync(filePath, 'utf8').trim();
                if (rawContent.startsWith('{') || rawContent.startsWith('[')) {
                    const parsedData = JSON.parse(rawContent);
                    const itemKeys = ['engines', 'levels', 'skins', 'backgrounds', 'effects', 'particles', 'playlists', 'posts', 'replays'];
                    let arrayFound = false;

                    for (const key of itemKeys) {
                        if (parsedData[key] && Array.isArray(parsedData[key])) {
                            parsedData[key].forEach(item => {
                                if (decompileAndWriteItem(item, key, lookupSourceDir, prioritizedEngines)) processedAny = true;
                            });
                            arrayFound = true;
                        }
                    }

                    if (!arrayFound) {
                        if (parsedData.skins && Array.isArray(parsedData.skins)) {
                            parsedData.skins.forEach(item => {
                                if (decompileAndWriteItem(item, 'skins', lookupSourceDir, prioritizedEngines)) processedAny = true;
                            });
                        } else if (parsedData.items && Array.isArray(parsedData.items)) {
                            parsedData.items.forEach(item => {
                                if (decompileAndWriteItem(item, activeCategory, lookupSourceDir, prioritizedEngines)) {
                                    processedAny = true;
                                }
                            });
                        } else if (parsedData.item || parsedData.sections || parsedData.name || parsedData.title) {
                            let routedCategory = activeCategory;

                            if (lookupSourceDir.toLowerCase().includes('engines_pool')) {
                                routedCategory = 'engines';
                            }
                            // OVERRIDE HANDLER: Forces flat track elements into levels category routing bucket
                            else if (lookupSourceDir.toLowerCase().includes('levels_pool')) {
                                routedCategory = 'levels';
                            }

                            if (decompileAndWriteItem(parsedData, routedCategory, lookupSourceDir, prioritizedEngines)) {
                                processedAny = true;
                            }
                        }
                    }
                }
            } catch (e) { }
        }
    });
    return processedAny;
}

module.exports = {
    processExtractedFiles
};