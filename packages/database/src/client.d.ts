import { PrismaClient } from "@prisma/client";
declare global {
    var prismaGlobal: PrismaClient | undefined;
}
export declare const prisma: PrismaClient<import(".prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
export { PrismaClient, TicketStatus } from "@prisma/client";
export type { GuildConfig, DailyAnalytics, Ticket, ScheduledMessage, } from "@prisma/client";
