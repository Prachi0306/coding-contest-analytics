const { connectDB, disconnectDB } = require('../src/config/database');
const User = require('../src/models/User');
const platformAggregator = require('../src/services/platformAggregator.service');

async function run() {
    try {
        await connectDB();
        const users = await User.find();
        if(users.length === 0) {
           console.log("No users found");
           return;
        }
        const user = users[0];
        console.log("Found user handles:", user.platformHandles);
        const result = await platformAggregator.fetchAllProfiles(user.platformHandles);
        console.log("Aggregator result summary:", result.summary);
        
        result.platforms.forEach(p => {
             console.log(`Platform ${p.platform}: Rating=${p.rating}, maxRating=${p.maxRating}, Contests=${p.contests?.length}`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        await disconnectDB();
    }
}
run();
