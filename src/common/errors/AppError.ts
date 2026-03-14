export class appError extends Error {
  public statusCode: number;
  public status: string;
  public errors: any;

  constructor(message: string, statusCode: number, errors?: any) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }
}
