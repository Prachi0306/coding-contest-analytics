const axios = require('axios');

async function test() {
    const rawHtmlResponse = await axios.get(`https://www.codechef.com/users/prachi24_49`, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml',
      }
    });

    const rawHtml = rawHtmlResponse.data;
    
    const ratingMatch = rawHtml.match(/class=["']rating-number["'][^>]*>(\d+)/i);
    console.log("ratingMatch 1:", ratingMatch);
    
    const anyRatingMatch = rawHtml.match(/rating-number[^>]*>(\d+)?/i);
    console.log("anyRatingMatch:", anyRatingMatch);

    const surroundingHTML = rawHtml.match(/.{0,50}rating-number.{0,50}/g);
    console.log("surroundingHTML:", surroundingHTML);
    
    const maxRatingMatch = rawHtml.match(/Highest Rating\s*(\d+)/i);
    console.log("maxRatingMatch:", maxRatingMatch);
}
test();
