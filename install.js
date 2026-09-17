const fs = require('fs');
const path = require('path');
const readline = require('readline');

const { UPLOADS_DIR, ENGINES_POOL_DIR, LEVELS_POOL_DIR, SOURCE_DIR, TEMP_EXTRACT_DIR } = require('./config.js');
const { hasPackageFiles, hasLevelConfigurations, cleanBuildTargets, getAvailableEngines } = require('./install-helpers.js');
const { processAndLinkAsset, writeLevelManifest } = require('./install-assets.js');
const { handleLevelModification } = require('./install-modifier.js');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Define the process directory
// Just to sync up the process of making a new directory.
try {
  process.chdir(__dirname);
  console.log(`New directory: ${process.cwd()}`);
} catch (err) {
  console.error(`Error changing directory: ${err}`);
}

const askQuestion = (query) => new Promise((resolve) => rl.question(query, resolve));

async function runInstallationPass() {
    console.log('\n--- 🕹️  SONOLUS SERVER CONFIGURATION SETUP ENGINE ---');
    
    const uploadsExist = hasPackageFiles(UPLOADS_DIR);
    const levelsExist = hasLevelConfigurations(LEVELS_POOL_DIR);
    let normalizedChoice = '1';

    if (!uploadsExist && !levelsExist) {
        console.log('[WARN] Setup files either do not exist, or were corrupted.');
        console.log('[INFO] Triggering First Time Setup');
        normalizedChoice = '0'; // option 0 for future reference 
    } else {
        console.log('1. Run the Sonolus Server');
        console.log('2. Add a new level');
        console.log('3. Modify an existing level');
        console.log('4. Manage the existing .scp files');
        console.log('5. Nuke everything and start again.');
        console.log('6. Exit this GUI');
        
        const choice = await askQuestion('\n📋 Select an installation path (Enter 1, 2, 3, 4, 5, or 6):\n> ');
        normalizedChoice = choice.trim();

        if (!['1', '2', '3', '4', '5', '6'].includes(normalizedChoice)) {
            console.error('❌ Error: Invalid choice selection. Aborting execution loop.');
            rl.close();
            process.exit(1);
        }
    }

    if (normalizedChoice === '6') {
        console.log('👋 Setup interface closed cleanly. Goodbye!\n');
        rl.close();
        process.exit(0);
    }

    if (normalizedChoice === '1') {
        console.log('\n🚀 Relaying execution thread controls to Sonolus server runtime environment...');
        
        // 1. Close this temporary configuration readline instance right before handing over control
        rl.close(); 

        // 2. Wrap the child lifecycle into a blocking Promise to prevent early async script termination
        await new Promise((resolve) => {
            try {
                const { spawn } = require('child_process');
                
                // Spawn the server index file using your exact inheritance layout
                const serverProcess = spawn('node', ['index.js'], { stdio: 'inherit' });
                
                serverProcess.on('close', (code) => {
                    console.log(`\n👋 Sonolus server process exited with code ${code}.`);
                    resolve(); // Unblocks the installation pass thread execution cleanly
                    process.exit(code || 0);
                });

                serverProcess.on('error', (err) => {
                    console.error('\n💥 Failed to start server execution thread:', err.message);
                    resolve();
                    process.exit(1);
                });

            } catch (serverRunError) {
                console.error('\n💥 Server runtime execution tracking thread stopped:', serverRunError.message);
                resolve();
                process.exit(1);
            }
        });
        return; 
    }

    if (normalizedChoice === '3') {
        await handleLevelModification(LEVELS_POOL_DIR, ENGINES_POOL_DIR, askQuestion);
        rl.close();
        return;
    }

    console.log('\n🧹 [Step 1]: Starting workspace pruning phase...');
    cleanBuildTargets(SOURCE_DIR, TEMP_EXTRACT_DIR, path.join(__dirname, 'pack'));

    // 🧹 [Step 1]: Starting workspace pruning phase...
    cleanBuildTargets(SOURCE_DIR, TEMP_EXTRACT_DIR, path.join(__dirname, 'pack'));

    // 💥 MULTI-LEVEL LOGIC FOR OPTION 3 (NUKE)
    if (normalizedChoice === '5') {
        if (fs.existsSync(LEVELS_POOL_DIR)) {
            try { fs.rmSync(LEVELS_POOL_DIR, { recursive: true, force: true }); console.log('✅ Entire levels_pool completely vaporized.'); } catch (e) {}
        }
        if (fs.existsSync(UPLOADS_DIR)) {
            try { fs.rmSync(UPLOADS_DIR, { recursive: true, force: true }); console.log('✅ Uploads directory archive cache cleared clean.'); } catch (e) {}
        }
    }

    // Ensure baseline directories exist
    if (!fs.existsSync(LEVELS_POOL_DIR)) fs.mkdirSync(LEVELS_POOL_DIR, { recursive: true });
    if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

    // 📥 MULTI-ARCHIVE TRACKING BRANCH FOR OPTION 2 (Replace/Manage Server Profile)
    if (normalizedChoice === '4') {
        console.log('\n📦 [Step 2]: Managing Server Profile Archives...');
        console.log(' [1] Clear out previous .scp archives and start a fresh profile');
        console.log(' [2] Keep existing uploaded profiles and merge a new .scp alongside them');
        
        const archiveChoice = await askQuestion('\n👉 Select profile storage behavior (Enter 1 or 2):\n> ');
        if (archiveChoice.trim() === '1') {
            try {
                const files = fs.readdirSync(UPLOADS_DIR);
                files.forEach(f => {
                    const ext = path.extname(f).toLowerCase();
                    if (ext === '.scp' || ext === '.zip') fs.unlinkSync(path.join(UPLOADS_DIR, f));
                });
                console.log('✅ Emptied legacy server archives from uploads folder layout.');
            } catch (err) { console.error('⚠️ Uploads clear warning:', err.message); }
        } else {
            console.log('🔒 Merging enabled. Preserving existing uploaded server archives.');
        }

        console.log('\n📥 Intercepting drag-and-drop server profile...');
        const droppedInputPath = await askQuestion('👉 DRAG & DROP your .scp/.zip profile archive here and press Enter:\n> ');
        const sanitizedSourcePath = droppedInputPath.trim().replace(/^["']|["']$/g, '');

        if (!fs.existsSync(sanitizedSourcePath)) {
            console.error(`\n❌ Error: Target file path does not exist.`);
            rl.close(); process.exit(1);
        }

        const originalFileName = path.basename(sanitizedSourcePath);
        try {
            fs.copyFileSync(sanitizedSourcePath, path.join(UPLOADS_DIR, originalFileName));
            console.log(`📦 Successfully compiled archive target inside: uploads/${originalFileName}`);
        } catch (e) {
            console.error(`❌ File mapping error:`, e.message);
            rl.close(); process.exit(1);
        }

        console.log('\n🏁 Server profile update operation completed successfully!');
        rl.close();
        return; 
    }

    // 🎵 MULTI-LEVEL TRACKING BRANCH FOR OPTION 1 (Add Level from Loose Assets)
    if (normalizedChoice === '2') {
        console.log('\n🎵 [Step 2]: Managing Levels Pool Database Context...');
        console.log(' [1] Keep your currently installed songs and add this new chart package alongside them');
        console.log(' [2] Wipe out all current custom song folders inside levels_pool and install only this one');
        
        const poolChoice = await askQuestion('\n👉 Select level storage behavior (Enter 1 or 2):\n> ');
        if (poolChoice.trim() === '2') {
            try {
                fs.rmSync(LEVELS_POOL_DIR, { recursive: true, force: true });
                fs.mkdirSync(LEVELS_POOL_DIR, { recursive: true });
                console.log('✅ Emptied previous level profiles from storage.');
            } catch (err) { console.error('⚠️ Levels pool clear error:', err.message); }
        } else {
            console.log('🔒 Append mode locked. Preserving current level library configurations.');
        }

        console.log('\n📝 Configuring New Level Metadata Manifest Definitions...');
        const inputTitle = await askQuestion('🎵 Level Title (e.g., "Execution Clap"):\n> ');
        const inputArtist = await askQuestion('🎤 Artist / Band Name (e.g., "Trap Chick"):\n> ');
        const inputAuthor = await askQuestion('✍️  Chart Author / Mapper (e.g., "Nexint#496350"):\n> ');
        const inputRating = await askQuestion('📊 Chart Difficulty Rating Level (e.g., "31"):\n> ');

        let chosenEngine = "Next-RUSH";
        const availableEngines = getAvailableEngines(ENGINES_POOL_DIR);
        if (availableEngines.length > 0) {
            console.log('\n⚙️  Select a Gameplay Engine for this Chart:');
            availableEngines.forEach((eng, idx) => console.log(`  [${idx + 1}] ${eng}`));
            const engineSelection = await askQuestion('👉 Enter engine number (Default fallback is 1):\n> ');
            const parsedIdx = parseInt(engineSelection.trim(), 10) - 1;
            if (!isNaN(parsedIdx) && parsedIdx >= 0 && parsedIdx < availableEngines.length) {
                chosenEngine = availableEngines[parsedIdx];
            }
        }

        const sanitizedSongSlug = inputTitle
            .trim()
            .replace(/[\[\](){}\uff08\uff09\u3010\u3011]/g, '') // Strip brackets and parens
            .replace(/[^a-zA-Z0-9-_]+/g, '-')                   // Convert remaining symbols/spaces to hyphens
            .replace(/-+/g, '-')                                 // Collapse duplicate consecutive hyphens
            .replace(/^-|-$/g, '')                               // Trim leading/trailing trailing hyphens
            || `Level-${Date.now()}`;
        const targetSongFolder = path.join(LEVELS_POOL_DIR, sanitizedSongSlug);
        fs.mkdirSync(targetSongFolder, { recursive: true });

        const manifestCreated = writeLevelManifest(targetSongFolder, inputTitle, inputArtist, inputAuthor, inputRating, chosenEngine);
        if (manifestCreated) {
            console.log(`✨ Generated metadata profile configuration: levels_pool/${sanitizedSongSlug}/item.json`);
        }

        console.log('\n📦 Linking Loose Chart Core Assets to Directory Workspace...');
        let jacketInput = await askQuestion('🖼️  DRAG & DROP your Jacket / Cover artwork image (.png, .webp, .jpg):\n> ');
        if(jacketInput == ""){
            jacketInput = path.join(__dirname, "placeholder", "placeholder.png");
            console.log("Loading Placeholder Image...")
        }
        await processAndLinkAsset(jacketInput, targetSongFolder, 'jacket.png');

        const musicInput = await askQuestion('🎵 DRAG & DROP your Audio Track file (.mp3, .wav, .ogg, .m4a):\n> ');
        await processAndLinkAsset(musicInput, targetSongFolder, 'music.mp3');

        const chartInput = await askQuestion('📊 DRAG & DROP your Chart Data node mapping payload file (.data, .json.gz, or raw file):\n> ');
        await processAndLinkAsset(chartInput, targetSongFolder, 'level.data');

        const optionalPreviewInput = await askQuestion('⏭️  (Optional) DRAG & DROP short preview audio file, or press Enter to skip:\n> ');
        if (optionalPreviewInput.trim() !== '') {
            await processAndLinkAsset(optionalPreviewInput, targetSongFolder, 'music_pre.mp3');
        }

        console.log('\n🏁 Workspace loose asset level installation completed successfully!');
        rl.close();
    }

    console.log('\n🏁 Workspace loose asset level installation completed successfully!');
    console.log(`💡 Run "node server.js" or select Option 1 now. Your chart database files will compile flawlessly.\n`);
    rl.close();
}

runInstallationPass();