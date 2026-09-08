// M0-3 spike helper: decode a session.jsonl.zstd into plain lines (read-only).
// Usage: node decode-test.mjs <path-to-session.jsonl.zstd> [maxLines]
import { createReadStream, readFileSync } from "node:fs";
import { pipeline } from "node:stream/promises";
import { createZstdDecompress } from "node:zlib";
import { Writable } from "node:stream";

const file = process.argv[2];
const maxLines = Number(process.argv[3] ?? 5);
if (!file) {
  console.error("usage: node decode-test.mjs <session.jsonl.zstd> [maxLines]");
  process.exit(2);
}

let buf = Buffer.alloc(0);
const sink = new Writable({
  write(chunk, _enc, cb) {
    buf = Buffer.concat([buf, chunk]);
    cb();
  },
});
await pipeline(createReadStream(file), createZstdDecompress(), sink);

const text = buf.toString("utf8");
const lines = text.split("\n");
console.log(`decoded chars=${text.length} lines=${lines.length}`);
for (const line of lines.slice(0, maxLines)) {
  try {
    const ev = JSON.parse(line);
    console.log(">", JSON.stringify({ type: ev.type, seq: ev.seq, time: ev.time, keys: Object.keys(ev) }));
  } catch {
    console.log("> (unparseable)", line.slice(0, 160));
  }
}
