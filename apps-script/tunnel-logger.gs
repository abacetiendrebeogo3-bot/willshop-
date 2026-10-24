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

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(15000);
  try {
    var d = JSON.parse(e.postData.contents);
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
