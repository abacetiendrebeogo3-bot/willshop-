# Montage des vidéos du tunnel Kit Minceur v2 (une vidéo par étape : illustrations + Awa, incrustations, sous-titres).
# Usage : python3 build_kit_v2.py <dossier_brut>   (le dossier contient A1.mp4… et 1a.mp4…, voir SCRIPT_AWA.md)
# Sortie : media/kit-v2/etapeN.mp4 + etapeN.jpg + captions.json (minutage des paroles dans la vidéo finale)
import subprocess, sys, os, json, tempfile
from PIL import Image, ImageDraw, ImageFont

SRC = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT = os.path.join(ROOT, "media", "kit-v2")
LOGO = os.path.join(ROOT, "icons", "icon-192.png")
W, H = 540, 960
FONT = "/usr/share/fonts/truetype/google-fonts/Poppins-Bold.ttf"
EMOJI = "/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf"
os.makedirs(OUT, exist_ok=True)
TMP = tempfile.mkdtemp()

# Couleurs des étiquettes
YEL, RED, GRN, WHT = ("#FFD400", "#111"), ("#E53935", "#fff"), ("#22C32A", "#fff"), ("#ffffff", "#111")

# Une étape = liste de plans. Plan = (clip, début, fin, vitesse, [paroles (t0, t1, texte)], [étiquettes (t0, t1, texte, couleur, y%)])
# Les temps sont relatifs au plan source (avant vitesse). *mot* = surligné en vert dans les sous-titres.
TOP, LOW = 0.10, 0.66
STEPS = {
 "etape1": [
  ("1a", 1.5, 4.5, 1, [], [(1.5, 4.5, "BALLONNÉ ?", RED, TOP)]),
  ("1b", 1.5, 4.5, 1, [], [(1.5, 4.5, "TROP SERRÉ", RED, TOP)]),
  ("1c", 2.5, 5.5, 1, [], [(2.5, 5.5, "⚖️", WHT, 0.60)]),
  ("A1", 0, 8.04, 1, [(0.45, 1.24, "Tu manges un peu,"), (1.64, 2.51, "et ton ventre *gonfle*."),
                      (3.23, 5.37, "Tes habits te *serrent*, tu as pris beaucoup de *poids*…"),
                      (5.75, 6.63, "tu te sens *lourd*."), (7.15, 8.04, "C'est *ton cas* ?")], []),
 ],
 "etape2": [
  ("2a", 2.0, 5.5, 1, [], [(2.0, 5.5, "💸 ARGENT PERDU", RED, TOP), (3.0, 5.5, "❌❌❌", None, 0.24)]),
  ("A2", 0, 8.04, 1, [(0.75, 3.19, "Tisanes, régimes, produits du *marché*…"), (3.42, 4.32, "Tu as *tout essayé*."),
                      (4.68, 5.30, "Tu as *payé*,"), (5.58, 6.77, "mais ton ventre est *toujours là*."), (7.18, 7.72, "C'est vrai ?")], []),
 ],
 "etape3": [
  ("3a", 0, 8.04, 2, [], []),
  ("A3", 0, 8.04, 1, [(0.43, 1.27, "Ce n'est *pas ta faute*."), (2.24, 4.33, "Ton ventre garde trop d'*eau* et de *déchets*,"),
                      (4.54, 5.52, "c'est pour ça qu'il *gonfle*."), (6.56, 7.61, "Il faut d'abord le *vider*.")],
                     [(0.43, 2.2, "✅ CE N'EST PAS TA FAUTE", GRN, LOW)]),
 ],
 "etape4": [
  ("A4", 0, 8.04, 1, [(0.43, 1.30, "Voici le *Kit Minceur*."), (1.43, 2.32, "Le *thé* le matin,"),
                      (2.57, 4.02, "une *gélule* le matin et le soir,"), (4.41, 5.47, "pendant *28 jours*."),
                      (5.87, 6.79, "Ton ventre *dégonfle*,"), (7.02, 8.04, "tu te sens *léger*…")],
                     [(4.41, 8.04, "📅 28 JOURS", YEL, LOW)]),
  ("4a", 3.5, 7.0, 1, [], [(3.5, 7.0, "VENTRE PLAT", GRN, TOP)]),
  ("4b", 2.0, 5.5, 1, [], [(2.0, 5.5, "LÉGER", GRN, TOP)]),
 ],
 "etape5": [
  ("A5", 1.2, 8.04, 1, [(2.07, 4.20, "Regarde les *messages* de mes clients."), (5.27, 6.46, "Des *femmes* et des *hommes*,"),
                        (6.78, 7.60, "ici à *Ouaga*.")],
                       [(2.07, 8.04, "⭐ ILS ONT TESTÉ", YEL, TOP), (4.2, 8.04, "img:media/avis1.webp", None, 0.40),
                        (5.27, 8.04, "img:media/avis3.webp", None, 0.55), (6.46, 8.04, "img:media/avis2.webp", None, 0.71)]),
 ],
 "etape6": [
  ("A6", 0, 8.04, 1, [(0.80, 1.80, "Avant, c'était *8 000 F*."), (2.75, 4.42, "Aujourd'hui, seulement *6 500 F*."),
                      (5.19, 7.46, "Et la livraison, *1 000 F*, partout où tu es.")],
                     [(0.80, 2.75, "~8 000 F", WHT, LOW), (2.75, 5.19, "6 500 F", GRN, LOW), (5.19, 8.04, "🛵 LIVRAISON 1 000 F", YEL, LOW)]),
  ("A6b", 0, 8.04, 1, [(0.12, 0.87, "Hors de *Ouaga* ?"), (1.18, 2.25, "On t'expédie par *STAF*,"), (2.50, 3.60, "*TSR*, *Rahimo*,"),
                       (3.75, 4.98, "ou la compagnie de *ton choix*."), (5.63, 6.95, "Frais d'expédition : *1 000 F*,"),
                       (7.12, 8.04, "partout au *Burkina*.")],
                      [(1.18, 8.04, "🚌 EXPÉDITION 1 000 F", YEL, LOW), (7.12, 8.04, "PARTOUT AU BURKINA", GRN, TOP)]),
  ("6a", 3.5, 8.04, 1, [], [(3.5, 8.04, "TOTAL 7 500 F", YEL, TOP), (4.3, 8.04, "⏳ PROMO CETTE SEMAINE · STOCK LIMITÉ", RED, 0.20)]),
 ],
}

def label_png(text, color, path):
    """Étiquette arrondie (texte + émojis en couleur) ou émoji seul en grand."""
    if text.startswith("img:"):  # capture d'avis WhatsApp sur fond blanc arrondi
        im = Image.open(os.path.join(ROOT, text[4:])).convert("RGBA")
        r = 440 / im.width; im = im.resize((440, int(im.height * r)), Image.LANCZOS)
        c = Image.new("RGBA", (im.width + 20, im.height + 20), (0, 0, 0, 0))
        ImageDraw.Draw(c).rounded_rectangle((6, 6, c.width - 1, c.height - 1), radius=16, fill=(0, 0, 0, 90))
        ImageDraw.Draw(c).rounded_rectangle((0, 0, c.width - 7, c.height - 7), radius=16, fill="#ffffff")
        c.alpha_composite(im, (7, 7)); c.save(path); return
    strike = text.startswith("~")  # « ~texte » = prix barré
    text = text.lstrip("~")
    f = ImageFont.truetype(FONT, 46)
    fe = ImageFont.truetype(EMOJI, 109)
    parts = []  # (texte, est_emoji)
    for ch in text:
        emo = ord(ch) > 0x2000 and ch not in "…É"
        if ch == "️":
            continue
        if parts and parts[-1][1] == emo:
            parts[-1] = (parts[-1][0] + ch, emo)
        else:
            parts.append((ch, emo))
    imgs = []
    for t, emo in parts:
        if emo:
            for c in t:
                im = Image.new("RGBA", (136, 128), (0, 0, 0, 0))
                ImageDraw.Draw(im).text((0, 0), c, font=fe, embedded_color=True)
                im = im.crop(im.getbbox())
                s = (130 if len(parts) == 1 else 54) / im.height
                imgs.append(im.resize((int(im.width * s), int(im.height * s)), Image.LANCZOS))
        else:
            t = t.strip()
            if not t:
                continue
            bb = f.getbbox(t)
            im = Image.new("RGBA", (bb[2] + 4, 64), (0, 0, 0, 0))
            ImageDraw.Draw(im).text((2, 2), t, font=f, fill=color[1] if color else "#fff")
            imgs.append(im)
    gap = 12
    cw = sum(i.width for i in imgs) + gap * (len(imgs) - 1)
    ch = max(i.height for i in imgs)
    pad = (30, 16) if color else (8, 8)
    canvas = Image.new("RGBA", (cw + 2 * pad[0] + 8, ch + 2 * pad[1] + 8), (0, 0, 0, 0))
    d = ImageDraw.Draw(canvas)
    if color:
        d.rounded_rectangle((8, 8, canvas.width - 1, canvas.height - 1), radius=22, fill=(0, 0, 0, 90))  # ombre
        d.rounded_rectangle((0, 0, canvas.width - 9, canvas.height - 9), radius=22, fill=color[0])
    x = pad[0]
    for i in imgs:
        canvas.alpha_composite(i, (x, pad[1] + (ch - i.height) // 2))
        x += i.width + gap
    if strike:
        d.line((pad[0] - 6, canvas.height // 2 - 4, canvas.width - pad[0] - 2, canvas.height // 2 - 4), fill="#E53935", width=7)
    if canvas.width > W - 30:  # trop large : on réduit
        r = (W - 30) / canvas.width
        canvas = canvas.resize((int(canvas.width * r), int(canvas.height * r)), Image.LANCZOS)
    canvas.save(path)

def ts(t):
    return "%d:%02d:%05.2f" % (int(t // 3600), int(t % 3600 // 60), t % 60)

def ass_text(txt):
    import re
    txt = re.sub(r"(\d) (\d{3}) F", r"\1\\h\2\\hF", txt)  # « 1 000 F » jamais coupé
    out, green = "", False
    for part in txt.split("*"):
        out += (r"{\c&H2AC322&}" if green else r"{\c&HFFFFFF&}") + part
        green = not green
    return r"{\fscx70\fscy70\alpha&HFF&\t(0,140,\fscx104\fscy104\alpha&H00&)\t(140,220,\fscx100\fscy100)}" + out

def make_ass(path, segs):
    head = ("[Script Info]\nScriptType: v4.00+\nPlayResX: %d\nPlayResY: %d\nWrapStyle: 0\n\n[V4+ Styles]\n"
            "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n"
            "Style: Sub,Poppins,46,&H00FFFFFF,&H00FFFFFF,&H00000000,&H96000000,1,0,0,0,100,100,0,0,1,4,2,2,30,30,90,1\n\n"
            "[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n") % (W, H)
    lines = ["Dialogue: 0,%s,%s,Sub,,0,0,0,,%s" % (ts(a), ts(b), ass_text(t)) for a, b, t in segs]
    open(path, "w").write(head + "\n".join(lines) + "\n")

def run(*a):
    subprocess.run(["ffmpeg", "-v", "error", "-y", *a], check=True)

CAPTIONS = {}
ONLY = sys.argv[2:]  # ex. : etape6 (par défaut, toutes les étapes)
CAP = os.path.join(OUT, "captions.json")
CAPTIONS = json.load(open(CAP)) if ONLY and os.path.exists(CAP) else {}
for step, shots in STEPS.items():
    if ONLY and step not in ONLY:
        continue
    parts, caps, t_off = [], [], 0.0
    for n, (clip, a, b, speed, subs, labels) in enumerate(shots):
        src = os.path.join(SRC, clip + ".mp4")
        dur = (b - a) / speed
        inputs = ["-ss", str(a), "-t", str(b - a), "-i", src]
        fc = "[0:v]setpts=(PTS-STARTPTS)/%g,scale=%d:%d,setsar=1,fps=24[v0];" % (speed, W, H)
        last = "v0"
        for i, (t0, t1, txt, col, y) in enumerate(labels):
            png = os.path.join(TMP, "%s_%d_%d.png" % (step, n, i))
            label_png(txt, col, png)
            inputs += ["-loop", "1", "-i", png]
            idx = 1 + i
            s0, s1 = (t0 - a) / speed, (t1 - a) / speed
            # apparition en fondu + légère montée
            fc += ("[%d:v]format=rgba,fade=in:st=%.2f:d=0.2:alpha=1[l%d];[%s][l%d]overlay=(W-w)/2:H*%.2f-min(t-%.2f\\,0.2)*60+12:enable='between(t,%.2f,%.2f)':shortest=1[v%d];"
                   % (idx, s0, i, last, i, y, s0, s0, s1, i + 1))
            last = "v%d" % (i + 1)
        if subs:
            ass = os.path.join(TMP, "%s_%d.ass" % (step, n))
            make_ass(ass, [((x - a) / speed, (y - a) / speed, t) for x, y, t in subs])
            fc += "[%s]ass=%s[vs];" % (last, ass)
            last = "vs"
            caps += [(round(t_off + (x - a) / speed, 2), round(t_off + (y - a) / speed, 2), t) for x, y, t in subs]
        vol = 1.0 if clip.startswith("A") else 0.5
        tempo = ",atempo=%g" % speed if speed != 1 else ""
        fc += "[0:a]asetpts=PTS-STARTPTS%s,volume=%g,aresample=44100,aformat=channel_layouts=stereo[a]" % (tempo, vol)
        part = os.path.join(TMP, "%s_%d.mp4" % (step, n))
        run(*inputs, "-filter_complex", fc, "-map", "[%s]" % last, "-map", "[a]", "-t", "%.3f" % dur,
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p", "-c:a", "pcm_s16le", part.replace(".mp4", ".mkv"))
        parts.append(part.replace(".mp4", ".mkv"))
        t_off += dur
    lst = os.path.join(TMP, step + ".txt")
    open(lst, "w").write("".join("file '%s'\n" % p for p in parts))
    out = os.path.join(OUT, step + ".mp4")
    run("-f", "concat", "-safe", "0", "-i", lst, "-i", LOGO, "-filter_complex", "[1]scale=56:56[lg];[0:v][lg]overlay=W-w-18:18[v]",
        "-map", "[v]", "-map", "0:a", "-af", "loudnorm=I=-16:TP=-1.5:LRA=11",
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "27", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "96k", "-ar", "44100", "-movflags", "+faststart", out)
    run("-ss", "0.3", "-i", out, "-frames:v", "1", "-q:v", "5", os.path.join(OUT, step + ".jpg"))
    CAPTIONS[step] = caps
    print(step, "%.1f s" % t_off, os.path.getsize(out) // 1024, "Ko")

json.dump(CAPTIONS, open(CAP, "w"), ensure_ascii=False, indent=1)
