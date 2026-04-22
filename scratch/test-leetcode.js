const axios = require('axios');

async function testLeetCode() {
  const query = `
    query {
      topTwoContests {
        title
        titleSlug
        startTime
        duration
      }
      pastContests(pageNo: 1, numPerPage: 10) {
        data {
          title
          titleSlug
          startTime
          duration
        }
      }
    }
  `;

  try {
    const res = await axios.post('https://leetcode.com/graphql', { query });
    console.log(JSON.stringify(res.data, null, 2));
  } catch (e) {
    console.error(e.message);
  }
}

testLeetCode();
