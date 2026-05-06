import { InterpolationError } from './errors.js';

/**
 * Resolver function used by the {@link Interpolator} to look up the
 * value associated with a field name.
 */
export type FieldResolver = (field: string) => string | undefined;

/**
 * Returns a fresh `RegExp` matching `{field-name}` placeholders.
 *
 * A factory rather than a shared instance because callers may use it
 * with `replace`/`replaceAll`, which mutate the `lastIndex` state of
 * `g`-flagged regexes.
 */
export function placeholderRegex(): RegExp {
  return /\{([A-Za-z0-9_.\-]+)\}/g;
}

/** Returns true when `value` contains at least one `{field}` placeholder. */
export function hasPlaceholder(value: string): boolean {
  return /\{[A-Za-z0-9_.\-]+\}/.test(value);
}

/**
 * Resolves `{field}` placeholders inside a template string against a
 * resolver, with cycle detection.
 *
 * Single responsibility: pure string interpolation. The class owns no
 * mutable state across calls.
 */
export class Interpolator {
  private static readonly MAX_DEPTH = 16;

  /**
   * Expand `{field}` placeholders in `template`.
   *
   * @throws {InterpolationError} If a referenced field cannot be
   *   resolved or if a cycle is detected.
   */
  public expand(template: string, resolve: FieldResolver): string {
    return this.expandWithStack(template, resolve, new Set<string>(), 0);
  }

  private expandWithStack(
    template: string,
    resolve: FieldResolver,
    stack: Set<string>,
    depth: number,
  ): string {
    if (depth > Interpolator.MAX_DEPTH) {
      throw new InterpolationError('<depth>', template);
    }

    return template.replace(placeholderRegex(), (_match, field: string) => {
      if (stack.has(field)) {
        throw new InterpolationError(field, template);
      }
      const raw = resolve(field);
      if (raw === undefined) {
        throw new InterpolationError(field, template);
      }
      stack.add(field);
      try {
        return this.expandWithStack(raw, resolve, stack, depth + 1);
      } finally {
        stack.delete(field);
      }
    });
  }
}
