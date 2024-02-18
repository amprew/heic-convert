import watch from 'node-watch';
import * as esbuild from 'esbuild'

async function runBuild() {
  const result = await esbuild.build({
    entryPoints: ['./src/index.tsx', './src/worker/worker.js'],
    bundle: true,
    outdir: 'dist',
  })

  console.log(result)
}

watch('./src', { recursive: true }, runBuild)
runBuild();
