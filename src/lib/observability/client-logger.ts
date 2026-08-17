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

  static error(message: string, context?: ClientLoggerContext): void {
    const payload = ClientLogger.formatLog(LogLevelType.Error, message, context);
    console.error(JSON.stringify(payload));
  }
}
