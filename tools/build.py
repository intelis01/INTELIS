#!/usr/bin/env python3
"""Compila el sitio en un solo HTML autocontenido para pegarlo en Canva.

Incrusta y minifica la hoja de estilos, los scripts, el catálogo de giros y
los logotipos, e integra el aviso de privacidad como sección de la misma
página (en Canva no existe una segunda página a la cual enlazar).

Uso:  python3 tools/build.py      →  dist/intelis-canva.html
"""
import base64, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'dist' / 'intelis-canva.html'


def min_css(css):
    css = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
    css = re.sub(r'\s+', ' ', css)
    css = re.sub(r'\s*([{};])\s*', r'\1', css)
    css = css.replace(';}', '}')
    return css.strip()


def min_js(js):
    js = re.sub(r'/\*.*?\*/', '', js, flags=re.S)
    lines = (l.strip() for l in js.splitlines())
    return '\n'.join(l for l in lines if l)


def min_html(html):
    html = re.sub(r'<!--.*?-->', '', html, flags=re.S)
    lines = (l.strip() for l in html.splitlines())
    return '\n'.join(l for l in lines if l)


def data_uri(path, mime):
    return f'data:{mime};base64,' + base64.b64encode(path.read_bytes()).decode()


def aviso_section():
    doc = (ROOT / 'aviso-privacidad.html').read_text(encoding='utf-8')
    article = re.search(r'<article class="doc up"[^>]*>.*?</article>', doc, flags=re.S).group(0)
    return ('<section class="sec" id="aviso" aria-labelledby="h-aviso"><div class="wrap">'
            '<div class="head"><p class="eyebrow">Aviso de privacidad · versión simplificada</p>'
            '<h2 class="h2" id="h-aviso">Sus datos, para su diagnóstico.</h2></div>'
            + article.replace('style="margin-top:32px"', '') + '</div></section>')


def main():
    html = (ROOT / 'index.html').read_text(encoding='utf-8')
    css = min_css((ROOT / 'css' / 'meridian.css').read_text(encoding='utf-8'))
    js = min_js((ROOT / 'js' / 'giros.js').read_text(encoding='utf-8') + '\n' +
                (ROOT / 'js' / 'app.js').read_text(encoding='utf-8'))

    # Cada logotipo se incrusta una sola vez; las repeticiones copian su imagen al cargar
    blank = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=='
    for name in ('meridian', 'intelis-wordmark', 'intelis'):
        tag = f'src="assets/{name}.png"'
        first = html.index(tag)
        html = (html[:first] + f'data-k="{name}" src="{data_uri(ROOT / "assets" / (name + ".png"), "image/png")}"'
                + html[first + len(tag):].replace(tag, f'data-dup="{name}" src="{blank}"'))
    js = ('[].forEach.call(document.querySelectorAll("img[data-dup]"),function(i){'
          'i.src=document.querySelector(\'img[data-k="\'+i.dataset.dup+\'"]\').src});\n' + js)

    html = html.replace('<link rel="stylesheet" href="css/meridian.css">', f'<style>{css}</style>')
    html = re.sub(r'<link rel="preload"[^>]*>\n?', '', html)
    html = html.replace('<script src="js/giros.js" defer></script>\n<script src="js/app.js" defer></script>',
                        f'<script>document.addEventListener("DOMContentLoaded",function(){{\n{js}\n}});</script>')

    # Metadatos para buscadores y redes: dentro de Canva no se usan
    html = re.sub(r'<script type="application/ld\+json">.*?</script>\n?', '', html, flags=re.S)
    html = re.sub(r'<meta property="og:[^>]*>\n?|<link rel="canonical"[^>]*>\n?', '', html)
    html = html.replace('href="assets/favicon.svg"', f'href="{data_uri(ROOT / "assets" / "favicon.svg", "image/svg+xml")}"')

    html = html.replace('href="aviso-privacidad.html"', 'href="#aviso"')
    html = html.replace('</main>', aviso_section() + '\n</main>')

    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(min_html(html), encoding='utf-8')
    print(f'{OUT.relative_to(ROOT)}  {OUT.stat().st_size / 1024:.1f} KB')


if __name__ == '__main__':
    main()
