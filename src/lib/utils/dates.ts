import {
  format,
  startOfWeek,
  endOfWeek,
  subWeeks,
  addWeeks,
  parseISO,
  isValid,
  differenceInDays,
  isBefore,
  isAfter,
} from "date-fns";

export const toISODate = (d: Date) => format(d, "yyyy-MM-dd");

export const formatDisplay = (d: string | Date) => {
  const date = typeof d === "string" ? parseISO(d) : d;
  return isValid(date) ? format(date, "MMM d, yyyy") : "—";
};

export const formatShort = (d: string | Date) => {
  const date = typeof d === "string" ? parseISO(d) : d;
  return isValid(date) ? format(date, "MMM d") : "—";
};

export const getWeekRange = (date: Date = new Date()) => ({
  start: toISODate(startOfWeek(date, { weekStartsOn: 1 })),
  end: toISODate(endOfWeek(date, { weekStartsOn: 1 })),
});

export const getPrevWeekRange = (date: Date = new Date()) =>
  getWeekRange(subWeeks(date, 1));

export const getNextWeekRange = (date: Date = new Date()) =>
  getWeekRange(addWeeks(date, 1));

export { parseISO, isValid, differenceInDays, isBefore, isAfter, format };
