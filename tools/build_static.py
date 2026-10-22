#!/usr/bin/env python3
"""Compila una versión estática y editable para Canva: sin JavaScript.

Diferencias con dist/intelis-canva.html:
  · Ningún script. Todo el contenido queda visible y escrito en el HTML.
  · Las cuatro pantallas del diagnóstico se muestran una tras otra.
  · Las cartas y las preguntas frecuentes quedan abiertas.
  · La lista de los 73 giros se escribe agrupada por sector (sin buscador).
  · La consola de la portada queda encendida.
  · Las variables de estilo se sustituyen por valores literales (colores,
    tamaños, radios, sombras), que es lo que el importador puede convertir
    en propiedades editables.
  · Las animaciones que se conservan son sólo CSS.

Uso:  python3 tools/build_static.py   →  dist/intelis-canva-editable.html
"""
import json, pathlib, re, sys
from bs4 import BeautifulSoup

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'tools'))
from build import min_css, min_html, data_uri, aviso_section  # noqa: E402

OUT = ROOT / 'dist' / 'intelis-canva-editable.html'
MOBILE_MAX = 680          # el :root del sitio redefine sombras y márgenes hasta este ancho

STATIC_CSS = """
.deck-grid{grid-template-columns:1fr}
.deck{display:flex;flex-direction:column;gap:36px}
.deck-panel{opacity:1;visibility:visible;transform:none;grid-area:auto}
.scr-h{display:flex;align-items:center;gap:12px;margin-bottom:4px}
.scr-h b{font-size:15px;font-weight:600;letter-spacing:-.016em}
.scr-h span{font-size:13px;color:#4F5B72}
.card-tab{cursor:default}
.g-list{max-height:none;overflow:visible}
.g-grp{grid-column:1/-1;font-size:11px;font-weight:600;color:#00357A;padding:18px 0 4px}
.g-grp:first-child{padding-top:10px}
.az-name{animation-play-state:running}
"""


def read_vars(block):
    return dict(re.findall(r'(--[\w-]+)\s*:\s*([^;}]+)', block))


def resolve(text, env):
    """Sustituye var(--x) / var(--x,fallback) por su valor, en varias pasadas."""
    pat = re.compile(r'var\((--[\w-]+)(?:,([^()]*(?:\([^()]*\))?[^()]*))?\)')
    for _ in range(6):
        new = pat.sub(lambda m: env[m.group(1)].strip() if m.group(1) in env else m.group(0), text)
        if new == text:
            break
        text = new
    return text


def split_blocks(css):
    """Divide la hoja minificada en bloques de primer nivel: (prelude, cuerpo)."""
    out, i = [], 0
    while i < len(css):
        j = css.index('{', i)
        prelude, depth, k = css[i:j], 1, j + 1
        while depth:
            depth += {'{': 1, '}': -1}.get(css[k], 0)
            k += 1
        out.append((prelude, css[j + 1:k - 1]))
        i = k
    return out


def literal_css(css):
    css = min_css(css)
    blocks = split_blocks(css)
    base = read_vars(next(b for p, b in blocks if p == ':root'))
    mobile_over = {}
    for p, b in blocks:
        if p.startswith('@media') and ':root{' in b:
            mobile_over = read_vars(b)
    mobile = {**base, **mobile_over}
    mobile_keys = set(mobile_over)

    out, extra = [], []
    for prelude, body in blocks:
        if prelude == ':root':
            continue
        if prelude.startswith('@'):
            body = re.sub(r':root\{[^}]*\}', '', body)
            if not body.strip():
                continue
            m = re.search(r'max-width:(\d+)px', prelude)
            env = mobile if (m and int(m.group(1)) <= MOBILE_MAX) else base
            out.append(f'{prelude}{{{resolve(body, env)}}}')
            continue
        if prelude.startswith('.js '):        # apariciones que dependían de JavaScript
            continue
        out.append(f'{prelude}{{{resolve(body, base)}}}')
        # Declaraciones que en móvil usaban otro valor: se repiten en la consulta de móvil
        decls = [d for d in body.split(';') if any(f'var({k}' in d for k in mobile_keys)]
        if decls:
            extra.append(f'{prelude}{{{resolve(";".join(decls), mobile)}}}')
    if extra:
        out.append(f'@media(max-width:{MOBILE_MAX}px){{{"".join(extra)}}}')
    css = ''.join(out) + min_css(STATIC_CSS)
    return css.replace('.sw[aria-checked="true"]', '.sw[data-on]')


def giros_html(soup):
    src = (ROOT / 'js' / 'giros.js').read_text(encoding='utf-8')
    grupos = json.loads(re.search(r'window\.GRUPOS=(\{.*?\});', src, re.S).group(1))
    giros = json.loads(re.search(r'window\.GIROS=(\[.*?\]);', src, re.S).group(1))
    frag = []
    for key, name in grupos.items():
        items = [g for g in giros if g[2] == key]
        frag.append(f'<p class="g-grp">{name} · {len(items)}</p>')
        for n, d, _, ok in items:
            tag = ('<span class="g-src">Referencia INEGI</span>' if ok
                   else '<span class="g-src no">Sin fuente oficial</span>')
            frag.append(f'<div class="g-it"><div class="gt"><b>{n}</b><span>{d}</span></div>{tag}</div>')
    return BeautifulSoup(''.join(frag), 'html.parser')


def main():
    html = (ROOT / 'index.html').read_text(encoding='utf-8')
    soup = BeautifulSoup(html, 'html.parser')

    # Sin scripts ni metadatos de buscadores
    for t in soup.find_all('script'):
        t.decompose()
    for t in soup.select('meta[property^="og:"], link[rel="canonical"], link[rel="preload"]'):
        t.decompose()
    for sel in ('.skip', '#prog', '#float', '.g-top', '#gchips', '.card-chev'):
        for t in soup.select(sel):
            t.decompose()

    # Apariciones: todo visible desde el inicio
    for t in soup.select('.rv'):
        t['class'] = [c for c in t['class'] if c != 'rv']
        if t.get('style', '').startswith('--d:'):
            del t['style']

    # Consola encendida
    sw = soup.select_one('#sw')
    sw.name = 'div'
    for a in ('role', 'aria-checked', 'aria-label', 'id'):
        sw.attrs.pop(a, None)
    sw['class'] = ['sw']
    sw['data-on'] = ''
    for p in soup.select('#plates .plate'):
        p['class'].append('lit')
    soup.select_one('#roMods').string = '5'
    soup.select_one('#roBar')['style'] = 'transform:none'
    soup.select_one('#roCards').string = '18'
    soup.select_one('#roTime').string = '< 60 s'

    # Diagnóstico: las cuatro pantallas, una tras otra
    screens = soup.select('.scr')
    for scr, panel in zip(screens, soup.select('.deck-panel')):
        name = scr.select_one('b').get_text()
        count = scr.select_one('b + span').get_text()
        n = scr.select_one('.scr-n i').get_text()
        head = BeautifulSoup(f'<div class="scr-h"><span class="step-n">{n}</span><b>{name}</b><span>{count}</span></div>', 'html.parser')
        panel.insert(0, head)
        panel['class'] = ['deck-panel', 'on']
        for a in ('role', 'aria-labelledby', 'id'):
            panel.attrs.pop(a, None)
    soup.select_one('.screens').decompose()

    # Cartas y preguntas abiertas, sin botones
    for card in soup.select('.card'):
        card['class'].append('open')
        tab = card.select_one('.card-tab')
        tab.name = 'div'
        tab.attrs.pop('aria-expanded', None)

    # Evidencia con barras encendidas y AZIMUT con su destello
    soup.select_one('#evid')['class'].append('in')
    soup.select_one('.az-hero')['class'].append('az-on')

    # Giros escritos en el HTML
    glist = soup.select_one('#glist')
    glist.clear()
    glist.append(giros_html(soup))

    out = str(soup)
    root_vars = read_vars(next(b for p, b in split_blocks(min_css((ROOT / 'css' / 'meridian.css').read_text(encoding='utf-8'))) if p == ':root'))
    css = literal_css((ROOT / 'css' / 'meridian.css').read_text(encoding='utf-8'))
    out = out.replace('<link href="css/meridian.css" rel="stylesheet"/>', f'<style>{css}</style>')
    out = out.replace('<link rel="stylesheet" href="css/meridian.css"/>', f'<style>{css}</style>')
    for name in ('meridian', 'intelis-wordmark', 'intelis'):
        out = out.replace(f'src="assets/{name}.png"', f'src="{data_uri(ROOT / "assets" / (name + ".png"), "image/png")}"')
    out = out.replace('href="assets/favicon.svg"', f'href="{data_uri(ROOT / "assets" / "favicon.svg", "image/svg+xml")}"')
    out = out.replace('href="aviso-privacidad.html"', 'href="#aviso"')
    out = out.replace('</main>', aviso_section() + '\n</main>')
    out = re.sub(r'style="([^"]*)"', lambda m: 'style="' + resolve(m.group(1), root_vars) + '"', out)

    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(min_html(out), encoding='utf-8')
    print(f'{OUT.relative_to(ROOT)}  {OUT.stat().st_size / 1024:.1f} KB')


if __name__ == '__main__':
    main()
