# Construit tunnels/pack-pro-willy.html (à coller dans un bloc « Code HTML » Systeme.io)
# et essai/pack-pro.html (page d'essai sur Vercel, rien n'est envoyé au Sheet).
# Usage : python3 tunnels/pack-pro-media/build.py   (depuis la racine du repo)
import os
H=os.path.dirname(os.path.abspath(__file__)); R=os.path.dirname(os.path.dirname(H))
src=open(os.path.join(R,'tunnels/will-academy-chat.src.html')).read()
css=src[src.index('<style>'):src.index('</style>')]
tools=src[src.index('  /* ---------- Outils du chat ---------- */'):src.index('  /* ===================== PARCOURS')]
flow=open(os.path.join(H,'flow.js')).read()
AV="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Ccircle cx='32' cy='32' r='32' fill='%2322C32A'/%3E%3Ctext x='32' y='43' font-family='Arial' font-weight='700' font-size='30' fill='%2306301F' text-anchor='middle'%3EA%3C/text%3E%3C/svg%3E"
extra='''#wa-tunnel .card .pic{display:block;width:min(300px,72vw);height:auto;background:#ddd}
#wa-tunnel .card .ph{width:min(300px,72vw);padding:22px 16px;text-align:center;background:linear-gradient(135deg,#0B4A36,#16881F);color:#fff;font-size:14px}
#wa-tunnel .card .ph span{display:block;font-size:30px;margin-bottom:6px}
#wa-tunnel .card .ph b{color:#fff}
#wa-tunnel .card .note{margin:8px 0 0;font-size:12.5px;color:var(--mut)}
#wa-tunnel .lnk{color:var(--wa);font-weight:700}
#wa-tunnel .steps4 em{font-weight:800;color:var(--gr-d)}
#wa-tunnel .price{margin-top:10px}
#wa-tunnel .recap span:last-child{white-space:nowrap}
'''
head='''<!-- ============================================================
  Tunnel « Pack Pro 10 000 F » — chat avec Aïcha (assistante de Willy Tiendré)
  À coller dans UN bloc « Code HTML » d'une page Systeme.io. Plein écran sur téléphone.
  Source : tunnels/pack-pro-media/flow.js → build : python3 tunnels/pack-pro-media/build.py
  Médias : déposer les fichiers dans media/pack-pro/ (voir README.md du dossier).
============================================================= -->
'''
body='''<div id="wa-tunnel" role="main" aria-label="Discussion avec Aïcha, assistante de Willy Tiendré">
  <div class="top">
    <img src="__AV__" alt="Aïcha">
    <div class="who"><b>Aïcha · Willy Tiendré</b><small><i></i>en ligne</small></div>
  </div>
  <div class="prog"><i id="wat-prog"></i></div>
  <div class="chat" id="wat-chat"><div class="wrap" id="wat-list"></div></div>
  <div class="dock" id="wat-dock"></div>
</div>
'''
js='''<script>
(function () {
  /* ===================== RÉGLAGES ===================== */
  var CFG = {
    prix: 10000, valeur: 80000,
    wa: "22672019524",
    media: "https://willshop-app.vercel.app/media/pack-pro/",
    pageWeb: "",            /* lien de la page web du Maquis Le Baobab (laisser vide = pas de bouton) */
    pixel: "1530587975198974",
    sheet: "https://script.google.com/macros/s/AKfycbxIaukPzsovSA39TKZa9FsETNUr4nGKl7N0KAHO2qWSqP1bmPygGyc98NEeLXJ06JEV/exec"
  };
  var AV = "__AV__", PROD = "Pack Pro 10 000";
  /* Suivi seulement sur la vraie page (pas en aperçu, pas avec ?test) */
  var LIVE = /systeme\\.io$/.test(location.hostname) && !/[?&]test/.test(location.search);
  /* ==================================================== */
  var root = document.getElementById("wa-tunnel"); if (!root) return;
  document.body.classList.add("wat-on");
  var chat = document.getElementById("wat-chat"), list = document.getElementById("wat-list"), dock = document.getElementById("wat-dock");
  var S = {}, SID;
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  SID = store("pp_sid"); if (!SID) { SID = "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); store("pp_sid", SID); }
  try { S = JSON.parse(store("pp_s") || "{}") || {}; } catch (e) { S = {}; }
  function save() { store("pp_s", JSON.stringify(S)); }
  /* Pixel Facebook : installé ici seulement s'il n'est pas déjà sur la page */
  if (LIVE && CFG.pixel && !window.fbq) {
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    window.fbq("init", CFG.pixel); window.fbq("track", "PageView");
  }
  /* ---------- Suivi : Sheet (onglet Visites) + Pixel ---------- */
  function send(o) {
    if (!LIVE) return;
    try {
      o.sid = SID; o.produit = PROD; if (!o.zone && S.com != null) o.zone = (COM[S.com] || {}).k || "";
      var d = JSON.stringify(o);
      if (!(navigator.sendBeacon && navigator.sendBeacon(CFG.sheet, d))) fetch(CFG.sheet, { method: "POST", mode: "no-cors", body: d, keepalive: true });
    } catch (e) {}
  }
  function step(s) { send({ type: "visit", step: s }); }
  function px(ev, data, custom) { if (!LIVE) return; try { var f = window.fbq; if (f) f(custom ? "trackCustom" : "track", ev, data || {}); } catch (e) {} }

'''
out=head+css+extra+'</style>\n\n'+body+'\n'+js+tools+flow+'})();\n</script>\n'
out=out.replace('__AV__',AV)
assert '__' not in out.replace('__proto__',''), 'placeholder'
assert 'src=""' not in out
open(os.path.join(R,'tunnels/pack-pro-willy.html'),'w').write(out)
essai='<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Essai · Pack Pro</title></head><body style="margin:0">\n'+out+'</body></html>\n'
open(os.path.join(R,'essai/pack-pro.html'),'w').write(essai)
print('pack-pro-willy.html', len(out), 'caractères')
