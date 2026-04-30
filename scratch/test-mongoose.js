const { connectDB, disconnectDB } = require('../src/config/database');
const config = require('../src/config');

console.log("Config mongodbUri:", config.mongodbUri.replace(/:([^:@]{1,})@/, ':****@'));

async function test() {
    try {
        await connectDB();
        console.log("Success!");
        await disconnectDB();
    } catch (e) {
        console.error("Failed:", e);
    }
}
test();
