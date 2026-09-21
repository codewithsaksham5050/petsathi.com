// Simple per-file mutex so two requests never read/write the same
// Excel file at the same time (which would corrupt the file).
const locks = {};

function runExclusive(key, task) {
  const previous = locks[key] || Promise.resolve();
  const run = previous.then(task, task);
  // keep the chain alive even if a task throws, but swallow the error
  // here so it doesn't block the NEXT task in line.
  locks[key] = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

module.exports = { runExclusive };
