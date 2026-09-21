/**
 * FastFlow — Script de Preparação dos Ativos Web para o Capacitor (dist/)
 * Copia os arquivos necessários para a pasta dist/ antes do sync nativo do Android.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');

console.log('[FastFlow Build] Preparando pasta dist/ para Capacitor...');

// Cria ou limpa a pasta dist
if (fs.existsSync(DIST_DIR)) {
  fs.rmSync(DIST_DIR, { recursive: true, force: true });
}
fs.mkdirSync(DIST_DIR, { recursive: true });

// Arquivos raiz
const rootFiles = ['index.html', 'manifest.webmanifest', 'service-worker.js'];
rootFiles.forEach((file) => {
  const src = path.join(ROOT_DIR, file);
  const dest = path.join(DIST_DIR, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`  ✓ Copiado: ${file}`);
  }
});

// Pastas de recursos (css, js, assets)
const folders = ['css', 'js', 'assets'];
folders.forEach((folder) => {
  const src = path.join(ROOT_DIR, folder);
  const dest = path.join(DIST_DIR, folder);
  if (fs.existsSync(src)) {
    fs.cpSync(src, dest, { recursive: true });
    console.log(`  ✓ Copiada pasta: ${folder}/`);
  }
});

console.log('[FastFlow Build] Build da pasta dist/ concluído com sucesso! 🚀');
