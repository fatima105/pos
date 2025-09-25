const fs = require('fs');
const archiver = require('archiver');
const path = require('path');

const output = fs.createWriteStream('ALIMART.zip');
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
  console.log(`✅ Zip created: ${archive.pointer()} bytes`);
});

archive.on('warning', err => {
  if (err.code === 'ENOENT') console.warn(err);
  else throw err;
});

archive.on('error', err => {
  throw err;
});

archive.pipe(output);

// Add everything except any node_modules
archive.glob('**/*', {
  cwd: path.join(__dirname, 'ALIMART'),
  ignore: ['**/node_modules/**']
});

archive.finalize();
