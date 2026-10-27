# Montage des vidéos de Sadia pour le tunnel Will Academy.
# Recadrage 4:5 (720x900), sous-titres animés (mots clés en vert), logo, son normalisé, compression mobile.
# Usage : python3 build_videos.py <dossier_des_vidéos_brutes>
import subprocess, sys, os, glob

SRC = sys.argv[1]
OUT = os.path.dirname(os.path.abspath(__file__))
LOGO = os.path.join(OUT, "..", "icons", "icon-192.png")
W, H = 720, 900

# (fichier source commence par, nom de sortie, décalage du recadrage en % de la hauteur, [(début, fin, texte)])
# Les mots entre *étoiles* sont surlignés en vert.
CLIPS = [
    ("67c38043", "02-objectif", 0.10, [(1.75, 3.96, "Super ! Dis-moi, c'est pour *gagner de l'argent*…"), (4.40, 5.50, "*faire la pub* de tes produits…"), (5.90, 7.30, "ou *créer du contenu* ?")]),
    ("942978a3", "03a-simple", 0.10, [(2.05, 2.75, "C'est *simple* :"), (3.30, 4.35, "ton *téléphone* suffit."), (5.30, 6.60, "Même une *grand-mère* peut le faire…"), (7.05, 7.70, "*regarde* !")]),
    ("71f23a82", "03b-grand-mere", 0.10, [(0.30, 1.05, "Hé !"), (1.35, 3.45, "Si moi *j'y arrive*,"), (3.70, 4.50, "*toi aussi* tu peux !"), (4.95, 6.60, "Tu veux voir la *première vidéo* ?")]),
    ("39ae1494", "04a-plateforme", 0.10, [(0.05, 2.10, "Ta formation est sur ton *téléphone* :"), (2.70, 3.85, "*8 vidéos* courtes,"), (4.40, 4.90, "*pas à pas*,"), (5.25, 7.50, "avec un *exercice* après chaque vidéo.")]),
    ("0c26fa4a", "04b-accompagnement", 0.10, [(0.65, 2.00, "Tu y as accès *à vie*,"), (2.55, 4.50, "et on t'accompagne dans le *groupe WhatsApp*."), (5.90, 7.50, "On regarde ta *première leçon* ?")]),
    ("4d687cbe", "04c-lecon", 0.10, [(1.95, 4.10, "Voilà ta *première leçon* !"), (4.30, 5.50, "Regarde-la *jusqu'au bout*,"), (5.90, 7.05, "d'accord ?")]),
    ("113650d3", "05-offre", 0.10, [(2.60, 3.60, "Alors, *ça t'a plu* ?"), (4.10, 6.10, "La suite t'attend dans la *formation complète*."), (6.40, 7.40, "Tu *prends ta place* ?")]),
    ("a98c4069", "06-whatsapp", 0.10, [(0.00, 0.75, "Top !"), (1.20, 2.50, "Appuie sur le bouton *WhatsApp* :"), (3.05, 3.55, "tu *paies*,"), (3.75, 5.85, "et Wilfried t'ajoute à la *formation* et au *groupe*."), (6.30, 7.10, "*À tout de suite* !")]),
]

def ts(t):
    h = int(t // 3600); m = int(t % 3600 // 60); s = t % 60
    return "%d:%02d:%05.2f" % (h, m, s)

def ass_text(txt):
    # *mot* -> vert ; animation d'apparition « pop »
    out, green = "", False
    for part in txt.split("*"):
        out += (r"{\c&H2AC322&}" if green else r"{\c&HFFFFFF&}") + part
        green = not green
    return r"{\fscx70\fscy70\alpha&HFF&\t(0,140,\fscx104\fscy104\alpha&H00&)\t(140,220,\fscx100\fscy100)}" + out

def make_ass(path, segs):
    head = """[Script Info]
ScriptType: v4.00+
PlayResX: %d
PlayResY: %d
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Sub,Poppins,60,&H00FFFFFF,&H00FFFFFF,&H00000000,&H96000000,1,0,0,0,100,100,0,0,1,5,3,2,40,40,110,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
""" % (W, H)
    lines = ["Dialogue: 0,%s,%s,Sub,,0,0,0,,%s" % (ts(a), ts(b), ass_text(t)) for a, b, t in segs]
    open(path, "w").write(head + "\n".join(lines) + "\n")

for key, name, off, segs in CLIPS:
    src = glob.glob(os.path.join(SRC, key + "-*.mp4"))[0]
    ass = os.path.join(OUT, name + ".ass")
    make_ass(ass, segs)
    # recadrage 4:5 : largeur entière, hauteur = largeur * 5/4, à partir de off * hauteur
    vf = ("crop=iw:iw*5/4:0:ih*%.3f,scale=%d:%d,setsar=1[v];[1]scale=64:64[lg];[v][lg]overlay=W-w-22:22[v2];[v2]ass=%s" % (off, W, H, ass))
    out = os.path.join(OUT, name + ".mp4")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-i", LOGO, "-filter_complex", vf,
                    "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-c:v", "libx264", "-preset", "veryfast", "-crf", "26", "-pix_fmt", "yuv420p",
                    "-c:a", "aac", "-b:a", "96k", "-ar", "44100", "-movflags", "+faststart", out], check=True)
    # image d'attente (première image) pour un affichage immédiat
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", "0.3", "-i", out, "-frames:v", "1", "-q:v", "5", os.path.join(OUT, name + ".jpg")], check=True)
    os.remove(ass)
    print(name, os.path.getsize(out) // 1024, "Ko")
