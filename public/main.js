const logEl = document.getElementById("log");
const actionEl = document.getElementById("action");
const formArea = document.getElementById("form-area");
const sendBtn = document.getElementById("send");

function append(msg, cls="bot") {
  const d = document.createElement("div");
  d.className = "msg " + cls;
  d.innerHTML = msg;
  logEl.appendChild(d);
  logEl.scrollTop = logEl.scrollHeight;
}

function renderForm() {
  const a = actionEl.value;
  formArea.innerHTML = "";
  if (a === "list") {
    formArea.innerHTML = `
      <input id="q" placeholder="Pesquisar por nome ou SKU (opcional)">
      <input id="lowStockBelow" type="number" placeholder="Mostrar com estoque abaixo de (opcional)">
    `;
  } else if (a === "create") {
    formArea.innerHTML = `
      <input id="name" placeholder="Nome do item" required>
      <input id="qty" type="number" placeholder="Quantidade" value="0">
      <input id="price" type="number" step="0.01" placeholder="Preço (opcional)">
      <input id="sku" placeholder="SKU (opcional)">
    `;
  } else if (a === "get" || a === "delete") {
    formArea.innerHTML = `<input id="id" placeholder="ID do item">`;
  } else if (a === "update") {
    formArea.innerHTML = `
      <input id="id" placeholder="ID do item">
      <input id="name" placeholder="Novo nome (opcional)">
      <input id="qty" type="number" placeholder="Nova quantidade (opcional)">
      <input id="price" type="number" step="0.01" placeholder="Novo preço (opcional)">
      <input id="sku" placeholder="Novo SKU (opcional)">
    `;
  }
}

async function callApi(action, data) {
  append(`<b class="user">Request:</b> action=${action} <pre class="item">${JSON.stringify(data)}</pre>`, "user");
  try {
    const res = await fetch("/.netlify/functions/stock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, data })
    });
    const json = await res.json();
    append(`<b class="bot">Response:</b> <pre class="item">${JSON.stringify(json, null, 2)}</pre>`, "bot");
  } catch (err) {
    append(`<b class="bot">Erro:</b> ${err.message}`, "bot");
  }
}

actionEl.addEventListener("change", renderForm);
sendBtn.addEventListener("click", () => {
  const a = actionEl.value;
  const data = {};
  if (a === "list") {
    const q = document.getElementById("q").value.trim();
    const low = document.getElementById("lowStockBelow").value;
    if (q) data.q = q;
    if (low) data.lowStockBelow = Number(low);
  } else if (a === "create") {
    data.name = document.getElementById("name").value.trim();
    data.qty = Number(document.getElementById("qty").value || 0);
    const p = document.getElementById("price").value;
    if (p) data.price = Number(p);
    const sku = document.getElementById("sku").value.trim();
    if (sku) data.sku = sku;
  } else if (a === "get" || a === "delete") {
    data.id = document.getElementById("id").value.trim();
  } else if (a === "update") {
    data.id = document.getElementById("id").value.trim();
    const name = document.getElementById("name").value.trim();
    if (name) data.name = name;
    const qty = document.getElementById("qty").value;
    if (qty) data.qty = Number(qty);
    const price = document.getElementById("price").value;
    if (price) data.price = Number(price);
    const sku = document.getElementById("sku").value.trim();
    if (sku) data.sku = sku;
  }
  callApi(a, data);
});

// initial render
renderForm();
append("Pronto. Selecione uma ação e envie. (Persistência via Supabase.)");
