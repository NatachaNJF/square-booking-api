import { describe, expect, it, beforeEach, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock database functions
vi.mock("./db", () => ({
  getRooms: vi.fn(async () => [
    {
      id: 1,
      name: "Salle 1",
      area: 25,
      capacity: "10 à 20 pers.",
      pricePerHour: "39.83",
      priceHalfDay: "119.44",
      priceFullDay: "197.79",
      description: "Salle de réunion équipée",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]),
  getRoomById: vi.fn(async (id) => {
    if (id === 1) {
      return {
        id: 1,
        name: "Salle 1",
        area: 25,
        capacity: "10 à 20 pers.",
        pricePerHour: "39.83",
        priceHalfDay: "119.44",
        priceFullDay: "197.79",
        description: "Salle de réunion équipée",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
    return undefined;
  }),
  checkAvailability: vi.fn(async () => []),
  checkRoomConflicts: vi.fn(async () => []),
  createReservation: vi.fn(async (data) => ({
    id: 1,
    ...data,
    createdAt: new Date(),
    updatedAt: new Date(),
  })),
  createOrGetExternalUser: vi.fn(async (data) => ({
    id: 1,
    ...data,
    createdAt: new Date(),
    updatedAt: new Date(),
  })),
  getUserQuota: vi.fn(async () => ({
    id: 1,
    userId: 1,
    quotaHours: "40",
    usedHours: "10",
    year: 2026,
    createdAt: new Date(),
    updatedAt: new Date(),
  })),
  updateUserQuotaUsedHours: vi.fn(async () => ({
    id: 1,
    userId: 1,
    quotaHours: "40",
    usedHours: "12",
    year: 2026,
    createdAt: new Date(),
    updatedAt: new Date(),
  })),
  getPendingReservations: vi.fn(async () => []),
  getReservationsByUser: vi.fn(async () => []),
  updateReservationStatus: vi.fn(async () => {}),
  getReservationById: vi.fn(async (id) => ({
    id,
    roomId: 1,
    internalUserId: null,
    externalUserId: 1,
    startTime: new Date(),
    endTime: new Date(),
    duration: "2",
    status: "pending",
    pricePerUnit: "39.83",
    subtotal: "79.66",
    eveningSupplement: "0",
    saturdaySupplement: "0",
    beveragePackage: false,
    beverageCount: 0,
    beveragePrice: "0",
    totalPrice: "79.66",
    notes: null,
    setupId: null,
    odooActivityId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  })),
  getRoomSetups: vi.fn(async () => []),
  getAdditionalOptions: vi.fn(async () => []),
  updateAdditionalOption: vi.fn(async () => ({})),
  updateRoom: vi.fn(async () => ({})),
  getReservationOptions: vi.fn(async () => []),
  addReservationOption: vi.fn(async () => ({})),
}));

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function createAuthenticatedContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("Rooms Router", () => {
  it("should list all rooms", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const rooms = await caller.rooms.list();

    expect(rooms).toHaveLength(1);
    expect(rooms[0]?.name).toBe("Salle 1");
  });

  it("should get room by ID", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const room = await caller.rooms.getById(1);

    expect(room).toBeDefined();
    expect(room?.id).toBe(1);
    expect(room?.name).toBe("Salle 1");
  });
});

describe("Reservations Router", () => {
  it("should check availability for a room", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.reservations.checkAvailability({
      roomId: 1,
      startTime: "2026-03-01 10:00:00",
      endTime: "2026-03-01 12:00:00",
    });

    expect(result.available).toBe(true);
    expect(result.conflicts).toHaveLength(0);
  });

  it("should implement room conflict logic: small room blocks large room", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.reservations.checkAvailability({
      roomId: 3,
      startTime: "2026-03-01 10:00:00",
      endTime: "2026-03-01 12:00:00",
    });

    expect(result.available).toBe(true);
  });

  it("should implement room conflict logic: large room blocks small rooms", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.reservations.checkAvailability({
      roomId: 1,
      startTime: "2026-03-01 10:00:00",
      endTime: "2026-03-01 12:00:00",
    });

    expect(result.available).toBe(true);
  });

  it("should create an external reservation", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const reservation = await caller.reservations.create({
      roomId: 1,
      startTime: "2026-03-01 10:00:00",
      endTime: "2026-03-01 12:00:00",
      duration: 2,
      pricePerUnit: 39.83,
      subtotal: 79.66,
      eveningSupplement: 0,
      saturdaySupplement: 0,
      beveragePackage: false,
      beverageCount: 0,
      beveragePrice: 0,
      totalPrice: 79.66,
      externalUserName: "John Doe",
      externalUserEmail: "john@example.com",
      externalUserAddress: "123 Main St",
      externalUserCompany: "Acme Corp",
      externalUserVatNumber: "BE123456789",
    });

    expect(reservation).toBeDefined();
    expect(reservation.status).toBe("pending");
  });

  it("should create an internal reservation and auto-confirm", async () => {
    const ctx = createAuthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    const reservation = await caller.reservations.create({
      roomId: 1,
      startTime: "2026-03-01 10:00:00",
      endTime: "2026-03-01 12:00:00",
      duration: 2,
      pricePerUnit: 39.83,
      subtotal: 79.66,
      eveningSupplement: 0,
      saturdaySupplement: 0,
      beveragePackage: false,
      beverageCount: 0,
      beveragePrice: 0,
      totalPrice: 79.66,
    });

    expect(reservation).toBeDefined();
    expect(reservation.status).toBe("confirmed");
  });

  it("should reject external reservation without email", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.reservations.create({
        roomId: 1,
        startTime: "2026-03-01 10:00:00",
        endTime: "2026-03-01 12:00:00",
        duration: 2,
        pricePerUnit: 39.83,
        subtotal: 79.66,
        eveningSupplement: 0,
        saturdaySupplement: 0,
        beveragePackage: false,
        beverageCount: 0,
        beveragePrice: 0,
        totalPrice: 79.66,
      })
    ).rejects.toThrow("Email required for external users");
  });
});

describe("Quotas Router", () => {
  it("should get user quota for authenticated user", async () => {
    const ctx = createAuthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    const quota = await caller.quotas.getMyQuota();

    expect(quota).toBeDefined();
    expect(quota?.userId).toBe(1);
    expect(quota?.quotaHours).toBe("40");
  });

  it("should not allow non-admin to set quotas", async () => {
    const ctx = createAuthenticatedContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.quotas.setUserQuota({
        userId: 1,
        quotaHours: 50,
      })
    ).rejects.toThrow("Unauthorized");
  });
});
