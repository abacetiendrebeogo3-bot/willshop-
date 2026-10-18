// WillShop — assistant IA. La clé Anthropic reste sur Vercel (variable ANTHROPIC_API_KEY), jamais dans le téléphone.
// Avant chaque question, on vérifie le nom et le PIN auprès du Google Sheet : seuls la direction et les commerciaux y ont accès.
const BRIDGE = "https://script.google.com/macros/s/AKfycbxudwbiZxBeTqbPU5XxCkAx1KsCuzcA8Y3qEbTEERqQ8IB6XX4hDwH7Cs3o8l9Sv8G0/exec";
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";
const MODEL_QUICK = process.env.ANTHROPIC_MODEL_QUICK || "claude-haiku-5-5";

async function whoIs(cred) {
  const r = await fetch(BRIDGE, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ action: "login", cred }), redirect: "follow" });
  const j = await r.json();
  if (!j.ok) throw new Error(j.error || "PIN incorrect");
  return j.data;
}

module.exports = async function handler(req, res) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (req.method === "GET") return res.status(200).json({ ready: !!key });
  if (req.method !== "POST") return res.status(405).json({ error: "Méthode non autorisée" });
  if (!key) return res.status(503).json({ error: "Assistant pas encore activé : ajoute ANTHROPIC_API_KEY dans Vercel." });

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  let me;
  try { me = await whoIs(body.cred); } catch (e) { return res.status(401).json({ error: "Connexion refusée : " + e.message }); }
  if (me.role === "driver") return res.status(403).json({ error: "L'assistant est réservé à la direction et aux commerciaux." });

  const messages = (Array.isArray(body.messages) ? body.messages : [])
    .filter(m => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-14)
    .map(m => ({ role: m.role, content: m.content.slice(0, 60000) }));
  if (!messages.length || messages[messages.length - 1].role !== "user") return res.status(400).json({ error: "Question manquante" });

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: body.quick ? MODEL_QUICK : MODEL,
        max_tokens: body.quick ? 300 : 900,
        system: `Tu es l'assistant de WillShop, boutique en ligne à Ouagadougou. Tu parles à ${me.nom} (${me.role === "ceo" ? "la direction" : "commerciale"}). Réponds en français simple, phrases courtes, montants en francs CFA (F). Si une information n'est pas dans les données fournies, dis-le.`,
        messages
      })
    });
    const j = await r.json();
    if (!r.ok) {
      const msg = j && j.error && j.error.message || "Erreur de l'IA";
      return res.status(r.status === 429 ? 429 : 502).json({ error: /credit|balance/i.test(msg) ? "Crédit Anthropic épuisé : recharge ton compte." : msg });
    }
    const text = (j.content || []).filter(c => c.type === "text").map(c => c.text).join("\n").trim();
    return res.status(200).json({ text });
  } catch (e) {
    return res.status(502).json({ error: "L'IA ne répond pas pour le moment." });
  }
}
