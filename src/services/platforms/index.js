

const codeforcesService = require('./codeforces.service');
const leetcodeService = require('./leetcode.service');
const codechefService = require('./codechef.service');


const platformServices = {
  codeforces: codeforcesService,
  leetcode: leetcodeService,
  codechef: codechefService,
};


function getPlatformService(platform) {
  return platformServices[platform] || null;
}


function getAllPlatforms() {
  return Object.keys(platformServices);
}

module.exports = {
  platformServices,
  getPlatformService,
  getAllPlatforms,
  codeforcesService,
  leetcodeService,
  codechefService,
};
