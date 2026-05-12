/*
  Warnings:

  - You are about to drop the column `justified` on the `transaction` table. All the data in the column will be lost.
  - You are about to drop the column `programmed` on the `transaction` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `transaction` DROP COLUMN `justified`,
    DROP COLUMN `programmed`,
    ADD COLUMN `dueDate` DATETIME(3) NULL,
    ADD COLUMN `status` ENUM('PENDING', 'PAID', 'PARTIAL', 'CANCELLED') NOT NULL DEFAULT 'PAID',
    MODIFY `paymentMethod` ENUM('CASH', 'CARD', 'TRANSFER', 'YAPE', 'PLIN') NOT NULL;
