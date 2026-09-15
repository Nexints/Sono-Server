const fs = require('fs');
const path = require('path');
const { writeLevelManifest, processAndLinkAsset } = require('./install-assets');
const { getAvailableEngines } = require('./install-helpers');

async function handleLevelModification(LEVELS_POOL_DIR, ENGINES_POOL_DIR, askQuestion) {
    if (!fs.existsSync(LEVELS_POOL_DIR)) {
        console.error('❌ Error: No levels pool folder exists yet to modify.');
        return false;
    }

    const songDirs = fs.readdirSync(LEVELS_POOL_DIR).filter(item => 
        fs.statSync(path.join(LEVELS_POOL_DIR, item)).isDirectory()
    );

    if (songDirs.length === 0) {
        console.error('❌ Error: There are no existing level subfolders inside your levels pool folder.');
        return false;
    }

    console.log('\n📋 Existing Levels Available for Modification:');
    songDirs.forEach((dir, i) => console.log(`  [${i + 1}] ${dir}`));

    const selectionInput = await askQuestion('\n🎯 Enter the number of the level you wish to modify:\n> ');
    const index = parseInt(selectionInput.trim(), 10) - 1;

    if (isNaN(index) || index < 0 || index >= songDirs.length) {
        console.error('❌ Error: Invalid selection choice.');
        return false;
    }

    const targetSongSlug = songDirs[index];
    const targetSongFolder = path.join(LEVELS_POOL_DIR, targetSongSlug);
    const manifestPath = path.join(targetSongFolder, 'item.json');

    let currentMeta = { title: targetSongSlug, artist: '', author: '', rating: '31', engine: 'Next-RUSH' };
    if (fs.existsSync(manifestPath)) {
        try {
            const parsed = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
            currentMeta.title = parsed.title || currentMeta.title;
            currentMeta.artist = parsed.artists || '';
            currentMeta.author = parsed.author || '';
            currentMeta.rating = String(parsed.rating || '31');
            currentMeta.engine = parsed.engine || currentMeta.engine;
        } catch (e) {}
    }

    console.log(`\n✏️  [Part A]: Modifying Level Metadata: [${targetSongSlug}] (Press Enter to keep current values)`);
    const newTitle = await askQuestion(`🎵 New Title [Current: "${currentMeta.title}"]:\n> `);
    const newArtist = await askQuestion(`🎤 New Artist [Current: "${currentMeta.artist}"]:\n> `);
    const newAuthor = await askQuestion(`✍️  New Author [Current: "${currentMeta.author}"]:\n> `);
    const newRating = await askQuestion(`📊 New Difficulty Rating [Current: "${currentMeta.rating}"]:\n> `);

    let selectedEngine = currentMeta.engine;
    const engines = getAvailableEngines(ENGINES_POOL_DIR);
    if (engines.length > 0) {
        console.log(`\n⚙️  Available Gameplay Engines [Current Bind: "${currentMeta.engine}"]:`);
        engines.forEach((eng, idx) => console.log(`  [${idx + 1}] ${eng}`));
        const engInput = await askQuestion(`👉 Enter an engine number to switch, or press Enter to keep current:\n> `);
        const engIdx = parseInt(engInput.trim(), 10) - 1;
        if (!isNaN(engIdx) && engIdx >= 0 && engIdx < engines.length) {
            selectedEngine = engines[engIdx];
        }
    }

    const updatedTitle = newTitle.trim() || currentMeta.title;
    const updatedArtist = newArtist.trim() || currentMeta.artist;
    const updatedAuthor = newAuthor.trim() || currentMeta.author;
    const updatedRating = newRating.trim() || currentMeta.rating;

    writeLevelManifest(targetSongFolder, updatedTitle, updatedArtist, updatedAuthor, updatedRating, selectedEngine);

    console.log('\n📦 [Part B]: Modifying Loose Core Assets (Drag any file variant to replace/convert, press Enter to skip)');
    
    const jacketInput = await askQuestion('🖼️  New Jacket/Cover Artwork (.png, .webp, .jpg):\n> ');
    if (jacketInput.trim() !== '') await processAndLinkAsset(jacketInput, targetSongFolder, 'jacket.png');

    const musicInput = await askQuestion('🎵 New Audio Track (.mp3, .wav, .ogg, .m4a):\n> ');
    if (musicInput.trim() !== '') await processAndLinkAsset(musicInput, targetSongFolder, 'music.mp3');

    const chartInput = await askQuestion('📊 New Chart Data File (.data / .json.gz):\n> ');
    if (chartInput.trim() !== '') await processAndLinkAsset(chartInput, targetSongFolder, 'level.data');

    const previewInput = await askQuestion('⏭️  New Optional Audio Preview Track (.mp3, .wav, .ogg):\n> ');
    if (previewInput.trim() !== '') await processAndLinkAsset(previewInput, targetSongFolder, 'music_pre.mp3');

    const newSongSlug = updatedTitle
        .trim()
        .replace(/[\[\](){}\uff08\uff09\u3010\u3011]/g, '')
        .replace(/[^a-zA-Z0-9-_]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    if (newSongSlug !== targetSongSlug) {
        const newSongFolder = path.join(LEVELS_POOL_DIR, newSongSlug);
        try {
            fs.renameSync(targetSongFolder, newSongFolder);
            console.log(`\n🔄 Renamed directory framework bounds: ${targetSongSlug} -> ${newSongSlug}`);
        } catch (renameErr) {
            console.error(`⚠️ Folder renaming step encountered an issue:`, renameErr.message);
        }
    }

    console.log('\n✨ Level profile modifications successfully evaluated!');
    return true;
}

module.exports = {
    handleLevelModification
};