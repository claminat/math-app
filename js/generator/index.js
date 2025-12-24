import { randomFrom } from "../utils.js";
import { genAddition } from "./addition.js";
import { genSubtraction } from "./subtraction.js";
import { genMultiplication } from "./multiplication.js";
import { genDivision } from "./division.js";

export function generateOneQuestion(config, id) {
  const op = randomFrom(config.operations);

  switch (op) {
    case "addition": return genAddition(config, id);
    case "subtraction": return genSubtraction(config, id);
    case "multiplication": return genMultiplication(config, id);
    case "division": return genDivision(config, id);
  }
}
