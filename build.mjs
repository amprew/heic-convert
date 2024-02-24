import watch from 'node-watch';
import * as esbuild from 'esbuild'

const watchFlag = process.argv.indexOf("--watch") !== -1;


async function runBuild() {
  const result = await esbuild.build({
    entryPoints: ['./src/index.tsx', './src/worker/worker.js'],
    bundle: true,
    outdir: 'public/dist',
    minify: true,
    minifySyntax: true,
    minifyIdentifiers: true
  })
}

if(watchFlag) {
  watch('./src', { recursive: true }, runBuild)
}
runBuild();
