/*
  Warnings:

  - You are about to alter the column `type` on the `category` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Enum(EnumId(1))`.
  - Made the column `justified` on table `transaction` required. This step will fail if there are existing NULL values in that column.
  - Made the column `programmed` on table `transaction` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `category` MODIFY `type` ENUM('INCOME', 'EXPENSE') NOT NULL;

-- AlterTable
ALTER TABLE `transaction` MODIFY `justified` BOOLEAN NOT NULL DEFAULT false,
    MODIFY `programmed` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `user` ALTER COLUMN `updatedAt` DROP DEFAULT;
