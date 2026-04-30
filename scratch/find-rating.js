const fs = require('fs');

const html = fs.readFileSync('scratch/prachi_codechef.html', 'utf8');

const regex = /.{0,60}1496.{0,60}/g;
let match;
while ((match = regex.exec(html)) !== null) {
  console.log(`Match: ${match[0]}`);
}
