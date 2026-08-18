-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Turtelli database initialization
-- Schema migrations are managed by Prisma, this just enables extensions
