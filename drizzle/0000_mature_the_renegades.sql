CREATE TABLE `admin_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`hits` integer NOT NULL,
	`reset_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `rsvp` (
	`id` text PRIMARY KEY NOT NULL,
	`request_id` text NOT NULL,
	`side` text NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`attendance` text NOT NULL,
	`guest_count` integer NOT NULL,
	`companions` text NOT NULL,
	`meal` text NOT NULL,
	`bus` text NOT NULL,
	`message` text NOT NULL,
	`consent` integer NOT NULL,
	`created_at` text NOT NULL,
	CONSTRAINT "rsvp_side" CHECK("rsvp"."side" IN ('groom', 'bride')),
	CONSTRAINT "rsvp_attendance" CHECK("rsvp"."attendance" IN ('yes', 'no')),
	CONSTRAINT "rsvp_count" CHECK(typeof("rsvp"."guest_count") = 'integer' AND "rsvp"."guest_count" BETWEEN 0 AND 20),
	CONSTRAINT "rsvp_meal" CHECK("rsvp"."meal" IN ('yes', 'no', 'undecided')),
	CONSTRAINT "rsvp_bus" CHECK("rsvp"."bus" IN ('none', '대전', '경주')),
	CONSTRAINT "rsvp_consent" CHECK("rsvp"."consent" = 1),
	CONSTRAINT "rsvp_attendance_fields" CHECK(("rsvp"."attendance" = 'yes' AND "rsvp"."guest_count" >= 1) OR ("rsvp"."attendance" = 'no' AND "rsvp"."guest_count" = 0 AND "rsvp"."meal" = 'no' AND "rsvp"."bus" = 'none' AND "rsvp"."companions" = ''))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rsvp_request_id_unique` ON `rsvp` (`request_id`);--> statement-breakpoint
CREATE INDEX `idx_rsvp_created_at` ON `rsvp` (`created_at`);--> statement-breakpoint
CREATE TABLE `snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`uploader` text NOT NULL,
	`file_name` text NOT NULL,
	`byte_size` integer NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`consent` integer NOT NULL,
	`created_at` text NOT NULL,
	CONSTRAINT "snapshot_consent" CHECK("snapshots"."consent" = 1),
	CONSTRAINT "snapshot_dimensions" CHECK("snapshots"."byte_size" > 0 AND "snapshots"."width" > 0 AND "snapshots"."height" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `snapshots_file_name_unique` ON `snapshots` (`file_name`);--> statement-breakpoint
CREATE INDEX `idx_snapshots_created_at` ON `snapshots` (`created_at`);