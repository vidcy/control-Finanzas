/*
  Warnings:

  - Added the required column `amountSoles` to the `Transaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `currency` to the `Transaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `day` to the `Transaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `month` to the `Transaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `Transaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Transaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `year` to the `Transaction` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `transaction` DROP FOREIGN KEY `Transaction_categoryId_fkey`;

-- AlterTable
ALTER TABLE `transaction` ADD COLUMN `amountSoles` DOUBLE NOT NULL,
    ADD COLUMN `currency` VARCHAR(191) NOT NULL,
    ADD COLUMN `day` INTEGER NOT NULL,
    ADD COLUMN `exchangeRate` DOUBLE NULL,
    ADD COLUMN `justified` BOOLEAN NULL,
    ADD COLUMN `month` INTEGER NOT NULL,
    ADD COLUMN `programmed` BOOLEAN NULL,
    ADD COLUMN `type` ENUM('INCOME', 'EXPENSE') NOT NULL,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL,
    ADD COLUMN `year` INTEGER NOT NULL,
    MODIFY `categoryId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `Transaction` ADD CONSTRAINT `Transaction_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
