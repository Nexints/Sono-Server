const fs = require('fs');
const path = require('path');
const sharp = require('sharp'); // For image transcoding (WebP -> PNG)
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');

// Link fluent-ffmpeg to the automatically bundled static binaries
ffmpeg.setFfmpegPath(ffmpegStatic);

/**
 * Advanced file handler that processes, converts, and renames loose chart assets on the fly
 */
async function processAndLinkAsset(sourceInput, targetFolder, destinationName) {
    const cleanedPath = sourceInput.trim().replace(/^["']|["']$/g, '');
    if (!fs.existsSync(cleanedPath)) {
        console.error(`❌ Error: Source file path does not exist: ${cleanedPath}`);
        return false;
    }

    const inputExt = path.extname(cleanedPath).toLowerCase();
    const targetPath = path.join(targetFolder, destinationName);

    // 🖼️ CASE A: IMAGE PROCESSING (Targeting jacket.png)
    if (destinationName === 'jacket.png') {
        try {
            if (inputExt === '.png') {
                fs.copyFileSync(cleanedPath, targetPath);
                console.log(`✅ Linked raw image asset straight into place.`);
            } else {
                console.log(`🗜️  Converting image format [${inputExt}] safely to optimized PNG via sharp...`);
                await sharp(cleanedPath).png().toFile(targetPath);
                console.log(`✅ Transcoded artwork successfully -> jacket.png`);
            }
            return true;
        } catch (imgErr) {
            console.error(`❌ Image conversion engine tracking error:`, imgErr.message);
            return false;
        }
    }

    // 🎵 CASE B: AUDIO PROCESSING (Targeting music.mp3 or music_pre.mp3)
    if (destinationName === 'music.mp3' || destinationName === 'music_pre.mp3') {
        if (inputExt === '.mp3') {
            fs.copyFileSync(cleanedPath, targetPath);
            console.log(`✅ Linked raw MP3 track asset straight into place.`);
            return true;
        }

        console.log(`🎚️  Transcoding raw input audio [${inputExt}] to high-quality standard MP3 via FFmpeg...`);
        return new Promise((resolve) => {
            ffmpeg(cleanedPath)
                .toFormat('mp3')
                .audioBitrate('192k') // High-fidelity audio constraint standard for custom charting
                .on('end', () => {
                    console.log(`✅ Transcoded audio successfully -> ${destinationName}`);
                    resolve(true);
                })
                .on('error', (err) => {
                    console.error(`❌ FFmpeg transcode stream crashed:`, err.message);
                    resolve(false);
                })
                .save(targetPath);
        });
    }

    // 📊 CASE C: DATA PAYLOAD PROCESSING (Targeting level.data)
    if (destinationName === 'level.data') {
        fs.copyFileSync(cleanedPath, targetPath);
        console.log(`✅ Linked chart data node mapping payload -> level.data`);
        return true;
    }

    return false;
}

function writeLevelManifest(targetSongFolder, title, artist, author, rating, preferredEngine = "Next-RUSH") {
    const levelJsonReference = {
        version: 1,
        title: title.trim() || "Execution Clap",
        rating: parseInt(rating.trim(), 10) || 31,
        author: author.trim() || "Nexint#496350",
        artists: artist.trim() || "Trap Chick",
        engine: preferredEngine
    };

    try {
        const metadataOutputPath = path.join(targetSongFolder, 'item.json');
        fs.writeFileSync(metadataOutputPath, JSON.stringify(levelJsonReference, null, 4), 'utf8');
        return true;
    } catch (writeError) {
        console.error('❌ Failed writing metadata JSON structural asset:', writeError.message);
        return false;
    }
}

module.exports = {
    processAndLinkAsset, // Export upgraded processing layer wrapper
    writeLevelManifest
};