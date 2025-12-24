export const PRESETS = {
  grade1: {
    questionCount: 10,
    operations: ["addition"],
    termCount: 2,
    allowCarry: false,
    numberRanges: [{ max: 10, weight: 100 }]
  },

  grade2: {
    questionCount: 20,
    operations: ["addition", "subtraction"],
    termCount: 2,
    allowCarry: true,
    numberRanges: [{ max: 99, weight: 100 }]
  },

  grade3: {
    questionCount: 20,
    operations: ["addition", "subtraction", "multiplication"],
    termCount: 3,
    allowCarry: true,
    numberRanges: [
      { max: 99, weight: 70 },
      { max: 999, weight: 30 }
    ]
  },

  grade4: {
    questionCount: 25,
    operations: ["addition", "subtraction", "multiplication", "division"],
    termCount: 4,
    allowCarry: true,
    numberRanges: [
      { max: 99, weight: 50 },
      { max: 999, weight: 50 }
    ]
  }
};

// Chọn lớp
export const CONFIG = PRESETS.grade3;
