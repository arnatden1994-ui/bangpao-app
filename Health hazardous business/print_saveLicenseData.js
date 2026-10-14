const fs = require('fs');
const lines = fs.readFileSync('JavaScript.html', 'utf8').split('\n');
let start = lines.findIndex(l => l.includes('function saveLicenseData()'));
for (let i = start; i < start + 30; i++) {
    if (i < lines.length) console.log((i + 1) + ': ' + lines[i].trim());
}
