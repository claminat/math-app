export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function randomByWeight(ranges) {
  const total = ranges.reduce((s, r) => s + r.weight, 0);
  let rand = Math.random() * total;

  for (const r of ranges) {
    if (rand < r.weight) {
      return randomInt(0, r.max);
    }
    rand -= r.weight;
  }
}
