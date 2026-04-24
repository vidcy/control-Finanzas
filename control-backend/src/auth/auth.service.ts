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

    async register(name: string, email: string, password: string) {
        const hashed = await bcrypt.hash(password, 10)

        const user = await this.usersService.createUser({
            name,
            email,
            password: hashed,
        })

        return this.generateToken(user.id, user.email)
    }

    async login(email: string, password: string) {
        const user = await this.usersService.findByEmail(email)

        if (!user) throw new UnauthorizedException('Usuario no existe')

        const isMatch = await bcrypt.compare(password, user.password)
        if (!isMatch) throw new UnauthorizedException('Password incorrecto')

        return this.generateToken(user.id, user.email)
    }

    private generateToken(userId: string, email: string) {
        const payload = { sub: userId, email }
        return {
            access_token: this.jwtService.sign(payload),
        }
    }
}