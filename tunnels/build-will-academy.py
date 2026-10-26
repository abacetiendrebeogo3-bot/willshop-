# Construit les tunnels Will Academy prêts à coller dans Systeme.io (source + images en ligne)
import json
b=json.load(open('assets-academy/b64.json')); logo=open('assets-academy/logo64.txt').read()
for name in ['will-academy-chat','will-academy-jeu']:
    s=open(name+'.src.html').read()
    for k,v in [('__AV__',b['AV']),('__P_TEASER__',b['P_TEASER']),('__P_PRES__',b['P_PRES']),('__P_L1__',b['P_L1']),('__PORTRAIT__',b['PORTRAIT']),('__LOGO__',logo)]:
        s=s.replace(k,v)
    assert '__P_' not in s and '__AV__' not in s and '__LOGO__' not in s and '__PORTRAIT__' not in s
    open(name+'.html','w').write(s); print(name, len(s))
