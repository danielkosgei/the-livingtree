import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const profileTable = pgTable("profile", {
    id: uuid("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}).enableRLS();
