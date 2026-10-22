// WillShop — connexion du WhatsApp de la commerciale par QR code (Evolution API).
// Réservé à la Direction (nom + PIN vérifiés auprès du Google Sheet).
// Les clés restent sur Vercel : EVOLUTION_API_URL, EVOLUTION_API_KEY (et WA_INSTANCE, facultatif).
// IMPORTANT : le numéro connecté est en LECTURE SEULE. Aucune fonction ici n'envoie de message.
const BRIDGE = "https://script.google.com/macros/s/AKfycbxudwbiZxBeTqbPU5XxCkAx1KsCuzcA8Y3qEbTEERqQ8IB6XX4hDwH7Cs3o8l9Sv8G0/exec";

async function bridge(action, cred, p) {
  const r = await fetch(BRIDGE, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ action, cred, p: p || {} }), redirect: "follow" });
  const j = await r.json();
  if (!j.ok) throw new Error(j.error || "Erreur du pont");
  return j.data;
}

function evo() {
  const url = String(process.env.EVOLUTION_API_URL || "").trim().replace(/\/+$/, "");
  const key = String(process.env.EVOLUTION_API_KEY || "").trim();
  const instance = String(process.env.WA_INSTANCE || "willshop_commerciale").trim();
  if (!url || !key) throw Object.assign(new Error("Ajoute EVOLUTION_API_URL et EVOLUTION_API_KEY dans les variables Vercel du projet willshop-app."), { code: 503 });
  const call = async (path, method = "GET", body) => {
    const r = await fetch(url + path, { method, headers: { "Content-Type": "application/json", apikey: key }, body: body ? JSON.stringify(body) : undefined });
    const txt = await r.text();
    let data = null; try { data = JSON.parse(txt); } catch (e) { data = { raw: txt }; }
    return { ok: r.ok, status: r.status, data };
  };
  return { call, instance };
}

function webhookConfig(url) {
  return { enabled: true, url, byEvents: false, base64: false, events: ["MESSAGES_UPSERT"] };
}

async function state(E) {
  const r = await E.call(`/instance/connectionState/${E.instance}`);
  if (r.status === 404) return { state: "absent" };
  const raw = String((r.data && (r.data.instance?.state || r.data.state)) || "close").toLowerCase();
  let phone = "";
  const f = await E.call(`/instance/fetchInstances?instanceName=${E.instance}`);
  const inst = Array.isArray(f.data) ? f.data[0] : f.data;
  const owner = inst && (inst.ownerJid || inst.owner || inst.instance?.owner);
  if (owner) phone = "+" + String(owner).split("@")[0].split(":")[0].replace(/\D/g, "");
  return { state: raw === "open" ? "connecte" : raw === "connecting" ? "attente" : "deconnecte", phone, name: (inst && (inst.profileName || inst.instance?.profileName)) || "" };
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Méthode non autorisée" });
  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  try {
    const me = await bridge("login", body.cred);
    if (me.role !== "ceo") return res.status(403).json({ error: "Réservé à la direction" });
    const E = evo();
    const action = body.action || "status";

    if (action === "status") return res.status(200).json(await state(E));

    if (action === "connect") {
      const { key, url } = await bridge("waKey", body.cred);
      const hook = `${url}?k=${key}`;
      let st = await state(E);
      if (st.state === "absent") {
        const c = await E.call("/instance/create", "POST", {
          instanceName: E.instance, qrcode: true, integration: "WHATSAPP-BAILEYS",
          rejectCall: false, groupsIgnore: true, alwaysOnline: false, readMessages: false, readStatus: false, syncFullHistory: false,
          webhook: webhookConfig(hook)
        });
        if (!c.ok) throw new Error(`Evolution (création) ${c.status} : ${JSON.stringify(c.data).slice(0, 200)}`);
      }
      // Toujours (re)brancher le webhook vers le Google Sheet
      const w = await E.call(`/webhook/set/${E.instance}`, "POST", { webhook: webhookConfig(hook) });
      if (!w.ok) throw new Error(`Evolution (webhook) ${w.status} : ${JSON.stringify(w.data).slice(0, 200)}`);
      // Réglages de discrétion : ne jamais marquer lu, ne pas forcer « en ligne »
      await E.call(`/settings/set/${E.instance}`, "POST", { rejectCall: false, groupsIgnore: true, alwaysOnline: false, readMessages: false, readStatus: false, syncFullHistory: false }).catch(() => null);
      st = await state(E);
      if (st.state === "connecte") return res.status(200).json(st);
      const q = await E.call(`/instance/connect/${E.instance}`);
      const qr = q.data && (q.data.base64 || q.data.qrcode?.base64) || "";
      const pairing = q.data && (q.data.pairingCode || q.data.qrcode?.pairingCode) || "";
      if (!qr && !pairing) throw new Error(`QR code indisponible (${q.status}). Réessaie dans quelques secondes.`);
      return res.status(200).json({ state: "attente", qr, pairing });
    }

    if (action === "disconnect") {
      await E.call(`/instance/logout/${E.instance}`, "DELETE");
      return res.status(200).json(await state(E));
    }
    return res.status(400).json({ error: "Action inconnue" });
  } catch (e) {
    return res.status(e.code || 500).json({ error: e.message || "Erreur" });
  }
};
