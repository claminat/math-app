(function () {
  "use strict";

  // ===== config.js =====
  
// Default presets (cấu hình mặc định trong file)
const DEFAULT_PRESETS = {
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

const DEFAULT_SELECTED_PRESET_KEY = "grade3";

const CONFIG_STORAGE_KEY = "math_app_config_v1";
const EXAM_STORAGE_KEY = "math_app_exam_v1";
  const ANS_STORAGE_PREFIX = "math_app_answers_v1:";

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function loadAppConfig() {
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (!raw) {
      return {
        selectedPresetKey: DEFAULT_SELECTED_PRESET_KEY,
        presets: deepClone(DEFAULT_PRESETS)
      };
    }
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object") throw new Error("bad config");
    const selectedPresetKey = (data.selectedPresetKey || DEFAULT_SELECTED_PRESET_KEY);
    const presets = (data.presets && typeof data.presets === "object") ? data.presets : deepClone(DEFAULT_PRESETS);

    // Ensure all grades exist (merge defaults)
    const merged = deepClone(DEFAULT_PRESETS);
    ["grade1", "grade2", "grade3", "grade4"].forEach((k) => {
      if (presets[k]) merged[k] = Object.assign({}, merged[k], presets[k]);
    });

    return { selectedPresetKey, presets: merged };
  } catch (e) {
    return {
      selectedPresetKey: DEFAULT_SELECTED_PRESET_KEY,
      presets: deepClone(DEFAULT_PRESETS)
    };
  }
}

function saveAppConfig(appConfig) {
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify({
      selectedPresetKey: appConfig.selectedPresetKey,
      presets: appConfig.presets,
      updatedAt: Date.now()
    }));
  } catch (e) {
    // ignore
  }
}

function loadExamState() {
  try {
    const raw = localStorage.getItem(EXAM_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object") return null;
    if (!Array.isArray(data.questions)) return null;
    if (!data.configSnapshot || typeof data.configSnapshot !== "object") return null;
    if (!data.presetKey || typeof data.presetKey !== "string") return null;

    // basic shape validation
    if (typeof data.configSnapshot.questionCount !== "number") return null;
    if (data.questions.length !== data.configSnapshot.questionCount) return null;
    return data;
  } catch (e) {
    return null;
  }
}

function saveExamState(presetKey, configSnapshot, questions) {
  const createdAt = Date.now();
  try {
    localStorage.setItem(EXAM_STORAGE_KEY, JSON.stringify({
      presetKey,
      configSnapshot,
      questions,
      createdAt
    }));
  } catch (e) {
    // ignore
  }
  return createdAt;
}

function loadAnswerState(examId) {
  try {
    if (typeof examId !== "number") return null;
    const raw = localStorage.getItem(ANS_STORAGE_PREFIX + String(examId));
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object") return null;
    if (!data.answers || typeof data.answers !== "object") return null;
    return data;
  } catch (e) {
    return null;
  }
}

function saveAnswerState(examId, answers) {
  try {
    if (typeof examId !== "number") return;
    localStorage.setItem(ANS_STORAGE_PREFIX + String(examId), JSON.stringify({
      answers: answers || {},
      savedAt: Date.now()
    }));
  } catch (e) {
    // ignore
  }
}

function buildNewQuestions(config) {
  const qs = [];
  for (let i = 0; i < config.questionCount; i++) {
    qs.push(generateOneQuestion(config, i));
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

function collectAnswersFromInputs() {
  const inputs = Array.from(document.querySelectorAll("input.answer-input"));
  const map = {};
  inputs.forEach(i => {
    const qid = i.getAttribute("data-id");
    map[qid] = (i.value || "").trim();
  });
  return map;
}

function applyAnswersToInputs(answerMap) {
  if (!answerMap || typeof answerMap !== "object") return;
  const inputs = Array.from(document.querySelectorAll("input.answer-input"));
  inputs.forEach(i => {
    const qid = i.getAttribute("data-id");
    if (Object.prototype.hasOwnProperty.call(answerMap, qid)) {
      i.value = String(answerMap[qid] ?? "");
    }
  });
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

    const open = (arg) => {
      // arg: function OR { title, desc, onOk }
      if (typeof arg === "function") {
        onOk = arg;
      } else if (arg && typeof arg === "object") {
        onOk = arg.onOk;
        const tEl = document.getElementById("pwdTitle");
        const dEl = overlay.querySelector(".modal-desc");
        if (tEl && typeof arg.title === "string") tEl.textContent = arg.title;
        if (dEl && typeof arg.desc === "string") dEl.textContent = arg.desc;
      } else {
        onOk = null;
      }
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
    // Runtime app config (from storage; fallback to defaults in file)
    let appConfig = loadAppConfig();

    // Load exam state (survive F5). If missing, generate immediately from current config.
    const savedExam = loadExamState();

    function normalizeConfig(cfg) {
      const c = deepClone(cfg || {});
      c.questionCount = parseInt(c.questionCount, 10) || 10;
      c.termCount = parseInt(c.termCount, 10) || 2;
      c.allowCarry = !!c.allowCarry;
      c.operations = Array.isArray(c.operations) ? c.operations.slice() : ["addition"];
      c.numberRanges = Array.isArray(c.numberRanges) ? c.numberRanges.map(r => Object.assign({}, r)) : [{ max: 10, weight: 100 }];

      // Normalize ranges:
      // - first range: min defaults to 0
      // - subsequent range: if min missing and prev.max exists, min = prev.max + 1 (helps users avoid "999 includes <100")
      for (let i = 0; i < c.numberRanges.length; i++) {
        const r = c.numberRanges[i];
        const prev = c.numberRanges[i - 1];
        const hasMin = (r.min !== undefined && r.min !== null && String(r.min).trim() !== "");
        if (!hasMin) {
          if (i === 0) r.min = 0;
          else if (prev && prev.max !== undefined && prev.max !== null) {
            const pm = parseInt(prev.max, 10);
            if (!Number.isNaN(pm)) r.min = pm + 1;
            else r.min = 0;
          } else r.min = 0;
        }
        r.min = parseInt(r.min, 10);
        r.max = parseInt(r.max, 10);
        r.weight = parseFloat(r.weight);
      }

      return c;
    }

    let state;
    let currentExamId = null;
    let currentConfigSnapshot = null;

    if (savedExam) {
      currentExamId = (typeof savedExam.createdAt === "number") ? savedExam.createdAt : ((typeof savedExam.createdAt === "string" && /^\d+$/.test(savedExam.createdAt)) ? parseInt(savedExam.createdAt, 10) : null);
      currentConfigSnapshot = savedExam.configSnapshot;

      // Backward compatibility: older saved exams may not have createdAt
      if (currentExamId === null) {
        currentExamId = Date.now();
        try {
          localStorage.setItem(EXAM_STORAGE_KEY, JSON.stringify({
            presetKey: savedExam.presetKey,
            configSnapshot: savedExam.configSnapshot,
            questions: savedExam.questions,
            createdAt: currentExamId
          }));
        } catch (e) {
          // ignore
        }
      }

      state = { questions: savedExam.questions, submitted: false, answersShown: false };
    } else {
      const presetKey = appConfig.selectedPresetKey || DEFAULT_SELECTED_PRESET_KEY;
      const cfg = normalizeConfig(appConfig.presets[presetKey]);
      const qs = buildNewQuestions(cfg);
      currentExamId = saveExamState(presetKey, cfg, qs);
      currentConfigSnapshot = cfg;
      saveAnswerState(currentExamId, {});
      state = { questions: qs, submitted: false, answersShown: false };
    }

    renderQuestions(state.questions);

    // Restore saved answers for this exam (avoid mixing answers across exams)
    const savedAnsState = loadAnswerState(currentExamId);
    if (savedAnsState && typeof currentExamId === "number") {
      applyAnswersToInputs(savedAnsState.answers);
    }

    // Clock + password modal
    setupClock();
    const pwdModal = setupPasswordModal();

    // ===== Settings modal =====
    const settings = {
      overlay: document.getElementById("settingsOverlay"),
      closeBtn: document.getElementById("settingsCloseBtn"),
      cancelBtn: document.getElementById("settingsCancelBtn"),
      saveBtn: document.getElementById("settingsSaveBtn"),
      resetBtn: document.getElementById("resetPresetBtn"),
      presetSelect: document.getElementById("presetSelect"),
      questionCountInput: document.getElementById("questionCountInput"),
      termCountInput: document.getElementById("termCountInput"),
      allowCarryInput: document.getElementById("allowCarryInput"),
      opChecks: Array.from(document.querySelectorAll(".opCheck")),
      tbody: document.getElementById("rangesTbody"),
      addRangeBtn: document.getElementById("addRangeBtn"),
      err: document.getElementById("settingsError")
    };

    let draft = null; // { selectedPresetKey, presets }
    let draftCurrentKey = null;

    function showSettingsError(msg) {
      if (!settings.err) return;
      settings.err.textContent = msg;
      settings.err.classList.remove("hidden");
    }

    function hideSettingsError() {
      if (!settings.err) return;
      settings.err.textContent = "";
      settings.err.classList.add("hidden");
    }

    function openSettings() {
      if (!settings.overlay) return;
      draft = deepClone(appConfig);
      draftCurrentKey = draft.selectedPresetKey || DEFAULT_SELECTED_PRESET_KEY;

      // preset select
      if (settings.presetSelect) {
        settings.presetSelect.value = draftCurrentKey;
      }

      renderSettingsFormForKey(draftCurrentKey);
      hideSettingsError();

      settings.overlay.classList.remove("hidden");
      setTimeout(() => settings.presetSelect && settings.presetSelect.focus(), 0);
    }

    function closeSettings() {
      if (!settings.overlay) return;
      settings.overlay.classList.add("hidden");
      hideSettingsError();
      draft = null;
      draftCurrentKey = null;
    }

    function renderRangesTable(ranges) {
      if (!settings.tbody) return;
      settings.tbody.innerHTML = "";
      ranges.forEach((r, idx) => {
        const tr = document.createElement("tr");

        const tdMin = document.createElement("td");
        const tdMax = document.createElement("td");
        const tdW = document.createElement("td");
        const tdDel = document.createElement("td");

        const inMin = document.createElement("input");
        inMin.className = "range-input";
        inMin.type = "number";
        inMin.step = "1";
        inMin.placeholder = "min";
        inMin.value = (r.min === undefined || r.min === null) ? "" : String(r.min);
        inMin.dataset.idx = String(idx);
        inMin.dataset.field = "min";

        const inMax = document.createElement("input");
        inMax.className = "range-input";
        inMax.type = "number";
        inMax.step = "1";
        inMax.placeholder = "max";
        inMax.value = (r.max === undefined || r.max === null) ? "" : String(r.max);
        inMax.dataset.idx = String(idx);
        inMax.dataset.field = "max";

        const inW = document.createElement("input");
        inW.className = "range-input";
        inW.type = "number";
        inW.step = "1";
        inW.placeholder = "weight";
        inW.value = (r.weight === undefined || r.weight === null) ? "" : String(r.weight);
        inW.dataset.idx = String(idx);
        inW.dataset.field = "weight";

        const delBtn = document.createElement("button");
        delBtn.className = "row-del-btn";
        delBtn.type = "button";
        delBtn.textContent = "🗑";
        delBtn.dataset.idx = String(idx);

        tdMin.appendChild(inMin);
        tdMax.appendChild(inMax);
        tdW.appendChild(inW);
        tdDel.appendChild(delBtn);

        tr.appendChild(tdMin);
        tr.appendChild(tdMax);
        tr.appendChild(tdW);
        tr.appendChild(tdDel);

        settings.tbody.appendChild(tr);
      });
    }

    function renderSettingsFormForKey(presetKey) {
      if (!draft) return;
      draftCurrentKey = presetKey;
      const cfg = draft.presets[presetKey] || deepClone(DEFAULT_PRESETS[presetKey]);

      if (settings.questionCountInput) settings.questionCountInput.value = String(cfg.questionCount ?? "");
      if (settings.termCountInput) settings.termCountInput.value = String(cfg.termCount ?? "");
      if (settings.allowCarryInput) settings.allowCarryInput.checked = !!cfg.allowCarry;

      const ops = Array.isArray(cfg.operations) ? cfg.operations : [];
      settings.opChecks.forEach(chk => {
        chk.checked = ops.includes(chk.value);
      });

      const ranges = Array.isArray(cfg.numberRanges) ? cfg.numberRanges : [];
      renderRangesTable(ranges);
    }

    function readSettingsFormToPreset(presetKey) {
      if (!draft) return null;

      const qc = parseInt(settings.questionCountInput?.value || "", 10);
      const tc = parseInt(settings.termCountInput?.value || "", 10);
      const allowCarry = !!settings.allowCarryInput?.checked;
      const ops = settings.opChecks.filter(c => c.checked).map(c => c.value);

      if (!Number.isFinite(qc) || qc < 1) return { error: "questionCount phải là số >= 1" };
      if (!Number.isFinite(tc) || tc < 2) return { error: "termCount phải là số >= 2" };
      if (!ops.length) return { error: "Bạn phải chọn ít nhất 1 phép tính (operations)." };

      const oldCfg = draft.presets[presetKey] || deepClone(DEFAULT_PRESETS[presetKey]);
      const ranges = Array.isArray(oldCfg.numberRanges) ? deepClone(oldCfg.numberRanges) : [];

      // Validate ranges
      if (!ranges.length) return { error: "numberRanges phải có ít nhất 1 dòng." };
      for (let i = 0; i < ranges.length; i++) {
        const r = ranges[i];
        const max = parseInt(r.max, 10);
        const weight = parseFloat(r.weight);
        const minRaw = (r.min === undefined || r.min === null || String(r.min).trim() === "") ? null : parseInt(r.min, 10);

        if (!Number.isFinite(max) || max <= 0) return { error: `range #${i + 1}: max phải là số > 0` };
        if (!Number.isFinite(weight) || weight <= 0) return { error: `range #${i + 1}: weight phải là số > 0` };
        if (minRaw !== null && (!Number.isFinite(minRaw) || minRaw < 0)) return { error: `range #${i + 1}: min phải là số >= 0 (hoặc để trống)` };
        if (minRaw !== null && minRaw > max) return { error: `range #${i + 1}: min không được lớn hơn max` };
      }

      return {
        questionCount: qc,
        operations: ops,
        termCount: tc,
        allowCarry,
        numberRanges: ranges.map(r => {
          const out = { max: parseInt(r.max, 10), weight: parseFloat(r.weight) };
          if (r.min !== undefined && r.min !== null && String(r.min).trim() !== "") out.min = parseInt(r.min, 10);
          return out;
        })
      };
    }

    // Settings events
    if (settings.overlay) {
      settings.overlay.addEventListener("click", (e) => {
        if (e.target === settings.overlay) closeSettings();
      });
    }
    settings.closeBtn && settings.closeBtn.addEventListener("click", closeSettings);
    settings.cancelBtn && settings.cancelBtn.addEventListener("click", closeSettings);

    settings.presetSelect && settings.presetSelect.addEventListener("change", () => {
      if (!draft) return;
      const k = settings.presetSelect.value;
      draft.selectedPresetKey = k;
      renderSettingsFormForKey(k);
      hideSettingsError();
    });

    settings.addRangeBtn && settings.addRangeBtn.addEventListener("click", () => {
      if (!draft || !draftCurrentKey) return;
      const cfg = draft.presets[draftCurrentKey] || deepClone(DEFAULT_PRESETS[draftCurrentKey]);
      cfg.numberRanges = Array.isArray(cfg.numberRanges) ? cfg.numberRanges : [];
      cfg.numberRanges.push({ min: "", max: 99, weight: 50 });
      draft.presets[draftCurrentKey] = cfg;
      renderRangesTable(cfg.numberRanges);
    });

    // Delegate input changes + delete row
    settings.tbody && settings.tbody.addEventListener("click", (e) => {
      const t = e.target;
      if (!(t instanceof HTMLElement)) return;
      if (t.matches("button.row-del-btn")) {
        const idx = parseInt(t.dataset.idx || "", 10);
        if (!draft || !draftCurrentKey || !Number.isFinite(idx)) return;
        const cfg = draft.presets[draftCurrentKey];
        if (!cfg || !Array.isArray(cfg.numberRanges)) return;
        cfg.numberRanges.splice(idx, 1);
        renderRangesTable(cfg.numberRanges);
      }
    });

    settings.tbody && settings.tbody.addEventListener("input", (e) => {
      const t = e.target;
      if (!(t instanceof HTMLInputElement)) return;
      const idx = parseInt(t.dataset.idx || "", 10);
      const field = t.dataset.field;
      if (!draft || !draftCurrentKey || !Number.isFinite(idx) || !field) return;
      const cfg = draft.presets[draftCurrentKey] || deepClone(DEFAULT_PRESETS[draftCurrentKey]);
      cfg.numberRanges = Array.isArray(cfg.numberRanges) ? cfg.numberRanges : [];
      if (!cfg.numberRanges[idx]) return;
      cfg.numberRanges[idx][field] = t.value;
      draft.presets[draftCurrentKey] = cfg;
    });

    settings.resetBtn && settings.resetBtn.addEventListener("click", () => {
      if (!draft || !draftCurrentKey) return;
      draft.presets[draftCurrentKey] = deepClone(DEFAULT_PRESETS[draftCurrentKey]);
      renderSettingsFormForKey(draftCurrentKey);
      hideSettingsError();
    });

    settings.saveBtn && settings.saveBtn.addEventListener("click", () => {
      if (!draft) return;
      hideSettingsError();

      const presetKey = settings.presetSelect ? settings.presetSelect.value : (draft.selectedPresetKey || DEFAULT_SELECTED_PRESET_KEY);
      const maybe = readSettingsFormToPreset(presetKey);
      if (!maybe) return;
      if (maybe.error) {
        showSettingsError(maybe.error);
        return;
      }

      // Update draft
      draft.presets[presetKey] = maybe;
      draft.selectedPresetKey = presetKey;

      // Password confirm (HHmm)
      pwdModal.open({
        title: "Xác nhận lưu cấu hình",
        desc: "Nhập mật khẩu (HHmm - 4 số). Nhấn Enter để xác nhận.",
        onOk: () => {
          appConfig = draft;
          saveAppConfig(appConfig);
          closeSettings();
        }
      });
    });


    const AUTOSAVE_DEBOUNCE_MS = 450;
    let autosaveTimer = null;

    function showDraftSavedMessage() {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, "0");
      const mi = String(now.getMinutes()).padStart(2, "0");
      const ss = String(now.getSeconds()).padStart(2, "0");
      const el = document.getElementById("summary");
      if (!el) return;
      const msg = `💾 Đã lưu tạm lúc ${hh}:${mi}:${ss}`;
      const existing = (el.innerHTML || "").trim();
      if (!existing) el.innerHTML = msg;
      else el.innerHTML = existing + "<br/>" + msg;
    }

    function scheduleAutosave() {
      if (autosaveTimer) clearTimeout(autosaveTimer);
      autosaveTimer = setTimeout(() => {
        if (typeof currentExamId !== "number") return;
        const ans = collectAnswersFromInputs();
        saveAnswerState(currentExamId, ans);
      }, AUTOSAVE_DEBOUNCE_MS);
    }

    function flushSaveDraft(showMessage) {
      if (autosaveTimer) {
        clearTimeout(autosaveTimer);
        autosaveTimer = null;
      }
      if (typeof currentExamId !== "number") return;
      const ans = collectAnswersFromInputs();
      saveAnswerState(currentExamId, ans);
      if (showMessage) showDraftSavedMessage();
    }

    // Auto-save answers as user types (debounced)
    const qContainer = document.getElementById("question-container");
    if (qContainer) {
      qContainer.addEventListener("input", (e) => {
        const t = e.target;
        if (t && t.classList && t.classList.contains("answer-input")) {
          scheduleAutosave();
        }
      });
      qContainer.addEventListener("change", (e) => {
        const t = e.target;
        if (t && t.classList && t.classList.contains("answer-input")) {
          scheduleAutosave();
        }
      });
    }

    // Bind main actions
    document.getElementById("submitBtn").onclick = () => { flushSaveDraft(false); handleSubmit(state); };
    document.getElementById("showAnswerBtn").onclick = () => {
      pwdModal.open({
        title: "Xác nhận hiện đáp án",
        desc: "Nhập mật khẩu (HHmm - 4 số). Nhấn Enter để xác nhận.",
        onOk: () => {
          flushSaveDraft(false);
          showAnswers(state);
        }
      });
    };

    const saveDraftBtn = document.getElementById("saveDraftBtn");
    if (saveDraftBtn) {
      saveDraftBtn.onclick = () => flushSaveDraft(true);
    }

    const newBtn = document.getElementById("newSetBtn");
    if (newBtn) {
      newBtn.onclick = () => {
        pwdModal.open({
          title: "Xác nhận đổi đề",
          desc: "Nhập mật khẩu (HHmm - 4 số). Nhấn Enter để xác nhận.",
          onOk: () => {
            const presetKey = appConfig.selectedPresetKey || DEFAULT_SELECTED_PRESET_KEY;
            const cfg = normalizeConfig(appConfig.presets[presetKey]);
            const qs = buildNewQuestions(cfg);
            currentExamId = saveExamState(presetKey, cfg, qs);
            currentConfigSnapshot = cfg;
            saveAnswerState(currentExamId, {});
            clearSummary();
            state = { questions: qs, submitted: false, answersShown: false };
            renderQuestions(state.questions);
          }
        });
      };
    }

    const cfgBtn = document.getElementById("configBtn");
    if (cfgBtn) {
      cfgBtn.onclick = () => openSettings();
    }
  });
})();