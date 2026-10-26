var SHEET_ID = "1pTd-mhmjUVUYX1tDb37XChKd23ATgKYhuW9rpLq2Flo";
// Ordre réel du tunnel : Oui → ville → quartier → jour → numéro → offre → commande
var STEPS_ORDER = ["Arrivée", "Question", "Veut le produit", "Ville", "Quartier", "Jour", "Numéro donné", "Offre vue", "Commande"];

function txt(v, n) { return String(v == null ? "" : v).slice(0, n || 120); }

function findRow(sh, col, value) {
  if (!value) return 0;
  var last = sh.getLastRow();
  if (last < 2) return 0;
  var f = sh.getRange(2, col, last - 1, 1).createTextFinder(String(value)).matchEntireCell(true).findNext();
  return f ? f.getRow() : 0;
}

function laterStep(a, b) {
  return STEPS_ORDER.indexOf(b) > STEPS_ORDER.indexOf(a) ? b : a;
}

// Onglet Visites : A Arrivée | B Produit | C Session | D Dernière étape | E Veut | F Zone | G Jour | H Qté | I Téléphone | J A commandé | K Mise à jour
function upsertVisit(ss, d) {
  var sh = ss.getSheetByName("Visites");
  var now = new Date();
  var r = findRow(sh, 3, d.sid);
  if (!r) {
    sh.appendRow([now, txt(d.produit), txt(d.sid, 40), txt(d.step || "Arrivée", 40), txt(d.veut, 20), txt(d.zone, 30), txt(d.jour, 30),
      d.qte ? Number(d.qte) : "", d.tel ? "'" + txt(d.tel, 25) : "", d.type === "order" ? "Oui" : "Non", now]);
    return;
  }
  var row = sh.getRange(r, 1, 1, 11).getValues()[0];
  row[3] = laterStep(String(row[3] || ""), txt(d.step, 40) || String(row[3] || ""));
  if (d.veut) row[4] = txt(d.veut, 20);
  if (d.zone) row[5] = txt(d.zone, 30);
  if (d.jour) row[6] = txt(d.jour, 30);
  if (d.qte) row[7] = Number(d.qte);
  if (d.tel) row[8] = "'" + txt(d.tel, 25);
  if (d.type === "order") row[9] = "Oui";
  row[10] = now;
  sh.getRange(r, 1, 1, 11).setValues([row]);
}

// Onglet Commandes : A Date | B Produit | C Qté | D Prix | E Zone | F Lieu | G Tél | H Jour | I Statut | J Note | K Relances | L Dernière relance | M Session | N Étape
function upsertCommande(ss, d) {
  var sh = ss.getSheetByName("Commandes");
  var r = findRow(sh, 13, d.sid);
  var isOrder = d.type === "order" || !d.type;
  if (!r) {
    if (!isOrder && d.type !== "lead") return;
    sh.appendRow([new Date(), txt(d.produit), Number(d.qte) || 1, Number(d.prix) || "", txt(d.zone, 30), txt(d.lieu),
      "'" + txt(d.tel, 25), txt(d.jour, 30), isOrder ? "Nouvelle" : "Prospect", "", "", "", txt(d.sid, 40), isOrder ? "Commande" : txt(d.step || "Numéro donné", 40)]);
    return;
  }
  var row = sh.getRange(r, 1, 1, 14).getValues()[0];
  if (d.produit) row[1] = txt(d.produit);
  if (d.qte) row[2] = Number(d.qte);
  if (d.prix) row[3] = Number(d.prix);
  if (d.zone) row[4] = txt(d.zone, 30);
  if (d.lieu) row[5] = txt(d.lieu);
  if (d.tel) row[6] = "'" + txt(d.tel, 25);
  if (d.jour) row[7] = txt(d.jour, 30);
  if (isOrder) {
    if (String(row[8]) === "Prospect" || !row[8]) row[8] = "Nouvelle";
    row[13] = "Commande";
  } else if (d.step) {
    row[13] = laterStep(String(row[13] || ""), txt(d.step, 40));
  }
  row[6] = String(row[6]).charAt(0) === "'" ? row[6] : "'" + row[6];
  sh.getRange(r, 1, 1, 14).setValues([row]);
}

// ===================== ACADÉMIE (formations) =====================
// Les formations vont dans un Sheet séparé « WillShop Académie », pas dans les commandes de la boutique.
var ACADEMIE_ID = "1Zdj2DA8Zh_iHEfdvYg6GdFTNMSsjth0v8W2-TXOxIhU";
var ACA_STEPS = ["Arrivée", "Intéressé", "Objectif", "Extrait lancé", "Extrait vu", "Offre vue", "Question", "Numéro donné", "Commande"];
var ACA_RANK = { "Visiteur": 0, "Prospect": 1, "Veut payer": 2, "Acompte": 3, "Payé": 4, "Perdu": 4 };

// Onglet Prospects : A Date | B Formation | C Session | D Nom | E WhatsApp | F Pays | G Objectif | H Dernière étape | I Statut
//                    J Montant payé | K Date paiement | L Accès donné | M Relances | N Dernière relance | O Note | P Mise à jour
function upsertAcademie(d) {
  var sh = SpreadsheetApp.openById(ACADEMIE_ID).getSheetByName("Prospects");
  var now = new Date();
  var step = d.type === "order" ? "Commande" : txt(d.step || "Arrivée", 40);
  var statut = d.type === "order" ? "Veut payer" : (d.tel ? "Prospect" : "Visiteur");
  var r = findRow(sh, 3, d.sid);
  if (!r) {
    sh.appendRow([now, txt(d.produit), txt(d.sid, 40), txt(d.nom, 60), d.tel ? "'" + txt(d.tel, 25) : "", txt(d.zone, 30),
      txt(d.lieu || d.veut, 40), step, statut, "", "", "", 0, "", "", now]);
    return;
  }
  var row = sh.getRange(r, 1, 1, 16).getValues()[0];
  if (d.nom) row[3] = txt(d.nom, 60);
  if (d.tel) row[4] = "'" + txt(d.tel, 25);
  else if (row[4]) row[4] = "'" + String(row[4]).replace(/^'/, "");
  if (d.zone) row[5] = txt(d.zone, 30);
  if (d.lieu || d.veut) row[6] = txt(d.lieu || d.veut, 40);
  if (ACA_STEPS.indexOf(step) > ACA_STEPS.indexOf(String(row[7]))) row[7] = step;
  if ((ACA_RANK[statut] || 0) > (ACA_RANK[String(row[8])] || 0)) row[8] = statut; // ne rétrograde jamais un statut
  row[15] = now;
  sh.getRange(r, 1, 1, 16).setValues([row]);
}

// ===================== API de l'app « WillShop Académie » =====================
// L'app envoie {app:1, action, pin, p}. Le PIN est dans l'onglet Config (B1) du Sheet Académie.
var ACA_COLS = ["date", "formation", "sid", "nom", "tel", "pays", "objectif", "etape", "statut", "montant", "datePaiement",
  "acces", "relances", "derniereRelance", "note", "maj", "progression"];

function acaJson(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function acaIso(v) { return v instanceof Date ? v.toISOString() : v; }

function acaCheckPin(ss, pin) {
  var cache = CacheService.getScriptCache(), fails = Number(cache.get("aca_fails") || 0);
  if (fails >= 8) throw new Error("Trop d'essais. Réessaie dans 10 minutes.");
  var good = String(ss.getSheetByName("Config").getRange("B1").getValue()).replace(/^'/, "").trim();
  if (!good || String(pin || "").trim() !== good) { cache.put("aca_fails", String(fails + 1), 600); throw new Error("Code PIN incorrect"); }
  cache.remove("aca_fails");
}

function acaData(ss) {
  var sh = ss.getSheetByName("Prospects"), last = sh.getLastRow(), rows = [];
  if (last >= 2) sh.getRange(2, 1, last - 1, 17).getValues().forEach(function (r, i) {
    var o = { row: i + 2 };
    ACA_COLS.forEach(function (k, j) { o[k] = acaIso(r[j]); });
    o.tel = String(o.tel || "").replace(/^'/, "");
    rows.push(o);
  });
  var rl = ss.getSheetByName("Relances"), seq = [];
  if (rl.getLastRow() >= 2) rl.getRange(2, 1, rl.getLastRow() - 1, 4).getValues().forEach(function (r) {
    if (r[0] && r[3]) seq.push({ pour: String(r[0]), jour: Number(r[1]) || 0, titre: String(r[2]), message: String(r[3]) });
  });
  var cfg = {}, cf = ss.getSheetByName("Config").getRange("A2:B10").getValues();
  cf.forEach(function (r) { if (r[0]) cfg[String(r[0])] = String(r[1]); });
  var tb = ss.getSheetByName("Tableau de bord").getRange("B4:B9").getValues().map(function (r) { return Number(r[0]) || 0; });
  var bp = ss.getSheetByName("Budget pub"), pub = 0, blocs = [];
  if (bp.getLastRow() >= 2) bp.getRange(2, 1, bp.getLastRow() - 1, 10).getValues().forEach(function (r) {
    pub += Number(r[3]) || 0;
    if (r[0]) blocs.push({ bloc: r[0], du: acaIso(r[1]), au: acaIso(r[2]), pub: Number(r[3]) || 0, ventes: Number(r[4]) || 0, encaisse: Number(r[5]) || 0,
      reinjecter: Number(r[7]) || 0, epargner: Number(r[8]) || 0, parJour: Number(r[9]) || 0 });
  });
  return { prospects: rows, sequence: seq, config: cfg,
    params: { budget: tb[0], prix: tb[1], bonus: tb[2], reinjection: tb[3], coutMax: tb[4], objectif: tb[5] }, pub: pub, blocs: blocs,
    now: new Date().toISOString() };
}

// Met à jour une ligne retrouvée par sa session (jamais par numéro de ligne seul : le Sheet peut bouger)
function acaUpdate(ss, p) {
  var sh = ss.getSheetByName("Prospects"), r = findRow(sh, 3, p.sid);
  if (!r) throw new Error("Prospect introuvable");
  var row = sh.getRange(r, 1, 1, 17).getValues()[0], f = p.fields || {}, now = new Date();
  if (f.statut !== undefined) {
    if (f.statut === "Payé" && String(row[8]) !== "Payé") { row[12] = 0; row[13] = ""; if (!row[10]) row[10] = now; }
    if (f.statut === "Acompte" && !row[10]) row[10] = now;
    row[8] = String(f.statut);
  }
  if (f.montant !== undefined) row[9] = Number(f.montant) || "";
  if (f.acces !== undefined) row[11] = f.acces ? "Oui" : "";
  if (f.note !== undefined) row[14] = String(f.note).slice(0, 500);
  if (f.nom !== undefined) row[3] = String(f.nom).slice(0, 60);
  if (f.progression !== undefined) row[16] = Math.max(0, Math.min(8, Number(f.progression) || 0));
  if (p.relance) { row[12] = (Number(row[12]) || 0) + 1; row[13] = now; }
  if (row[4]) row[4] = "'" + String(row[4]).replace(/^'/, "");
  row[15] = now;
  sh.getRange(r, 1, 1, 17).setValues([row]);
  return true;
}

// Ajoute un contact venu directement sur WhatsApp (hors tunnel)
function acaAdd(ss, p) {
  var sh = ss.getSheetByName("Prospects"), now = new Date();
  var sid = "m" + now.getTime().toString(36);
  sh.appendRow([now, "Formation Vidéos IA", sid, String(p.nom || "").slice(0, 60), "'" + String(p.tel || "").slice(0, 25), String(p.pays || "Burkina"),
    "WhatsApp direct", "Numéro donné", "Prospect", "", "", "", 0, "", String(p.note || "").slice(0, 500), now, 0]);
  return sid;
}

function acaApi(d) {
  var ss = SpreadsheetApp.openById(ACADEMIE_ID);
  try {
    acaCheckPin(ss, d.pin);
    if (d.action === "data") return acaJson({ ok: true, data: acaData(ss) });
    if (d.action === "update") return acaJson({ ok: true, data: acaUpdate(ss, d.p || {}) });
    if (d.action === "add") return acaJson({ ok: true, data: acaAdd(ss, d.p || {}) });
    return acaJson({ ok: false, error: "Action inconnue" });
  } catch (err) {
    return acaJson({ ok: false, error: String(err.message || err) });
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(15000);
  try {
    var d = JSON.parse(e.postData.contents);
    if (d.app) return acaApi(d);
    if (/^Formation/i.test(String(d.produit || ""))) { upsertAcademie(d); return ContentService.createTextOutput("ok"); }
    var ss = SpreadsheetApp.openById(SHEET_ID);
    if (d.type === "order" || !d.type) d.step = "Commande";
    if (d.sid) upsertVisit(ss, d);
    if (d.type === "lead" || d.type === "order" || !d.type) upsertCommande(ss, d);
    else if (d.sid && (d.zone || d.jour || d.step)) upsertCommande(ss, d); // met à jour un prospect existant
    return ContentService.createTextOutput("ok");
  } catch (err) {
    return ContentService.createTextOutput("erreur");
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return ContentService.createTextOutput("WillShop commandes : actif");
}
