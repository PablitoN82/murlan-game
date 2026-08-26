import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const rooms = sqliteTable("rooms", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  status: text("status").notNull().default("waiting"),
  state: text("state").notNull(),
  version: integer("version").notNull().default(1),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const players = sqliteTable("players", {
  id: text("id").primaryKey(),
  roomId: text("room_id").notNull().references(() => rooms.id, { onDelete: "cascade" }),
  seat: integer("seat").notNull(),
  name: text("name").notNull(),
  tokenHash: text("token_hash").notNull(),
  connectedAt: text("connected_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  lastSeenAt: text("last_seen_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  leftAt: text("left_at"),
});

export const gameEvents = sqliteTable("game_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  roomId: text("room_id").notNull().references(() => rooms.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  actorSeat: integer("actor_seat").notNull(),
  type: text("type").notNull(),
  payload: text("payload").notNull().default("{}"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const roomJoinLimits = sqliteTable("room_join_limits", {
  key: text("key").primaryKey(),
  attempts: integer("attempts").notNull().default(1),
  windowStartedAt: text("window_started_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const lobbyMessages = sqliteTable("lobby_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  text: text("text").notNull(),
  roomCode: text("room_code"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
