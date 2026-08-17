import { isAppError } from "../errors/AppError";

export enum LogLevelType {
  Info = 'Info',
  Warn = 'Warn',
  Error = 'Error',
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
  private static formatLog(level: LogLevelType, message: string, context?: ClientLoggerContext): ClientLoggerPayload {
    return {
      Level: level,
      Message: message,
      Timestamp: new Date().toISOString(),
      Context: context,
    };
  }

  static info(message: string, context?: ClientLoggerContext): void {
    const payload = ClientLogger.formatLog(LogLevelType.Info, message, context);
    console.info(JSON.stringify(payload));
  }

  static warn(message: string, context?: ClientLoggerContext): void {
    const payload = ClientLogger.formatLog(LogLevelType.Warn, message, context);
    // Telemetry mapping could be placed here
    console.warn(JSON.stringify(payload));
  }

  static error(message: string, errorOrContext?: unknown): void {
    let finalContext: ClientLoggerContext | undefined = undefined;

    if (isAppError(errorOrContext)) {
      finalContext = {
        Code: errorOrContext.code,
        Name: errorOrContext.name,
        Message: errorOrContext.message,
        Cause: errorOrContext.cause,
      };
    } else if (errorOrContext instanceof Error) {
      finalContext = {
        Name: errorOrContext.name,
        Message: errorOrContext.message,
        Stack: errorOrContext.stack,
      };
    } else if (errorOrContext !== undefined && errorOrContext !== null) {
      finalContext = typeof errorOrContext === 'object' ? errorOrContext as ClientLoggerContext : { data: errorOrContext };
    }

    const payload = ClientLogger.formatLog(LogLevelType.Error, message, finalContext);
    
    if (errorOrContext instanceof Error) {
      console.error(JSON.stringify(payload), errorOrContext);
    } else {
      console.error(JSON.stringify(payload));
    }
  }
}
