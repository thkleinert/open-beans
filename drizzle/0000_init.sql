CREATE TABLE `app_settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`theme` text(10) DEFAULT 'auto'
);
--> statement-breakpoint
CREATE TABLE `bean` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`brand` text(100) NOT NULL,
	`name` text(100) NOT NULL,
	`image_url` text(255),
	`is_archived` integer DEFAULT false,
	`rating` integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `recipe_template` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text(100) NOT NULL,
	`tag_id` integer,
	`position` integer DEFAULT 0,
	`bean_min` real DEFAULT 10,
	`bean_max` real DEFAULT 30,
	`bean_step` real DEFAULT 0.5,
	`bean_default` real DEFAULT 18,
	`grinder_min` integer DEFAULT 1,
	`grinder_max` integer DEFAULT 50,
	`grinder_step` integer DEFAULT 1,
	`grinder_default` integer DEFAULT 12,
	`weight_min` real DEFAULT 20,
	`weight_max` real DEFAULT 200,
	`weight_step` real DEFAULT 1,
	`weight_default` real DEFAULT 40,
	`brew_min` integer DEFAULT 20,
	`brew_max` integer DEFAULT 600,
	`brew_step` integer DEFAULT 5,
	`brew_default` integer DEFAULT 30,
	FOREIGN KEY (`tag_id`) REFERENCES `tag`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `recipe` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text(100) NOT NULL,
	`category` text(50),
	`template_id` integer,
	`position` integer,
	`bean_id` integer NOT NULL,
	`grinder_coarseness` text(50),
	`bean_amount` real,
	`brew_time` text(50),
	`final_weight` real,
	FOREIGN KEY (`template_id`) REFERENCES `recipe_template`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`bean_id`) REFERENCES `bean`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `tag` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text(50) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tag_name_unique` ON `tag` (`name`);