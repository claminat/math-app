
import { randomByWeight, randomInt } from "../utils.js";

export function genAddition(config, id) {
  const termCount = config.termCount;
  const unknownIndex = randomInt(0, termCount);
  const correctAnswer = randomByWeight(config.numberRanges);

  let terms = [];
  let sum = correctAnswer;

  for (let i = 0; i < termCount; i++) {
    if (i === unknownIndex) {
      terms.push("x");
    } else {
      const n = randomByWeight(config.numberRanges);
      terms.push(n);
      sum += n;
    }
  }

  const result = unknownIndex === termCount ? "x" : sum;

  if (!config.allowCarry && hasCarry(terms, correctAnswer)) {
    return genAddition(config, id);
  }

  return {
    id,
    operation: "addition",
    terms,
    result,
    unknownIndex,
    correctAnswer
  };
}

function hasCarry(terms, x) {
  let colSum = x;
  terms.forEach(t => {
    if (t !== "x") colSum += t;
  });
  return colSum >= 10;
}
