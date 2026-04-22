const mongoose = require('mongoose');
require('dotenv').config();
const dataSyncService = require('../src/services/dataSync.service');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');
  
  try {
    const cf = await dataSyncService.syncCodeforcesContests();
    console.log('Codeforces sync:', cf.synced);
  } catch (e) {
    console.error('CF error:', e.message);
  }
  
  try {
    const lc = await dataSyncService.syncLeetCodeContests();
    console.log('LeetCode sync:', lc.synced);
  } catch (e) {
    console.error('LC error:', e.message);
  }
  
  try {
    const cc = await dataSyncService.syncCodeChefContests();
    console.log('CodeChef sync:', cc.synced);
  } catch (e) {
    console.error('CC error:', e.message);
  }

  process.exit(0);
}

run();
