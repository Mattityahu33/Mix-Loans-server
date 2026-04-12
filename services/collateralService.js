import { HTTP_STATUS } from "../constants/appConstants.js";
import { AppError } from "../utils/appError.js";
import { collateralRepository } from "../repositories/collateralRepository.js";
import { loanRepository } from "../repositories/loanRepository.js";
import { dbCollateralStatusToUi, dbLoanStatusToUi, uiCollateralStatusToDb } from "../utils/schemaAdapters.js";

const formatCollateral = (collateral) => ({
  ...collateral,
  id: String(collateral.id),
  loan_id: String(collateral.loan_id),
  client_id: String(collateral.client_id),
  loanStatus: dbLoanStatusToUi(collateral.loan_status),
  collateralStatus: dbCollateralStatusToUi(collateral.status),
});

export const collateralService = {
  async list(filters) {
    const records = await collateralRepository.list(filters);
    return records.map(formatCollateral);
  },

  async getById(id) {
    const collateral = await collateralRepository.findById(id);
    if (!collateral) {
      throw new AppError("Collateral not found", HTTP_STATUS.NOT_FOUND);
    }
    return formatCollateral(collateral);
  },

  async create(payload, connection) {
    const loan = await loanRepository.findById(payload.loan_id, connection);
    if (!loan) {
      throw new AppError("Loan not found", HTTP_STATUS.NOT_FOUND);
    }

    const collateralId = await collateralRepository.create(
      {
        loan_id: Number(payload.loan_id),
        client_id: Number(payload.client_id || loan.client_id),
        item_type: payload.item_type || "General",
        description: payload.description,
        serial_number: payload.serial_number || null,
        estimated_value: Number(payload.estimated_value ?? payload.collateral_value ?? 0),
        valuation_date: payload.valuation_date || null,
        status: uiCollateralStatusToDb(payload.collateral_status || payload.status),
        storage_location: payload.storage_location || null,
        notes: payload.notes || null,
      },
      connection
    );
    return formatCollateral(await collateralRepository.findById(collateralId, connection));
  },

  async update(id, payload, connection) {
    const fields = {};
    if (payload.description !== undefined) fields.description = payload.description;
    if (payload.item_type !== undefined) fields.item_type = payload.item_type;
    if (payload.serial_number !== undefined) fields.serial_number = payload.serial_number;
    if (payload.estimated_value !== undefined || payload.collateral_value !== undefined) {
      fields.estimated_value = Number(payload.estimated_value ?? payload.collateral_value ?? 0);
    }
    if (payload.valuation_date !== undefined) fields.valuation_date = payload.valuation_date;
    if (payload.collateral_status !== undefined || payload.status !== undefined) {
      fields.status = uiCollateralStatusToDb(payload.collateral_status || payload.status);
    }
    if (payload.storage_location !== undefined) fields.storage_location = payload.storage_location;
    if (payload.notes !== undefined) fields.notes = payload.notes;

    const updated = await collateralRepository.update(id, fields, connection);
    if (!updated) {
      throw new AppError("Collateral not found", HTTP_STATUS.NOT_FOUND);
    }
    return formatCollateral(await collateralRepository.findById(id, connection));
  },

  async remove(id, connection) {
    const removed = await collateralRepository.remove(id, connection);
    if (!removed) {
      throw new AppError("Collateral not found", HTTP_STATUS.NOT_FOUND);
    }
  },
};
