const Contest = require('../models/Contest');
const { generateICS } = require('../utils/generateICS');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

/**
 * @route   GET /api/calendar/:contestId
 * @desc    Generate and download an .ics file for a contest
 * @access  Public
 */
const downloadCalendarICS = asyncHandler(async (req, res) => {
  const { contestId } = req.params;

  const contest = await Contest.findById(contestId);
  if (!contest) {
    throw AppError.notFound('Contest not found');
  }

  const icsString = generateICS(contest);

  // Set headers to prompt file download
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="contest-${contest.name.replace(/[^a-zA-Z0-9]/g, '-')}.ics"`
  );

  return res.status(200).send(icsString);
});

module.exports = {
  downloadCalendarICS,
};
