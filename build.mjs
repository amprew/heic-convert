import watch from 'node-watch';
import * as esbuild from 'esbuild'
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const watchFlag = process.argv.indexOf("--watch") !== -1;

async function processTailwind() {
  try {
    await execAsync('node_modules/.bin/tailwindcss -i ./src/App.css -o ./public/dist/app.css --minify');
    console.log('✓ Tailwind CSS processed');
  } catch (error) {
    console.error('Error processing Tailwind CSS:', error);
  }
}

async function runBuild() {
  try {
    // Process Tailwind CSS first
    await processTailwind();
    
    // Then build JavaScript
    const result = await esbuild.build({
      entryPoints: ['./src/index.tsx', './src/worker/worker.js'],
      bundle: true,
      outdir: 'public/dist',
      minify: true,
      minifySyntax: true,
      minifyIdentifiers: true,
      loader: {
        '.css': 'empty'
      }
    });
    
    console.log('✓ Build completed');
  } catch (error) {
    console.error('Build failed:', error);
  }
}

if(watchFlag) {
  watch('./src', { recursive: true }, runBuild)
}
runBuild();
