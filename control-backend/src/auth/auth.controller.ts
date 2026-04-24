import { Controller, Post, Body } from '@nestjs/common'
import { AuthService } from './auth.service'

import { UseGuards, Get, Req } from '@nestjs/common'
import { JwtAuthGuard } from './jwt.guard'


@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Post('register')
    register(@Body() body: any) {
        return this.authService.register(
            body.name,
            body.email,
            body.password,
        )
    }

    @Post('login')
    login(@Body() body: any) {
        return this.authService.login(
            body.email,
            body.password,
        )
    }
    @UseGuards(JwtAuthGuard)
    @Get('profile')
    getProfile(@Req() req) {
        return req.user
    }
}