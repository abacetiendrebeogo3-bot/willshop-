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

// ---------- Journal (suivi en direct) ----------
function journal_(qui, action, row, client, detail) {
  try { ss_().getSheetByName("Journal").appendRow([stamp_(), qui, action, row || "", client ? "'" + client : "", String(detail || "").slice(0, 200)]); } catch (e) {}
}
// ---------- Caisse : remises d'espèces des livreurs ----------
// Onglet « Caisse » : Déclaré le | Livreur | Montant | Commandes (lignes) | Statut | Validé par | Validé le | Note
function remises_() {
  var sh = ss_().getSheetByName("Caisse"), n = sh.getLastRow();
  if (n < 2) return [];
  return sh.getRange(2, 1, n - 1, 8).getDisplayValues().map(function (r, i) {
    return { id: i + 2, date: r[0], livreur: r[1], montant: Number(String(r[2]).replace(/\D/g, "")) || 0, lignes: String(r[3]), statut: r[4], par: r[5], le: r[6] };
  });
}

var FIELDS = {
  ceo:    { paye: 0, statut: 9, note: 10, relances: 11, derniere: 12, livreur: 15, paiement: 16, livreeLe: 17, jour: 8, lieu: 6, source: 22, type: 23, dateRelance: 24, creePar: 25, nom: 26 },
  sales:  { paye: 0, statut: 9, note: 10, relances: 11, derniere: 12, livreur: 15, jour: 8, lieu: 6, source: 22, type: 23, dateRelance: 24, creePar: 25, nom: 26 },
  driver: { paye: 0, statut: 9, note: 10, paiement: 16, livreeLe: 17, jour: 8 }
};

// ---------- Tâches de la commerciale ----------
// Onglet « Tâches » : Date | Qui | Type | Clé | Faite à | Note | Ajoutée par
// Types : statuts · contact (clé = numéro) · cr (clé = heure du compte-rendu) · libre (clé = identifiant)
function tasksSheet_() {
  var ss = ss_(), sh = ss.getSheetByName("Tâches");
  if (!sh) { sh = ss.insertSheet("Tâches"); sh.appendRow(["Date", "Qui", "Type", "Clé", "Faite à", "Note", "Ajoutée par"]); sh.setFrozenRows(1); sh.getRange("A:D").setNumberFormat("@"); }
  return sh;
}
function day_(d) { return Utilities.formatDate(d || new Date(), "GMT", "dd/MM/yyyy"); }
function tasks_(days) {
  var sh = tasksSheet_(), n = sh.getLastRow();
  if (n < 2) return [];
  var keep = {}; for (var i = 0; i < days; i++) keep[day_(new Date(Date.now() - i * 86400000))] = 1;
  return sh.getRange(2, 1, n - 1, 7).getDisplayValues().map(function (r, i) {
    return { id: i + 2, date: r[0], qui: r[1], type: r[2], cle: r[3], faite: r[4], note: r[5], par: r[6] };
  }).filter(function (t) { return keep[t.date] || (t.type === "libre" && !t.faite); });
}

function api(action, cred, p) {
  if (action === "names") return names();
  var me = auth_(cred), role = roleOf_(me.role);
  if (action === "login") return { nom: me.nom, role: role };

  if (action === "data") {
    var ss = ss_(), sh = ss.getSheetByName("Commandes"), n = sh.getLastRow();
    if (sh.getMaxColumns() < 26) sh.insertColumnsAfter(sh.getMaxColumns(), 26 - sh.getMaxColumns());
    var h = sh.getRange(1, 1, 1, 26).getValues()[0];
    var headers = ["Date", "Produit", "Qté", "Prix", "Zone", "Lieu", "Tél", "Jour", "Statut", "Note", "Relances", "Dernière relance", "Session", "Étape", "Livreur", "Paiement", "Livrée le", "Modifié par", "Payé le", "Encaissé par", "Remis à la caisse le", "Source", "Type", "Date relance", "Créé par", "Nom client"];
    for (var colIdx = 21; colIdx < 26; colIdx++) {
      if (!h[colIdx]) sh.getRange(1, colIdx + 1).setValue(headers[colIdx]);
    }
    var rows = n < 2 ? [] : sh.getRange(2, 1, n - 1, 26).getDisplayValues();
    var out = rows.map(function (r, i) { return { row: i + 2, v: r }; });
    if (role === "driver") out = out.filter(function (x) { return x.v[14] === me.nom; });
    var t = team_();
    var res = { rows: out, drivers: t.filter(function (m) { return /livr/i.test(m.role) && m.actif; }).map(function (m) { return m.nom; }) };
    if (role !== "driver") res.stock = stockRows_().map(function (x) { return { produit: x.produit, stock: x.stock, seuil: x.seuil, achat: role === "ceo" ? x.achat : 0, vente: x.vente, maj: x.maj }; });
    var rem = remises_();
    if (role === "driver") res.remises = rem.filter(function (x) { return x.livreur === me.nom; }).slice(-10);
    if (role !== "driver") { var tk = tasks_(7); res.tasks = role === "ceo" ? tk : tk.filter(function (x) { return x.qui === me.nom; }); }
    if (role === "ceo") {
      res.remises = rem.slice(-40);
      var js = ss.getSheetByName("Journal"), jn = js.getLastRow();
      res.journal = jn < 2 ? [] : js.getRange(Math.max(2, jn - 59), 1, Math.min(60, jn - 1), 6).getDisplayValues().reverse();
      var ms = ss.getSheetByName("Mouvements"), mn = ms ? ms.getLastRow() : 0;
      res.moves = mn < 2 ? [] : ms.getRange(Math.max(2, mn - 60), 1, Math.min(61, mn - 1), 7).getDisplayValues().reverse();
      var vs = ss.getSheetByName("Visites"), vn = vs.getLastRow();
      var from = Math.max(2, vn - 3000);
      res.visits = vn < 2 ? [] : vs.getRange(from, 1, vn - from + 1, 4).getDisplayValues();
      res.team = t.map(function (m) { return { nom: m.nom, role: m.role, tel: m.tel, actif: m.actif, pin: !!m.pin }; });
    }
    return res;
  }

  if (action === "addOrder") {
    if (role === "driver") throw new Error("Réservé à la commerciale et à la direction");
    var nom = String(p.nom || "").trim().slice(0, 100);
    var tel = String(p.tel || "").trim().slice(0, 30);
    if (!nom) throw new Error("Nom du client obligatoire");
    if (!tel) throw new Error("Téléphone obligatoire");
    var produit = String(p.produit || "").trim().slice(0, 100);
    if (!produit) throw new Error("Produit obligatoire");
    var qte = Math.max(1, Math.round(Number(p.qte) || 1));
    var prix = Math.max(0, Math.round(Number(p.prix) || 0));
    var zone = String(p.zone || "Ouagadougou").trim().slice(0, 50);
    var lieu = String(p.lieu || "").trim().slice(0, 100);
    var source = String(p.source || "WhatsApp direct").trim().slice(0, 50);
    var type = String(p.type || "commande").toLowerCase();
    var isProm = type === "promesse";
    var dateRelance = isProm ? String(p.dateRelance || "").trim().slice(0, 30) : "";
    var statut = isProm ? "Promesse" : "Confirmée";
    var jour = isProm ? "À convenir" : String(p.jour || "Aujourd'hui").trim().slice(0, 50);
    var note = String(p.note || "").trim().slice(0, 400);
    if (nom) note = ("[Client: " + nom + "] " + note).trim();

    var lkAdd = LockService.getScriptLock();
    lkAdd.waitLock(10000);
    try {
      var shCmd = ss_().getSheetByName("Commandes");
      if (shCmd.getMaxColumns() < 26) shCmd.insertColumnsAfter(shCmd.getMaxColumns(), 26 - shCmd.getMaxColumns());
      var nowStr = stamp_();
      var newRow = [
        nowStr,
        produit,
        qte,
        prix,
        zone,
        lieu,
        "'" + tel,
        jour,
        statut,
        note,
        "",
        "",
        "MANUEL-" + Date.now(),
        isProm ? "Promesse d'achat" : "Commande manuelle",
        "",
        "",
        "",
        me.nom + " · " + nowStr,
        "",
        "",
        "",
        source,
        type,
        dateRelance,
        me.nom,
        nom
      ];
      shCmd.appendRow(newRow);
      var rowNum = shCmd.getLastRow();
      journal_(me.nom, "Nouvelle " + (isProm ? "promesse" : "commande") + " (" + source + ")", rowNum, tel, produit + " · " + (nom || lieu));
      return { ok: true, row: rowNum };
    } finally {
      lkAdd.releaseLock();
    }
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
      var before = sh2.getRange(row, 1, 1, 26).getDisplayValues()[0], wasDelivered = /^livr/i.test(before[8]);
      var client = before[6], notes = [];
      // « paye » : le client a payé (mode = Espèces / Orange Money / Moov Money)
      if (patch.paye !== undefined) {
        var mode = String(patch.paye).slice(0, 30);
        if (mode) { sh2.getRange(row, 16).setValue(mode); sh2.getRange(row, 19, 1, 2).setValues([[stamp_(), me.nom]]); notes.push("Payé " + before[3] + " F en " + mode); }
        else if (role === "ceo") { sh2.getRange(row, 19, 1, 3).setValues([["", "", ""]]); notes.push("Paiement annulé"); }
        delete patch.paye;
      }
      // une livraison payée sur place enregistre aussi le paiement (sauf s'il était déjà payé d'avance)
      if (patch.paiement && /^livr/i.test(patch.statut || "") && !before[18]) { sh2.getRange(row, 19, 1, 2).setValues([[stamp_(), me.nom]]); }
      Object.keys(patch).forEach(function (k) {
        if (!(k in allowed)) throw new Error("Modification non autorisée");
        var v = patch[k] === "now" ? stamp_() : String(patch[k]).slice(0, 400);
        sh2.getRange(row, allowed[k]).setValue(v);
      });
      sh2.getRange(row, 18).setValue(me.nom + " · " + stamp_());
      if (patch.statut !== undefined && patch.statut !== before[8]) notes.push(patch.statut + (patch.paiement ? " · " + before[3] + " F en " + patch.paiement : ""));
      if (patch.livreur !== undefined) notes.push(patch.livreur ? "Attribuée à " + patch.livreur : "Livreur retiré");
      if (patch.relances !== undefined) { var last = String(patch.relances).split(/,\s*/).pop(); notes.push(/^J\+/.test(last) ? "Relance " + last + " envoyée" : /^jour/i.test(last) ? "Client prévenu de la livraison du jour" : /^veille/i.test(last) ? "Rappel de la veille envoyé" : "Client recontacté"); }
      if (patch.jour !== undefined && patch.statut === undefined) notes.push("Livraison prévue " + patch.jour);
      if (notes.length) journal_(me.nom, notes.join(" · "), row, client, before[1] + " · " + before[5]);
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
  if (action === "remise") {
    if (role !== "driver") throw new Error("Réservé aux livreurs");
    var lk2 = LockService.getScriptLock(); lk2.waitLock(10000);
    try {
      var cs = ss_().getSheetByName("Commandes"), cn = cs.getLastRow();
      var all = cn < 2 ? [] : cs.getRange(2, 1, cn - 1, 21).getDisplayValues();
      var pending = {};
      remises_().filter(function (x) { return x.livreur === me.nom && /attente/i.test(x.statut); }).forEach(function (x) { x.lignes.split(/[,\s]+/).forEach(function (l) { if (l) pending[l] = 1; }); });
      var lignes = [], total = 0;
      all.forEach(function (r, i) { var ln = String(i + 2); if (/esp/i.test(r[15]) && r[19] === me.nom && r[18] && !r[20] && !pending[ln]) { lignes.push(ln); total += Number(String(r[3]).replace(/\D/g, "")) || 0; } });
      if (!lignes.length) throw new Error("Rien à remettre : pas d'espèces encaissées en attente");
      ss_().getSheetByName("Caisse").appendRow([stamp_(), me.nom, total, lignes.join(", "), "En attente", "", "", ""]);
      journal_(me.nom, "Remise de caisse déclarée : " + total + " F", "", "", lignes.length + " commande(s)");
      return { montant: total, lignes: lignes.length };
    } finally { lk2.releaseLock(); }
  }

  if (action === "remiseOk") {
    if (role !== "ceo") throw new Error("Réservé à la direction");
    var lk3 = LockService.getScriptLock(); lk3.waitLock(10000);
    try {
      var r0 = remises_().filter(function (x) { return x.id === Number(p.id); })[0];
      if (!r0) throw new Error("Remise introuvable");
      if (!/attente/i.test(r0.statut)) throw new Error("Remise déjà validée");
      var csh = ss_().getSheetByName("Caisse"), now = stamp_();
      csh.getRange(r0.id, 5, 1, 3).setValues([[p.refus ? "Refusée" : "Reçu", me.nom, now]]);
      if (!p.refus) { var cm = ss_().getSheetByName("Commandes"); r0.lignes.split(/[,\s]+/).forEach(function (l) { if (Number(l) >= 2) cm.getRange(Number(l), 21).setValue(now); }); }
      journal_(me.nom, (p.refus ? "Remise refusée : " : "Argent reçu de " + r0.livreur + " : ") + r0.montant + " F", "", "", "");
      return { ok: true };
    } finally { lk3.releaseLock(); }
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
  if (action === "taskDone") {
    if (role === "driver") throw new Error("Réservé à l'équipe commerciale");
    var tsh = tasksSheet_(), type = String(p.type || ""), cle = String(p.cle || "").slice(0, 40), note = String(p.note || "").slice(0, 300);
    if (!/^(statuts|contact|cr|libre)$/.test(type)) throw new Error("Tâche inconnue");
    var lk4 = LockService.getScriptLock(); lk4.waitLock(10000);
    try {
      if (type === "libre") {
        var t0 = tasks_(60).filter(function (x) { return x.type === "libre" && String(x.id) === cle; })[0];
        if (!t0) throw new Error("Tâche introuvable");
        tsh.getRange(t0.id, 5).setValue(stamp_());
        journal_(me.nom, "Tâche faite : " + t0.note, "", "", "");
        return { ok: true };
      }
      var exists = tasks_(1).some(function (x) { return x.qui === me.nom && x.type === type && x.cle === cle; });
      if (!exists) tsh.appendRow(["'" + day_(), me.nom, type, "'" + cle, stamp_(), note, ""]);
      var lbl = type === "statuts" ? "Statuts WhatsApp postés" : type === "cr" ? "Compte-rendu de " + cle + " h posté" : "Contact enregistré";
      journal_(me.nom, lbl, "", type === "contact" ? "'" + cle : "", "");
      return { ok: true };
    } finally { lk4.releaseLock(); }
  }
  if (action === "taskAdd") {
    if (role !== "ceo") throw new Error("Réservé à la direction");
    var texte = String(p.texte || "").trim().slice(0, 200), qui = String(p.qui || "").trim();
    if (!texte || !qui) throw new Error("Tâche ou personne manquante");
    tasksSheet_().appendRow(["'" + day_(), qui, "libre", "", "", texte, me.nom]);
    var sh5 = tasksSheet_(); sh5.getRange(sh5.getLastRow(), 4).setValue("'" + sh5.getLastRow());
    journal_(me.nom, "Tâche ajoutée pour " + qui + " : " + texte, "", "", "");
    return { ok: true };
  }
  throw new Error("Action inconnue");
}
