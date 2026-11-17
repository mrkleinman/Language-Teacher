// Job storage behind a small interface, so the service does not care where jobs live.
//
//   interface JobStore {
//     async put(id, record)      // create or replace the PUBLIC record of a job (never a credential; the service never puts one here)
//     async get(id)              // the record, or null
//     async delete(id)           // remove it (idempotent)
//     async listIds()            // every stored id
//   }
//
// Included: MemoryFileStore — a Map in memory, written through to one JSON file per job (mode 0600) in a directory, so a finished track survives a restart of
// the process on the SAME disk. It is NOT durable on Cloud Run: an instance's disk is in-memory and goes away when the instance is replaced or scaled to zero.
//
// To run on Cloud Run with results that survive instance restarts, write another class with the same four methods and pass it to createServer({ store }):
//   * Cloud Storage: put -> bucket.file(id + '.json').save(JSON.stringify(record)); get -> download + JSON.parse (404 -> null); delete -> file.delete({ ignoreNotFound: true });
//     listIds -> bucket.getFiles(). Add a lifecycle rule "delete objects older than 1 day" on the bucket, which also does the 24 h purge for you.
//   * or Firestore: collection('jobs').doc(id).set(record) / .get() / .delete(); a TTL policy on the field `expiresAt` purges old jobs.
//   Keep the record under the size limit of the service you pick (Firestore documents are 1 MiB; a track list can be larger, so prefer Cloud Storage for `result`).
// The queue itself stays in the process (one browser per instance), so keep maxInstances at 1 or accept that each instance has its own queue.
'use strict'
const fs = require('fs')
const path = require('path')

const SAFE_ID = /^[a-f0-9]{32}$/

class MemoryFileStore {
  // dir: where the files go (created if missing); null = memory only
  constructor(dir) {
    this.dir = dir || null
    this.mem = new Map()
    if (this.dir) { fs.mkdirSync(this.dir, { recursive: true, mode: 0o700 }); this._load() }
  }
  _file(id) { if (!SAFE_ID.test(id)) throw new Error('bad job id'); return path.join(this.dir, id + '.json') }
  _load() {
    for (const f of fs.readdirSync(this.dir)) {
      const m = /^([a-f0-9]{32})\.json$/.exec(f); if (!m) continue
      try { this.mem.set(m[1], JSON.parse(fs.readFileSync(path.join(this.dir, f), 'utf8'))) } catch (e) { try { fs.unlinkSync(path.join(this.dir, f)) } catch (x) {} }
    }
  }
  async put(id, record) {
    this.mem.set(id, record)
    if (this.dir) {
      const f = this._file(id), tmp = f + '.tmp'
      fs.writeFileSync(tmp, JSON.stringify(record), { mode: 0o600 }); fs.renameSync(tmp, f)
    }
  }
  async get(id) { const r = this.mem.get(id); return r ? r : null }
  async delete(id) {
    this.mem.delete(id)
    if (this.dir) { try { fs.unlinkSync(this._file(id)) } catch (e) {} }
  }
  async listIds() { return [...this.mem.keys()] }
}

module.exports = { MemoryFileStore, SAFE_ID }
