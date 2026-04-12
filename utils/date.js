export const toMysqlDate = (date) => {
  const value = new Date(date);
  return value.toISOString().split("T")[0];
};

export const addPeriods = (date, periods, frequency) => {
  const value = new Date(date);
  if (frequency === "Daily") {
    value.setDate(value.getDate() + periods);
  } else if (frequency === "Weekly") {
    value.setDate(value.getDate() + (periods * 7));
  } else if (frequency === "Biweekly") {
    value.setDate(value.getDate() + (periods * 14));
  } else {
    value.setMonth(value.getMonth() + periods);
  }
  return toMysqlDate(value);
};

export const addDays = (date, days) => {
  const value = new Date(date);
  value.setDate(value.getDate() + days);
  return toMysqlDate(value);
};

export const diffInDays = (fromDate, toDate = new Date()) => {
  const from = new Date(fromDate);
  const to = new Date(toDate);
  const milliseconds = to.setHours(0, 0, 0, 0) - from.setHours(0, 0, 0, 0);
  return Math.floor(milliseconds / 86400000);
};
