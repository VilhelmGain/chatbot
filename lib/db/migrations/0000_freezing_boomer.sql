CREATE TABLE "Chat" (
	"createdAt" timestamp NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"userId" uuid NOT NULL,
	"visibility" varchar DEFAULT 'private' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "CustomModel" (
	"capabilities" json NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"modelId" varchar(256) NOT NULL,
	"name" varchar(256) NOT NULL,
	"providerId" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "CustomProvider" (
	"baseURL" varchar(512) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"encryptedApiKey" text NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"iv" varchar(32) NOT NULL,
	"name" varchar(128) NOT NULL,
	"providerKey" varchar(128),
	"type" varchar NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"userId" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Document" (
	"content" text,
	"createdAt" timestamp NOT NULL,
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"text" varchar DEFAULT 'text' NOT NULL,
	"title" text NOT NULL,
	"userId" uuid NOT NULL,
	CONSTRAINT "Document_id_createdAt_pk" PRIMARY KEY("id","createdAt")
);
--> statement-breakpoint
CREATE TABLE "Message_v2" (
	"attachments" json NOT NULL,
	"chatId" uuid NOT NULL,
	"createdAt" timestamp NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parts" json NOT NULL,
	"role" varchar NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Stream" (
	"chatId" uuid NOT NULL,
	"createdAt" timestamp NOT NULL,
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	CONSTRAINT "Stream_id_pk" PRIMARY KEY("id")
);
--> statement-breakpoint
CREATE TABLE "Suggestion" (
	"createdAt" timestamp NOT NULL,
	"description" text,
	"documentCreatedAt" timestamp NOT NULL,
	"documentId" uuid NOT NULL,
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"isResolved" boolean DEFAULT false NOT NULL,
	"originalText" text NOT NULL,
	"suggestedText" text NOT NULL,
	"userId" uuid NOT NULL,
	CONSTRAINT "Suggestion_id_pk" PRIMARY KEY("id")
);
--> statement-breakpoint
CREATE TABLE "User" (
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"email" varchar(64) NOT NULL,
	"emailVerified" boolean DEFAULT false NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"image" text,
	"isAnonymous" boolean DEFAULT false NOT NULL,
	"name" text,
	"password" varchar(64),
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Vote_v2" (
	"chatId" uuid NOT NULL,
	"isUpvoted" boolean NOT NULL,
	"messageId" uuid NOT NULL,
	CONSTRAINT "Vote_v2_chatId_messageId_pk" PRIMARY KEY("chatId","messageId")
);
--> statement-breakpoint
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "CustomModel" ADD CONSTRAINT "CustomModel_providerId_CustomProvider_id_fk" FOREIGN KEY ("providerId") REFERENCES "public"."CustomProvider"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "CustomProvider" ADD CONSTRAINT "CustomProvider_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Document" ADD CONSTRAINT "Document_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Message_v2" ADD CONSTRAINT "Message_v2_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Stream" ADD CONSTRAINT "Stream_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Suggestion" ADD CONSTRAINT "Suggestion_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Suggestion" ADD CONSTRAINT "Suggestion_documentId_documentCreatedAt_Document_id_createdAt_fk" FOREIGN KEY ("documentId","documentCreatedAt") REFERENCES "public"."Document"("id","createdAt") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Vote_v2" ADD CONSTRAINT "Vote_v2_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Vote_v2" ADD CONSTRAINT "Vote_v2_messageId_Message_v2_id_fk" FOREIGN KEY ("messageId") REFERENCES "public"."Message_v2"("id") ON DELETE no action ON UPDATE no action;