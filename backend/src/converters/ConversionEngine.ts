import {
  ConversionFile,
  ConversionResult,
  ValidationResult,
  OutputFormat,
  SupportedFormat,
} from '../types';

/**
 * Abstract interface that every conversion engine must implement.
 * To add a new converter: implement this interface and register it in registry.ts.
 */
export interface ConversionEngine {
  /** Human-readable name for logging and debugging */
  readonly name: string;

  /** MIME types this engine can handle as input */
  readonly supportedInputMimeTypes: string[];

  /** File extensions this engine can handle (as fallback) */
  readonly supportedInputExtensions: string[];

  /** Output formats this engine can produce */
  readonly supportedOutputFormats: OutputFormat[];

  /** Maximum file size this engine can handle */
  readonly maxFileSizeMB: number;

  /** Metadata about supported formats (used for /api/formats endpoint) */
  readonly supportedFormatsMeta: SupportedFormat[];

  /**
   * Validate engine-specific constraints beyond basic file validation.
   * Called after basic file validation passes.
   */
  validate(file: ConversionFile): Promise<ValidationResult>;

  /**
   * Perform the actual conversion.
   * Must write the output file to the provided outputDir.
   * Must NOT expose filesystem paths to the outside world.
   * Must NOT execute file contents.
   */
  convert(file: ConversionFile, outputDir: string): Promise<ConversionResult>;
}
