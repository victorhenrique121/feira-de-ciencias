(() => {
  "use strict";

  // A experiência começa pelo cadastro simples do visitante.
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

    $("#payback").textContent = `${months.toLocaleString("pt-BR", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    })} meses`;

    $("#paybackYears").textContent =
      `≈ ${(months / 12).toLocaleString("pt-BR", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
      })} anos para recuperar o investimento.`;

    $("#investLabel").textContent = money(inv);
    $("#monthLabel").textContent = money(monthly);
    $("#annual").textContent = money(annual);
    $("#progressBar").style.width = `${reached}%`;
    $("#progressText").textContent = `${Math.round(reached)}%`;
    $("#chartPayback").textContent =
      `Payback: ${months.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} meses`;

    const points = [1, Math.min(5, years), years]
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort((a, b) => a - b);

    $("#table").innerHTML = `
      <table>
        <thead><tr><th>Tempo</th><th>Economia</th><th>Saldo</th></tr></thead>
        <tbody>
          ${points.map((year) => {
            const economy = annual * year;
            return `<tr><td>${year} ano${year > 1 ? "s" : ""}</td><td>${money(economy)}</td><td>${money(economy - inv)}</td></tr>`;
          }).join("")}
        </tbody>
      </table>
    `;

    drawChart(inv, monthly, years);
    updateImpact(inv, monthly, years);
  }

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

    for (let m = 0; m <= monthsTotal; m += Math.max(1, Math.round(monthsTotal / steps))) {
      points.push([x(m), y(Math.min(monthly * m, maxValue))]);
    }
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
    if (!( $("#financeTimeline"))) return;
    const {inv, monthly, years} = chartState;
    const totalMonths = Math.max(120, years * 12);
    const payback = inv / monthly;
    const markers = [
      {label:"Mês 1", month:1},
      {label:"Mês 12", month:12},
      {label:"Payback", month:Math.min(totalMonths, Math.max(1, Math.round(payback)))},
      {label:"5 anos", month:Math.min(totalMonths, 60)},
      {label:"10 anos", month:Math.min(totalMonths, 120)}
    ];
    const closest = markers.reduce((a,b)=>Math.abs(b.month-selectedMonth)<Math.abs(a.month-selectedMonth)?b:a, markers[0]);
    $("#financeTimeline").innerHTML = markers.map((m,i)=>`<button type="button" class="timeline-item ${m===closest?'active':''}" data-month="${m.month}" aria-label="${m.label}"><span class="timeline-dot">${i+1}</span><span class="timeline-label">${m.label}</span></button>`).join("");
    $$(".timeline-item").forEach(btn=>btn.addEventListener("click",()=>{
      timelineMonth=Number(btn.dataset.month);
      chartMonth.value=String(Math.min(Number(chartMonth.max),timelineMonth));
      renderInteractiveChart(timelineMonth);
    }));
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
    $("#housePayback").textContent = `${payback.toLocaleString("pt-BR", {minimumFractionDigits: 1,maximumFractionDigits: 1})} meses`;
    $("#houseText").textContent = `neste cenário, o investimento seria recuperado em cerca de ${(payback / 12).toLocaleString("pt-BR", {minimumFractionDigits: 1,maximumFractionDigits: 1})} anos.`;
    $("#investimento").value = investment.toFixed(2);
    $("#economia").value = monthlySave.toFixed(2);
    calculate();
    updateImpact(investment, monthlySave, 10, kwh);
  }

  ["houseKwh", "houseBill", "houseInvestment", "houseSaving"].forEach((id) => $(`#${id}`)?.addEventListener("input", calculateHouse));

  /* IMPACTO AMBIENTAL — estimativa didática */
  function updateImpact(inv, monthlySave, years, kwh = Number($("#houseKwh")?.value || 0)) {
    const months = Math.max(1, years * 12);
    const annualEnergy = Math.max(0, kwh * 12);
    const estimatedCo2 = Math.round(annualEnergy * 0.24 * (months / 12));
    $("#co2Impact").textContent = `${estimatedCo2.toLocaleString("pt-BR")} kg`;
    $("#energyImpact").textContent = `${annualEnergy.toLocaleString("pt-BR")} kWh`;
  }

  $("#calcBtn")?.addEventListener("click", calculate);
  ["investimento", "economia", "anos"].forEach((id) => $(`#${id}`)?.addEventListener("input", calculate));

  /* IDENTIFICAÇÃO DO VISITANTE */
  const visitante = JSON.parse(sessionStorage.getItem("visitante") || "null");
  const quizNameInput = $("#quizName");
  if (quizNameInput && visitante?.nome) quizNameInput.value = visitante.nome;

  /* QUIZ */
  const quizForm = $("#quizForm");
  quizForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
  });

  calculate();
  calculateHouse();

  /* REVEAL */
  const revealItems = $$(".reveal");
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });
    revealItems.forEach((item) => observer.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add("visible"));
  }
})();
