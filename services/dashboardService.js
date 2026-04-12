import { loanService } from "./loanService.js";
import { clientRepository } from "../repositories/clientRepository.js";
import { settingsService } from "./settingsService.js";
import { notificationService } from "./notificationService.js";
import { paymentRepository } from "../repositories/paymentRepository.js";
import { loanRepository } from "../repositories/loanRepository.js";

export const dashboardService = {
  async getStats() {
    const [loans, clients, settings, notifications, payments] = await Promise.all([
      loanService.list({}),
      clientRepository.list({}),
      settingsService.getCurrent(),
      notificationService.list({ status: "unread" }),
      paymentRepository.list({}),
    ]);

    return {
      total_loans: loans.length,
      active_loans: loans.filter((loan) => loan.status === "Active").length,
      due_soon_loans: loans.filter((loan) => loan.status === "Due Soon").length,
      overdue_loans: loans.filter((loan) => loan.status === "Overdue").length,
      completed_loans: loans.filter((loan) => loan.status === "Completed").length,
      defaulted_loans: loans.filter((loan) => loan.status === "Defaulted").length,
      total_capital_lent: Number(loans.reduce((sum, loan) => sum + Number(loan.amount || 0), 0).toFixed(2)),
      total_interest_earned: Number(
        loans
          .filter((loan) => loan.status === "Completed")
          .reduce((sum, loan) => sum + Number(loan.total_interest || 0), 0)
          .toFixed(2)
      ),
      total_outstanding_balance: Number(
        loans.reduce((sum, loan) => sum + Number(loan.total_outstanding || 0), 0).toFixed(2)
      ),
      total_collected: Number(payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0).toFixed(2)),
      total_clients: clients.length,
      total_notifications: notifications.length,
      capital_available: 0,
    };
  },

  async getAlerts() {
    const notifications = await notificationService.list({ status: "unread" });
    return notifications.slice(0, 10);
  },

  async getReportSummary() {
    const [loans, payments, monthlyLoans] = await Promise.all([
      loanService.list({}),
      paymentRepository.list({}),
      loanRepository.monthlyPortfolio(),
    ]);

    const collectionsByMonth = payments.reduce((accumulator, payment) => {
      const key = `${String(payment.payment_date).slice(0, 7)}-01`;
      accumulator[key] = Number((Number(accumulator[key] || 0) + Number(payment.amount || 0)).toFixed(2));
      return accumulator;
    }, {});

    return {
      summary: {
        total_disbursed: Number(loans.reduce((sum, loan) => sum + Number(loan.amount || 0), 0).toFixed(2)),
        total_collected: Number(payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0).toFixed(2)),
        overdue_loans: loans.filter((loan) => loan.status === "Overdue").length,
        active_loans: loans.filter((loan) => loan.status === "Active" || loan.status === "Due Soon").length,
        completed_loans: loans.filter((loan) => loan.status === "Completed").length,
        expected_payments: Number(loans.reduce((sum, loan) => sum + Number(loan.total_repayment || 0), 0).toFixed(2)),
        received_payments: Number(payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0).toFixed(2)),
      },
      monthly: monthlyLoans.map((row) => ({
        month: row.month_key,
        total_disbursed: Number(row.total_disbursed || 0),
        expected_interest: Number(row.expected_interest || 0),
        loans_created: Number(row.loans_created || 0),
        total_collected: Number(collectionsByMonth[row.month_key] || 0),
      })),
    };
  },
};
