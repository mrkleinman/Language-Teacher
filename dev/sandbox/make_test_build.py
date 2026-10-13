#!/usr/bin/env python3
"""Make the TEST build of the app (served at <site>/test/) from the dev build (dev/index.html).

The test page shares the production site's origin, so it would share the learner's localStorage. A small prelude, run before the
app, isolates it with COPY-ON-WRITE:
  · reads fall through to the learner's real data (lessons are made for the real vocabulary and progress),
  · every write and removal goes to a separate namespace (tt-test:) — the real keys are never written, changed or deleted,
  · a banner says TEST BUILD and offers "Delete test data" (removes only tt-test: keys),
  · no web-app manifest (the test page cannot be installed over the real app), no service worker registration.

  python3 sandbox/make_test_build.py dev/index.html <out>/test/index.html
"""
import sys, re

PRELUDE = r"""<script>
/* TEST BUILD — copy-on-write storage: reads see the learner's real data; writes / removals go ONLY to the tt-test: namespace. */
(function () {
  var P = 'tt-test:', TOMB = '\u0000tt-test-deleted';
  var S = Storage.prototype, g = S.getItem, s = S.setItem, r = S.removeItem;
  var ls = null; try { ls = window.localStorage } catch (e) {}
  var mine = function (o) { return ls && o === ls };
  S.getItem = function (k) {
    if (!mine(this)) return g.call(this, k);
    var v = g.call(this, P + k);
    if (v === TOMB) return null;
    return v !== null ? v : g.call(this, k);            // read-through to the real data (read only)
  };
  S.setItem = function (k, v) { return mine(this) ? s.call(this, P + k, v) : s.call(this, k, v) };
  S.removeItem = function (k) { return mine(this) ? s.call(this, P + k, TOMB) : r.call(this, k) };
  var c0 = S.clear; S.clear = function () { if (!mine(this)) return c0.call(this); window.__TT_TEST_BUILD__.clear() };   // never wipes real data
  try { if (window.storage) window.storage = undefined } catch (e) {}   // no other storage path in the test build
  window.__TT_TEST_BUILD__ = { namespace: P,
    usage: function () { var n = 0, c = 0; for (var i = 0; i < ls.length; i++) { var k = ls.key(i); if (k && k.indexOf(P) === 0) { n++; c += (g.call(ls, k) || '').length } } return { keys: n, chars: c } },
    clear: function () { var ks = []; for (var i = 0; i < ls.length; i++) { var k = ls.key(i); if (k && k.indexOf(P) === 0) ks.push(k) } ks.forEach(function (k) { r.call(ls, k) }); return ks.length } };
  document.addEventListener('DOMContentLoaded', function () {
    var b = document.createElement('div');
    b.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#7c3aed;color:#fff;font:600 11px/1.4 system-ui,sans-serif;padding:3px 8px;display:flex;gap:8px;align-items:center;justify-content:center;pointer-events:auto';
    b.innerHTML = '<span>TEST BUILD __VERSION__ · separate test data (your real progress is read, never changed)</span>';
    var x = document.createElement('button'); x.textContent = 'Delete test data';
    x.style.cssText = 'font:600 10px system-ui;border:0;border-radius:4px;padding:1px 6px;background:#fff;color:#7c3aed';
    x.onclick = function () { if (confirm('Delete all TEST data on this phone? Your real lessons and progress are not touched.')) { var n = window.__TT_TEST_BUILD__.clear(); alert(n + ' test item(s) deleted.'); location.reload() } };
    b.appendChild(x); document.body.appendChild(b);
  });
})();
</script>
"""

def main(src, dst):
    html = open(src, encoding='utf-8').read()
    m = re.search(r'<meta name="app-version" content="(v\d+)"', html)
    version = m.group(1) if m else 'dev'
    out = html.replace('<head>', '<head>\n' + PRELUDE.replace('__VERSION__', version), 1)
    out = out.replace('<link rel="manifest" href="./manifest.json"/>', '')                     # cannot be installed over the real app
    out = re.sub(r"if\('serviceWorker'in navigator\)\{.*?\}\s*\n", "/* TEST BUILD: no service worker */\n", out, count=1, flags=re.S)
    out = out.replace('<title>Thai Teacher</title>', '<title>TEST · Thai Teacher ' + version + '</title>')
    assert out.count('tt-test:') >= 1 and 'rel="manifest"' not in out and "serviceWorker'in navigator" not in out
    open(dst, 'w', encoding='utf-8').write(out)
    print('test build', version, '→', dst)

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
