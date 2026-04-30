const fs = require('fs');
const html = fs.readFileSync('scratch/prachi_codechef.html', 'utf8');

const regex = /class=["']rating["'][^>]*>([^<]+)/g;
let match;
while ((match = regex.exec(html)) !== null) {
  console.log(`Match inner text: ${match[1]}`);
}
