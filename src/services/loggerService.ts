import { thoughtStreamService } from "./thoughtStreamService";

type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR" | "SECURITY";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  metadata?: any;
}

/**
 * LoggerService
 * Provides structured, prioritized logging across the LUCA ecosystem.
 * Integrates with ThoughtStream for live diagnostic visibility.
 */
class LoggerService {
  private static instance: LoggerService;
  private readonly logLimit = 1000;
  private logs: LogEntry[] = [];

  private constructor() {}

  public static getInstance(): LoggerService {
    if (!LoggerService.instance) {
      LoggerService.instance = new LoggerService();
    }
    return LoggerService.instance;
  }

  private format(level: LogLevel, service: string, message: string, metadata?: any): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      service,
      message,
      metadata
    };
  }

  private persist(entry: LogEntry) {
    this.logs.push(entry);
    if (this.logs.length > this.logLimit) {
      this.logs.shift();
    }

    // Console output with color-matching logic
    const color = this.getColor(entry.level);
    console.log(`%c[${entry.level}] [${entry.service}] ${entry.message}`, `color: ${color}`, entry.metadata || '');
  }

  private getColor(level: LogLevel): string {
    switch (level) {
      case "ERROR": return "#ff4d4f";
      case "WARN": return "#faad14";
      case "SECURITY": return "#722ed1";
      case "DEBUG": return "#8c8c8c";
      default: return "#1890ff";
    }
  }

  public info(service: string, message: string, metadata?: any, pushToThoughtStream: boolean = false) {
    const entry = this.format("INFO", service, message, metadata);
    this.persist(entry);
    if (pushToThoughtStream) {
      thoughtStreamService.pushThought("OBSERVATION", `[${service}] ${message}`);
    }
  }

  public warn(service: string, message: string, metadata?: any, pushToThoughtStream: boolean = true) {
    const entry = this.format("WARN", service, message, metadata);
    this.persist(entry);
    if (pushToThoughtStream) {
      thoughtStreamService.pushThought("WARNING", `[${service}] ${message}`);
    }
  }

  public error(service: string, message: string, metadata?: any, pushToThoughtStream: boolean = true) {
    const entry = this.format("ERROR", service, message, metadata);
    this.persist(entry);
    if (pushToThoughtStream) {
      thoughtStreamService.pushThought("ERROR", `[${service}] ${message}`);
    }
  }

  public security(service: string, message: string, metadata?: any) {
    const entry = this.format("SECURITY", service, message, metadata);
    this.persist(entry);
    thoughtStreamService.pushThought("SECURITY", `[${service}] ${message}`);
  }

  public getRecentLogs(): LogEntry[] {
    return [...this.logs];
  }
}

export const loggerService = LoggerService.getInstance();
