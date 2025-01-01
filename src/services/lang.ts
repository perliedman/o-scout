export function plural(x: number, noun: string, pluralEnding: string = "s") {
  return `${x} ${x !== 1 ? noun + pluralEnding : noun}`;
}
