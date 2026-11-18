  /* ===================== CONTENU ===================== */
  var COM = [
    { t: "👗 Boutique / vêtements", k: "Boutique", phr: "une boutique de vêtements",
      reac: "Ah, les habits ! Pendant les fêtes, tout le monde veut être frais 👌",
      aff: "affiche-faso-style.jpg", affCap: "Affiche pour <b>Faso Style</b> (boutique de vêtements)",
      vid: "spot-produit", vidCap: "Spot pub pour un <b>produit</b>. Pour toi, ce sera tes habits 👗" },
    { t: "🍗 Restaurant / maquis", k: "Maquis", phr: "un restaurant / maquis",
      reac: "Ah, un maquis ! Les fêtes, c'est le moment où les gens sortent manger 😄",
      aff: "affiche-maquis-baobab.jpg", affCap: "Affiche pour le <b>Maquis Le Baobab</b>",
      vid: "spot-histoire", vidCap: "Spot pub en <b>mini-histoire</b>. Pour toi, ce sera ton poulet braisé 🍗" },
    { t: "💇🏾‍♀️ Salon / beauté", k: "Salon", phr: "un salon de beauté",
      reac: "Un salon, super ! Pour les fêtes, les femmes veulent être belles 💅🏾",
      aff: "affiche-belle-afro.jpg", affCap: "Affiche pour le <b>Salon Belle Afro</b>",
      vid: "spot-produit", vidCap: "Spot pub pour un <b>produit de beauté</b> 💚" },
    { t: "🛍️ Autre commerce", k: "Autre", phr: "un commerce",
      reac: "Très bien, c'est noté 👍",
      aff: "affiche-faso-style.jpg", affCap: "Affiche pour <b>Faso Style</b>",
      vid: "spot-tbm", vidCap: "Spot pub pour <b>TBM Inov Afrika</b> (entreprise d'étanchéité) 🏗️" }
  ];
  var PUB = [
    { t: "✅ Oui, et ça marche", k: "Oui, ça marche", r: ["Bien ! Pendant les fêtes, on va pousser encore plus fort 🚀"] },
    { t: "😕 Oui, mais pas de résultats", k: "Oui, sans résultats", r: ["Je comprends. Souvent, c'est le visuel ou le réglage de la pub qui bloque.", "C'est exactement le travail de Willy : il fait des pubs pour WillShop et pour des entreprises tous les jours 💪🏾"] },
    { t: "🙅🏾 Jamais", k: "Jamais", r: ["Pas de souci, c'est notre travail 😉", "Tu n'as rien à filmer, rien à régler. On s'occupe de tout."] }
  ];
  function M(f) { return CFG.media + f; }
  function comTxt() { var c = COM[S.com]; if (!c) return ""; return c.k === "Autre" && S.autre ? "Autre : " + S.autre : c.k; }

  /* Image dans le chat (si l'image manque, on montre une carte texte à la place) */
  function imgCard(file, caption) {
    return { html: '<div class="card"><img class="pic" alt="" src="' + M(file) + '">' +
      '<div class="ph" hidden><span>🖼️</span>' + caption + "</div>" +
      '<div class="pad">' + caption + "</div></div>",
      after: function (el) {
        var im = el.querySelector(".pic");
        im.onload = down;
        im.onerror = function () { im.remove(); el.querySelector(".ph").hidden = false; el.querySelector(".pad").hidden = true; };
      } };
  }
  function input(ph, label, min, cb) {
    dock.innerHTML = '<div class="in"><form class="form" id="wat-f"><input id="wat-i" maxlength="40" placeholder="' + ph + '">' +
      '<div class="msg" id="wat-m">Écris au moins ' + min + ' lettres 🙂</div><button class="opt main" type="submit">' + label + "</button></form></div>";
    var f = document.getElementById("wat-f"), i = document.getElementById("wat-i");
    f.onsubmit = function (e) {
      e.preventDefault();
      var v = i.value.replace(/\s+/g, " ").trim();
      if (v.length < min) { i.classList.add("err"); document.getElementById("wat-m").style.display = "block"; return; }
      i.blur(); clear(); me(v); setTimeout(function () { cb(v); }, 300);
    };
    down();
  }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  /* Jours proposés pour le rendez-vous : à partir de demain, sans le dimanche */
  var JN = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
  var MN = ["janv.", "févr.", "mars", "avril", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
  function jours() {
    var out = [], d = new Date();
    while (out.length < CFG.jours) {
      d.setDate(d.getDate() + 1);
      if (d.getDay() === 0) continue;
      out.push(JN[d.getDay()] + " " + d.getDate() + " " + MN[d.getMonth()]);
    }
    return out;
  }

  /* ===================== PARCOURS ===================== */
  if (/[?&](reset|test)/.test(location.search)) { S = {}; save(); }
  var arrived = false;
  function start() {
    prog(6);
    if (!arrived) { arrived = true; step("Arrivée"); px("ViewContent", { content_name: PROD }); }
    if (S.nom && S.clicWa) return retour();
    bot(["Bonjour 👋 Moi c'est <b>Aïcha</b>, l'assistante de <b>Willy Tiendré</b>.",
      "Les fêtes arrivent 🎄 C'est le moment où les gens achètent le plus. Si on ne te voit pas, ils vont acheter ailleurs.",
      "Dis-moi d'abord : tu as quel type de commerce ?"], function () {
      ask(COM.map(function (c) { return { t: c.t }; }), function (a, i) {
        S.com = i; save(); send({ type: "visit", step: "Commerce", com: comTxt() }); px("TunnelDemarre", {}, true);
        if (COM[i].k !== "Autre") return pub();
        bot(["D'accord ! Tu vends quoi ? Écris-le en 2 ou 3 mots 👇"], function () {
          input("Ex : pièces de moto, pagnes, cosmétiques…", "Continuer", 3, function (v) { S.autre = v; save(); send({ type: "visit", step: "Commerce", com: comTxt() }); pub(); });
        });
      });
    });
  }

  function pub() {
    prog(18);
    bot([COM[S.com].reac, "Tu fais déjà la pub sur Facebook ?"], function () {
      ask(PUB.map(function (o) { return { t: o.t }; }), function (a, i) {
        S.pub = i; save(); send({ type: "visit", step: "Pub", pub: PUB[i].k });
        bot(PUB[i].r.concat(["Regarde ce qu'on fait pour des commerces comme le tien 👇"]), preuve);
      });
    });
  }

  function preuve() {
    prog(30); step("Preuve vue");
    var c = COM[S.com];
    var vc = videoCard(M(c.vid + ".mp4"), M(c.vid + ".jpg"), { caption: c.vidCap, onStart: function () { step("Vidéo lancée"); px("VideoExemple", {}, true); } }), va = vc.after;
    vc.after = function (el) { va(el); el.querySelector("video").addEventListener("error", function () { el.querySelector(".card").innerHTML = '<div class="ph"><span>🎬</span>' + c.vidCap + "</div>"; }); };
    bot([imgCard(c.aff, c.affCap), vc, "Et après, Willy lance ta pub et la suit lui-même. Toi, tu reçois les clients sur WhatsApp 📲"], function () {
      ask([{ t: "C'est combien ? 👀", c: "main" }], offre);
    });
  }

  function offre() {
    prog(42); step("Offre vue"); px("OffreVue", {}, true);
    bot(["Voici l'<b>Offre spéciale fêtes</b> 👇", { html: '<div class="card"><div class="pad"><span class="tag">🎄 Spécial fêtes</span><h4>Pub clé en main · Willy Tiendré</h4>' +
      '<div class="recap"><div><span>🎬 2 vidéos pub</span><span>✅</span></div>' +
      '<div><span>🖼️ 3 affiches pro</span><span>✅</span></div>' +
      '<div><span>📢 Ta pub Facebook lancée et suivie pendant 7 jours</span><span>✅</span></div></div>' +
      '<div class="price"><b>' + fmt(CFG.prix) + '</b></div>' +
      '<div class="bonus"><span>⏱️ Prêt en 48 h</span><span>✏️ 1 correction offerte</span></div>' +
      '<p class="note">Le budget de la pub (l\'argent pour Facebook) est à part. C\'est toi qui choisis. On conseille à partir de ' + fmt(CFG.budgetMin) + '.</p></div></div>' },
      "⚠️ Seulement <b>" + CFG.places + " places</b>, jusqu'au " + CFG.fin + ". Willy veut bien faire le travail de chaque client."], function () {
      ask([{ t: "Ok ! Et le budget pub, je paie comment ? 💳", c: "main" }, { t: "J'ai une question", c: "soft" }], function (a, i) {
        if (i) return question(offre);
        carte();
      });
    });
  }

  function carte() {
    prog(52);
    bot(["Tu as une carte bancaire (Visa, carte Orange Money…) ?"], function () {
      ask([{ t: "💳 Oui, j'ai une carte" }, { t: "🙅🏾 Non, pas de carte" }], function (a, i) {
        S.carte = i ? "Pas de carte" : "A une carte"; save(); send({ type: "visit", step: "Budget pub", carte: S.carte });
        bot(i ? ["Pas de souci 👍 Tu envoies le budget pub à Willy par <b>Orange Money ou Moov</b>, et il le paie avec sa carte.", "Tu reçois les preuves de paiement de Facebook."]
          : ["Parfait 👍 Tu mets le budget sur ta carte, et Willy lance la pub avec.", "L'argent reste chez toi, tu vois tout ce qui est dépensé."], page);
      });
    });
  }

  function page() {
    prog(60);
    bot(["Ton commerce a déjà une page Facebook ?"], function () {
      ask([{ t: "Oui ✅" }, { t: "Non, pas encore" }], function (a, i) {
        S.page = i ? "Non" : "Oui"; save(); send({ type: "visit", step: "Page Facebook", page: S.page });
        bot([i ? "Pas grave, Willy t'aide à la créer 😉" : "Super ! Tu donneras juste l'accès à Willy pour lancer la pub, il t'explique comment.",
          "Pour le pack, c'est simple 🤝", { html: '<div class="card"><div class="pad"><div class="steps4">' +
          '<div><em>1</em><span>Tu paies <b>' + fmt(CFG.avance) + ' d\'avance</b> par Orange Money ou Moov.</span></div>' +
          '<div><em>2</em><span>Tu envoies tes photos, tes prix et ton logo.</span></div>' +
          '<div><em>3</em><span>En <b>48 h</b>, tu vois tes vidéos et tes affiches.</span></div>' +
          '<div><em>4</em><span>Ça te plaît ? Tu paies le reste (' + fmt(CFG.prix - CFG.avance) + ') et Willy lance ta pub.</span></div></div></div></div>' },
          "On en parle ensemble avant de commencer. Tu préfères comment ?"], rdv);
      });
    });
  }

  var RDV = [
    { t: "📞 Un appel de 15 min", k: "Appel" },
    { t: "🤝 Se rencontrer à Ouaga", k: "Rencontre" },
    { t: "💬 Juste sur WhatsApp", k: "WhatsApp" }
  ];
  function rdv() {
    prog(70);
    ask(RDV.map(function (o) { return { t: o.t }; }), function (a, i) {
      S.rdv = RDV[i].k; S.quand = ""; S.lieu = ""; save(); send({ type: "visit", step: "Rendez-vous", rdv: S.rdv });
      if (S.rdv === "WhatsApp") return bot(["D'accord, Willy t'écrit directement 👍"], contact);
      if (S.rdv === "Rencontre") return bot(["Pas de souci 🤝 Willy se déplace. Le déplacement est à <b>" + fmt(CFG.deplacement) + "</b>.", "Tu es dans quel quartier ?"], function () {
        input("Ex : Pissy, Ouaga 2000, Tampouy…", "Continuer", 3, function (v) { S.lieu = cap(v); save(); quand(); });
      });
      quand();
    });
  }

  function quand() {
    prog(78);
    if (CFG.agenda) {
      dock.innerHTML = '<div class="in"><div class="hint">👇 Choisis ton heure</div><a class="cta" id="wat-ag" href="' + CFG.agenda + '" target="_blank" rel="noopener">📅 Choisir mon jour et mon heure</a>' +
        '<button type="button" class="opt" id="wat-ok">C\'est fait ✅</button></div>';
      document.getElementById("wat-ag").onclick = function () { S.quand = "Agenda Google"; save(); send({ type: "visit", step: "Rendez-vous", quand: S.quand }); };
      document.getElementById("wat-ok").onclick = function () { clear(); me("C'est fait ✅"); setTimeout(contact, 300); };
      return bot([S.rdv === "Appel" ? "Choisis le moment de ton appel 👇" : "Choisis le moment de la rencontre 👇"], down);
    }
    var J = jours();
    bot(["Quel jour t'arrange ?"], function () {
      ask(J, function (j) {
        bot(["Et à quelle heure ?"], function () {
          ask(CFG.heures, function (h) {
            S.quand = j + " à " + h; save(); send({ type: "visit", step: "Rendez-vous", quand: S.quand });
            bot(["Noté : <b>" + esc(S.quand) + "</b> 🗓️ Willy te confirme sur WhatsApp."], contact);
          });
        });
      });
    });
  }

  function contact() {
    prog(86); px("InitiateCheckout", { value: CFG.prix, currency: "XOF" });
    bot(["Dernière chose : ton prénom, le nom de ton commerce et ton numéro WhatsApp 👇"], function () {
      dock.innerHTML = '<div class="in"><form class="form" id="wat-c">' +
        '<input name="nom" maxlength="40" autocomplete="given-name" placeholder="Ton prénom">' +
        '<input name="ent" maxlength="50" placeholder="Nom de ton commerce (facultatif)">' +
        '<div class="tel"><input name="tel" type="tel" inputmode="tel" autocomplete="tel" placeholder="Ton numéro WhatsApp (ex : 70 00 00 00)"></div>' +
        '<div class="msg">Mets ton prénom et un numéro de 8 chiffres 🙂</div>' +
        '<button class="opt main" type="submit">Continuer</button></form></div>';
      var f = document.getElementById("wat-c");
      f.onsubmit = function (e) {
        e.preventDefault();
        var nom = f.nom.value.replace(/\s+/g, " ").trim(), d = f.tel.value.replace(/\D/g, "").replace(/^(00)?226/, "");
        var okN = nom.length >= 2, okT = d.length === 8;
        f.nom.classList.toggle("err", !okN); f.tel.classList.toggle("err", !okT); f.querySelector(".msg").style.display = okN && okT ? "none" : "block";
        if (!okN || !okT) return;
        S.nom = cap(nom); S.ent = f.ent.value.replace(/\s+/g, " ").trim(); S.tel = d.replace(/(\d{2})(?=\d)/g, "$1 "); save();
        clear(); me(S.nom + (S.ent ? " · " + S.ent : "") + " · " + S.tel);
        send({ type: "lead", step: "Numéro donné", nom: S.nom, ent: S.ent, tel: S.tel, rdv: S.rdv, quand: S.quand, lieu: S.lieu, carte: S.carte, page: S.page, pub: (PUB[S.pub] || {}).k });
        px("Lead", { value: CFG.prix, currency: "XOF" });
        setTimeout(final, 300);
      };
      down();
    });
  }

  function rdvTxt() {
    if (S.rdv === "Appel") return "Appel" + (S.quand ? " : " + S.quand : "");
    if (S.rdv === "Rencontre") return "Rencontre" + (S.lieu ? " à " + S.lieu : "") + (S.quand ? ", " + S.quand : "");
    return "Sur WhatsApp";
  }
  function msgWa() {
    var c = COM[S.com] || COM[3], phr = c.phr;
    if (c.k === "Autre" && S.autre) phr = "un commerce (" + S.autre + ")";
    return "Bonjour Willy, je suis " + S.nom + (S.ent ? " de " + S.ent : "") + ", j'ai " + phr + ". Je veux l'offre fêtes à 15 000 F (2 vidéos + 3 affiches + pub). " +
      "Rendez-vous : " + rdvTxt() + ". " + (S.carte === "Pas de carte" ? "Je n'ai pas de carte bancaire." : "J'ai une carte bancaire.");
  }
  function final() {
    prog(96); step("Récap vu");
    var lignes = '<div><span>Offre fêtes (2 vidéos + 3 affiches + pub 7 jours)</span><span>' + fmt(CFG.prix) + '</span></div>';
    if (S.rdv === "Rencontre") lignes += '<div><span>Déplacement à Ouaga</span><span>' + fmt(CFG.deplacement) + '</span></div>';
    lignes += '<div><span>Après avoir vu ton travail</span><span>' + fmt(CFG.prix - CFG.avance) + '</span></div>' +
      '<div><span>À payer aujourd\'hui (avance)</span><span>' + fmt(CFG.avance) + '</span></div></div>' +
      '<p class="note">🗓️ Rendez-vous : <b>' + esc(rdvTxt()) + '</b><br>📢 Budget pub à part : à partir de ' + fmt(CFG.budgetMin) + '</p>';
    bot(["Merci <b>" + esc(S.nom) + "</b> 🙏 Voici ton récap 👇", { html: '<div class="card"><div class="pad"><div class="recap">' + lignes + '</div></div>' },
      "Touche le bouton pour réserver ta place. Ton message est déjà écrit, tu as juste à l'envoyer 👇"], cta);
  }
  function cta() {
    var url = "https://wa.me/" + CFG.wa + "?text=" + encodeURIComponent(msgWa());
    dock.innerHTML = '<div class="in"><div class="hint">👇 Touche ici</div><a class="cta wa" id="wat-go" href="' + url + '" target="_blank" rel="noopener">' + WAI + "Réserver ma place sur WhatsApp</a>" +
      '<div class="safe">🔒 Tu paies l\'avance seulement après avoir parlé avec Willy</div></div>';
    document.getElementById("wat-go").onclick = function () {
      S.clicWa = 1; save(); send({ type: "visit", step: "Clic WhatsApp" }); px("Contact");
      if (!S.done) { S.done = 1; setTimeout(function () { bot(["Top 🎉 Willy va te répondre pour confirmer ton rendez-vous.", "À tout de suite sur WhatsApp 👋🏾"]); }, 1200); }
    };
    down();
  }

  function question(back) {
    var url = "https://wa.me/" + CFG.wa + "?text=" + encodeURIComponent("Bonjour Willy, j'ai une question sur l'offre fêtes à 15 000 F : ");
    dock.innerHTML = '<div class="in"><a class="cta wa" id="wat-q" href="' + url + '" target="_blank" rel="noopener">' + WAI + "Poser ma question à Willy</a>" +
      '<button type="button" class="link" id="wat-back">Revenir à l\'offre</button></div>';
    document.getElementById("wat-q").onclick = function () { step("Question WhatsApp"); px("Contact"); };
    document.getElementById("wat-back").onclick = function () { clear(); back(); }; down();
  }

  function retour() {
    prog(90);
    bot(["Re-bonjour <b>" + esc(S.nom) + "</b> 👋", "Tu as pu envoyer ton message à Willy sur WhatsApp ?"], function () {
      ask([{ t: "Renvoyer mon message", c: "main" }, { t: "Revoir l'offre" }, { t: "🔄 Recommencer depuis le début" }], function (a, i) {
        if (i === 0) return bot(["Voilà 👇"], cta);
        if (i === 1) return offre();
        S = {}; save(); list.innerHTML = ""; lastWho = ""; start();
      });
    });
  }

  start();
