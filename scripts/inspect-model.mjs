import { readFile } from 'node:fs/promises';

// Read the TFLite FlatBuffer tables without changing the supplied model.
const b = await readFile('best.tflite');
const field = (table, index) => {
  const vt = table - b.readInt32LE(table);
  const slot = 4 + index * 2;
  if (slot >= b.readUInt16LE(vt)) return 0;
  const offset = b.readUInt16LE(vt + slot);
  return offset ? table + offset : 0;
};
const ref = (p) => p + b.readUInt32LE(p);
const vector = (p, objects = false) => {
  if (!p) return [];
  const v = ref(p);
  return Array.from({ length: b.readUInt32LE(v) }, (_, i) =>
    objects ? ref(v + 4 + i * 4) : b.readInt32LE(v + 4 + i * 4),
  );
};
const string = (p) => {
  if (!p) return '';
  const s = ref(p);
  return b.toString('utf8', s + 4, s + 4 + b.readUInt32LE(s));
};
const model = b.readUInt32LE(0);
const graph = vector(field(model, 2), true)[0];
const tensors = vector(field(graph, 0), true);
const describe = (id) => {
  const t = tensors[id];
  const type = field(t, 1);
  return {
    id,
    name: string(field(t, 3)),
    shape: vector(field(t, 0)),
    type: type ? b.readUInt8(type) : 0,
  };
};
const result = {
  identifier: b.toString('ascii', 4, 8),
  description: string(field(model, 3)),
  inputs: vector(field(graph, 1)).map(describe),
  outputs: vector(field(graph, 2)).map(describe),
};
console.log(JSON.stringify(result, null, 2));
if (process.argv.includes('--tail'))
  console.log(tensors.map((_, i) => describe(i)).slice(-55));
if (process.argv.includes('--operators')) {
  const codes = vector(field(model, 1), true);
  const operators = vector(field(graph, 3), true).map((op) => {
    const index = field(op, 0);
    const code = codes[index ? b.readUInt32LE(index) : 0];
    const builtin = field(code, 3),
      deprecated = field(code, 0);
    return {
      builtin: builtin
        ? b.readInt32LE(builtin)
        : deprecated
          ? b.readUInt8(deprecated)
          : 0,
      inputs: vector(field(op, 1)),
      outputs: vector(field(op, 2)),
    };
  });
  console.log(
    JSON.stringify(
      {
        builtinCodes: [...new Set(operators.map((op) => op.builtin))],
        tail: operators.slice(-16),
      },
      null,
      2,
    ),
  );
}
