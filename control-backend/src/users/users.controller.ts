import { Controller, Post, Body, Get, UseGuards } from "@nestjs/common"
import { UsersService } from "./users.service";
import { JwtAuthGuard } from "src/auth/jwt.guard";
import { Patch } from "@nestjs/common";
import { Param } from "@nestjs/common";

@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }
    @Post()
    createUsers(@Body() body: any) {
        return this.usersService.createUsers(body);

    }
    @UseGuards(JwtAuthGuard)
    @Get()
    listUser() {
        return this.usersService.listUser();
    }
    @UseGuards(JwtAuthGuard)
    @Get(':id')
    findUser(@Param('id') id: string) {
        return this.usersService.findUser(id);
    }
    @UseGuards(JwtAuthGuard)
    @Patch(':id')
    updateUser(@Param('id') id: string, @Body() body: any) {
        return this.usersService.update(id, body);
    }
    @UseGuards(JwtAuthGuard)
    @Patch(':id/inactive')
    inactiveUser(@Param('id') id: string) {
        return this.usersService.inactiveUser(id);
    }
    @UseGuards(JwtAuthGuard)
    @Patch(':id/active')
    activeUser(@Param('id') id: string) {
        return this.usersService.activeUser(id);
    }



}