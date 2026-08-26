CREATE TABLE `lobby_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`text` text NOT NULL,
	`room_code` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
