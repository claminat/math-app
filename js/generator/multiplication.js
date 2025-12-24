import { randomInt } from "../utils.js";

export function genMultiplication(config, id) {
  const a = randomInt(2, 9);
  const b = randomInt(2, 9);

  return {
    id,
    operation: "multiplication",
    terms: [a, b],
    result: a * b,
    unknownIndex: 2,
    correctAnswer: a * b
  };
}
