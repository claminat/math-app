export function renderQuestions(questions) {
  const c = document.getElementById("question-container");
  c.innerHTML = "";

  questions.forEach(q => {
    const div = document.createElement("div");
    div.className = "question";
    div.dataset.id = q.id;

    div.innerHTML = `
      ${q.id + 1}. ${buildText(q, true)}
      <input type="number">
    `;
    c.appendChild(div);
  });
}

export function buildText(q, hideX) {
  const map = {
    addition: "+",
    subtraction: "-",
    multiplication: "×",
    division: "÷"
  };

  const left = q.terms
    .map(t => (t === "x" && hideX ? "□" : t))
    .join(` ${map[q.operation]} `);

  const right = q.result === "x" && hideX ? "□" : q.result;
  return `${left} = ${right}`;
}

export function showAnswers(state) {
  if (state.answersShown) return;

  state.questions.forEach(q => {
    const div = document.querySelector(`.question[data-id="${q.id}"]`);
    const answerLine = document.createElement("div");
    answerLine.className = "answer-line";
    answerLine.innerText = buildAnswerText(q);
    div.appendChild(answerLine);
  });

  state.answersShown = true;
}

export function buildAnswerText(q) {
  const map = {
    addition: "+",
    subtraction: "-",
    multiplication: "×",
    division: "÷"
  };

  const terms = q.terms.map(t => (t === "x" ? q.correctAnswer : t));
  const result = q.result === "x" ? q.correctAnswer : q.result;

  return `${terms.join(` ${map[q.operation]} `)} = ${result}`;
}

export function handleSubmit(state) {
  if (state.submitted) return;

  let correct = 0, wrong = 0;

  state.questions.forEach(q => {
    const div = document.querySelector(`.question[data-id="${q.id}"]`);
    const input = div.querySelector("input");
    const val = Number(input.value);

    if (val === q.correctAnswer) {
      div.classList.add("correct");
      correct++;
    } else {
      div.classList.add("wrong");
      wrong++;
    }
  });

  const score = ((correct / state.questions.length) * 10).toFixed(1);
  document.getElementById("summary").innerText =
    `Đúng: ${correct} | Sai: ${wrong} | Điểm: ${score} / 10`;

  state.submitted = true;
}
