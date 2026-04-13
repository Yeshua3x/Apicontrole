const fetch = require("node-fetch");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const jsonResponse = (status, body) => ({
  statusCode: status,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  },
  body: JSON.stringify(body)
});

const supabaseRequest = async (method, path, body = null, params = "") => {
  const url = `${SUPABASE_URL}/rest/v1/${path}${params}`;
  const res = await fetch(url, {
    method,
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch (e) { json = text; }
  return { status: res.status, body: json };
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return jsonResponse(200, { ok: true });

  let payload = {};
  try { payload = JSON.parse(event.body || "{}"); } catch (e) { return jsonResponse(400, { error: "Invalid JSON" }); }
  const { action, data } = payload;
  if (!action) return jsonResponse(400, { error: "Missing action" });

  try {
    switch (action) {
      case "create": {
        if (!data || !data.name) return jsonResponse(400, { error: "Missing name" });
        const body = { name: data.name, qty: data.qty || 0, price: data.price ?? null, sku: data.sku ?? null };
        const r = await supabaseRequest("POST", "items", body, "?return=representation");
        if (r.status >= 400) return jsonResponse(r.status, { error: r.body });
        return jsonResponse(201, { ok: true, item: r.body[0] });
      }

      case "list": {
        const filters = [];
        if (data && data.q) {
          const q = encodeURIComponent(data.q);
          // Using ilike for case-insensitive partial match; wrap with % handled by supabase via ilike.*term*
          filters.push(`or=(name.ilike.*${q}*,sku.ilike.*${q}*)`);
        }
        if (data && data.lowStockBelow != null) {
          filters.push(`qty=lt.${encodeURIComponent(Number(data.lowStockBelow))}`);
        }
        const params = filters.length ? "?" + filters.join("&") + "&order=inserted_at.desc" : "?order=inserted_at.desc";
        const r = await supabaseRequest("GET", "items", null, params);
        if (r.status >= 400) return jsonResponse(r.status, { error: r.body });
        return jsonResponse(200, { ok: true, items: r.body });
      }

      case "get": {
        if (!data || !data.id) return jsonResponse(400, { error: "Missing id" });
        const params = `?id=eq.${encodeURIComponent(data.id)}`;
        const r = await supabaseRequest("GET", "items", null, params);
        if (r.status >= 400) return jsonResponse(r.status, { error: r.body });
        if (!r.body || r.body.length === 0) return jsonResponse(404, { error: "Not found" });
        return jsonResponse(200, { ok: true, item: r.body[0] });
      }

      case "update": {
        if (!data || !data.id) return jsonResponse(400, { error: "Missing id" });
        const id = data.id;
        const body = {};
        if (data.name != null) body.name = data.name;
        if (data.qty != null) body.qty = data.qty;
        if (data.price !== undefined) body.price = data.price;
        if (data.sku !== undefined) body.sku = data.sku;
        if (Object.keys(body).length === 0) return jsonResponse(400, { error: "No fields to update" });
        const params = `?id=eq.${encodeURIComponent(id)}&return=representation`;
        const r = await supabaseRequest("PATCH", "items", body, params);
        if (r.status >= 400) return jsonResponse(r.status, { error: r.body });
        return jsonResponse(200, { ok: true, item: r.body[0] });
      }

      case "delete": {
        if (!data || !data.id) return jsonResponse(400, { error: "Missing id" });
        const params = `?id=eq.${encodeURIComponent(data.id)}&return=representation`;
        const r = await supabaseRequest("DELETE", "items", null, params);
        if (r.status >= 400) return jsonResponse(r.status, { error: r.body });
        return jsonResponse(200, { ok: true, removed: r.body[0] });
      }

      default:
        return jsonResponse(400, { error: "Unknown action" });
    }
  } catch (err) {
    return jsonResponse(500, { error: "Server error", details: err.message });
  }
};
