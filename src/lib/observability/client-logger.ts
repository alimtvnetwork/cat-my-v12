export class ClientLogger {
  static info(message: string, ...args: any[]) {
    console.info(message, ...args);
  }

  static warn(message: string, ...args: any[]) {
    console.warn(message, ...args);
  }

  static error(message: string, ...args: any[]) {
    console.error(message, ...args);
  }
}
