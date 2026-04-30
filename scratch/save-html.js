const axios = require('axios');
const fs = require('fs');

async function test() {
    const rawHtmlResponse = await axios.get(`https://www.codechef.com/users/prachi24_49`, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml',
      }
    });

    fs.writeFileSync('scratch/prachi_codechef.html', rawHtmlResponse.data);
    console.log("HTML saved to scratch/prachi_codechef.html");
}
test();
