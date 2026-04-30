const fs = require('fs');
const html = fs.readFileSync('scratch/prachi_codechef.html', 'utf8');

const lines = html.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('1496')) {
    console.log("----");
    console.log(lines[i-2]);
    console.log(lines[i-1]);
    console.log(lines[i]);
  }
}
