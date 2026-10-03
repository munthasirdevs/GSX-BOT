"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TicketStatus = exports.PrismaClient = exports.prisma = void 0;
const client_1 = require("@prisma/client");
exports.prisma = globalThis.prismaGlobal ??
    new client_1.PrismaClient({
        log: process.env.NODE_ENV === "development"
            ? ["query", "error", "warn"]
            : ["error"],
    });
if (process.env.NODE_ENV !== "production") {
    globalThis.prismaGlobal = exports.prisma;
}
var client_2 = require("@prisma/client");
Object.defineProperty(exports, "PrismaClient", { enumerable: true, get: function () { return client_2.PrismaClient; } });
Object.defineProperty(exports, "TicketStatus", { enumerable: true, get: function () { return client_2.TicketStatus; } });
