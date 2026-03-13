/**
 * payHelloBizClient.ts
 *
 * API client for Pay.hellobiz.app financial management system
 * Provides accounting, payroll, transactions, invoices, and reporting
 *
 * @module payHelloBizClient
 */

import { logger } from "./infra/logger.ts";

const PAY_HELLOBIZ_API_URL = Deno.env.get("PAY_HELLOBIZ_API_URL") ||
  "https://pay.hellobiz.app/api";
const PAY_HELLOBIZ_API_KEY = Deno.env.get("PAY_HELLOBIZ_API_KEY");

interface PayHelloBizConfig {
  apiUrl?: string;
  apiKey?: string;
  timeout?: number;
}

interface AccountingEntry {
  date: string;
  type: "income" | "expense" | "asset" | "liability";
  category: string;
  amount: number;
  description: string;
  clientId?: string;
  agencyId?: string;
  metadata?: Record<string, unknown>;
}

interface PayrollEntry {
  employeeId: string;
  employeeName: string;
  period: string;
  basicPay: number;
  allowances?: number;
  deductions?: number;
  netPay: number;
  status: "pending" | "processed" | "paid";
  metadata?: Record<string, unknown>;
}

interface Transaction {
  transactionId: string;
  date: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  clientId?: string;
  agencyId?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

interface Invoice {
  invoiceNumber: string;
  clientId: string;
  agencyId?: string;
  issueDate: string;
  dueDate: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  metadata?: Record<string, unknown>;
}

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

interface FinancialReport {
  reportType:
    | "income_statement"
    | "balance_sheet"
    | "cash_flow"
    | "profit_loss";
  period: string;
  startDate: string;
  endDate: string;
  data: Record<string, unknown>;
  summary: {
    totalIncome?: number;
    totalExpenses?: number;
    netProfit?: number;
    assets?: number;
    liabilities?: number;
    equity?: number;
  };
}

interface ReconciliationResult {
  reconciliationId: string;
  date: string;
  accountType: string;
  matchedCount: number;
  unmatchedCount: number;
  discrepancyAmount: number;
  status: "in_progress" | "completed" | "failed";
  items: ReconciliationItem[];
}

interface ReconciliationItem {
  itemId: string;
  type: string;
  amount: number;
  status: "matched" | "unmatched" | "discrepancy";
  details?: Record<string, unknown>;
}

export class PayHelloBizClient {
  private apiUrl: string;
  private apiKey: string;
  private timeout: number;

  constructor(config: PayHelloBizConfig = {}) {
    this.apiUrl = config.apiUrl || PAY_HELLOBIZ_API_URL;
    this.apiKey = config.apiKey || PAY_HELLOBIZ_API_KEY || "";
    this.timeout = config.timeout || 30000;

    if (!this.apiKey) {
      logger.warn(
        "PAY_HELLOBIZ_API_KEY not configured - Pay.hellobiz.app integration disabled",
      );
    }
  }

  /**
   * Make authenticated request to Pay.hellobiz.app API
   */
  private async makeRequest(
    endpoint: string,
    method: string = "GET",
    body?: Record<string, unknown>,
  ): Promise<unknown> {
    if (!this.apiKey) {
      throw new Error("Pay.hellobiz.app API key not configured");
    }

    const url = `${this.apiUrl}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const headers: Record<string, string> = {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      };

      const options: RequestInit = {
        method,
        headers,
        signal: controller.signal,
      };

      if (
        body && (method === "POST" || method === "PATCH" || method === "PUT")
      ) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Pay.hellobiz.app API error (${response.status}): ${errorText}`,
        );
      }

      return await response.json();
    } catch (error) {
      if (error.name === "AbortError") {
        throw new Error(`Pay.hellobiz.app API timeout after ${this.timeout}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * ACCOUNTING API
   */

  /**
   * Create accounting entry
   */
  async createAccountingEntry(
    entry: AccountingEntry,
  ): Promise<{ success: boolean; entryId: string }> {
    logger.info("Creating accounting entry", {
      type: entry.type,
      amount: entry.amount,
    });

    const result = await this.makeRequest(
      "/v1/accounting/entries",
      "POST",
      entry,
    );
    return result as { success: boolean; entryId: string };
  }

  /**
   * Get accounting entries
   */
  async getAccountingEntries(filters?: {
    startDate?: string;
    endDate?: string;
    type?: string;
    clientId?: string;
    agencyId?: string;
  }): Promise<AccountingEntry[]> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value.toString());
      });
    }

    const result = await this.makeRequest(
      `/v1/accounting/entries?${params.toString()}`,
    );
    return (result as { entries: AccountingEntry[] }).entries;
  }

  /**
   * PAYROLL API
   */

  /**
   * Create payroll entry
   */
  async createPayrollEntry(
    entry: PayrollEntry,
  ): Promise<{ success: boolean; payrollId: string }> {
    logger.info("Creating payroll entry", {
      employeeId: entry.employeeId,
      netPay: entry.netPay,
    });

    const result = await this.makeRequest("/v1/payroll/entries", "POST", entry);
    return result as { success: boolean; payrollId: string };
  }

  /**
   * Get payroll entries
   */
  async getPayrollEntries(filters?: {
    period?: string;
    employeeId?: string;
    status?: string;
  }): Promise<PayrollEntry[]> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value.toString());
      });
    }

    const result = await this.makeRequest(
      `/v1/payroll/entries?${params.toString()}`,
    );
    return (result as { entries: PayrollEntry[] }).entries;
  }

  /**
   * Process payroll for period
   */
  async processPayroll(
    period: string,
  ): Promise<{ success: boolean; processedCount: number }> {
    logger.info("Processing payroll", { period });

    const result = await this.makeRequest("/v1/payroll/process", "POST", {
      period,
    });
    return result as { success: boolean; processedCount: number };
  }

  /**
   * TRANSACTION API
   */

  /**
   * Record transaction
   */
  async recordTransaction(
    transaction: Omit<Transaction, "transactionId">,
  ): Promise<{ success: boolean; transactionId: string }> {
    logger.info("Recording transaction", {
      type: transaction.type,
      amount: transaction.amount,
    });

    const result = await this.makeRequest(
      "/v1/transactions",
      "POST",
      transaction,
    );
    return result as { success: boolean; transactionId: string };
  }

  /**
   * Get transactions
   */
  async getTransactions(filters?: {
    startDate?: string;
    endDate?: string;
    type?: string;
    clientId?: string;
    agencyId?: string;
    status?: string;
  }): Promise<Transaction[]> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value.toString());
      });
    }

    const result = await this.makeRequest(
      `/v1/transactions?${params.toString()}`,
    );
    return (result as { transactions: Transaction[] }).transactions;
  }

  /**
   * INVOICE API
   */

  /**
   * Generate invoice
   */
  async generateInvoice(
    invoice: Omit<Invoice, "invoiceNumber">,
  ): Promise<{ success: boolean; invoiceNumber: string; invoiceUrl: string }> {
    logger.info("Generating invoice", {
      clientId: invoice.clientId,
      total: invoice.total,
    });

    const result = await this.makeRequest("/v1/invoices", "POST", invoice);
    return result as {
      success: boolean;
      invoiceNumber: string;
      invoiceUrl: string;
    };
  }

  /**
   * Get invoice by number
   */
  async getInvoice(invoiceNumber: string): Promise<Invoice> {
    const result = await this.makeRequest(`/v1/invoices/${invoiceNumber}`);
    return result as Invoice;
  }

  /**
   * Get invoices
   */
  async getInvoices(filters?: {
    clientId?: string;
    agencyId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<Invoice[]> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value.toString());
      });
    }

    const result = await this.makeRequest(`/v1/invoices?${params.toString()}`);
    return (result as { invoices: Invoice[] }).invoices;
  }

  /**
   * Update invoice status
   */
  async updateInvoiceStatus(
    invoiceNumber: string,
    status: Invoice["status"],
  ): Promise<{ success: boolean }> {
    logger.info("Updating invoice status", { invoiceNumber, status });

    const result = await this.makeRequest(
      `/v1/invoices/${invoiceNumber}/status`,
      "PATCH",
      { status },
    );
    return result as { success: boolean };
  }

  /**
   * FINANCIAL REPORTING API
   */

  /**
   * Generate financial report
   */
  async generateFinancialReport(
    reportType: FinancialReport["reportType"],
    startDate: string,
    endDate: string,
    filters?: {
      clientId?: string;
      agencyId?: string;
    },
  ): Promise<FinancialReport> {
    logger.info("Generating financial report", {
      reportType,
      startDate,
      endDate,
    });

    const body = {
      reportType,
      startDate,
      endDate,
      ...filters,
    };

    const result = await this.makeRequest("/v1/reports/generate", "POST", body);
    return result as FinancialReport;
  }

  /**
   * Get dashboard summary
   */
  async getDashboardSummary(filters?: {
    clientId?: string;
    agencyId?: string;
    period?: string;
  }): Promise<{
    revenue: number;
    expenses: number;
    netProfit: number;
    outstandingInvoices: number;
    pendingPayroll: number;
    recentTransactions: Transaction[];
  }> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value.toString());
      });
    }

    const result = await this.makeRequest(
      `/v1/dashboard/summary?${params.toString()}`,
    );
    return result as {
      revenue: number;
      expenses: number;
      netProfit: number;
      outstandingInvoices: number;
      pendingPayroll: number;
      recentTransactions: Transaction[];
    };
  }

  /**
   * AUTO-RECONCILIATION API
   */

  /**
   * Perform auto-reconciliation
   */
  async performReconciliation(
    accountType: string,
    startDate: string,
    endDate: string,
  ): Promise<ReconciliationResult> {
    logger.info("Performing auto-reconciliation", {
      accountType,
      startDate,
      endDate,
    });

    const result = await this.makeRequest("/v1/reconciliation/auto", "POST", {
      accountType,
      startDate,
      endDate,
    });

    return result as ReconciliationResult;
  }

  /**
   * Get reconciliation status
   */
  async getReconciliationStatus(
    reconciliationId: string,
  ): Promise<ReconciliationResult> {
    const result = await this.makeRequest(
      `/v1/reconciliation/${reconciliationId}`,
    );
    return result as ReconciliationResult;
  }

  /**
   * Resolve reconciliation discrepancy
   */
  async resolveDiscrepancy(
    reconciliationId: string,
    itemId: string,
    resolution: "accept" | "reject" | "manual_adjustment",
    notes?: string,
  ): Promise<{ success: boolean }> {
    logger.info("Resolving reconciliation discrepancy", {
      reconciliationId,
      itemId,
      resolution,
    });

    const result = await this.makeRequest(
      `/v1/reconciliation/${reconciliationId}/resolve`,
      "POST",
      {
        itemId,
        resolution,
        notes,
      },
    );

    return result as { success: boolean };
  }

  /**
   * USAGE SYNC (for AEVOICE cost tracking integration)
   */

  /**
   * Sync usage costs to Pay.hellobiz.app
   */
  async syncUsageCosts(data: {
    clientId: string;
    agencyId?: string;
    period: string;
    costs: {
      aiLlmCost: number;
      voiceTtsCost: number;
      telephonyCost: number;
      platformOverheadCost: number;
      totalCost: number;
    };
    revenue: {
      grossRevenue: number;
      netProfit: number;
      agencyShare: number;
      platformShare: number;
    };
    usageDetails?: Record<string, unknown>;
  }): Promise<{ success: boolean; syncId: string }> {
    logger.info("Syncing usage costs to Pay.hellobiz.app", {
      clientId: data.clientId,
      period: data.period,
      totalCost: data.costs.totalCost,
    });

    const result = await this.makeRequest("/v1/usage-sync", "POST", data);
    return result as { success: boolean; syncId: string };
  }
}

/**
 * Create default Pay.hellobiz.app client instance
 */
export function createPayHelloBizClient(
  config?: PayHelloBizConfig,
): PayHelloBizClient {
  return new PayHelloBizClient(config);
}
