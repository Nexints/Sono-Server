const path = require('path');

// Forces paths to look next to the .exe on any machine
const baseExecutionPath = process.cwd();

module.exports = {
    ADDRESS: "0.0.0.0", 
    PORT: 39039, 
    https: false,

    // Build settings
    CONFIG_NAME: 'sea-config.json',
    OUTPUT_EXE: 'sono-utils.exe',

    title: "Sono-Overlay Local Server",
    desc: "Custom-coded, lightweight Sonolus server for Sono-Overlay users.",
    debug: false,

    UPLOADS_DIR: path.join(baseExecutionPath, 'uploads'), 
    ENGINES_POOL_DIR: path.join(baseExecutionPath, 'engines_pool'), 
    LEVELS_POOL_DIR: path.join(baseExecutionPath, 'levels_pool'), 
    BANNER_POOL_DIR: path.join(baseExecutionPath, 'banner_pool'), 
    SOURCE_DIR: path.join(baseExecutionPath, 'source'), 
    TEMP_EXTRACT_DIR: path.join(baseExecutionPath, 'temp_extracted'), 
};