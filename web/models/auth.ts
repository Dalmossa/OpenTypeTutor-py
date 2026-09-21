export interface LoginDTO {
  email: string;
  password: string;
}

export interface LoginResponseDTO {
  accessToken: string;
  refreshToken: string;
}

export interface RefreshTokenDTO {
  refreshToken: string;
}

export interface RefreshTokenResponseDTO {
  accessToken: string;
  refreshToken: string;
}

export interface RegisterUserDTO {
  name: string;
  email: string;
  password: string;
}

export interface RegisterUserResponseDTO {
  userId: string;
}

export interface GetUserResponseDTO {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  activeLayout: string;
  currentLevel: number;
  timezone: string; // IANA (RN37)
}

export interface UpdateUserLayoutResponseDTO {
  userId: string;
  activeLayout: string;
  currentLevel: number;
}
