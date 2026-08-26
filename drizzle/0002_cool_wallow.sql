CREATE TABLE `room_join_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`attempts` integer DEFAULT 1 NOT NULL,
	`window_started_at` text NOT NULL,
	`updated_at` text NOT NULL
);
