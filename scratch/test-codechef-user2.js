const { fetchProfile } = require('../src/services/platforms/codechef.service');

async function test() {
    const data = await fetchProfile('prachi24_49');
    console.log("Current Rating:", data.rating);
    console.log("Highest Rating:", data.maxRating);
}
test();
