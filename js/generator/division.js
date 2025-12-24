import { randomInt } from "../utils.js";

export function genDivision(config, id) {
  const b = randomInt(2, 9);
  const x = randomInt(2, 9);
  const a = b * x;

  return {
    id,
    operation: "division",
    terms: [a, b],
    result: x,
    unknownIndex: 2,
    correctAnswer: x
  };
}
