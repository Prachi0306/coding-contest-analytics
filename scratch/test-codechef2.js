const { fetchProfile } = require('../src/services/platforms/codechef.service');

async function test() {
    const data = await fetchProfile('tourist');
    console.log(data);
}
test();
