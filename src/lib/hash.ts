/** Deterministic, dependency-free password hashing for in-app accounts. */

function fnv1a(str: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h >>> 0
}

function mix(seed: number, str: string): string {
  let h = seed
  let out = ''
  for (let i = 0; i < 64; i++) {
    h ^= str.charCodeAt(i % str.length) + i * 31
    h = Math.imul(h, 0x9e3779b1) >>> 0
    out += String(h % 16)
  }
  return out
}

export function hashPassword(password: string, salt = 'apta-static-salt'): string {
  const a = fnv1a(`${salt}:${password}`)
  const b = fnv1a(`${password}:${salt}:v2`)
  return `apta1$${a.toString(16)}${b.toString(16)}${mix(a ^ b, password)}`
}

export function verifyPassword(password: string, stored: string): boolean {
  return hashPassword(password) === stored
}
