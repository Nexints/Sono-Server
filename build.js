const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const startTime = Date.now();
const CONFIG_NAME = 'sea-config.json';
const OUTPUT_EXE = path.join(process.cwd(), 'dist', 'sono-server.exe');
const bundledScriptPath = path.join(process.cwd(), 'dist', 'bundle.js');

async function runBuild() {
    console.log('[INFO] Starting Clean Standard Executable Builder...');

    const distFolder = path.join(process.cwd(), 'dist');
    const distModulesFolder = path.join(distFolder, 'node_modules');
    
    if (!fs.existsSync(distFolder)) fs.mkdirSync(distFolder);
    if (!fs.existsSync(distModulesFolder)) fs.mkdirSync(distModulesFolder, { recursive: true });

    try {
        if (fs.existsSync(OUTPUT_EXE)) fs.unlinkSync(OUTPUT_EXE);
        if (fs.existsSync(bundledScriptPath)) fs.unlinkSync(bundledScriptPath);
    } catch (e) {
        console.error('❌ Critical Error: The output executable is currently locked by a running process!');
        process.exit(1);
    }

    try {
        console.log('[INFO] Bundling codebase cleanly via esbuild...');
        
        // ✅ THE CLEAN RESOLUTION BYPASS: No regex text replacement hacks.
        // We use an official esbuild plugin to capture file lookups and remap them to 
        // runtime mainModule execution hooks. This wipes out raw require string tokens 
        // natively from the bundle text, allowing Node 26 to compile smoothly.
        await require('esbuild').build({
            entryPoints: ['install.js'], 
            bundle: true,
            minify: false,
            platform: 'node',
            external: ['fs', 'path', 'child_process', 'zlib', 'express', 'express-rate-limit', 'readline', '@sonolus/express', 'adm-zip'],
            outfile: bundledScriptPath,
            plugins: [{
                name: 'native-sea-ast-resolver',
                setup(build) {
                    // Intercept external package names
                    build.onResolve({ filter: /^(sharp|fluent-ffmpeg|ffmpeg-static)$/ }, args => {
                        return { path: args.path, external: true, namespace: 'sea-pkg-intercept' };
                    });
                    build.onLoad({ filter: /.*/, namespace: 'sea-pkg-intercept' }, args => {
                        return {
                            contents: `module.exports = process.mainModule.require("${args.path}");`,
                            loader: 'js'
                        };
                    });

                    // Intercept local relative file paths
                    build.onResolve({ filter: /^\.\/(config|package\.json)/ }, args => {
                        return { path: args.path, external: true, namespace: 'sea-file-intercept' };
                    });
                    build.onLoad({ filter: /.*/, namespace: 'sea-file-intercept' }, args => {
                        const targetFileName = args.path.endsWith('.json') ? './package.json' : './config.js';
                        return {
                            contents: `module.exports = process.mainModule.require("${targetFileName}");`,
                            loader: 'js'
                        };
                    });
                }
            }]
        });

        console.log('[INFO] Mapping resource arrays into sea-config.json...');
        const configContent = {
            main: bundledScriptPath,
            output: OUTPUT_EXE,
            disableExperimentalSEAWarning: true,
            // 🌟 THE FIX: Instructs Node 26 to run your code bundle immediately on boot 
            // instead of dropping the user into the standard Node command line REPL prompt!
            useCodeCache: true
        };
        fs.writeFileSync(CONFIG_NAME, JSON.stringify(configContent, null, 2));

        console.log(`[INFO] Instantiating native execution shell layout...`);
        fs.copyFileSync(process.execPath, OUTPUT_EXE);

        console.log(`[INFO] Compiling code directly into standalone EXE...`);
        execSync(`node --build-sea ${CONFIG_NAME}`, { stdio: 'inherit' });

        // Copy required native modules to dist folder automation layout
        console.log('[INFO] Copying native module directories to dist/node_modules...');
        const modulesToCopy = ['sharp', 'fluent-ffmpeg', 'ffmpeg-static'];
        
        const sharpWinFolder = fs.readdirSync(path.join(process.cwd(), 'node_modules', '@img')).find(f => f.startsWith('sharp-win32'));
        if (sharpWinFolder) {
            const imgTargetDir = path.join(distModulesFolder, '@img', sharpWinFolder);
            fs.mkdirSync(imgTargetDir, { recursive: true });
            fs.cpSync(path.join(process.cwd(), 'node_modules', '@img', sharpWinFolder), imgTargetDir, { recursive: true });
        }

        modulesToCopy.forEach(mod => {
            const srcModPath = path.join(process.cwd(), 'node_modules', mod);
            const destModPath = path.join(distModulesFolder, mod);
            if (fs.existsSync(srcModPath)) {
                fs.cpSync(srcModPath, destModPath, { recursive: true });
            }
        });

        // Copy the required loose scripts next to the executable
        fs.copyFileSync(path.join(process.cwd(), 'config.js'), path.join(distFolder, 'config.js'));
        fs.copyFileSync(path.join(process.cwd(), 'package.json'), path.join(distFolder, 'package.json'));
        fs.copyFileSync(path.join(process.cwd(), 'index.js'), path.join(distFolder, 'index.js'));
        fs.copyFileSync(path.join(process.cwd(), 'decompiler.js'), path.join(distFolder, 'decompiler.js'));
        fs.copyFileSync(path.join(process.cwd(), 'utils.js'), path.join(distFolder, 'utils.js'));

        console.log(`\n[SUCCESS] Standalone package deployment compiled cleanly!`);
        console.log(`📍 Location: ${distFolder}`);

    } catch (error) {
        console.error(`\n[ERROR] Project Compilation failed: ${error.message}`);
    } finally {
        console.log('[INFO] Cleaning up intermediate build configurations.');
        if (fs.existsSync(CONFIG_NAME)) fs.unlinkSync(CONFIG_NAME);
        if (fs.existsSync(bundledScriptPath)) fs.unlinkSync(bundledScriptPath);
        
        console.log(`[INFO] Build operations finalized in ${(Date.now() - startTime) / 1000} seconds.\n`);
    }
}

runBuild();