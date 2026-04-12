import { NOTIFICATION_TYPES } from "../constants/appConstants.js";
import { LOAN_STATUS } from "../constants/loanConstants.js";
import { notificationRepository } from "../repositories/notificationRepository.js";
import { dbLoanStatusToUi } from "../utils/schemaAdapters.js";

export const notificationService = {
  async list(filters, connection) {
    const notifications = await notificationRepository.list(filters, connection);
    return notifications.map((notification) => ({
      ...notification,
      id: String(notification.id),
      loan_id: notification.related_loan_id ? String(notification.related_loan_id) : null,
      client_id: notification.related_client_id ? String(notification.related_client_id) : null,
      status: notification.is_read ? "read" : "unread",
    }));
  },

  async notifyLoanStatus(loan, connection) {
    const statusToType = {
      [LOAN_STATUS.DUE_SOON]: {
        type: NOTIFICATION_TYPES.DUE_SOON,
        title: "Loan due soon",
        severity: "warning",
      },
      [LOAN_STATUS.OVERDUE]: {
        type: NOTIFICATION_TYPES.OVERDUE,
        title: "Loan overdue",
        severity: "warning",
      },
      [LOAN_STATUS.DEFAULTED]: {
        type: NOTIFICATION_TYPES.DEFAULTED,
        title: "Loan defaulted",
        severity: "critical",
      },
    };

    const definition = statusToType[loan.status];
    if (!definition) {
      await notificationRepository.markResolvedByLoanAndTypes(
        loan.id,
        [
          NOTIFICATION_TYPES.DUE_SOON,
          NOTIFICATION_TYPES.OVERDUE,
          NOTIFICATION_TYPES.DEFAULTED,
        ],
        connection
      );
      return;
    }

    const existing = await notificationRepository.findExisting(definition.type, loan.id, 0, connection);
    if (existing) {
      return;
    }

    await notificationRepository.create(
      {
        related_loan_id: loan.id,
        related_client_id: loan.client_id,
        type: definition.type,
        title: definition.title,
        message: `${loan.client_name} - ${loan.loan_code || loan.id} is currently ${dbLoanStatusToUi(loan.status)}.`,
        severity: definition.severity,
      },
      connection
    );
  },

  async notifyPaymentRecorded({ loan, payment, completed }, connection) {
    const type = completed ? NOTIFICATION_TYPES.PAYMENT_COMPLETED : NOTIFICATION_TYPES.PAYMENT_RECORDED;
    const title = completed ? "Loan completed" : "Payment recorded";
    const message = completed
      ? `${loan.client_name} completed loan ${loan.loan_code || loan.id}.`
      : `Payment of ${payment.amount} was recorded for loan ${loan.loan_code || loan.id}.`;

    await notificationRepository.create(
      {
        related_loan_id: loan.id,
        related_client_id: loan.client_id,
        type,
        title,
        message: completed ? message : `${message} Remaining balance is ${loan.remaining_balance}.`,
        severity: completed ? "success" : "info",
      },
      connection
    );
  },
};
