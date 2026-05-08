/*
  Warnings:

  - Made the column `lastName` on table `user` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `user` MODIFY `lastName` VARCHAR(191) NOT NULL;
