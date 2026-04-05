CREATE TABLE `additionalOptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`price` decimal(10,2) NOT NULL,
	`pricePerPerson` boolean DEFAULT false,
	`category` varchar(50) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `additionalOptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reservationOptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reservationId` int NOT NULL,
	`optionId` int NOT NULL,
	`quantity` int DEFAULT 1,
	`price` decimal(10,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reservationOptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `roomSetups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`imageUrl` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `roomSetups_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `reservations` ADD `setupId` int;--> statement-breakpoint
ALTER TABLE `reservationOptions` ADD CONSTRAINT `reservationOptions_reservationId_reservations_id_fk` FOREIGN KEY (`reservationId`) REFERENCES `reservations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reservationOptions` ADD CONSTRAINT `reservationOptions_optionId_additionalOptions_id_fk` FOREIGN KEY (`optionId`) REFERENCES `additionalOptions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reservations` ADD CONSTRAINT `reservations_setupId_roomSetups_id_fk` FOREIGN KEY (`setupId`) REFERENCES `roomSetups`(`id`) ON DELETE no action ON UPDATE no action;