CREATE TABLE `externalUsers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(320) NOT NULL,
	`address` text,
	`company` varchar(255),
	`vatNumber` varchar(50),
	`phone` varchar(20),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `externalUsers_id` PRIMARY KEY(`id`),
	CONSTRAINT `externalUsers_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `reservations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roomId` int NOT NULL,
	`internalUserId` int,
	`externalUserId` int,
	`startTime` datetime NOT NULL,
	`endTime` datetime NOT NULL,
	`duration` decimal(8,2) NOT NULL,
	`status` enum('pending','confirmed','rejected','cancelled') NOT NULL DEFAULT 'pending',
	`pricePerUnit` decimal(8,2) NOT NULL,
	`subtotal` decimal(10,2) NOT NULL,
	`eveningSupplement` decimal(10,2) NOT NULL DEFAULT '0',
	`saturdaySupplement` decimal(10,2) NOT NULL DEFAULT '0',
	`beveragePackage` boolean DEFAULT false,
	`beverageCount` int DEFAULT 0,
	`beveragePrice` decimal(10,2) NOT NULL DEFAULT '0',
	`totalPrice` decimal(10,2) NOT NULL,
	`notes` text,
	`odooActivityId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reservations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rooms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`area` int NOT NULL,
	`capacity` varchar(50) NOT NULL,
	`pricePerHour` decimal(8,2) NOT NULL,
	`priceHalfDay` decimal(8,2) NOT NULL,
	`priceFullDay` decimal(8,2) NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rooms_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `userQuotas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`quotaHours` decimal(8,2) NOT NULL DEFAULT '0',
	`usedHours` decimal(8,2) NOT NULL DEFAULT '0',
	`year` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userQuotas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `reservations` ADD CONSTRAINT `reservations_roomId_rooms_id_fk` FOREIGN KEY (`roomId`) REFERENCES `rooms`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reservations` ADD CONSTRAINT `reservations_internalUserId_users_id_fk` FOREIGN KEY (`internalUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reservations` ADD CONSTRAINT `reservations_externalUserId_externalUsers_id_fk` FOREIGN KEY (`externalUserId`) REFERENCES `externalUsers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `userQuotas` ADD CONSTRAINT `userQuotas_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;