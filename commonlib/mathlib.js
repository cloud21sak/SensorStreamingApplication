// Common math functions used throughout the project

"use strict";

module.exports = {
  // Basic function for standard deviation:
  getStandardDevitation: (numbers) => {
    let m = getMean(numbers);
    return Math.sqrt(
      numbers.reduce(function (sq, n) {
        return sq + Math.pow(n - m, 2);
      }, 0) /
        (numbers.length - 1)
    );
  },

  // Basic function for mean value:
  getMean: (numbers) => {
    return (
      numbers.reduce(function (a, b) {
        return Number(a) + Number(b);
      }) / numbers.length
    );
  },

  median: (numbers) => {
    var median = 0,
      numsLen = numbers.length;
    numbers.sort((a, b) => a - b);

    if (
      numsLen % 2 ===
      0 // is even
    ) {
      // average of two middle numbers
      median = (numbers[numsLen / 2 - 1] + numbers[numsLen / 2]) / 2;
    } else {
      // is odd
      // middle number only
      median = numbers[(numsLen - 1) / 2];
    }

    return median;
  },
};
