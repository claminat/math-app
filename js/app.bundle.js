(function () {
  "use strict";

  // ===== config.js =====
  const PRESETS = {
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
        { max: 99, weight: 10 },
        { min: 100, max: 999, weight: 90 }
      ]
    },

    grade4: {
      questionCount: 25,
      operations: ["addition", "subtraction", "multiplication", "division"],
      termCount: 4,
      allowCarry: true,
      numberRanges: [
        { max: 99, weight: 50 },
        { min: 100, max: 999, weight: 50 }
      ]
    }
  };

  // Chọn lớp (đổi preset tại đây)
  const CONFIG = PRESETS.grade3;

  const PRESET_NAME = "grade3";
  const STORAGE_KEY = "math_app_state_v1";

  function loadSavedQuestions() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || data.preset !== PRESET_NAME) return null;
      if (!Array.isArray(data.questions)) return null;
      if (data.questions.length !== CONFIG.questionCount) return null;
      return data.questions;
    } catch (e) {
      return null;
    }
  }

  function saveQuestions(questions) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        preset: PRESET_NAME,
        questions
      }));
    } catch (e) {
      // ignore storage errors
    }
  }

  function buildNewQuestions() {
    const qs = [];
    for (let i = 0; i < CONFIG.questionCount; i++) {
      qs.push(generateOneQuestion(CONFIG, i));
    }
    return qs;
  }

  function clearSummary() {
    const el = document.getElementById("summary");
    if (el) el.innerHTML = "";
  }

  // ===== utils.js =====
  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function randomFrom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function randomByWeight(ranges) {
    const total = ranges.reduce((s, r) => s + r.weight, 0);
    let rand = Math.random() * total;

    for (const r of ranges) {
      if (rand < r.weight) {
        const min = (typeof r.min === "number") ? r.min : 0;
        const max = (typeof r.max === "number") ? r.max : min;
        return randomInt(min, max);
      }
      rand -= r.weight;
    }
    // Fallback
    const last = ranges[ranges.length - 1];
    const min = (typeof last.min === "number") ? last.min : 0;
    const max = (typeof last.max === "number") ? last.max : min;
    return randomInt(min, max);
  }

  // ===== generator/addition.js =====
  function genAddition(config, id) {
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

    let result = sum;
    if (unknownIndex === termCount) {
      // x ở vế phải
      result = "x";
      // đảm bảo có ít nhất 1 số ở vế trái để bài có nghĩa
      if (terms.every(t => t === "x")) terms[0] = 0;
    }

    // nếu không cho phép nhớ (carry) thì thử lại vài lần
    if (config.allowCarry === false) {
      let tries = 0;
      while (tries++ < 50 && hasCarry(terms, correctAnswer)) {
        // regenerate
        return genAddition(config, id);
      }
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

  // ===== generator/subtraction.js =====
  function genSubtraction(config, id) {
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

  // ===== generator/multiplication.js =====
  function genMultiplication(config, id) {
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

  // ===== generator/division.js =====
  function genDivision(config, id) {
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

  // ===== generator/index.js =====
  function generateOneQuestion(config, id) {
    const op = randomFrom(config.operations);

    switch (op) {
      case "addition": return genAddition(config, id);
      case "subtraction": return genSubtraction(config, id);
      case "multiplication": return genMultiplication(config, id);
      case "division": return genDivision(config, id);
      default: return genAddition(config, id);
    }
  }

  // ===== renderer.js =====
  function renderQuestions(questions) {
    const c = document.getElementById("question-container");
    c.innerHTML = "";

    const table = document.createElement("table");
    table.className = "question-table";
    table.innerHTML = `
      <thead>
        <tr>
          <th class="col-no">#</th>
          <th class="col-q">Câu hỏi</th>
          <th class="col-a">Đáp án</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;

    const tbody = table.querySelector("tbody");

    questions.forEach(q => {
      const tr = document.createElement("tr");
      tr.className = "question-row";
      tr.dataset.id = q.id;

      tr.innerHTML = `
        <td class="col-no">${q.id + 1}</td>
        <td class="col-q">${buildQuestionHtml(q)}</td>
        <td class="col-a"><span class="answer-cell" data-id="${q.id}"></span></td>
      `;

      tbody.appendChild(tr);
    });

    c.appendChild(table);
  }

  function buildText(q, hideX) {
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

  function buildQuestionHtml(q) {
    const map = {
      addition: "+",
      subtraction: "-",
      multiplication: "×",
      division: "÷"
    };

    const op = ` ${map[q.operation]} `;

    // unknownIndex === terms.length => result is unknown
    if (q.unknownIndex === q.terms.length) {
      const left = q.terms.join(op);
      return `${left} = <input class="answer-input" data-id="${q.id}" type="number" inputmode="numeric" />`;
    }

    const left = q.terms
      .map((t, idx) => idx === q.unknownIndex ? `<input class="answer-input" data-id="${q.id}" type="number" inputmode="numeric" />` : t)
      .join(op);

    return `${left} = ${q.result}`;
  }

  function showAnswers(state) {
    if (state.answersShown) return;

    state.questions.forEach(q => {
      const cell = document.querySelector(`.answer-cell[data-id="${q.id}"]`);
      if (cell) cell.textContent = buildAnswerText(q);
    });

    state.answersShown = true;
  }

  function buildAnswerText(q) {
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

  function handleSubmit(state) {
    if (state.submitted) return;

    let correct = 0, wrong = 0;

    state.questions.forEach(q => {
      const row = document.querySelector(`tr.question-row[data-id="${q.id}"]`);
      const input = row.querySelector("input.answer-input");
      const val = Number(input.value);

      if (val === q.correctAnswer) {
        row.classList.add("correct");
        correct++;
      } else {
        row.classList.add("wrong");
        wrong++;
      }
    });

    const score = ((correct / state.questions.length) * 10).toFixed(1);
    document.getElementById("summary").innerText =
      `Đúng: ${correct} | Sai: ${wrong} | Điểm: ${score} / 10`;

    state.submitted = true;
  }

  // ===== main.js (no modules) =====
  let state = {
    questions: [],
    submitted: false,
    answersShown: false
  };

  
  // ===== clock + password modal helpers =====
  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function formatDateTime(d) {
    const dd = pad2(d.getDate());
    const mm = pad2(d.getMonth() + 1);
    const yyyy = d.getFullYear();
    const HH = pad2(d.getHours());
    const MM = pad2(d.getMinutes());
    const SS = pad2(d.getSeconds());
    return `${dd}/${mm}/${yyyy} ${HH}:${MM}:${SS}`;
  }

  function getHHmm(d) {
    return `${pad2(d.getHours())}${pad2(d.getMinutes())}`;
  }

  function setupClock() {
    const el = document.getElementById("clock");
    if (!el) return;

    const tick = () => {
      el.textContent = formatDateTime(new Date());
      const now = new Date();
      const msToNextSecond = 1000 - now.getMilliseconds();
      setTimeout(tick, Math.max(50, msToNextSecond));
    };

    tick();
  }

  function setupPasswordModal() {
    const overlay = document.getElementById("pwdOverlay");
    const input = document.getElementById("pwdInput");
    const okBtn = document.getElementById("pwdOkBtn");
    const cancelBtn = document.getElementById("pwdCancelBtn");
    const errorEl = document.getElementById("pwdError");

    if (!overlay || !input || !okBtn || !cancelBtn || !errorEl) {
      // modal not present (shouldn't happen)
      return { open: (_onOk) => _onOk && _onOk() };
    }

    let onOk = null;

    const hideError = () => errorEl.classList.add("hidden");
    const showError = () => errorEl.classList.remove("hidden");

    const close = () => {
      overlay.classList.add("hidden");
      onOk = null;
      hideError();
    };

    const tryConfirm = () => {
      const expectedNow = getHHmm(new Date());
      const val = (input.value || "").trim();
      if (val === expectedNow) {
        const cb = onOk;
        close();
        if (typeof cb === "function") cb();
      } else {
        showError();
        input.focus();
        input.select();
      }
    };

    const open = (cb) => {
      onOk = cb;
      input.value = "";
      hideError();
      overlay.classList.remove("hidden");
      setTimeout(() => input.focus(), 0);
    };

    // Input sanitize: digits only, max 4 chars
    input.addEventListener("input", () => {
      const digits = (input.value || "").replace(/\D+/g, "").slice(0, 4);
      if (digits !== input.value) input.value = digits;
    });

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });

    cancelBtn.addEventListener("click", close);
    okBtn.addEventListener("click", tryConfirm);

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        tryConfirm();
      } else if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    });

    // Fallback: if Enter/Escape not captured on input (focus issues), capture on document while modal is open
    document.addEventListener("keydown", (e) => {
      if (overlay.classList.contains("hidden")) return;
      if (e.key === "Enter") {
        e.preventDefault();
        tryConfirm();
      } else if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    }, true);

    return { open };
  }

document.addEventListener("DOMContentLoaded", () => {
    // 1) Load saved set (survive F5)
    const saved = loadSavedQuestions();
    const initialQuestions = saved || buildNewQuestions();

    // If no saved set, persist immediately
    if (!saved) saveQuestions(initialQuestions);

    // state is re-assignable (used by buttons)
    state = {
      questions: initialQuestions,
      submitted: false,
      answersShown: false
    };

    renderQuestions(state.questions);

    // Clock + password modal
    setupClock();
    const pwdModal = setupPasswordModal();

    // Bind actions
    document.getElementById("submitBtn").onclick = () => handleSubmit(state);
    document.getElementById("showAnswerBtn").onclick = () => showAnswers(state);

    const newBtn = document.getElementById("newSetBtn");
    if (newBtn) {
      newBtn.onclick = () => {
        // Require time-based password (HHmm) before generating a new set
        pwdModal.open(() => {
          const qs = buildNewQuestions();
          saveQuestions(qs);
          clearSummary();

          state = { questions: qs, submitted: false, answersShown: false };
          renderQuestions(state.questions);
        });
      };
    }
  });})();