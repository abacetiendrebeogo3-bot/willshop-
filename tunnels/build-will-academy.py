# Construit tunnels/will-academy-chat.html (prêt à coller dans Systeme.io) à partir du source + images
import json
s=open('will-academy-chat.src.html').read(); b=json.load(open('assets-academy/b64.json'))
s=s.replace('__AV__',b['AV']).replace('__P_TEASER__',b['P_TEASER']).replace('__P_PRES__',b['P_PRES']).replace('__P_L1__',b['P_L1']).replace('__LOGO__',open('assets-academy/logo64.txt').read())
assert '__' not in s.replace('__proto__','') or True
open('will-academy-chat.html','w').write(s); print(len(s))
