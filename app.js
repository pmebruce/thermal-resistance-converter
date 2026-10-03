const FACTORS = {
  thickness: { um: 1e-6, mm: 1e-3, cm: 1e-2, m: 1, in: 0.0254, mil: 0.0000254 },
  area: { mm2: 1e-6, cm2: 1e-4, m2: 1, in2: 0.00064516 },
  conductivity: { wmk: 1, wcmk: 100, btuhftf: 1.730735 },
  areaResistance: { m2kw: 1, cm2kw: 1e-4, mm2kw: 1e-6, cin2w: 0.00064516 },
  totalResistance: { kw: 1, cw: 1 },
  heatFlux: { wm2: 1, wcm2: 10000, win2: 1550.0031 }
};

const UNIT_LABELS = {
  um: "µm", mm: "mm", cm: "cm", m: "m", in: "inch", mil: "mil",
  mm2: "mm²", cm2: "cm²", m2: "m²", in2: "in²",
  wmk: "W/m·K", wcmk: "W/cm·K", btuhftf: "BTU/h·ft·°F",
  m2kw: "m²·K/W", cm2kw: "cm²·K/W", mm2kw: "mm²·K/W", cin2w: "°C·in²/W",
  kw: "K/W", cw: "°C/W",
  wm2: "W/m²", wcm2: "W/cm²", win2: "W/in²"
};

const CATEGORY_UNITS = {
  areaResistance: ["cin2w", "m2kw", "cm2kw", "mm2kw"],
  conductivity: ["wmk", "wcmk", "btuhftf"],
  thickness: ["mm", "um", "mil", "in", "cm", "m"],
  area: ["mm2", "cm2", "in2", "m2"],
  totalResistance: ["kw", "cw"],
  heatFlux: ["wm2", "wcm2", "win2"]
};

const $ = function(id) { return document.getElementById(id); };
const positive = function(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : NaN;
};

function superscriptExponent(exponent) {
  const map = { "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };
  return String(exponent).split("").map(function(char) { return map[char] || char; }).join("");
}

function formatNumber(value, digits) {
  if (!Number.isFinite(value)) return "—";
  if (value === 0) return "0";
  const abs = Math.abs(value);
  const precision = digits || 4;
  if (abs < 0.001 || abs >= 100000) {
    const parts = value.toExponential(precision - 1).split("e");
    const coefficient = Number(parts[0]).toFixed(precision - 1).replace(/(\.\d*?[1-9])0+$/, "$1").replace(/\.0+$/, "");
    return coefficient + " × 10" + superscriptExponent(Number(parts[1]));
  }
  return value.toLocaleString("zh-TW", { maximumSignificantDigits: precision, useGrouping: true });
}

function rawNumber(value) {
  if (!Number.isFinite(value)) return "";
  return Number(value.toPrecision(10)).toString();
}

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(function() { toast.classList.remove("show"); }, 1700);
}

function currentMode() {
  return document.querySelector('input[name="singleMode"]:checked').value;
}

function calculateSingle() {
  const mode = currentMode();
  const thickness = positive($("thicknessValue").value) * FACTORS.thickness[$("thicknessUnit").value];
  const area = positive($("areaValue").value) * FACTORS.area[$("areaUnit").value];
  const power = positive($("powerValue").value);
  let k;
  let areaResistance;

  if (mode === "k-to-r") {
    k = positive($("conductivityValue").value) * FACTORS.conductivity[$("conductivityUnit").value];
    areaResistance = thickness / k;
  } else {
    areaResistance = positive($("areaResistanceValue").value) * FACTORS.areaResistance[$("areaResistanceUnit").value];
    k = thickness / areaResistance;
  }

  const valid = Number.isFinite(thickness) && Number.isFinite(k) && Number.isFinite(areaResistance);
  const totalResistance = valid && Number.isFinite(area) ? areaResistance / area : NaN;
  const deltaT = Number.isFinite(totalResistance) && Number.isFinite(power) ? totalResistance * power : NaN;
  const imperialResistance = areaResistance / FACTORS.areaResistance.cin2w;

  $("validBadge").textContent = valid ? "數值有效" : "請檢查輸入";
  $("validBadge").classList.toggle("invalid", !valid);
  $("resultK").textContent = formatNumber(k, 5);
  $("resultAreaRsi").textContent = formatNumber(areaResistance, 5);
  $("resultAreaRimp").textContent = formatNumber(imperialResistance, 5);
  $("resultTotalR").textContent = formatNumber(totalResistance, 5);
  $("resultDeltaT").textContent = formatNumber(deltaT, 5);

  if (mode === "k-to-r") {
    $("primaryLabel").textContent = "面積熱阻 R″";
    $("primaryValue").textContent = formatNumber(imperialResistance, 5);
    $("primaryUnit").textContent = "°C·in²/W";
    $("formulaText").textContent = "R″ = t ÷ k";
    $("formulaNote").textContent = "由材料本體 k 計算，不含額外接觸熱阻。";
  } else {
    $("primaryLabel").textContent = "等效熱傳導係數 k";
    $("primaryValue").textContent = formatNumber(k, 5);
    $("primaryUnit").textContent = "W/m·K";
    $("formulaText").textContent = "k_eq = t ÷ R″";
    $("formulaNote").textContent = "用量測熱阻反算，結果可包含測試條件下的接觸效應。";
  }
}

function setSingleMode(mode) {
  const radio = document.querySelector('input[name="singleMode"][value="' + mode + '"]');
  radio.checked = true;
  $("conductivityField").classList.toggle("hidden", mode !== "k-to-r");
  $("areaResistanceField").classList.toggle("hidden", mode !== "r-to-k");
  calculateSingle();
}

function loadPreset(name) {
  setSingleMode("r-to-k");
  $("thicknessUnit").value = "mm";
  $("areaResistanceUnit").value = "cin2w";
  if (name === "div") {
    $("thicknessValue").value = "0.2";
    $("areaResistanceValue").value = "0.05";
    showToast("DIV-300：0.2 mm／R″ 0.050 @ 50 psi");
  } else {
    $("thicknessValue").value = "0.05";
    $("areaResistanceValue").value = "0.006";
    showToast("DM-800A：0.05 mm／R″ 0.006 @ 80 °C、40 psi");
  }
  calculateSingle();
}

function resetSingle() {
  $("thicknessValue").value = "0.2";
  $("thicknessUnit").value = "mm";
  $("conductivityValue").value = "15";
  $("conductivityUnit").value = "wmk";
  $("areaResistanceValue").value = "0.05";
  $("areaResistanceUnit").value = "cin2w";
  $("areaValue").value = "400";
  $("areaUnit").value = "mm2";
  $("powerValue").value = "100";
  setSingleMode("k-to-r");
}

let layers = [];

function darbondLayers() {
  return [
    { name: "DIV-300", thickness: 0.2, unit: "mm", k: 6.20 },
    { name: "DM-800A", thickness: 0.05, unit: "mm", k: 12.9167 }
  ];
}

function makeInput(className, value, type) {
  const input = document.createElement("input");
  input.className = className;
  input.type = type || "number";
  input.value = value;
  if (input.type === "number") {
    input.min = "0";
    input.step = "any";
    input.inputMode = "decimal";
  }
  return input;
}

function renderLayers() {
  const list = $("layerList");
  list.replaceChildren();

  const resistances = layers.map(function(layer) {
    const thickness = positive(layer.thickness) * FACTORS.thickness[layer.unit];
    const k = positive(layer.k);
    return thickness / k;
  });
  const total = resistances.reduce(function(sum, value) {
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);

  layers.forEach(function(layer, index) {
    const row = document.createElement("div");
    row.className = "layer-row";

    const name = makeInput("layer-name", layer.name, "text");
    name.setAttribute("aria-label", "第 " + (index + 1) + " 層材料名稱");
    name.addEventListener("input", function() { layers[index].name = name.value; });

    const thickness = makeInput("layer-thickness", layer.thickness);
    thickness.setAttribute("aria-label", "第 " + (index + 1) + " 層厚度");
    thickness.addEventListener("input", function() {
      layers[index].thickness = thickness.value;
      updateLayerShares();
      calculateStack();
    });

    const unit = document.createElement("select");
    unit.className = "layer-unit";
    unit.setAttribute("aria-label", "第 " + (index + 1) + " 層厚度單位");
    ["um", "mm", "cm", "m", "in", "mil"].forEach(function(key) {
      const option = document.createElement("option");
      option.value = key;
      option.textContent = UNIT_LABELS[key];
      option.selected = key === layer.unit;
      unit.append(option);
    });
    unit.addEventListener("change", function() {
      layers[index].unit = unit.value;
      updateLayerShares();
      calculateStack();
    });

    const k = makeInput("layer-k", layer.k);
    k.setAttribute("aria-label", "第 " + (index + 1) + " 層熱傳導係數");
    k.addEventListener("input", function() {
      layers[index].k = k.value;
      updateLayerShares();
      calculateStack();
    });

    const remove = document.createElement("button");
    remove.className = "delete-layer";
    remove.type = "button";
    remove.textContent = "移除";
    remove.setAttribute("aria-label", "刪除第 " + (index + 1) + " 層");
    remove.disabled = layers.length === 1;
    remove.addEventListener("click", function() {
      layers.splice(index, 1);
      renderLayers();
    });

    const header = document.createElement("div");
    header.className = "layer-card-header";
    const number = document.createElement("strong");
    number.className = "layer-card-number";
    number.textContent = "第 " + (index + 1) + " 層";
    header.append(number, remove);

    function field(labelText, className, control) {
      const wrapper = document.createElement("label");
      wrapper.className = "layer-field " + className;
      const label = document.createElement("span");
      label.className = "layer-field-label";
      label.textContent = labelText;
      wrapper.append(label, control);
      return wrapper;
    }

    const thicknessControl = document.createElement("div");
    thicknessControl.className = "layer-inline-control";
    thicknessControl.append(thickness, unit);

    const kControl = document.createElement("div");
    kControl.className = "layer-inline-control layer-k-control";
    const kUnit = document.createElement("span");
    kUnit.className = "layer-k-unit";
    kUnit.textContent = "W/m·K";
    kControl.append(k, kUnit);

    const fields = document.createElement("div");
    fields.className = "layer-card-fields";
    fields.append(
      field("材料名稱", "layer-name-field", name),
      field("厚度", "layer-thickness-field", thicknessControl),
      field("導熱係數 k", "layer-k-field", kControl)
    );

    const share = document.createElement("div");
    share.className = "layer-share";
    const shareLabel = document.createElement("span");
    shareLabel.className = "layer-share-label";
    shareLabel.textContent = "該層面積熱阻";
    const shareText = document.createElement("strong");
    shareText.className = "layer-share-value";
    const percentage = total > 0 && Number.isFinite(resistances[index]) ? resistances[index] / total * 100 : 0;
    shareText.textContent = formatNumber(resistances[index] / FACTORS.areaResistance.cin2w, 4) + " °C·in²/W · " + formatNumber(percentage, 3) + "%";
    const track = document.createElement("div");
    track.className = "share-track";
    const fill = document.createElement("div");
    fill.className = "share-fill";
    fill.style.width = Math.max(0, Math.min(100, percentage)) + "%";
    track.append(fill);
    share.append(shareLabel, shareText, track);

    row.append(header, fields, share);
    list.append(row);
  });

  calculateStack();
}

function updateLayerShares() {
  const resistances = layers.map(function(layer) {
    const thickness = positive(layer.thickness) * FACTORS.thickness[layer.unit];
    const k = positive(layer.k);
    return thickness / k;
  });
  const total = resistances.reduce(function(sum, value) {
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);

  document.querySelectorAll("#layerList .layer-share").forEach(function(share, index) {
    const resistance = resistances[index];
    const percentage = total > 0 && Number.isFinite(resistance) ? resistance / total * 100 : 0;
    const label = share.querySelector(".layer-share-value");
    const fill = share.querySelector(".share-fill");
    if (label) label.textContent = formatNumber(resistance / FACTORS.areaResistance.cin2w, 4) + " °C·in²/W · " + formatNumber(percentage, 3) + "%";
    if (fill) fill.style.width = Math.max(0, Math.min(100, percentage)) + "%";
  });
}

function calculateStack() {
  let totalThickness = 0;
  let totalAreaResistance = 0;
  let valid = layers.length > 0;

  layers.forEach(function(layer) {
    const thickness = positive(layer.thickness) * FACTORS.thickness[layer.unit];
    const k = positive(layer.k);
    if (!Number.isFinite(thickness) || !Number.isFinite(k)) valid = false;
    else {
      totalThickness += thickness;
      totalAreaResistance += thickness / k;
    }
  });

  const area = positive($("stackAreaValue").value) * FACTORS.area[$("stackAreaUnit").value];
  const power = positive($("stackPowerValue").value);
  const effectiveK = valid && totalAreaResistance > 0 ? totalThickness / totalAreaResistance : NaN;
  const totalR = valid && Number.isFinite(area) ? totalAreaResistance / area : NaN;
  const deltaT = Number.isFinite(totalR) && Number.isFinite(power) ? totalR * power : NaN;

  $("stackTotalRimp").textContent = formatNumber(totalAreaResistance / FACTORS.areaResistance.cin2w, 5);
  $("stackTotalRsi").textContent = formatNumber(totalAreaResistance, 5) + " m²·K/W";
  $("stackEffectiveK").textContent = formatNumber(effectiveK, 5);
  $("stackThickness").textContent = "總厚度 " + formatNumber(totalThickness / 1e-3, 5) + " mm";
  $("stackTotalR").textContent = formatNumber(totalR, 5);
  $("stackDeltaT").textContent = formatNumber(deltaT, 5);
}

function populateUnitSelects() {
  const category = $("unitCategory").value;
  const units = CATEGORY_UNITS[category];
  const previousFrom = $("unitFrom").value;
  const previousTo = $("unitTo").value;
  $("unitFrom").replaceChildren();
  $("unitTo").replaceChildren();

  units.forEach(function(key) {
    const fromOption = document.createElement("option");
    fromOption.value = key;
    fromOption.textContent = UNIT_LABELS[key];
    $("unitFrom").append(fromOption);

    const toOption = document.createElement("option");
    toOption.value = key;
    toOption.textContent = UNIT_LABELS[key];
    $("unitTo").append(toOption);
  });

  if (units.includes(previousFrom)) $("unitFrom").value = previousFrom;
  if (units.includes(previousTo)) $("unitTo").value = previousTo;
  else $("unitTo").selectedIndex = Math.min(1, units.length - 1);

  if (category === "areaResistance") {
    $("unitFrom").value = "cin2w";
    $("unitTo").value = "m2kw";
  }
  calculateUnits();
}

function calculateUnits() {
  const category = $("unitCategory").value;
  const value = Number($("unitInputValue").value);
  const from = $("unitFrom").value;
  const to = $("unitTo").value;
  const baseValue = value * FACTORS[category][from];
  const result = baseValue / FACTORS[category][to];

  $("unitResultValue").textContent = Number.isFinite(result) ? formatNumber(result, 6) : "—";
  $("unitResultLabel").textContent = UNIT_LABELS[to] || "";
  $("unitEquation").textContent = Number.isFinite(result)
    ? formatNumber(value, 6) + " " + UNIT_LABELS[from] + " = " + formatNumber(result, 6) + " " + UNIT_LABELS[to]
    : "請輸入有效數值";
  $("copyResult").dataset.copy = rawNumber(result);
}

function switchPanel(name) {
  document.querySelectorAll(".tab").forEach(function(tab) {
    const selected = tab.dataset.panel === name;
    tab.classList.toggle("active", selected);
    tab.setAttribute("aria-selected", selected ? "true" : "false");
  });
  document.querySelectorAll(".panel").forEach(function(panel) {
    const selected = panel.id === "panel-" + name;
    panel.hidden = !selected;
    panel.classList.toggle("active", selected);
  });
}

document.querySelectorAll(".tab").forEach(function(tab) {
  tab.addEventListener("click", function() { switchPanel(tab.dataset.panel); });
});

document.querySelectorAll('input[name="singleMode"]').forEach(function(input) {
  input.addEventListener("change", function() { setSingleMode(input.value); });
});

["thicknessValue", "thicknessUnit", "conductivityValue", "conductivityUnit", "areaResistanceValue", "areaResistanceUnit", "areaValue", "areaUnit", "powerValue"].forEach(function(id) {
  $(id).addEventListener("input", calculateSingle);
  $(id).addEventListener("change", calculateSingle);
});

document.querySelectorAll("[data-preset]").forEach(function(button) {
  button.addEventListener("click", function() { loadPreset(button.dataset.preset); });
});

$("resetSingle").addEventListener("click", resetSingle);
$("loadDarbond").addEventListener("click", function() {
  layers = darbondLayers();
  renderLayers();
  showToast("已載入由 TDS 熱阻反算的 Darbond 等效 k");
});
$("addLayer").addEventListener("click", function() {
  layers.push({ name: "新材料", thickness: 0.1, unit: "mm", k: 5 });
  renderLayers();
});
["stackAreaValue", "stackAreaUnit", "stackPowerValue"].forEach(function(id) {
  $(id).addEventListener("input", calculateStack);
  $(id).addEventListener("change", calculateStack);
});

$("unitCategory").addEventListener("change", populateUnitSelects);
["unitInputValue", "unitFrom", "unitTo"].forEach(function(id) {
  $(id).addEventListener("input", calculateUnits);
  $(id).addEventListener("change", calculateUnits);
});
$("swapUnits").addEventListener("click", function() {
  const from = $("unitFrom").value;
  $("unitFrom").value = $("unitTo").value;
  $("unitTo").value = from;
  calculateUnits();
});
$("copyResult").addEventListener("click", async function() {
  const text = $("copyResult").dataset.copy;
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    showToast("已複製結果");
  } catch (error) {
    showToast("瀏覽器不允許自動複製");
  }
});

function updateNetworkStatus() {
  const status = $("networkStatus");
  status.classList.toggle("offline", !navigator.onLine);
  status.lastChild.textContent = navigator.onLine ? "可離線使用" : "目前離線";
}
window.addEventListener("online", updateNetworkStatus);
window.addEventListener("offline", updateNetworkStatus);

let deferredInstallPrompt;
window.addEventListener("beforeinstallprompt", function(event) {
  event.preventDefault();
  deferredInstallPrompt = event;
  $("installButton").hidden = false;
});
$("installButton").addEventListener("click", async function() {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  $("installButton").hidden = true;
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", function() {
    navigator.serviceWorker.register("./sw.js");
  });
}

layers = darbondLayers();
renderLayers();
populateUnitSelects();
calculateSingle();
updateNetworkStatus();