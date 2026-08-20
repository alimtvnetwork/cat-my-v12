import { isAppError } from "../errors/AppError";

export enum LogLevelType {
  Info = "Info",
  Warn = "Warn",
  Error = "Error",
}

export interface ClientLoggerContext {
  CorrelationId?: string;
  [key: string]: unknown;
}

export interface ClientLoggerPayload {
  Level: LogLevelType;
  Message: string;
  Timestamp: string;
  Context?: ClientLoggerContext;
}

export class ClientLogger {
  private static formatLog(
    level: LogLevelType,
    message: string,
    context?: ClientLoggerContext,
  ): ClientLoggerPayload {
    return {
      Level: level,
      Message: message,
      Timestamp: new Date().toISOString(),
      Context: context,
    };
  }

  private static parseContext(
    contextOrError?: unknown,
    ...args: unknown[]
  ): ClientLoggerContext | undefined {
    let finalContext: ClientLoggerContext | undefined = undefined;

    if (isAppError(contextOrError)) {
      finalContext = {
        Code: contextOrError.code,
        Name: contextOrError.name,
        Message: contextOrError.message,
        Cause: contextOrError.cause,
      };
    } else if (contextOrError instanceof Error) {
      finalContext = {
        Name: contextOrError.name,
        Message: contextOrError.message,
        Stack: contextOrError.stack,
      };
    } else if (contextOrError !== undefined && contextOrError !== null) {
      finalContext =
        typeof contextOrError === "object"
          ? { ...(contextOrError as object) }
          : { data: contextOrError };
    }

    if (args.length > 0) {
      finalContext = {
        ...(finalContext || {}),
        args: args,
      };
    }

    return finalContext;
  }

  static info(message: string, context?: unknown, ...args: unknown[]): void {
    const finalContext = ClientLogger.parseContext(context, ...args);
    const payload = ClientLogger.formatLog(LogLevelType.Info, message, finalContext);
    console.info(JSON.stringify(payload));
  }

  static warn(message: string, context?: unknown, ...args: unknown[]): void {
    const finalContext = ClientLogger.parseContext(context, ...args);
    const payload = ClientLogger.formatLog(LogLevelType.Warn, message, finalContext);
    console.warn(JSON.stringify(payload));
  }

  static error(message: string, errorOrContext?: unknown, ...args: unknown[]): void {
    const finalContext = ClientLogger.parseContext(errorOrContext, ...args);
    const payload = ClientLogger.formatLog(LogLevelType.Error, message, finalContext);

    if (errorOrContext instanceof Error) {
      console.error(JSON.stringify(payload), errorOrContext);
    } else {
      console.error(JSON.stringify(payload));
    }
  }
}
