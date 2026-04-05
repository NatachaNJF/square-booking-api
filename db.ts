import { drizzle } from "drizzle-orm/mysql2";
import { eq, and, gte, lte } from "drizzle-orm";
import mysql from "mysql2/promise";
import * as schema from "./schema.js";
import dotenv from "dotenv";

dotenv.config();

const { users, rooms, reservations, externalUsers, userQuotas, roomSetups, additionalOptions, reservationOptions } = schema;

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const pool = mysql.createPool(process.env.DATABASE_URL);
      _db = drizzle(pool);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}


export async function upsertUser(user: any): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(users).values(user).onDuplicateKeyUpdate({ set: user });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, openId as any)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getRooms(): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(rooms);
}

export async function getRoomById(id: number): Promise<any | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(rooms).where(eq(rooms.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function checkAvailability(roomId: number, startTime: Date, endTime: Date): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  const overlapping = await db.select().from(reservations).where(
    and(eq(reservations.roomId, roomId), eq(reservations.status, 'confirmed'))
  );
  return overlapping.filter((res: any) => {
    const resStart = new Date(res.startTime);
    const resEnd = new Date(res.endTime);
    return !(endTime <= resStart || startTime >= resEnd);
  });
}

export async function getRoomSetups(): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(roomSetups);
}

export async function getAdditionalOptions(): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(additionalOptions);
}

export async function createReservation(data: any): Promise<any> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(reservations).values(data);
  const id = (result[0] as any).insertId;
  const reservation = await db.select().from(reservations).where(eq(reservations.id, id)).limit(1);
  return reservation[0];
}

export async function updateReservationStatus(id: number, status: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Base de données indisponible");
  await db.update(reservations).set({ status: status as any }).where(eq(reservations.id, id));
}

export async function deleteReservation(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Base de données indisponible");
  await db.delete(reservations).where(eq(reservations.id, id));
}

export async function getPendingReservations(): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  const pending = await db
    .select()
    .from(reservations)
    .where(eq(reservations.status, 'pending'));
    
  return pending;
}

export async function getReservationsByUser(userId: number): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(reservations).where(eq(reservations.internalUserId, userId));
}

export async function createOrGetExternalUser(data: any): Promise<any> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(externalUsers).where(eq(externalUsers.email, data.email)).limit(1);
  if (existing.length > 0) return existing[0];
  const result = await db.insert(externalUsers).values(data);
  const id = (result[0] as any).insertId;
  const user = await db.select().from(externalUsers).where(eq(externalUsers.id, id)).limit(1);
  return user[0];
}

export async function getUserQuota(userId: number, year: number): Promise<any | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  // La table n'a pas de colonne 'year', on récupère juste le quota de l'utilisateur
  const result = await db.select().from(userQuotas).where(eq(userQuotas.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createOrUpdateUserQuota(userId: number, year: number, quotaHours: number): Promise<any> {
  const db = await getDb();
  if (!db) throw new Error("Base de données indisponible");
  // Le schéma utilise 'quotaLimit' et 'quotaUsed' (pas quotaHours)
  await db.insert(userQuotas)
    .values({ userId, quotaLimit: quotaHours, quotaUsed: 0 })
    .onDuplicateKeyUpdate({ set: { quotaLimit: quotaHours } });
  return { userId, year, quotaHours };
}

export async function updateAdditionalOption(id: number, data: any): Promise<any> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(additionalOptions).set(data).where(eq(additionalOptions.id, id));
  return data;
}

export async function updateRoom(id: number, data: any): Promise<any> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(rooms).set(data).where(eq(rooms.id, id));
  return data;
}

export async function addReservationOption(reservationId: number, optionId: number, quantity: number, price: number): Promise<any> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(reservationOptions).values({ reservationId, optionId, quantity, price: price.toString() as any });
  return { reservationId, optionId, quantity, price };
}

export async function getReservationOptions(reservationId: number): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(reservationOptions).where(eq(reservationOptions.reservationId, reservationId));
}

export async function getReservationsForCalendar(startDate: Date, endDate: Date): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(reservations).where(and(gte(reservations.startTime, startDate), lte(reservations.endTime, endDate), eq(reservations.status, 'confirmed')));
}
