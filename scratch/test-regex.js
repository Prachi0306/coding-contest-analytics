const fs = require('fs');
const html = fs.readFileSync('scratch/prachi_codechef.html', 'utf8');

const regex = /class=['"]rating['"][^>]*>(\d+)/i;
console.log("New regex test:", html.match(regex));
