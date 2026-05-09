import { pgTable, pgEnum } from "drizzle-orm/pg-core";

export const dabbaSchema = {
  table: pgTable,
  enum: pgEnum,
};
