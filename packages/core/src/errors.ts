/**
 * Typed errors for the Recog engine. All errors are intentionally
 * thrown rather than returned, in line with the project's
 * fail-loud-and-fast policy.
 */

/** Base class for all engine errors. */
export class RecogError extends Error {
  public override readonly name: string = 'RecogError';
}

/** Thrown when XML cannot be parsed or is structurally invalid. */
export class XmlParseError extends RecogError {
  public override readonly name = 'XmlParseError';
  public constructor(message: string, public readonly file?: string) {
    super(file !== undefined ? `${file}: ${message}` : message);
  }
}

/** Thrown when a regex pattern fails to compile. */
export class RegexCompileError extends RecogError {
  public override readonly name = 'RegexCompileError';
  public constructor(
    public readonly pattern: string,
    public readonly flags: string,
    cause: unknown,
  ) {
    super(
      `Failed to compile pattern /${pattern}/${flags}: ${
        cause instanceof Error ? cause.message : String(cause)
      }`,
    );
  }
}

/** Thrown when a flag string contains an unknown Recog flag name. */
export class UnknownFlagError extends RecogError {
  public override readonly name = 'UnknownFlagError';
  public constructor(public readonly flag: string) {
    super(`Unknown Recog regex flag: ${flag}`);
  }
}

/** Thrown when interpolation references an unresolved field. */
export class InterpolationError extends RecogError {
  public override readonly name = 'InterpolationError';
  public constructor(public readonly field: string, public readonly template: string) {
    super(`Unresolved interpolation field {${field}} in template "${template}"`);
  }
}

/** Thrown when a database is requested but unknown to the engine. */
export class UnknownDatabaseError extends RecogError {
  public override readonly name = 'UnknownDatabaseError';
  public constructor(public readonly db: string) {
    super(`Unknown fingerprint database: ${db}`);
  }
}

/** Thrown when fingerprint examples fail verification. */
export class VerificationError extends RecogError {
  public override readonly name = 'VerificationError';
  public constructor(message: string) {
    super(message);
  }
}
