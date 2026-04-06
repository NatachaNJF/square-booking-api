import { mysqlTable, int, varchar, timestamp, datetime, decimal, mysqlEnum, boolean, text } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";
/**
 * Users (Internes & Admins)
 */
export const users = mysqlTable("users", {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    passwordHash: varchar("passwordHash", { length: 255 }), // Nullable car les simples utilisateurs utilisent le lien magique
    role: mysqlEnum("role", ["admin", "user"]).default("user").notNull(),
    magicLinkToken: varchar("magicLinkToken", { length: 255 }),
    tokenExpiresAt: datetime("tokenExpiresAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
/**
 * Quotas des utilisateurs internes (décrémentation)
 */
export const userQuotas = mysqlTable("userQuotas", {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id),
    quotaLimit: int("quotaLimit").notNull().default(10), // Total allowed
    quotaUsed: int("quotaUsed").notNull().default(0), // Track usage
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
/**
 * External Users (Clients sans compte)
 */
export const externalUsers = mysqlTable("externalUsers", {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 255 }),
    company: varchar("company", { length: 255 }),
    vatNumber: varchar("vatNumber", { length: 255 }),
    address: text("address"),
    magicLinkToken: varchar("magicLinkToken", { length: 255 }).unique(), // Lien magique unique
    createdAt: timestamp("createdAt").defaultNow().notNull(),
});
/**
 * Rooms
 */
export const rooms = mysqlTable("rooms", {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    area: int("area").notNull(),
    capacity: int("capacity").notNull(),
    description: text("description"),
    pricePerHour: decimal("pricePerHour", { precision: 8, scale: 2 }).notNull(),
    priceHalfDay: decimal("priceHalfDay", { precision: 8, scale: 2 }).notNull(),
    priceFullDay: decimal("priceFullDay", { precision: 8, scale: 2 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
/**
 * Room Setups
 */
export const roomSetups = mysqlTable("roomSetups", {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
});
/**
 * Additional Options
 */
export const additionalOptions = mysqlTable("additionalOptions", {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    category: varchar("category", { length: 255 }), // e.g. "beverage", "equipment"
    price: decimal("price", { precision: 8, scale: 2 }).notNull(),
    pricePerPerson: boolean("pricePerPerson").default(false),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
/**
 * Reservations
 */
export const reservations = mysqlTable("reservations", {
    id: int("id").autoincrement().primaryKey(),
    roomId: int("roomId").notNull().references(() => rooms.id),
    internalUserId: int("internalUserId").references(() => users.id),
    externalUserId: int("externalUserId").references(() => externalUsers.id),
    startTime: datetime("startTime").notNull(),
    endTime: datetime("endTime").notNull(),
    duration: decimal("duration", { precision: 8, scale: 2 }).notNull(),
    status: mysqlEnum("status", ["pending", "confirmed", "rejected", "cancelled"]).default("pending").notNull(),
    pricePerUnit: decimal("pricePerUnit", { precision: 8, scale: 2 }).notNull(),
    subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
    eveningSupplement: decimal("eveningSupplement", { precision: 10, scale: 2 }).notNull().default("0"),
    saturdaySupplement: decimal("saturdaySupplement", { precision: 10, scale: 2 }).notNull().default("0"),
    beveragePackage: boolean("beveragePackage").default(false),
    beverageCount: int("beverageCount").default(0),
    beveragePrice: decimal("beveragePrice", { precision: 10, scale: 2 }).notNull().default("0"),
    totalPrice: decimal("totalPrice", { precision: 10, scale: 2 }).notNull(),
    notes: text("notes"),
    setupId: int("setupId").references(() => roomSetups.id),
    odooActivityId: int("odooActivityId"),
    skipCleaningBuffer: boolean("skipCleaningBuffer").default(false), // Admin can skip the 30min cleaning buffer
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
/**
 * Reservation options (many-to-many)
 */
export const reservationOptions = mysqlTable("reservationOptions", {
    id: int("id").autoincrement().primaryKey(),
    reservationId: int("reservationId").notNull().references(() => reservations.id),
    optionId: int("optionId").notNull().references(() => additionalOptions.id),
    quantity: int("quantity").default(1),
    price: decimal("price", { precision: 10, scale: 2 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
});
/**
 * Relations
 */
export const userQuotasRelations = relations(userQuotas, ({ one }) => ({
    user: one(users, {
        fields: [userQuotas.userId],
        references: [users.id],
    }),
}));
export const reservationsRelations = relations(reservations, ({ one, many }) => ({
    room: one(rooms, {
        fields: [reservations.roomId],
        references: [rooms.id],
    }),
    internalUser: one(users, {
        fields: [reservations.internalUserId],
        references: [users.id],
    }),
    externalUser: one(externalUsers, {
        fields: [reservations.externalUserId],
        references: [externalUsers.id],
    }),
    setup: one(roomSetups, {
        fields: [reservations.setupId],
        references: [roomSetups.id],
    }),
    options: many(reservationOptions),
}));
export const reservationOptionsRelations = relations(reservationOptions, ({ one }) => ({
    reservation: one(reservations, {
        fields: [reservationOptions.reservationId],
        references: [reservations.id],
    }),
    option: one(additionalOptions, {
        fields: [reservationOptions.optionId],
        references: [additionalOptions.id],
    }),
}));
