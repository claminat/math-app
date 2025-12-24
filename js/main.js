import { CONFIG } from "./config.js";
import { generateOneQuestion } from "./generator/index.js";
import { renderQuestions, showAnswers, handleSubmit } from "./renderer.js";

const state = {
  questions: [],
  submitted: false,
  answersShown: false
};

document.addEventListener("DOMContentLoaded", () => {
  for (let i = 0; i < CONFIG.questionCount; i++) {
    state.questions.push(generateOneQuestion(CONFIG, i));
  }

  renderQuestions(state.questions);

  document.getElementById("submitBtn").onclick = () => handleSubmit(state);
  document.getElementById("showAnswerBtn").onclick = () => showAnswers(state);
});
