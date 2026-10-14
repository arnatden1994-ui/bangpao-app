const fs = require('fs');
const lines = fs.readFileSync('JavaScript.html', 'utf8').split('\n');
let start = lines.findIndex(l => l.includes('ลงชื่อ') && i > 700);
// actually just search from bottom up
for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].includes('exportToWord') && lines[i].includes('function')) {
        break; // we don't care, we just want inside exportToWord
    }
}
lines.forEach((l, i) => {
    if (l.includes('ลงชื่อ') && i > 700) {
        for(let j = i - 5; j < i + 30; j++) {
            if (j >= 0 && j < lines.length) console.log((j+1) + ': ' + lines[j].trim());
        }
    }
});
