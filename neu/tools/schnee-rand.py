#!/usr/bin/env python3
# Gegen weißen Saum bei Winterbildern: python3 neu/tools/schnee-rand.py quelle.png vor.png 0.52 0.68 3   (Toleranz 3–10 je nach Bild: zu hoch frisst Schnee an der Spitze)
# danach bild-einbauen.py vor.png ziel.webp <breite> --schnee --toleranz=1
# Setzt fast-weiße Punkte außerhalb eines waagrechten Bands (dort liegen die Plattenecken mit Schnee) exakt auf die
# Hintergrundfarbe, damit das Freistellen dort gründlicher ist. oben-weiss.py quelle ziel von bis toleranz
import sys
from PIL import Image
src,dst,a,b,tol=sys.argv[1],sys.argv[2],float(sys.argv[3]),float(sys.argv[4]),int(sys.argv[5])
im=Image.open(src).convert('RGB');w,h=im.size;p=im.load()
bg=sorted(p[c] for c in [(2,2),(w-3,2),(2,h-3),(w-3,h-3)])[1]
for y in range(h):
    if h*a <= y <= h*b: continue
    for x in range(w):
        if max(abs(p[x,y][i]-bg[i]) for i in range(3))<=tol: p[x,y]=bg
im.save(dst)
