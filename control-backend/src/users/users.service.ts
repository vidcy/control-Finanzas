import { ConflictException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import * as bcrypt from "bcrypt"


@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) { }
    async createUsers(data: any) {
        const existingUser = await this.findByEmail(data.email);
        if (existingUser) {
            throw new ConflictException('Usuario ya existe')
        }
        const hashedPassword = await bcrypt.hash(data.password, 10)
        return this.prisma.user.create({
            data: {
                name: data.name,
                lastName: data.lastName,
                email: data.email,
                password: hashedPassword,
                role: data.role as "ADMIN" | "USER",

            }
        })

    }
    async findByEmail(email: string) {
        return this.prisma.user.findUnique({
            where: { email }
        })

    }
    async listUser() {
        return this.prisma.user.findMany();
    }
    async findUser(id: string) {
        return this.prisma.user.findUnique({
            where: { id }
        })
    }
    async activeUserRequest(id: string) {
        const user = await this.prisma.user.update({
            where: { id },
            data: { isActive: true }
        })
        return user;
    }
    async inactiveUserRequest(id: string) {
        const user = await this.prisma.user.update({
            where: { id },
            data: { isActive: false }
        })
        return user;
    }
    async update(id: string, data: any) {
        return this.prisma.user.update({
            where: { id },
            data: data
        })
    }

}


