/*
  Warnings:

  - Made the column `amount` on table `transaction` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `transaction` MODIFY `amount` DOUBLE NOT NULL;
