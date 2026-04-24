import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor() {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: 'supersecret', // 👈 MISMA clave que usaste en JwtModule
        });
    }

    async validate(payload: any) {
        // 🔥 ESTA FUNCION ES LA MAGIA
        // Lo que retornes aquí se convierte en req.user
        return payload;
    }
}