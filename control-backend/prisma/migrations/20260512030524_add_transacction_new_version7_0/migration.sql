/*
  Warnings:

  - You are about to alter the column `currency` on the `transaction` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Enum(EnumId(5))`.

*/
-- AlterTable
ALTER TABLE `transaction` MODIFY `currency` ENUM('PEN', 'USD') NOT NULL;
