// Local owner tools only. This verifier is not a remote authorization boundary.
const verifiers = [{"salt":"f4ef8ee436fbcaeea0ff8f5c111c5cea","hash":"49f46121d6547c8035ae89d36047d413728954136515a7d70755f1d1706df784"},{"salt":"d199a174403fbccf12270e28d110e86a","hash":"a41a3d5fce3d24bbfb14c3e0ec50b53f448bf469b12d3d8dd7bb32b5e32c81ff"},{"salt":"96706022755fde064d7d47f964b8aeae","hash":"b9d33680862cd85e08261f43a70e6158cf4610bd4bce297005c4fc46ccf94fc7"}];
const fromHex = (value: string) => new Uint8Array(value.match(/../g)!.map(byte => parseInt(byte, 16)));

export async function verifyDeveloperCredentials(user: string, password: string): Promise<boolean> {
  if (user.length > 256 || password.length > 1024) return false;
  const input = await crypto.subtle.importKey('raw', new TextEncoder().encode(user + '\0' + password),
    'PBKDF2', false, ['deriveBits']);
  let matched = false;
  for (const verifier of verifiers) {
    const actual = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256',
      iterations: 210000, salt: fromHex(verifier.salt) }, input, 256));
    const expected = fromHex(verifier.hash);
    let difference = 0;
    for (let i = 0; i < expected.length; i++) difference |= actual[i] ^ expected[i];
    matched = matched || difference === 0;
  }
  return matched;
}
