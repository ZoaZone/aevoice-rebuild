/**
 * Centralized logging utility for AEVOICE backend functions
 * Provides consistent logging format and error handling
 */

export interface LogContext {
  function?: string;
  userId?: string;
  clientId?: string;
  agentId?: string;
  sessionId?: string;
  // TYPE SAFETY FIX #18: Replaced `any` with `unknown` for dynamic properties
  // Requires explicit type checking before accessing indexed properties
  [key: string]: unknown;
}

/**
 * Log levels for different types of messages
 */
export enum LogLevel {
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
  CRITICAL = "CRITICAL",
}

/**
 * Format a log message with timestamp and context
 */
function formatLog(
  level: LogLevel,
  message: string,
  context?: LogContext,
): string {
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : "";
  return `[${timestamp}] [${level}] ${message}${contextStr}`;
}

/**
 * Log an informational message
 */
export function logInfo(message: string, context?: LogContext): void {
  console.log(formatLog(LogLevel.INFO, message, context));
}

/**
 * Log a debug message
 */
export function logDebug(message: string, context?: LogContext): void {
  console.log(formatLog(LogLevel.DEBUG, message, context));
}

/**
 * Log a warning message
 */
export function logWarn(message: string, context?: LogContext): void {
  console.warn(formatLog(LogLevel.WARN, message, context));
}

// TYPE SAFETY FIX: Import error utility
import { toLoggableError } from "../types/index.ts";

/**
 * Log an error with full stack trace
 * TYPE SAFETY FIX #5: Replaced `Error | any` with `unknown` and use toLoggableError utility
 */
export function logError(
  message: string,
  error?: unknown,
  context?: LogContext,
): void {
  const errorDetails = error ? toLoggableError(error) : undefined;

  const fullContext = { ...context, error: errorDetails };
  console.error(formatLog(LogLevel.ERROR, message, fullContext));
}

/**
 * Log a critical error that requires immediate attention
 * TYPE SAFETY FIX #6: Replaced `Error | any` with `unknown` and use toLoggableError utility
 */
export function logCritical(
  message: string,
  error?: unknown,
  context?: LogContext,
): void {
  const errorDetails = error ? toLoggableError(error) : undefined;

  const fullContext = { ...context, error: errorDetails };
  console.error(formatLog(LogLevel.CRITICAL, message, fullContext));
}

// TYPE SAFETY FIX: Import loggable types to replace `any`
import type { LoggableParams, LoggableResult } from "../types/index.ts";

/**
 * Log function entry with parameters
 * TYPE SAFETY FIX #3: Replaced `any` with `LoggableParams` to ensure only serializable values are logged
 */
export function logFunctionEntry(
  functionName: string,
  params?: LoggableParams,
): void {
  const context: LogContext = { function: functionName };
  if (params) {
    context.params = params;
  }
  logInfo(`Function ${functionName} called`, context);
}

/**
 * Log function exit with result
 * TYPE SAFETY FIX #4: Replaced `any` with `LoggableResult` to prevent logging non-serializable values
 */
export function logFunctionExit(
  functionName: string,
  result?: LoggableResult,
): void {
  const context: LogContext = { function: functionName };
  if (result) {
    context.result = result;
  }
  logInfo(`Function ${functionName} completed`, context);
}

/**
 * Log an API request
 */
export function logApiRequest(
  method: string,
  path: string,
  context?: LogContext,
): void {
  logInfo(`API Request: ${method} ${path}`, { ...context, method, path });
}

/**
 * Log an API response
 */
export function logApiResponse(
  method: string,
  path: string,
  statusCode: number,
  context?: LogContext,
): void {
  logInfo(`API Response: ${method} ${path} - ${statusCode}`, {
    ...context,
    method,
    path,
    statusCode,
  });
}

/**
 * Log database operation
 */
export function logDbOperation(
  operation: string,
  entity: string,
  context?: LogContext,
): void {
  logInfo(`DB ${operation}: ${entity}`, { ...context, operation, entity });
}

/**
 * Log database error
 * TYPE SAFETY FIX #7: Replaced `Error | any` with `unknown` (will be converted by logError)
 */
export function logDbError(
  operation: string,
  entity: string,
  error: unknown,
  context?: LogContext,
): void {
  logError(`DB Error during ${operation} on ${entity}`, error, {
    ...context,
    operation,
    entity,
  });
}

// TYPE SAFETY FIX: Import validation type
import type { ValidationValue } from "../types/index.ts";

/**
 * Log validation error
 * TYPE SAFETY FIX #8: Replaced `any` with `ValidationValue` to ensure only serializable values are logged
 */
export function logValidationError(
  field: string,
  value: ValidationValue,
  reason: string,
  context?: LogContext,
): void {
  logWarn(`Validation failed for ${field}: ${reason}`, {
    ...context,
    field,
    value,
    reason,
  });
}

/**
 * Wrap a function with logging
 * TYPE SAFETY FIX #9-10: Replaced `any` in generic function wrapper with `unknown`
 * This maintains type safety while allowing any function to be wrapped
 */
export function withLogging<T extends (...args: unknown[]) => unknown>(
  functionName: string,
  fn: T,
): T {
  return ((...args: unknown[]) => {
    logFunctionEntry(functionName, args as LoggableParams);
    try {
      const result = fn(...args);
      // Check if result is a Promise
      if (result && typeof result.then === "function") {
        return result
          .then((res: unknown) => {
            logFunctionExit(functionName, res as LoggableResult);
            return res;
          })
          .catch((error: unknown) => {
            logError(`Error in ${functionName}`, error, {
              function: functionName,
            });
            throw error;
          });
      } else {
        logFunctionExit(functionName, result);
        return result;
      }
    } catch (error) {
      logError(`Error in ${functionName}`, error, { function: functionName });
      throw error;
    }
  }) as T;
}
