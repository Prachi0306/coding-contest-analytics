const axios = require('axios');

async function testCodeChef() {
  try {
    const res = await axios.get('https://www.codechef.com/api/list/contests/all');
    console.log("Future Contests:", res.data.future_contests.length);
    console.log("Present Contests:", res.data.present_contests.length);
    console.log("Past Contests:", res.data.past_contests.length);
    console.log("Sample past:", res.data.past_contests[0]);
  } catch (e) {
    console.error(e.message);
  }
}

testCodeChef();
