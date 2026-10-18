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
    if (role === "ceo") {
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
      Object.keys(patch).forEach(function (k) {
        if (!allowed[k]) throw new Error("Modification non autorisée");
        var v = patch[k] === "now" ? stamp_() : String(patch[k]).slice(0, 400);
        sh2.getRange(row, allowed[k]).setValue(v);
      });
      sh2.getRange(row, 18).setValue(me.nom + " · " + stamp_());
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
  throw new Error("Action inconnue");
}
