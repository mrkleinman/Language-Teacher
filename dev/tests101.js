// 18 Nov — the thinking effort of the listening stages when the optional model is selected (owner: "change the listening track workflow to your new suggestion across all languages").
// The plan, the beats, the whole-story review and the coherence judge are HIGH; writing, fixing, repair and the per-scene checks MEDIUM; translation and mechanical checks LOW.
// Real application code (the table and the request body builder); the server function's own whitelist is checked in tests45 F1.
const { load } = require('./harness')
const fs = require('fs')
const FILE = process.env.TT_FILE || 'tt.compiled.js'
let n = 0, fails = 0
const T = (id, name, pass, detail) => { n++; if (!pass) fails++; console.log((pass ? 'PASS ' : 'FAIL ') + id + '  ' + name + (!pass && detail !== undefined ? '\n      ' + JSON.stringify(detail).slice(0, 300) : '')) }
const c = load(FILE); c.console.info = () => {}
const E = c.ev('ANTHROPIC_STAGE_EFFORT')
const HIGH = ['O_listening_meaning_plan', 'O_listening_semantic_audit', 'O_listening_story_plan', 'O_listening_story_beats', 'O_listening_story_review', 'O_listening_coherence', 'O_listening_module_spine']
const MED = ['O_listening_plan_repair', 'O_listening_story_write', 'O_listening_story_edit', 'O_listening_story_line_fix', 'O_listening_story_repair', 'O_listening_story_qc_repair', 'O_listening_story_usage', 'O_listening_scene', 'O_listening_scene_check', 'O_listening_repair', 'O_listening_qc', 'O_listening_word_check', 'O_listening_module_scene', 'O_word_usage']
T('E1', 'the plan, beats, whole-story review, coherence judge and module spine are HIGH', HIGH.every(k => E[k] === 'high'), HIGH.map(k => [k, E[k]]))
T('E2', 'writing, fixing, repair, the per-scene checks and the scene / quality stages are MEDIUM', MED.every(k => E[k] === 'medium'), MED.map(k => [k, E[k]]))
T('E3', 'translation and the mechanical checks stay LOW', E.O_listening_story_english === 'low' && E.O_cue_fidelity === 'low' && Object.keys(E).filter(k => /^Y_/.test(k)).every(k => E[k] === 'low'))
T('E4', 'only the three values the server accepts are used (low / medium / high)', Object.values(E).every(v => ['low', 'medium', 'high'].includes(v)), [...new Set(Object.values(E))])
const body = stage => c.ev('anthropicRequestBody')({ model: 'claude-haiku-5-5', messages: [{ role: 'user', content: 'x' }], maxTokens: 1200, json: null, effort: E[stage] }).body
T('E5', 'the request body of a HIGH stage carries effort "high", a MEDIUM stage "medium", an unlisted stage the default "low"', body('O_listening_story_plan').output_config.effort === 'high' && body('O_listening_story_write').output_config.effort === 'medium' && c.ev('anthropicRequestBody')({ model: 'claude-haiku-5-5', messages: [{ role: 'user', content: 'x' }], maxTokens: 1200 }).body.output_config.effort === 'low')
const SRC = fs.readFileSync('tt.jsx', 'utf8')
T('E6', 'every listening stage label the app can send is in the table or deliberately left at the default (reading / pronunciation stages)', (() => { const labels = [...new Set((SRC.match(/'(O_listening_[a-z_]+)'/g) || []).map(x => x.slice(1, -1)))]; const missing = labels.filter(l => !(l in E)); return missing.every(l => /reading|pronun/.test(l)) })(), (() => { const labels = [...new Set((SRC.match(/'(O_listening_[a-z_]+)'/g) || []).map(x => x.slice(1, -1)))]; return labels.filter(l => !(l in E)) })())
console.log((fails ? 'FAIL ' : 'ALL PASS ') + (n - fails) + '/' + n)
process.exit(fails ? 1 : 0)
