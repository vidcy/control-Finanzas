import { Controller, Post, Body, Get, UseGuards } from "@nestjs/common"
import { UsersService } from "./users.service";
import { JwtAuthGuard } from "src/auth/jwt.guard";
import { Patch } from "@nestjs/common";
import { Param } from "@nestjs/common";
import { Roles } from "src/auth/role.decorator";
import { RolesGuard } from "src/auth/role.guard";

@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    @Post()
    createUsers(@Body() body: any) {
        return this.usersService.createUsers(body);

    }
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    @Get()
    listUser() {
        console.log('ENTRÓ A USERS');
        return this.usersService.listUser();

    }
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    @Get(':id')
    findUser(@Param('id') id: string) {
        return this.usersService.findUser(id);
    }
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    @Patch(':id')
    updateUser(@Param('id') id: string, @Body() body: any) {
        return this.usersService.update(id, body);
    }
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    @Patch(':id/active')
    activeUserRequest(@Param('id') id: string) {
        return this.usersService.activeUserRequest(id);
    }
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    @Patch(':id/inactive')
    inactiveUserRequest(@Param('id') id: string) {
        return this.usersService.inactiveUserRequest(id);
    }

}