CREATE TABLE `access_keys` (
  `id` text PRIMARY KEY NOT NULL,
  `label` text NOT NULL,
  `hash` text NOT NULL UNIQUE,
  `active` integer NOT NULL DEFAULT 1,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` text,
  `last_used_at` text
);
CREATE TABLE `device_sessions` (
  `id` text PRIMARY KEY NOT NULL,
  `key_id` text NOT NULL REFERENCES `access_keys`(`id`) ON DELETE CASCADE,
  `token_hash` text NOT NULL UNIQUE,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_used_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `revoked_at` text
);
CREATE TABLE `access_rate_limits` (`key` text PRIMARY KEY NOT NULL, `attempts` integer NOT NULL DEFAULT 0, `window_started_at` text NOT NULL);
