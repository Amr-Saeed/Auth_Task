export interface JwtPayload {
  sub: string;
  sid: string;
}

export class PublicUser {
  id: string;

  name: string;

  email: string;

  createdAt: Date;
}

export class AuthResponse {
  user: PublicUser;
}
