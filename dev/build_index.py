# The ONLY way index.html is produced: embed tt.jsx (canonical source) in the app shell.
import sys, re
src, shell_in, out, ver = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
h = open(shell_in, encoding='utf-8').read(); j = open(src, encoding='utf-8').read()
# v650: data-presets="react" — JSX only. The default Babel preset (env) rewrote every async function
# into regenerator code ("_callee76$" in the telemetry FUNCTION column, stage attribution by caller
# lost) and made the in-browser compile ~2.5x slower. Every browser the app targets runs ES2020 natively.
tag = '<script type="text/babel">'
a = h.index(tag); b = h.rindex('</script>')
h = h[:a] + '<script type="text/babel" data-presets="react">' + '\n' + j + '\n' + h[b:]
h = re.sub(r'<meta name="app-version" content="v\d+"/>', f'<meta name="app-version" content="{ver}"/>', h)
h = re.sub(r"tt-v\d+", f"tt-{ver}", h)
open(out, 'w', encoding='utf-8').write(h); print('built', out, ver)
