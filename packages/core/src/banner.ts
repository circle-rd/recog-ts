/**
 * Helpers for normalising raw banner input received from external
 * callers (HTTP, MCP, CLI) into the binary-safe string the engine
 * expects.
 */

/** Encoding tags accepted by API and MCP surfaces. */
export type BannerEncoding = 'utf8' | 'base64';

/**
 * Decode `data` according to `encoding`. `latin1` is used for the
 * base64 path because Recog patterns frequently embed non-UTF-8
 * bytes (LDAP BER, x.509 DNs, JARM hashes...) that would otherwise
 * be corrupted by UTF-8 replacement.
 */
export function decodeBanner(data: string, encoding: BannerEncoding | undefined): string {
  if (encoding === 'base64') {
    return Buffer.from(data, 'base64').toString('latin1');
  }
  return data;
}
