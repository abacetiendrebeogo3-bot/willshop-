// WillShop — pont sécurisé entre l'app WillShop (Vercel) et le Google Sheet des tunnels.
// L'app envoie { action, cred: { nom, pin }, p } en POST ; la réponse est du JSON.
var SHEET_ID = "1pTd-mhmjUVUYX1tDb37XChKd23ATgKYhuW9rpLq2Flo";

// Ancienne page Équipe (gardée pour les liens déjà envoyés)
function page_() {
  var it = DriveApp.getFilesByName("willshop-equipe.html"), best = null;
  while (it.hasNext()) { var f = it.next(); if (!f.isTrashed() && (!best || f.getLastUpdated() > best.getLastUpdated())) best = f; }
  if (!best) return "<p>Fichier willshop-equipe.html introuvable dans le Drive.</p>";
  return best.getBlob().getDataAsString("UTF-8");
}
function doGet() {
  return HtmlService.createHtmlOutput(page_())
    .setTitle("WillShop Équipe")
    .addMetaTag("viewport", "width=device-width, initial-scale=1, viewport-fit=cover");
}

// API JSON pour l'app WillShop
function doPost(e) {
  var out;
  try {
    var body = JSON.parse(e.postData.contents);
    out = { ok: true, data: api(body.action, body.cred, body.p || {}) };
  } catch (err) {
    out = { ok: false, error: String(err && err.message || err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function ss_() { return SpreadsheetApp.openById(SHEET_ID); }
function stamp_() { return Utilities.formatDate(new Date(), "GMT", "dd/MM/yyyy HH:mm:ss"); }
function roleOf_(r) { r = String(r || ""); return /direct|ceo|patron/i.test(r) ? "ceo" : /livr/i.test(r) ? "driver" : "sales"; }

function team_() {
  var sh = ss_().getSheetByName("Équipe");
  var n = sh.getLastRow();
  if (n < 2) return [];
  return sh.getRange(2, 1, n - 1, 5).getDisplayValues().map(function (r, i) {
    return { row: i + 2, nom: String(r[0]).trim(), role: String(r[1]), tel: String(r[2]), actif: !/^non/i.test(r[3]), pin: String(r[4]).trim() };
  }).filter(function (t) { return t.nom; });
}

function names() {
  return team_().filter(function (m) { return m.actif && m.pin; }).map(function (m) { return { nom: m.nom }; });
}

// Vérifie le PIN ; bloque 15 minutes après 6 erreurs sur le même nom
function auth_(cred) {
  if (!cred || !cred.nom || !cred.pin) throw new Error("PIN incorrect");
  var cache = CacheService.getScriptCache(), key = "fail_" + String(cred.nom).slice(0, 60);
  var fails = Number(cache.get(key) || 0);
  if (fails >= 6) throw new Error("Trop d'essais. Réessaie dans 15 minutes.");
  var me = team_().filter(function (m) { return m.nom === cred.nom && m.actif && m.pin && m.pin === String(cred.pin).trim(); })[0];
  if (!me) { cache.put(key, String(fails + 1), 900); Utilities.sleep(700); throw new Error("PIN incorrect"); }
  return me;
}

// Colonnes que chaque rôle peut modifier (numéro de colonne dans « Commandes »)
// ---------- Stock ----------
// Onglet « Stock » : Produit | Stock actuel | Seuil | Prix d'achat | Prix de vente | Mise à jour
// Onglet « Mouvements » : Date | Produit | Type | Quantité | Stock après | Par | Note
function stockRows_() {
  var sh = ss_().getSheetByName("Stock"); if (!sh) return [];
  var n = sh.getLastRow(); if (n < 2) return [];
  return sh.getRange(2, 1, n - 1, 6).getDisplayValues().map(function (r, i) {
    return { row: i + 2, produit: String(r[0]).trim(), stock: Number(String(r[1]).replace(/[^0-9-]/g, "")) || 0, seuil: Number(String(r[2]).replace(/\D/g, "")) || 0,
      achat: Number(String(r[3]).replace(/\D/g, "")) || 0, vente: Number(String(r[4]).replace(/\D/g, "")) || 0, maj: r[5] };
  }).filter(function (x) { return x.produit; });
}
// « Green Mask Stick x2 » avec quantité 1 = 2 unités du produit « Green Mask Stick »
function stockFor_(produit, qte) {
  var name = String(produit || "").toLowerCase(), best = null;
  stockRows_().forEach(function (x) { var k = x.produit.toLowerCase(); if (name.indexOf(k) === 0 && (!best || k.length > best.produit.length)) best = x; });
  if (!best) return null;
  var m = /x\s*(\d+)\s*$/i.exec(produit || ""), mult = m ? Number(m[1]) : 1;
  return { item: best, units: (Number(qte) || 1) * mult };
}
function moveStock_(item, delta, type, by, note) {
  var sh = ss_().getSheetByName("Stock"), after = item.stock + delta;
  sh.getRange(item.row, 2).setValue(after);
  sh.getRange(item.row, 6).setValue(stamp_());
  ss_().getSheetByName("Mouvements").appendRow([stamp_(), item.produit, type, delta, after, by, String(note || "").slice(0, 200)]);
  item.stock = after;
  return after;
}

var FIELDS = {
  ceo:    { statut: 9, note: 10, relances: 11, derniere: 12, livreur: 15, paiement: 16, livreeLe: 17, jour: 8, lieu: 6 },
  sales:  { statut: 9, note: 10, relances: 11, derniere: 12, livreur: 15, jour: 8, lieu: 6 },
  driver: { statut: 9, note: 10, paiement: 16, livreeLe: 17, jour: 8 }
};

function api(action, cred, p) {
  if (action === "names") return names();
  var me = auth_(cred), role = roleOf_(me.role);
  if (action === "login") return { nom: me.nom, role: role };

  if (action === "data") {
    var ss = ss_(), sh = ss.getSheetByName("Commandes"), n = sh.getLastRow();
    var rows = n < 2 ? [] : sh.getRange(2, 1, n - 1, 18).getDisplayValues();
    var out = rows.map(function (r, i) { return { row: i + 2, v: r }; });
    if (role === "driver") out = out.filter(function (x) { return x.v[14] === me.nom; });
    var t = team_();
    var res = { rows: out, drivers: t.filter(function (m) { return /livr/i.test(m.role) && m.actif; }).map(function (m) { return m.nom; }) };
    if (role !== "driver") res.stock = stockRows_().map(function (x) { return { produit: x.produit, stock: x.stock, seuil: x.seuil, achat: role === "ceo" ? x.achat : 0, vente: x.vente, maj: x.maj }; });
    if (role === "ceo") {
      var ms = ss.getSheetByName("Mouvements"), mn = ms ? ms.getLastRow() : 0;
      res.moves = mn < 2 ? [] : ms.getRange(Math.max(2, mn - 60), 1, Math.min(61, mn - 1), 7).getDisplayValues().reverse();
      var vs = ss.getSheetByName("Visites"), vn = vs.getLastRow();
      var from = Math.max(2, vn - 3000);
      res.visits = vn < 2 ? [] : vs.getRange(from, 1, vn - from + 1, 4).getDisplayValues();
      res.team = t.map(function (m) { return { nom: m.nom, role: m.role, tel: m.tel, actif: m.actif, pin: !!m.pin }; });
    }
    return res;
  }

  if (action === "update") {
    var lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      var sh2 = ss_().getSheetByName("Commandes");
      var row = Number(p && p.row);
      if (!(row >= 2 && row <= sh2.getLastRow())) throw new Error("Commande introuvable");
      if (role === "driver" && sh2.getRange(row, 15).getDisplayValue() !== me.nom) throw new Error("Cette livraison n'est pas à toi");
      var allowed = FIELDS[role], patch = (p && p.patch) || {};
      var before = sh2.getRange(row, 1, 1, 9).getDisplayValues()[0], wasDelivered = /^livr/i.test(before[8]);
      Object.keys(patch).forEach(function (k) {
        if (!allowed[k]) throw new Error("Modification non autorisée");
        var v = patch[k] === "now" ? stamp_() : String(patch[k]).slice(0, 400);
        sh2.getRange(row, allowed[k]).setValue(v);
      });
      sh2.getRange(row, 18).setValue(me.nom + " · " + stamp_());
      if (patch.statut !== undefined) {
        var nowDelivered = /^livr/i.test(patch.statut);
        if (nowDelivered !== wasDelivered) {
          var st = stockFor_(before[1], before[2]);
          if (st) moveStock_(st.item, nowDelivered ? -st.units : st.units, nowDelivered ? "Sortie (livraison)" : "Retour (livraison annulée)", me.nom, "Commande ligne " + row + " · " + before[6]);
        }
      }
      return { ok: true };
    } finally {
      lock.releaseLock();
    }
  }

  if (action === "addMember") {
    if (role !== "ceo") throw new Error("Réservé à la direction");
    var nom = String(p.nom || "").trim().slice(0, 60);
    if (!nom) throw new Error("Nom manquant");
    if (team_().some(function (m) { return m.nom.toLowerCase() === nom.toLowerCase(); })) throw new Error("Ce nom existe déjà");
    var pin = String(p.pin || "").replace(/\D/g, "").slice(0, 8);
    ss_().getSheetByName("Équipe").appendRow([nom, String(p.role || "Livreur").slice(0, 30), p.tel ? "'" + String(p.tel).slice(0, 25) : "", "Oui", pin ? "'" + pin : ""]);
    return { ok: true };
  }

  if (action === "setMember") {
    if (role !== "ceo") throw new Error("Réservé à la direction");
    var m = team_().filter(function (x) { return x.nom === p.nom; })[0];
    if (!m) throw new Error("Membre introuvable");
    var tsh = ss_().getSheetByName("Équipe");
    if (p.actif !== undefined) tsh.getRange(m.row, 4).setValue(p.actif ? "Oui" : "Non");
    if (p.pin) tsh.getRange(m.row, 5).setValue("'" + String(p.pin).replace(/\D/g, "").slice(0, 8));
    return { ok: true };
  }
  if (action === "stockMove") {
    if (role !== "ceo") throw new Error("Réservé à la direction");
    var lk = LockService.getScriptLock(); lk.waitLock(10000);
    try {
      var it = stockRows_().filter(function (x) { return x.produit === p.produit; })[0];
      if (!it) throw new Error("Produit introuvable");
      var q = Math.round(Number(p.qte) || 0);
      if (p.type === "entree") { if (q <= 0) throw new Error("Quantité invalide"); return { stock: moveStock_(it, q, "Entrée", me.nom, p.note) }; }
      if (p.type === "perte") { if (q <= 0) throw new Error("Quantité invalide"); return { stock: moveStock_(it, -q, "Perte / casse", me.nom, p.note) }; }
      if (p.type === "inventaire") { if (q < 0) throw new Error("Quantité invalide"); return { stock: moveStock_(it, q - it.stock, "Inventaire (compté : " + q + ")", me.nom, p.note) }; }
      throw new Error("Type inconnu");
    } finally { lk.releaseLock(); }
  }

  if (action === "stockProduct") {
    if (role !== "ceo") throw new Error("Réservé à la direction");
    var name = String(p.produit || "").trim().slice(0, 60);
    if (!name) throw new Error("Nom manquant");
    var ssh = ss_().getSheetByName("Stock"), ex = stockRows_().filter(function (x) { return x.produit.toLowerCase() === name.toLowerCase(); })[0];
    var seuil = Math.max(0, Math.round(Number(p.seuil) || 0)), achat = Math.max(0, Math.round(Number(p.achat) || 0)), vente = Math.max(0, Math.round(Number(p.vente) || 0));
    if (ex) { ssh.getRange(ex.row, 3, 1, 3).setValues([[seuil, achat || "", vente || ""]]); ssh.getRange(ex.row, 6).setValue(stamp_()); }
    else ssh.appendRow([name, 0, seuil, achat || "", vente || "", stamp_()]);
    return { ok: true };
  }
  throw new Error("Action inconnue");
}
