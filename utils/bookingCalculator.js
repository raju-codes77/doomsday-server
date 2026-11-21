/**
 * Calculates the minimum number of bundles needed to exactly match groupSize using Dynamic Programming.
 * @param {Array<number>} bundleSizes - Available bundle sizes (e.g., [2, 5])
 * @param {number} groupSize - Requested total seats (e.g., 11)
 * @returns {object} - Result object with possible status, totalBundles, and breakdown
 */
export const calculateBooking = (bundleSizes, groupSize) => {
  // Validate groupSize range
  if (!Number.isInteger(groupSize) || groupSize < 1 || groupSize > 10000) {
    return {
      possible: false,
      groupSize,
      totalBundles: 0,
      breakdown: [],
      bundles: [],
      message: 'groupSize must be an integer between 1 and 10000.',
    };
  }

  // Remove duplicates and sort descending
  const sortedSizes = [...new Set(bundleSizes)].sort((a, b) => b - a);

  // dp[i] stores the minimum number of bundles needed for i seats
  const dp = new Array(groupSize + 1).fill(Infinity);
  // parentBundle[i] stores the bundle size used to reach i seats (for reconstruction)
  const parentBundle = new Array(groupSize + 1).fill(-1);

  // Base case: 0 seats require 0 bundles
  dp[0] = 0;

  // Build DP table from 1 to groupSize
  for (let currentSeats = 1; currentSeats <= groupSize; currentSeats++) {
    for (const size of sortedSizes) {
      if (currentSeats - size >= 0 && dp[currentSeats - size] !== Infinity) {
        const candidateBundles = dp[currentSeats - size] + 1;
        if (candidateBundles < dp[currentSeats]) {
          dp[currentSeats] = candidateBundles;
          parentBundle[currentSeats] = size;
        }
      }
    }
  }

  // If groupSize is unreachable, no exact combination exists
  if (dp[groupSize] === Infinity) {
    return {
      possible: false,
      groupSize,
      totalBundles: 0,
      breakdown: [],
      bundles: [],
      message: 'No exact bundle combination is possible.',
    };
  }

  // Reconstruct bundle counts from parentBundle array
  const bundleCountMap = {};
  let remainingSeats = groupSize;

  while (remainingSeats > 0) {
    const sizeUsed = parentBundle[remainingSeats];
    bundleCountMap[sizeUsed] = (bundleCountMap[sizeUsed] || 0) + 1;
    remainingSeats -= sizeUsed;
  }

  // Format bundles list sorted by size descending
  const breakdown = Object.keys(bundleCountMap)
    .map(Number)
    .sort((a, b) => b - a)
    .map((size) => ({
      size,
      count: bundleCountMap[size],
    }));

  return {
    possible: true,
    groupSize,
    totalBundles: dp[groupSize],
    breakdown,
    bundles: breakdown,
  };
};
