import { HTTP_STATUS } from "../constants/appConstants.js";
import { AppError } from "../utils/appError.js";
import { clientRepository } from "../repositories/clientRepository.js";
import { loanRepository } from "../repositories/loanRepository.js";
import { dbLoanStatusToUi } from "../utils/schemaAdapters.js";

const formatClientLoan = (loan) => ({
  id: String(loan.id),
  loan_code: loan.loan_code,
  status: dbLoanStatusToUi(loan.status),
  remaining_balance: Number(loan.remaining_balance || 0),
});

export const clientService = {
  async list(filters) {
    return clientRepository.list(filters);
  },

  async getById(id) {
    const client = await clientRepository.findById(id);
    if (!client) {
      throw new AppError("Client not found", HTTP_STATUS.NOT_FOUND);
    }
    return client;
  },

  async getLoans(id) {
    await this.getById(id);
    const loans = await loanRepository.listByClientId(id);
    return loans.map(formatClientLoan);
  },

  async create(payload) {
    const clientId = await clientRepository.create(payload);
    return clientRepository.findById(clientId);
  },

  async update(id, payload) {
    const updated = await clientRepository.update(id, payload);
    if (!updated) {
      throw new AppError("Client not found", HTTP_STATUS.NOT_FOUND);
    }
    return clientRepository.findById(id);
  },

  async remove(id) {
    const removed = await clientRepository.remove(id);
    if (!removed) {
      throw new AppError("Client not found", HTTP_STATUS.NOT_FOUND);
    }
  },
};
