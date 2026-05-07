import { Injectable, UnauthorizedException } from '@nestjs/common'
import { UsersService } from '../users/users.service'
import * as bcrypt from 'bcrypt'
import { JwtService } from '@nestjs/jwt'

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
    ) { }

    async login(email: string, password: string) {
        const user = await this.usersService.findByEmail(email)

        if (!user) throw new UnauthorizedException('Usuario no existe')

        const isMatch = await bcrypt.compare(password, user.password)
        if (!isMatch) throw new UnauthorizedException('Password incorrecto')
        const payload = { sub: user.id, email: user.email };
        const token = this.jwtService.sign(payload);
        return {
            message: 'Usuario logueado correctamente',
            access_token: token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        };
    }

    private generateToken(userId: string, email: string) {
        const payload = { sub: userId, email }
        return {
            access_token: this.jwtService.sign(payload),
        }
    }
}