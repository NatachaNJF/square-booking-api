import { drizzle } from "drizzle-orm/mysql2";
import { eq, and, gte, lte } from "drizzle-orm";
import { createPool } from "mysql2/promise";
import * as schema from "./schema.js";
import dotenv from "dotenv";
dotenv.config();
const { users, rooms, reservations, externalUsers, userQuotas, roomSetups, additionalOptions, reservationOptions } = schema;
let _db = null;
export async function getDb() {
    if (!_db && process.env.DATABASE_URL) {
        try {
            const pool = createPool(process.env.DATABASE_URL);
            _db = drizzle(pool);
        }
        catch (error) {
            console.warn("[Database] Failed to connect:", error);
            _db = null;
        }
    }
    return _db;
}
export async function upsertUser(user) {
    const db = await getDb();
    if (!db)
        return;
    await db.insert(users).values(user).onDuplicateKeyUpdate({ set: user });
}
export async function getUserByOpenId(openId) {
    const db = await getDb();
    if (!db)
        return undefined;
    const result = await db.select().from(users).where(eq(users.id, openId)).limit(1);
    return result.length > 0 ? result[0] : undefined;
}
export async function getRooms() {
    const db = await getDb();
    if (!db)
        return [];
    return db.select().from(rooms);
}
export async function getRoomById(id) {
    const db = await getDb();
    if (!db)
        return undefined;
    const result = await db.select().from(rooms).where(eq(rooms.id, id)).limit(1);
    return result.length > 0 ? result[0] : undefined;
}
export async function checkAvailability(roomId, startTime, endTime) {
    const db = await getDb();
    if (!db)
        return [];
    const overlapping = await db.select().from(reservations).where(and(eq(reservations.roomId, roomId), eq(reservations.status, 'confirmed')));
    return overlapping.filter((res) => {
        const resStart = new Date(res.startTime);
        const resEnd = new Date(res.endTime);
        return !(endTime <= resStart || startTime >= resEnd);
    });
}
export async function getRoomSetups() {
    const db = await getDb();
    if (!db)
        return [];
    return db.select().from(roomSetups);
}
export async function getAdditionalOptions() {
    const db = await getDb();
    if (!db)
        return [];
    return db.select().from(additionalOptions);
}
export async function createReservation(data) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const result = await db.insert(reservations).values(data);
    const id = result[0].insertId;
    const reservation = await db.select().from(reservations).where(eq(reservations.id, id)).limit(1);
    return reservation[0];
}
export async function updateReservationStatus(id, status) {
    const db = await getDb();
    if (!db)
        throw new Error("Base de données indisponible");
    await db.update(reservations).set({ status: status }).where(eq(reservations.id, id));
}
export async function deleteReservation(id) {
    const db = await getDb();
    if (!db)
        throw new Error("Base de données indisponible");
    await db.delete(reservations).where(eq(reservations.id, id));
}
export async function getPendingReservations() {
    const db = await getDb();
    if (!db)
        return [];
    const pending = await db
        .select()
        .from(reservations)
        .where(eq(reservations.status, 'pending'));
    return pending;
}
export async function getReservationsByUser(userId) {
    const db = await getDb();
    if (!db)
        return [];
    return db.select().from(reservations).where(eq(reservations.internalUserId, userId));
}
export async function createOrGetExternalUser(data) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const existing = await db.select().from(externalUsers).where(eq(externalUsers.email, data.email)).limit(1);
    if (existing.length > 0)
        return existing[0];
    const result = await db.insert(externalUsers).values(data);
    const id = result[0].insertId;
    const user = await db.select().from(externalUsers).where(eq(externalUsers.id, id)).limit(1);
    return user[0];
}
export async function getUserQuota(userId, year) {
    const db = await getDb();
    if (!db)
        return undefined;
    // La table n'a pas de colonne 'year', on récupère juste le quota de l'utilisateur
    const result = await db.select().from(userQuotas).where(eq(userQuotas.userId, userId)).limit(1);
    return result.length > 0 ? result[0] : undefined;
}
export async function createOrUpdateUserQuota(userId, year, quotaHours) {
    const db = await getDb();
    if (!db)
        throw new Error("Base de données indisponible");
    // Le schéma utilise 'quotaLimit' et 'quotaUsed' (pas quotaHours)
    await db.insert(userQuotas)
        .values({ userId, quotaLimit: quotaHours, quotaUsed: 0 })
        .onDuplicateKeyUpdate({ set: { quotaLimit: quotaHours } });
    return { userId, year, quotaHours };
}
export async function updateAdditionalOption(id, data) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    await db.update(additionalOptions).set(data).where(eq(additionalOptions.id, id));
    return data;
}
export async function updateRoom(id, data) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    await db.update(rooms).set(data).where(eq(rooms.id, id));
    return data;
}
export async function addReservationOption(reservationId, optionId, quantity, price) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    await db.insert(reservationOptions).values({ reservationId, optionId, quantity, price: price.toString() });
    return { reservationId, optionId, quantity, price };
}
export async function getReservationOptions(reservationId) {
    const db = await getDb();
    if (!db)
        return [];
    return db.select().from(reservationOptions).where(eq(reservationOptions.reservationId, reservationId));
}
export async function getReservationsForCalendar(startDate, endDate) {
    const db = await getDb();
    if (!db)
        return [];
    return db.select().from(reservations).where(and(gte(reservations.startTime, startDate), lte(reservations.endTime, endDate), eq(reservations.status, 'confirmed')));
}
