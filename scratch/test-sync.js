require('dotenv').config();
const mongoose = require('mongoose');
const upsolvingService = require('../src/services/upsolving.service');
const User = require('../src/models/User');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const user = await User.findOne({});
  console.log('Testing with user:', user._id);
  
  try {
    const res = await upsolvingService.syncContestProblems(user._id, 'codeforces', '2218'); // Try an older contest to ensure they have submissions!
    console.log('Sync Result:', res);
    
    const stats = await upsolvingService.getUserUpsolveStats(user._id);
    console.log('Stats:', stats);
  } catch(e) {
    console.error('Error:', e);
  }

  await mongoose.disconnect();
}

test().catch(console.error);
