// WillShop — Superviseur : rédige LE message de relance d'un prospect à partir de sa conversation WhatsApp.
// Clé OpenAI sur Vercel (OPENAI_API_KEY), jamais dans le téléphone. Appelé seulement quand on touche « Rédiger avec l'IA ».
const BRIDGE = "https://script.google.com/macros/s/AKfycbxudwbiZxBeTqbPU5XxCkAx1KsCuzcA8Y3qEbTEERqQ8IB6XX4hDwH7Cs3o8l9Sv8G0/exec";
const MODEL = process.env.OPENAI_SUPERVISOR_MODEL || "gpt-4o-mini";

async function whoIs(cred) {
  const r = await fetch(BRIDGE, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ action: "login", cred }), redirect: "follow" });
  const j = await r.json();
  if (!j.ok) throw new Error(j.error || "PIN incorrect");
  return j.data;
}

module.exports = async function handler(req, res) {
  const key = process.env.OPENAI_API_KEY;
  if (req.method === "GET") return res.status(200).json({ ready: !!key });
  if (req.method !== "POST") return res.status(405).json({ error: "Méthode non autorisée" });
  if (!key) return res.status(503).json({ error: "IA pas encore activée : ajoute OPENAI_API_KEY dans Vercel (projet willshop-app)." });

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  let me;
  try { me = await whoIs(body.cred); } catch (e) { return res.status(401).json({ error: "Connexion refusée : " + e.message }); }
  if (me.role === "driver") return res.status(403).json({ error: "Réservé à la direction et aux commerciaux." });

  const msgs = (Array.isArray(body.messages) ? body.messages : []).slice(-25)
    .map(m => `[${String(m.at || "").slice(0, 16)}] ${m.out ? "COMMERCIALE" : "CLIENT"}: ${String(m.text || "").slice(0, 400)}`)
    .join("\n");
  const commandes = (Array.isArray(body.orders) ? body.orders : []).slice(0, 5)
    .map(o => `- ${o.produit || "?"} · ${o.statut || "?"} · ${o.prix || "?"} F`).join("\n");

  const system = `Tu es le superviseur commercial de WillShop, boutique en ligne à Ouagadougou (Burkina Faso) : produits bien-être et cosmétiques (Kit Minceur, Kit Maca, etc.), paiement à la livraison, livraison 1 000 F partout à Ouaga.
Tu aides la commerciale à relancer ses prospects sur WhatsApp. Réponds UNIQUEMENT en JSON : {"resume": "...", "message": "..."}
- "resume" : une phrase : où en est le prospect et ce qui bloque.
- "message" : le message exact à envoyer. Court (2-3 phrases), chaleureux, naturel, français simple de Ouaga, vouvoiement, 1 emoji maximum. Il pousse vers une action claire (commander, fixer l'heure de livraison, répondre à sa question). N'invente jamais de prix, de promo ou d'information absente de la conversation.`;
  const user = `Situation détectée : ${String(body.situation || "").slice(0, 200)}
Client : ${String(body.nom || "inconnu").slice(0, 60)}
${commandes ? "Commandes dans le fichier :\n" + commandes + "\n" : "Aucune commande dans le fichier.\n"}
Conversation WhatsApp (heure GMT = heure de Ouaga) :
${msgs || "(vide)"}`;

  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: MODEL, temperature: 0.5, max_tokens: 300, response_format: { type: "json_object" }, messages: [{ role: "system", content: system }, { role: "user", content: user }] })
    });
    const j = await r.json();
    if (!r.ok) return res.status(502).json({ error: "OpenAI : " + ((j.error && j.error.message) || r.status) });
    let out = {}; try { out = JSON.parse(j.choices[0].message.content); } catch (e) { out = { message: j.choices?.[0]?.message?.content || "" }; }
    return res.status(200).json({ resume: out.resume || "", message: out.message || "" });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Erreur IA" });
  }
};
