import { randomByWeight } from "../utils.js";

export function genSubtraction(config, id) {
  const a = randomByWeight(config.numberRanges);
  const b = randomByWeight(config.numberRanges);

  const max = Math.max(a, b);
  const min = Math.min(a, b);

  return {
    id,
    operation: "subtraction",
    terms: [max, min],
    result: max - min,
    unknownIndex: 2,
    correctAnswer: max - min
  };
}
