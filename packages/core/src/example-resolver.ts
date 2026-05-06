import { readFileSync } from 'node:fs';
import {
  basename,
  dirname,
  extname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from 'node:path';
import { XmlParseError } from './errors.js';

/**
 * Resolves the textual content of an `<example>` element from its
 * raw XML attributes and inner text.
 *
 * Single responsibility: handle `_encoding="base64"` and
 * `_filename="..."` semantics in a sandbox-safe way.
 */
export class ExampleResolver {
  public constructor(private readonly xmlFilePath: string | undefined) {}

  /**
   * Resolve the literal example text.
   *
   * @param innerText - The textual content of the `<example>` node
   *   (possibly empty when `_filename` is used).
   * @param encoding - The `_encoding` attribute, if any.
   * @param filename - The `_filename` attribute, if any.
   */
  public resolve(
    innerText: string,
    encoding: string | undefined,
    filename: string | undefined,
  ): string {
    if (filename !== undefined && filename !== '') {
      return this.readSiblingFile(filename);
    }
    if (encoding === 'base64') {
      const cleaned = innerText.replace(/\s+/g, '');
      return Buffer.from(cleaned, 'base64').toString('latin1');
    }
    if (encoding !== undefined && encoding !== '') {
      throw new XmlParseError(`Unsupported _encoding="${encoding}" on <example>`, this.xmlFilePath);
    }
    return innerText;
  }

  private readSiblingFile(filename: string): string {
    if (this.xmlFilePath === undefined) {
      throw new XmlParseError(
        `Cannot resolve _filename="${filename}": no XML file path context`,
      );
    }
    if (isAbsolute(filename)) {
      throw new XmlParseError(
        `_filename="${filename}" must be relative`,
        this.xmlFilePath,
      );
    }
    const xmlDir = dirname(this.xmlFilePath);
    const baseName = basename(this.xmlFilePath, extname(this.xmlFilePath));
    const sandboxDir = resolve(join(xmlDir, baseName));
    const candidate = resolve(join(sandboxDir, filename));

    // Sandbox check: candidate must remain inside sandboxDir.
    // Reject any relative path that starts with `..` followed by a
    // separator, equals `..`, or that resolves to an absolute path
    // (which `relative` returns when traversing across drives on
    // Windows or following symlinks).
    const rel = relative(sandboxDir, candidate);
    const escapes =
      rel === '..' ||
      rel.startsWith(`..${sep}`) ||
      rel.startsWith('../') ||
      isAbsolute(rel);
    if (escapes) {
      throw new XmlParseError(
        `_filename="${filename}" escapes sandbox`,
        this.xmlFilePath,
      );
    }
    return readFileSync(candidate, { encoding: 'latin1' });
  }
}
