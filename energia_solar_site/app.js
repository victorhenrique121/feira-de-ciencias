(() => {
  "use strict";

  // Exige a identificação simples do visitante antes de entrar na experiência.
  if (!sessionStorage.getItem("visitante")) {
    window.location.replace("/login");
    return;
  }

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  const money = (value) =>
    Number(value || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });

  /* MENU */
  const menuBtn = $("#menuBtn");
  const nav = $("#navLinks");

  menuBtn?.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
    document.body.classList.toggle("lock", open);
  });

  nav?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("open");
      menuBtn?.setAttribute("aria-expanded", "false");
      menuBtn?.setAttribute("aria-label", "Abrir menu");
      document.body.classList.remove("lock");
    });
  });

  /* PAYBACK */
  function calculate() {
    const inv = Number($("#investimento")?.value || 0);
    const monthly = Number($("#economia")?.value || 0);
    const years = Math.max(1, Number($("#anos")?.value || 1));

    if (inv <= 0 || monthly <= 0) {
      $("#payback").textContent = "—";
      $("#paybackYears").textContent = "Informe valores maiores que zero.";
      $("#progressBar").style.width = "0%";
      $("#progressText").textContent = "0%";
      $("#table").innerHTML = "";
      return;
    }

    const months = inv / monthly;
    const annual = monthly * 12;
    const total = annual * years;
    const reached = Math.min(100, (total / inv) * 100);

    $("#payback").textContent = `${months.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} meses`;
    $("#paybackYears").textContent = `≈ ${(months / 12).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} anos para recuperar o investimento.`;
    $("#investLabel").textContent = money(inv);
    $("#monthLabel").textContent = money(monthly);
    $("#annual").textContent = money(annual);
    $("#progressBar").style.width = `${reached}%`;
    $("#progressText").textContent = `${Math.round(reached)}%`;
    $("#chartPayback").textContent = `Payback: ${months.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} meses`;

    const points = [1, Math.min(5, years), years].filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b);
    $("#table").innerHTML = `<table><thead><tr><th>Tempo</th><th>Economia</th><th>Saldo</th></tr></thead><tbody>${points.map((year) => { const economy = annual * year; return `<tr><td>${year} ano${year > 1 ? "s" : ""}</td><td>${money(economy)}</td><td>${money(economy - inv)}</td></tr>`; }).join("")}</tbody></table>`;

    drawChart(inv, monthly, years);
    updateImpact(inv, monthly, years);
  }

  /* GRÁFICO SVG */
  function drawChart(inv, monthly, years) {
    const chart = $("#financeChart");
    if (!chart) return;

    const width = 700;
    const height = 240;
    const pad = { left: 36, right: 15, top: 15, bottom: 28 };
    const innerW = width - pad.left - pad.right;
    const innerH = height - pad.top - pad.bottom;
    const monthsTotal = Math.max(12, years * 12);
    const maxValue = Math.max(inv, monthly * monthsTotal) * 1.08;
    const x = (m) => pad.left + (m / monthsTotal) * innerW;
    const y = (v) => pad.top + innerH - (v / maxValue) * innerH;
    const steps = Math.min(60, Math.max(12, Math.ceil(monthsTotal / 3)));
    const points = [];

    for (let m = 0; m <= monthsTotal; m += Math.max(1, Math.round(monthsTotal / steps))) points.push([x(m), y(Math.min(monthly * m, maxValue))]);
    if (points[points.length - 1][0] !== x(monthsTotal)) points.push([x(monthsTotal), y(Math.min(monthly * monthsTotal, maxValue))]);

    const path = points.map((p, i) => `${i ? "L" : "M"} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
    const paybackMonth = Math.min(monthsTotal, inv / monthly);
    const px = x(paybackMonth);
    const py = y(inv);

    chart.innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Economia acumulada ao longo do tempo comparada ao investimento inicial"><line x1="${pad.left}" y1="${y(inv)}" x2="${width - pad.right}" y2="${y(inv)}" class="chart-invest"/><path d="${path}" class="chart-line"/><circle cx="${px}" cy="${py}" r="5" class="chart-point"/><text x="${pad.left}" y="${height - 7}" class="chart-label">0</text><text x="${width / 2}" y="${height - 7}" text-anchor="middle" class="chart-label">${Math.round(monthsTotal / 2)} meses</text><text x="${width - pad.right}" y="${height - 7}" text-anchor="end" class="chart-label">${monthsTotal} meses</text><text x="${pad.left + 5}" y="${Math.max(12, y(inv) - 7)}" class="chart-label">investimento</text><text x="${Math.min(width - 5, px + 8)}" y="${Math.max(15, py - 9)}" class="chart-label">payback</text></svg>`;
  }

  /* GRÁFICO INTERATIVO + LINHA DO TEMPO */
  const chartModal = $("#chartModal"), chartMonth = $("#chartMonth");
  let chartState = { inv: 8000, monthly: 250, years: 10 };
  let timelineMonth = 0;

  const timelineDescription = (label, month, inv, monthly, payback) => {
    const saved = monthly * month;
    const balance = Math.max(0, inv - saved);
    if (label === "Mês 1") return { title: "Mês 1 — o investimento começou", text: `A economia acumulada é ${money(saved)}. Ainda faltam ${money(balance)} para recuperar o investimento inicial.` };
    if (label === "Mês 12") return { title: "Mês 12 — primeiro ano", text: `Após 1 ano, a economia acumulada é ${money(saved)}. Compare esse valor com o investimento de ${money(inv)}.` };
    if (label === "Payback") return { title: `Payback — mês ${payback.toLocaleString("pt-BR", {maximumFractionDigits: 1})}`, text: `Neste ponto, a economia acumulada iguala o investimento inicial. A partir daqui, no modelo simples, a economia passa a superar o valor investido.` };
    if (label === "5 anos") return { title: "5 anos — investimento já recuperado", text: `Em 60 meses, a economia acumulada chega a ${money(saved)}. O saldo líquido estimado é ${money(saved - inv)}.` };
    return { title: "10 anos — visão de longo prazo", text: `Em 120 meses, a economia acumulada chega a ${money(saved)}. O saldo líquido estimado é ${money(saved - inv)}.` };
  };

  function renderTimeline(selectedMonth = timelineMonth){
    if (!$("#financeTimeline")) return;
    const {inv, monthly, years} = chartState;
    const totalMonths = Math.max(120, years * 12);
    const payback = inv / monthly;
    const markers = [{label:"Mês 1", month:1},{label:"Mês 12", month:12},{label:"Payback", month:Math.min(totalMonths, Math.max(1, Math.round(payback)))},{label:"5 anos", month:Math.min(totalMonths, 60)},{label:"10 anos", month:Math.min(totalMonths, 120)}];
    const closest = markers.reduce((a,b)=>Math.abs(b.month-selectedMonth)<Math.abs(a.month-selectedMonth)?b:a, markers[0]);
    $("#financeTimeline").innerHTML = markers.map((m,i)=>`<button type="button" class="timeline-item ${m===closest?'active':''}" data-month="${m.month}" aria-label="${m.label}"><span class="timeline-dot">${i+1}</span><span class="timeline-label">${m.label}</span></button>`).join("");
    $$(".timeline-item").forEach(btn=>btn.addEventListener("click",()=>{ timelineMonth=Number(btn.dataset.month); chartMonth.value=String(Math.min(Number(chartMonth.max),timelineMonth)); renderInteractiveChart(timelineMonth); }));
    const info=timelineDescription(closest.label, closest.month, inv, monthly, payback);
    $("#timelineInfo").innerHTML=`<strong>${info.title}</strong><span>${info.text}</span>`;
  }

  function renderInteractiveChart(month){
    const {inv,monthly,years}=chartState;
    const totalMonths=Math.max(1,years*12), m=Math.min(totalMonths,Math.max(0,Number(month)));
    const W=760,H=270,p={l:42,r:20,t:22,b:34},iw=W-p.l-p.r,ih=H-p.t-p.b,max=Math.max(inv,monthly*totalMonths)*1.08;
    const x=v=>p.l+(v/totalMonths)*iw, y=v=>p.t+ih-(v/max)*ih, pts=[];
    for(let i=0;i<=totalMonths;i+=Math.max(1,Math.ceil(totalMonths/60))) pts.push([x(i),y(Math.min(monthly*i,max))]);
    if(pts.at(-1)[0]!==x(totalMonths)) pts.push([x(totalMonths),y(Math.min(monthly*totalMonths,max))]);
    const path=pts.map((q,i)=>`${i?'L':'M'} ${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join(' ');
    const saved=monthly*m,balance=inv-saved,payback=inv/monthly;
    $("#interactiveChart").innerHTML=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Economia acumulada no mês ${m}"><line x1="${p.l}" y1="${y(inv)}" x2="${W-p.r}" y2="${y(inv)}" class="interactive-invest"/><path d="${path}" class="interactive-line"/><circle cx="${x(m)}" cy="${y(Math.min(saved,max))}" r="7" class="interactive-marker"/><text x="${p.l}" y="18" class="chart-label">Economia acumulada</text><text x="${W-p.r}" y="${Math.max(15,y(inv)-8)}" text-anchor="end" class="chart-label">Investimento</text><text x="${x(m)}" y="${Math.max(16,y(Math.min(saved,max))-12)}" text-anchor="middle" class="chart-label">Mês ${m}</text></svg>`;
    $("#chartMonthLabel").textContent=m;
    $("#chartSaved").textContent=money(saved);
    $("#chartBalance").textContent=money(Math.max(0,balance));
    $("#chartStatus").textContent=m>=payback?`Payback atingido (${payback.toLocaleString('pt-BR',{maximumFractionDigits:1})} meses)`: `Faltam ${(payback-m).toLocaleString('pt-BR',{maximumFractionDigits:1})} meses`;
    timelineMonth=m;
    renderTimeline(m);
  }

  $("#openChart")?.addEventListener("click",()=>{
    const inv=Number($("#investimento")?.value||0),monthly=Number($("#economia")?.value||0),years=Math.max(1,Number($("#anos")?.value||1));
    if(inv<=0||monthly<=0)return;
    chartState={inv,monthly,years};
    chartMonth.max=String(years*12);
    const payback=Math.round(inv/monthly);
    chartMonth.value=String(Math.min(years*12,payback));
    renderInteractiveChart(chartMonth.value);
    chartModal.classList.add("open"); chartModal.setAttribute("aria-hidden","false"); document.body.classList.add("lock"); $("#closeChart")?.focus();
  });
  function closeChartModal(){chartModal.classList.remove("open");chartModal.setAttribute("aria-hidden","true");document.body.classList.remove("lock")}
  $("#closeChart")?.addEventListener("click",closeChartModal);
  chartMonth?.addEventListener("input",()=>renderInteractiveChart(chartMonth.value));
  chartModal?.addEventListener("click",e=>{if(e.target===chartModal)closeChartModal()});

  /* SIMULADOR DA CASA */
  function calculateHouse() {
    const kwh = Number($("#houseKwh")?.value || 0);
    const bill = Number($("#houseBill")?.value || 0);
    const investment = Number($("#houseInvestment")?.value || 0);
    const savingPercent = Math.min(100, Math.max(0, Number($("#houseSaving")?.value || 0)));
    if (bill <= 0 || investment <= 0 || savingPercent <= 0) return;
    const monthlySave = bill * (savingPercent / 100);
    const newBill = bill - monthlySave;
    const annualSave = monthlySave * 12;
    const payback = investment / monthlySave;
    $("#houseNewBill").textContent = money(newBill);
    $("#houseMonthlySave").textContent = money(monthlySave);
    $("#houseAnnualSave").textContent = money(annualSave);
    $("#housePayback").textContent = `${payback.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} meses`;
    $("#houseText").textContent = `neste cenário, o investimento seria recuperado em cerca de ${(payback / 12).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} anos.`;
    $("#investimento").value = investment.toFixed(2);
    $("#economia").value = monthlySave.toFixed(2);
    calculate();
    updateImpact(investment, monthlySave, 10, kwh);
  }

  ["houseKwh", "houseBill", "houseInvestment", "houseSaving"].forEach((id) => $(`#${id}`)?.addEventListener("input", calculateHouse));

  /* IMPACTO AMBIENTAL — estimativa didática */
  function updateImpact(inv, monthlySave, years, kwh = Number($("#houseKwh")?.value || 400)) {
    const annualEnergy = Math.max(0, kwh * 12);
    const co2Factor = 0.24;
    const co2 = annualEnergy * co2Factor;
    $("#co2Impact").textContent = `${Math.round(co2).toLocaleString("pt-BR")} kg`;
    $("#energyImpact").textContent = `${Math.round(annualEnergy).toLocaleString("pt-BR")} kWh`;
  }

  $("#calcBtn")?.addEventListener("click", calculate);
  ["investimento", "economia", "anos"].forEach((id) => $(`#${id}`)?.addEventListener("input", calculate));

  /* QUIZ */
  const modal = $("#quizModal");
  const quiz = $("#quizContainer");
  const quizBtn = $("#quizBtn");
  const quizNext = $("#quizNext");
  const quizScore = $("#quizScore");
  let quizQuestions = [];
  let currentQuestion = 0;
  let score = 0;
  let answered = false;
  let quizAnswers = [];

  function shuffle(array) { return [...array].sort(() => Math.random() - 0.5); }

  function startQuiz() {
    const pool = Array.isArray(window.PERGUNTAS) ? window.PERGUNTAS : (typeof PERGUNTAS !== "undefined" ? PERGUNTAS : []);
    quizQuestions = shuffle(pool).slice(0, Math.min(8, pool.length));
    currentQuestion = 0; score = 0; answered = false; quizAnswers = [];
    quizScore.textContent = ""; quizNext.hidden = true; quizBtn.hidden = false;
    renderQuestion();
  }

  function renderQuestion() {
    const q = quizQuestions[currentQuestion];
    if (!q) { showQuizResult(); return; }
    const progress = ((currentQuestion) / quizQuestions.length) * 100;
    const letters = ["A", "B", "C", "D"];
    quiz.innerHTML = `<div class="quiz-progress"><div class="quiz-progress-top"><span>Questão ${currentQuestion + 1} de ${quizQuestions.length}</span><strong>${Math.round(progress)}%</strong></div><div class="quiz-progress-track"><span style="width:${progress}%"></span></div></div><div class="quiz-meta"><span>⚡ Energia</span><span>＋ Matemática</span></div><article class="question"><h3>${currentQuestion + 1}. ${q.pergunta}</h3><div class="quiz-options">${q.opcoes.map((option, index) => `<button class="quiz-option" type="button" data-answer="${index}"><span class="quiz-letter">${letters[index]}</span><span>${option}</span></button>`).join("")}</div><div class="quiz-feedback" id="quizFeedback" hidden></div><div class="quiz-explanation" id="quizExplanation"></div></article>`;
    quizBtn.textContent = "Responder"; quizBtn.disabled = false; quizNext.hidden = true; answered = false;
    $$(".quiz-option").forEach((button) => button.addEventListener("click", () => selectAnswer(Number(button.dataset.answer))));
  }

  function selectAnswer(answer) {
    if (answered) return;
    answered = true;
    const q = quizQuestions[currentQuestion];
    quizAnswers[currentQuestion] = { pergunta: q.pergunta, respostaSelecionada: answer, resposta: q.opcoes[answer], correta: q.correta, acertou: answer === q.correta };
    const options = $$(".quiz-option");
    const feedback = $("#quizFeedback");
    const explanation = $("#quizExplanation");
    options.forEach((button) => { button.disabled = true; const value = Number(button.dataset.answer); if (value === q.correta) button.classList.add("correct"); if (value === answer && value !== q.correta) button.classList.add("wrong"); });
    if (answer === q.correta) { score++; feedback.textContent = "✓ Correto! Você ganhou 100 pontos."; feedback.className = "quiz-feedback correct"; } else { feedback.textContent = `✕ Não foi dessa vez. Resposta: ${q.opcoes[q.correta]}.`; feedback.className = "quiz-feedback wrong"; }
    feedback.hidden = false; explanation.textContent = q.explicacao || ""; explanation.classList.add("visible"); quizBtn.disabled = true; quizNext.hidden = false; quizNext.textContent = currentQuestion === quizQuestions.length - 1 ? "Ver resultado" : "Próxima questão";
  }

  function nextQuestion() { if (!answered) return; currentQuestion++; renderQuestion(); }

  async function saveQuizResult(){
    const name = ($("#quizName")?.value || JSON.parse(sessionStorage.getItem("visitante") || "{}")?.nome || "Visitante").trim().slice(0,60) || "Visitante";
    const payload = { nome: name, score, total: quizQuestions.length, percentual: quizQuestions.length ? Math.round((score / quizQuestions.length) * 100) : 0, respostas: quizAnswers, data: new Date().toISOString() };
    try { const response = await fetch("/api/quiz-results", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)}); if(!response.ok) throw new Error("Falha ao salvar"); let status=$("#quizSaveStatus"); if(!status){status=document.createElement("div");status.id="quizSaveStatus";status.className="quiz-save-status";quiz.appendChild(status);} status.textContent="✓ Resultado registrado no projeto."; } catch(error) { console.warn("Não foi possível registrar o quiz:", error); }
  }

  function showQuizResult() {
    const total = quizQuestions.length;
    const percentage = total ? Math.round((score / total) * 100) : 0;
    let title = "Continue investigando!";
    if (percentage >= 90) title = "Especialista em Energia!"; else if (percentage >= 70) title = "Mandou muito bem!"; else if (percentage >= 50) title = "Bom trabalho!";
    quiz.innerHTML = `<div class="quiz-result"><div class="quiz-result-icon">✓</div><div class="quiz-result-score">${percentage}%</div><h3>${title}</h3><p>Você acertou <strong>${score} de ${total}</strong> questões. Conhecimento também faz parte da sustentabilidade.</p><div class="quiz-result-bar"><span style="width:${percentage}%"></span></div><strong>${score * 100} pontos</strong></div>`;
    quizBtn.hidden = false; quizBtn.disabled = false; quizBtn.textContent = "Jogar novamente"; quizNext.hidden = true; saveQuizResult();
  }

  quizBtn?.addEventListener("click", () => { if (!quizQuestions.length || quizBtn.textContent === "Jogar novamente") { startQuiz(); return; } if (!answered) { const selected = $(".quiz-option.selected"); if (selected) selectAnswer(Number(selected.dataset.answer)); } });
  quizNext?.addEventListener("click", nextQuestion);
  quiz?.addEventListener("click", (event) => { const option = event.target.closest(".quiz-option"); if (!option || answered) return; $$(".quiz-option").forEach((btn) => btn.classList.remove("selected")); option.classList.add("selected"); });
  $("#openQuiz")?.addEventListener("click", () => { modal.classList.add("open"); document.body.classList.add("lock"); startQuiz(); $("#closeQuiz")?.focus(); });
  function closeModal() { modal.classList.remove("open"); document.body.classList.remove("lock"); }
  $("#closeQuiz")?.addEventListener("click", closeModal);
  modal?.addEventListener("click", (event) => { if (event.target === modal) closeModal(); });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape" && modal?.classList.contains("open")) closeModal(); });

  /* DECISÃO */
  let selectedDecision = "";
  $$(".decision-btn").forEach((button) => { button.addEventListener("click", () => { selectedDecision = button.dataset.decision; $$(".decision-btn").forEach((btn) => btn.classList.remove("selected")); button.classList.add("selected"); $("#decisionReason").hidden = false; $("#decisionResult").textContent = ""; }); });
  $("#saveDecision")?.addEventListener("click", () => { const reason = $("#reasonSelect").value; if (!selectedDecision || !reason) { $("#decisionResult").textContent = "Escolha sua decisão e o principal motivo."; return; } const decisionText = selectedDecision === "sim" ? "Você decidiu investir." : "Você decidiu não investir neste cenário."; $("#decisionResult").textContent = `${decisionText} Principal motivo: ${reason}.`; });

  /* REVEAL */
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => { entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add("show"); observer.unobserve(entry.target); } }); }, { threshold: 0.08 });
    $$(".reveal").forEach((element) => observer.observe(element));
  } else { $$(".reveal").forEach((element) => element.classList.add("show")); }

  calculate();
  calculateHouse();
})();
