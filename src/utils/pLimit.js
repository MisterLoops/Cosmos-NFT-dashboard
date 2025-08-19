// pLimit.js
export default function pLimit(concurrency) {
  let activeCount = 0;
  const queue = [];

  const next = () => {
    if (queue.length === 0 || activeCount >= concurrency) return;
    activeCount++;
    const { fn, resolve, reject } = queue.shift();
    fn()
      .then(resolve)
      .catch(reject)
      .finally(() => {
        activeCount--;
        next();
      });
  };

  const run = (fn) =>
    new Promise((resolve, reject) => {
      queue.push({ fn, resolve, reject });
      next();
    });

  return run;
}
