// ---- state ----
let lang = localStorage.getItem("lang") || "hi";
let token = localStorage.getItem("token") || null;
let authMode = "login"; // or "register"
let crops = [];

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);
const t = (key) => (window.I18N[lang] && window.I18N[lang][key]) || key;

// ---- i18n ----
function applyLang() {
  document.documentElement.lang = lang;
  $$("[data-i18n]").forEach((el) => (el.textContent = t(el.dataset.i18n)));
  $$("[data-i18n-ph]").forEach((el) => (el.placeholder = t(el.dataset.i18nPh)));
  updateAuthLabels();
  $("#langSelect").value = lang;
}

function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.remove("hidden");
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.add("hidden"), 3000);
}

// ---- API helper ----
async function api(path, { method = "GET", body, auth = false, isForm = false } = {}) {
  const headers = {};
  if (!isForm) headers["Content-Type"] = "application/json";
  if (auth && token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: isForm ? body : body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.error || "error");
  return data;
}

// ---- tabs ----
$$(".tab").forEach((tab) =>
  tab.addEventListener("click", () => {
    $$(".tab").forEach((x) => x.classList.remove("active"));
    $$(".panel").forEach((x) => x.classList.remove("active"));
    tab.classList.add("active");
    $(`#tab-${tab.dataset.tab}`).classList.add("active");
    if (tab.dataset.tab === "account" && token) loadHistory();
  })
);

// ---- prices ----
async function loadPrices() {
  const q = $("#priceSearch").value;
  const category = $("#priceCategory").value;
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (category) params.set("category", category);
  const data = await api(`/prices?${params}`);
  crops = data.crops;
  renderPrices(data.crops);
  fillCropSelects();
}

function cropName(c) {
  return lang === "hi" ? c.name_hi : c.name_en;
}

function renderPrices(list) {
  $("#priceList").innerHTML = list
    .map(
      (c) => `
    <div class="price-card">
      <div class="cat">${t("cat_" + c.category)}</div>
      <div class="name">${cropName(c)}</div>
      <div class="price">₹${c.msp.toLocaleString("en-IN")}</div>
      <div class="unit">${t("per_unit")}</div>
    </div>`
    )
    .join("");
}

function fillCropSelects() {
  const opts = crops.map((c) => `<option value="${c.id}">${cropName(c)}</option>`).join("");
  $("#qualityCrop").innerHTML = opts;
  $("#adviceCrop").innerHTML = opts;
}

$("#priceSearch").addEventListener("input", () => loadPrices());
$("#priceCategory").addEventListener("change", () => loadPrices());

// ---- quality ----
$("#qualityImage").addEventListener("change", (e) => {
  const file = e.target.files[0];
  const preview = $("#qualityPreview");
  if (file) {
    preview.src = URL.createObjectURL(file);
    preview.classList.remove("hidden");
  } else {
    preview.classList.add("hidden");
  }
});

$("#qualityForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const file = $("#qualityImage").files[0];
  if (!file) return;
  const btn = $("#qualityForm button");
  const original = btn.querySelector("span").textContent;
  btn.disabled = true;
  btn.querySelector("span").textContent = t("analyzing");
  try {
    const fd = new FormData();
    fd.append("image", file);
    fd.append("cropId", $("#qualityCrop").value);
    const r = await api("/quality", { method: "POST", body: fd, isForm: true, auth: true });
    renderQualityResult(r);
    if (token) loadHistory();
  } catch (err) {
    toast(err.message);
  } finally {
    btn.disabled = false;
    btn.querySelector("span").textContent = original;
  }
});

function renderQualityResult(r) {
  const gradeLabel = lang === "hi" ? r.grade_label_hi : r.grade_label_en;
  const diff = r.priceVsMsp;
  const diffStr = (diff >= 0 ? "+" : "") + "₹" + diff.toLocaleString("en-IN");
  $("#qualityResult").innerHTML = `
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:10px">
      <span class="grade-badge grade-${r.grade}">${r.grade}</span>
      <div><div style="font-weight:700">${gradeLabel}</div>
      <div class="muted small">${lang === "hi" ? r.crop.name_hi : r.crop.name_en}</div></div>
    </div>
    <div class="kv"><span>${t("result_fair")}</span><span class="fair">₹${r.fairPrice.toLocaleString("en-IN")}</span></div>
    <div class="kv"><span>${t("result_msp")}</span><span class="v">₹${r.msp.toLocaleString("en-IN")}</span></div>
    <div class="kv"><span>${t("result_diff")}</span><span class="v">${diffStr}</span></div>
    <div class="kv"><span>${t("result_score")}</span><span class="v">${r.qualityScore}/100</span></div>
    <div class="kv"><span>${t("result_confidence")}</span><span class="v">${Math.round(r.confidence * 100)}%</span></div>
    <div class="muted small" style="margin-top:8px">${r.unit}</div>`;
  $("#qualityResult").classList.remove("hidden");
}

// ---- advice ----
$("#adviceBtn").addEventListener("click", async () => {
  const cropId = $("#adviceCrop").value;
  if (!cropId) return;
  try {
    const r = await api(`/storage/${cropId}`);
    renderAdvice(r);
  } catch (err) {
    toast(err.message);
  }
});

function renderAdvice(r) {
  let pill;
  if (r.perishable) pill = `<span class="pill wait">${t("perishable")}</span>`;
  else if (r.isBestToSellNow) pill = `<span class="pill good">${t("sell_now")}</span>`;
  else pill = `<span class="pill wait">${t("wait")}</span>`;

  const list = (lang === "hi" ? r.advice.hi : r.advice.en).map((x) => `<li>${x}</li>`).join("");
  const best = (lang === "hi" ? r.bestSellMonths.hi : r.bestSellMonths.en).join(", ");
  const harvest = (lang === "hi" ? r.harvestMonths.hi : r.harvestMonths.en).join(", ");

  $("#adviceResult").innerHTML = `
    <div style="margin-bottom:10px">${pill}</div>
    <div class="kv"><span>${t("harvest_months")}</span><span class="v">${harvest}</span></div>
    <div class="kv"><span>${t("best_months")}</span><span class="v">${best}</span></div>
    <ul class="advice-list">${list}</ul>`;
  $("#adviceResult").classList.remove("hidden");
}

// ---- auth ----
function updateAuthLabels() {
  $("#authSubmit").textContent = authMode === "login" ? t("login") : t("register");
  $("#authToggle").textContent = authMode === "login" ? t("no_account") : t("have_account");
  $("#nameField").classList.toggle("hidden", authMode === "login");
  $("#stateField").classList.toggle("hidden", authMode === "login");
}

$("#authToggle").addEventListener("click", () => {
  authMode = authMode === "login" ? "register" : "login";
  updateAuthLabels();
});

$("#authForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const body = {
    phone: $("#authPhone").value,
    password: $("#authPassword").value,
  };
  if (authMode === "register") {
    body.name = $("#authName").value;
    body.state = $("#authState").value;
    body.lang = lang;
  }
  try {
    const r = await api(`/auth/${authMode}`, { method: "POST", body });
    token = r.token;
    localStorage.setItem("token", token);
    showLoggedIn(r.user);
  } catch (err) {
    toast(err.message);
  }
});

$("#logoutBtn").addEventListener("click", () => {
  token = null;
  localStorage.removeItem("token");
  $("#loggedIn").classList.add("hidden");
  $("#loggedOut").classList.remove("hidden");
});

function showLoggedIn(user) {
  $("#userName").textContent = user.name || user.phone;
  $("#loggedOut").classList.add("hidden");
  $("#loggedIn").classList.remove("hidden");
  loadHistory();
}

async function loadHistory() {
  if (!token) return;
  try {
    const r = await api("/quality/history", { auth: true });
    if (!r.analyses.length) {
      $("#historyList").innerHTML = `<p class="muted">${t("no_history")}</p>`;
      return;
    }
    $("#historyList").innerHTML = r.analyses
      .map((a) => {
        const name = lang === "hi" ? a.crop.name_hi : a.crop.name_en;
        const date = new Date(a.createdAt).toLocaleDateString();
        return `<div class="price-card">
          <div class="cat">${date}</div>
          <div class="name">${name} · <span class="grade-badge grade-${a.grade}" style="width:26px;height:26px;line-height:26px;font-size:14px">${a.grade}</span></div>
          <div class="price">₹${a.fairPrice.toLocaleString("en-IN")}</div>
          <div class="unit">${a.unit}</div>
        </div>`;
      })
      .join("");
  } catch {
    // token expired → log out silently
    token = null;
    localStorage.removeItem("token");
    $("#loggedIn").classList.add("hidden");
    $("#loggedOut").classList.remove("hidden");
  }
}

// ---- language switch ----
$("#langSelect").addEventListener("change", (e) => {
  lang = e.target.value;
  localStorage.setItem("lang", lang);
  applyLang();
  renderPrices(crops);
  fillCropSelects();
});

// ---- init ----
async function init() {
  applyLang();
  await loadPrices();
  if (token) {
    try {
      const r = await api("/auth/me", { auth: true });
      showLoggedIn(r.user);
    } catch {
      token = null;
      localStorage.removeItem("token");
    }
  }
}
init();
