  /* ===================== CONTENU ===================== */
  var COM = [
    { t: "👗 Boutique / vêtements", k: "Boutique", phr: "une boutique de vêtements",
      reac: "Ah, les habits ! Ça part vite quand c'est bien montré 👌",
      aff: "affiche-faso-style.jpg", affCap: "Affiche pour <b>Faso Style</b> (boutique de vêtements)",
      vid: "spot-poulet-braise.mp4", vidPoster: "spot-poulet-braise.jpg", vidCap: "Spot pub pour un maquis. Pour toi, ce sera tes habits 👗" },
    { t: "🍗 Restaurant / maquis", k: "Maquis", phr: "un restaurant / maquis",
      reac: "Ah, un maquis ! Les gens mangent avec les yeux d'abord 😄",
      aff: "affiche-maquis-baobab.jpg", affCap: "Affiche pour le <b>Maquis Le Baobab</b>",
      vid: "spot-poulet-braise.mp4", vidPoster: "spot-poulet-braise.jpg", vidCap: "Spot pub <b>poulet braisé</b> 🍗" },
    { t: "💇🏾‍♀️ Salon / beauté", k: "Salon", phr: "un salon de beauté",
      reac: "Un salon, super ! La beauté, ça se voit d'abord 💅🏾",
      aff: "affiche-belle-afro.jpg", affCap: "Affiche pour le <b>Salon Belle Afro</b>",
      vid: "ugc-salon-coiffure.mp4", vidPoster: "ugc-salon-coiffure.jpg", vidCap: "Vidéo UGC pour un <b>salon de coiffure</b> : une cliente parle du salon, comme une vraie 😉" },
    { t: "🛍️ Autre commerce", k: "Autre", phr: "un commerce",
      reac: "Très bien, c'est noté 👍",
      aff: "affiche-faso-style.jpg", affCap: "Affiche pour <b>Faso Style</b>",
      vid: "spot-poulet-braise.mp4", vidPoster: "spot-poulet-braise.jpg", vidCap: "Spot pub pour un maquis. Pour toi, ce sera tes produits 🛍️" }
  ];
  var SOUCI = [
    { t: "😟 Pas assez de clients", k: "Clients", r: ["Je comprends. Souvent, ce n'est pas ton produit le problème. C'est que les gens ne te voient pas.", "Avec une vidéo pub et de belles affiches, on te voit partout : Facebook, TikTok, statuts WhatsApp 📲"] },
    { t: "📷 Mes photos ne font pas pro", k: "Photos", r: ["Beaucoup de commerçants sont comme toi.", "Aujourd'hui, avec l'IA, on fait des visuels pro <b>à partir de tes simples photos de téléphone</b> 📱✨"] },
    { t: "📢 Je ne sais pas faire de pub", k: "Pub", r: ["Pas de souci, c'est notre travail 😉", "Tu n'as rien à filmer, rien à monter. On te donne tout, prêt à poster."] },
    { t: "🌐 Je veux un site", k: "Site", r: ["Bonne idée ! Une page web, c'est ta vitrine ouverte jour et nuit.", "Le client voit tes produits, tes prix, et il t'écrit direct sur WhatsApp."] }
  ];
  function M(f) { return CFG.media + f; }

  /* Image dans le chat (si l'image manque, on montre une carte texte à la place) */
  function imgCard(file, caption, opts) {
    opts = opts || {};
    return { html: '<div class="card"><img class="pic" alt="" src="' + M(file) + '">' +
      '<div class="ph" hidden><span>🖼️</span>' + caption + "</div>" +
      '<div class="pad">' + caption + (opts.link ? '<br><a class="lnk" href="' + opts.link + '" target="_blank" rel="noopener">Ouvrir la page 👉</a>' : "") + "</div></div>",
      after: function (el) {
        var im = el.querySelector(".pic");
        im.onload = down;
        im.onerror = function () { im.remove(); el.querySelector(".ph").hidden = false; el.querySelector(".pad").hidden = true; };
      } };
  }
  function input(ph, label, min, cb) {
    dock.innerHTML = '<div class="in"><form class="form" id="wat-f"><input id="wat-i" maxlength="40" autocomplete="given-name" placeholder="' + ph + '">' +
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

  /* ===================== PARCOURS ===================== */
  function start() {
    prog(6); step("Arrivée"); px("ViewContent", { content_name: PROD });
    if (S.nom && S.clicWa) return retour();
    bot(["Bonjour 👋 Moi c'est <b>Aïcha</b>, l'assistante de <b>Willy Tiendré</b>.",
      "Tu as vu le <b>Pack Pro à 10 000 F</b> ? Je vais te montrer en 1 minute ce qu'on peut faire pour toi.",
      "D'abord, dis-moi : tu as quel type de commerce ?"], function () {
      ask(COM.map(function (c) { return { t: c.t }; }), function (a, i) {
        S.com = i; save(); step("Commerce"); send({ type: "visit", step: "Commerce", zone: COM[i].k }); px("TunnelDemarre", {}, true);
        if (COM[i].k !== "Autre") return souci();
        bot(["D'accord ! Tu vends quoi ? Écris-le en 2 ou 3 mots 👇"], function () {
          input("Ex : pièces de moto, pagnes, cosmétiques…", "Continuer", 3, function (v) { S.autre = v; save(); send({ type: "visit", step: "Commerce", zone: "Autre : " + v }); souci(); });
        });
      });
    });
  }

  function souci() {
    prog(22);
    var c = COM[S.com];
    bot([c.reac, "Et aujourd'hui, c'est quoi ton <b>plus gros souci</b> ?"], function () {
      ask(SOUCI.map(function (o) { return { t: o.t }; }), function (a, i) {
        S.souci = i; save(); send({ type: "visit", step: "Souci", veut: SOUCI[i].k });
        bot(SOUCI[i].r.concat(["Regarde ce qu'on a fait pour un commerce comme le tien 👇"]), preuve);
      });
    });
  }

  function preuve() {
    prog(38); step("Preuve vue");
    var c = COM[S.com];
    var vc = videoCard(M(c.vid), M(c.vidPoster), { caption: c.vidCap, onStart: function () { step("Vidéo lancée"); px("VideoExemple", {}, true); } }), va = vc.after;
    vc.after = function (el) { va(el); el.querySelector("video").addEventListener("error", function () { el.querySelector(".card").innerHTML = '<div class="ph"><span>🎬</span>' + c.vidCap + "</div>"; }); };
    bot([imgCard(c.aff, c.affCap), vc,
      "Tout ça, c'est fait et livré en <b>48 h</b> ⏱️"], function () {
      ask([{ t: "Waouh ! C'est combien ? 👀", c: "main" }, { t: "Voir aussi une page web 🌐" }], function (a, i) {
        if (!i) return offre();
        bot([imgCard("page-web-baobab.jpg", "La page web du <b>Maquis Le Baobab</b> : le menu, les prix, et un bouton pour commander sur WhatsApp.", { link: CFG.pageWeb }),
          "Ton commerce aura la sienne, à ton nom 😊"], function () {
          ask([{ t: "Ok, c'est combien ? 👀", c: "main" }], offre);
        });
      });
    });
  }

  function offre() {
    prog(55); step("Offre vue"); px("OffreVue", {}, true);
    bot(["Voici le <b>Pack Pro</b> 👇", { html: '<div class="card"><div class="pad"><span class="tag">Prix de lancement</span><h4>Pack Pro · Willy Tiendré</h4>' +
      '<div class="recap"><div><span>🎬 1 spot pub vidéo<br>🤳🏾 1 vidéo UGC</span><span><s>45 000 F</s></span></div>' +
      '<div><span>🖼️ 5 affiches pro</span><span><s>15 000 F</s></span></div>' +
      '<div><span>🌐 1 page web pour ton commerce</span><span><s>20 000 F</s></span></div>' +
      '<div><span>Valeur totale</span><span><s>80 000 F</s></span></div></div>' +
      '<div class="price"><b>' + fmt(CFG.prix) + '</b><s>' + fmt(CFG.valeur) + '</s></div>' +
      '<div class="bonus"><span>⏱️ Livré en 48 h</span><span>✏️ 1 correction offerte</span></div>' +
      '<p class="note">Vidéo UGC = une personne qui parle de ton commerce face caméra, comme une vraie cliente.</p></div></div>' },
      "⚠️ Ce prix est seulement pour les <b>100 premières places</b>."], function () {
      ask([{ t: "Et je paie comment ? 💸", c: "main" }], paiement);
    });
  }

  function paiement() {
    prog(68); step("Paiement vu");
    bot(["Ici, c'est <b>zéro risque</b> pour toi 🤝", { html: '<div class="card"><div class="pad"><h4>Comment ça se passe</h4><div class="steps4">' +
      '<div><em>1</em><span>Tu paies <b>5 000 F d\'avance</b> par Orange Money ou Moov.</span></div>' +
      '<div><em>2</em><span>Tu nous envoies tes infos et tes photos.</span></div>' +
      '<div><em>3</em><span>En <b>48 h</b>, tu vois tout ton travail fini, avec notre nom écrit dessus en transparence.</span></div>' +
      '<div><em>4</em><span>Ça te plaît ? Tu paies les <b>5 000 F restants</b> et tu reçois tous tes fichiers.</span></div></div></div></div>' },
      "Tu vois le travail <b>avant</b> de payer le reste.", "1 correction est offerte. Les suivantes sont à 2 000 F."], function () {
      objections();
    });
  }

  var OBJ = [
    { t: "🤔 C'est trop beau pour être vrai", k: "Trop beau", r: [
      "Je comprends 😅 Il y a beaucoup d'arnaques sur internet.",
      "Mais voilà pourquoi c'est possible : Willy travaille avec l'<b>intelligence artificielle</b>. Ce qui prenait une semaine à une équipe, il le fait en quelques heures. Donc le prix baisse.",
      "Et tu ne risques rien : tu paies seulement 5 000 F, et tu vois tout le travail fini <b>avant</b> de payer le reste.",
      "Les exemples que tu as vus, c'est notre travail 💯"] },
    { t: "📷 Je n'ai pas de belles photos", k: "Pas de photos", r: [
      "Pas de problème ! Les photos de ton téléphone suffisent 📱",
      "Tes produits, ta boutique, ton équipe… même si ce n'est pas parfait. L'IA s'occupe de rendre ça pro ✨",
      "Et si tu ne sais pas quoi prendre, Willy te dit sur WhatsApp quoi photographier. 5 minutes, c'est fini."] }
  ];
  function objections(seen) {
    seen = seen || {};
    prog(78);
    var opts = [], map = [];
    OBJ.forEach(function (o, i) { if (!seen[i]) { opts.push({ t: o.t }); map.push(i); } });
    opts.push({ t: "✅ Je suis prêt(e) !", c: "main" }); map.push("ok");
    if (Object.keys(seen).length) { opts.push({ t: "💬 J'ai une autre question", c: "soft" }); map.push("q"); }
    bot([Object.keys(seen).length ? "Autre chose qui te bloque ?" : "Tu as une question avant de commencer ? 👇"], function () {
      ask(opts, function (a, i) {
        var x = map[i];
        if (x === "ok") return prenom();
        if (x === "q") return question();
        seen[x] = 1; send({ type: "visit", step: "Objection", veut: OBJ[x].k });
        bot(OBJ[x].r, function () { objections(seen); });
      });
    });
  }

  function question() {
    var url = "https://wa.me/" + CFG.wa + "?text=" + encodeURIComponent("Bonjour Willy, j'ai une question sur le Pack Pro à 10 000 F : ");
    dock.innerHTML = '<div class="in"><a class="cta wa" id="wat-q" href="' + url + '" target="_blank" rel="noopener">' + WAI + "Poser ma question à Willy</a>" +
      '<button type="button" class="link" id="wat-back">Revenir à l\'offre</button></div>';
    document.getElementById("wat-q").onclick = function () { step("Question WhatsApp"); px("Contact"); };
    document.getElementById("wat-back").onclick = function () { clear(); objections({ 0: 1, 1: 1 }); }; down();
  }

  function prenom() {
    prog(88); step("Prêt"); px("InitiateCheckout", { value: CFG.prix, currency: "XOF" });
    bot(["Super ! 🎉", "C'est quoi ton prénom ? Comme ça, Willy sait qui lui écrit 😊"], function () {
      input("Ton prénom", "Continuer", 2, function (v) {
        S.nom = cap(v); save(); send({ type: "visit", step: "Prénom donné", jour: S.nom }); px("Lead", { value: CFG.prix, currency: "XOF" });
        final();
      });
    });
  }

  function msgWa() {
    var c = COM[S.com] || COM[3], phr = c.phr;
    if (c.k === "Autre" && S.autre) phr = "un commerce (" + S.autre + ")";
    return "Bonjour Willy, je suis " + S.nom + ", j'ai " + phr + ". Je veux le pack à 10 000 F.";
  }
  function final() {
    prog(96);
    bot(["Merci <b>" + esc(S.nom) + "</b> 🙏", { html: '<div class="card"><div class="pad"><div class="recap">' +
      '<div><span>Pack Pro</span><span>' + fmt(CFG.prix) + '</span></div>' +
      '<div><span>Aujourd\'hui (avance)</span><span>5 000 F</span></div>' +
      '<div><span>Après avoir vu ton travail</span><span>5 000 F</span></div></div></div></div>' },
      "Dernière étape : touche le bouton vert. Ton message est déjà écrit, tu as juste à l'envoyer 👇"], cta);
  }
  function cta() {
    var url = "https://wa.me/" + CFG.wa + "?text=" + encodeURIComponent(msgWa());
    dock.innerHTML = '<div class="in"><div class="hint">👇 Touche ici</div><a class="cta wa" id="wat-go" href="' + url + '" target="_blank" rel="noopener">' + WAI + "Écrire à Willy sur WhatsApp</a>" +
      '<div class="safe">🔒 Tu paies l\'avance seulement après avoir parlé avec Willy</div></div>';
    document.getElementById("wat-go").onclick = function () {
      S.clicWa = 1; save(); send({ type: "visit", step: "Clic WhatsApp", jour: S.nom }); px("Contact");
      if (!S.done) { S.done = 1; setTimeout(function () { bot(["Top 🎉 Willy va te répondre avec le numéro Orange Money / Moov pour l'avance.", "À tout de suite sur WhatsApp 👋🏾"]); }, 1200); }
    };
    down();
  }

  function retour() {
    prog(90);
    bot(["Re-bonjour <b>" + esc(S.nom) + "</b> 👋", "Tu as pu envoyer ton message à Willy sur WhatsApp ?"], function () {
      ask([{ t: "Renvoyer mon message", c: "main" }, { t: "Revoir l'offre" }, { t: "J'ai une question", c: "soft" }], function (a, i) {
        if (i === 0) return bot(["Voilà 👇"], cta);
        if (i === 1) return offre();
        question();
      });
    });
  }

  start();
