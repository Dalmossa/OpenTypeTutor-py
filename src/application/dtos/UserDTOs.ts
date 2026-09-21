export interface GetUserResponseDTO {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  activeLayout: string;
  currentLevel: number;
  timezone: string; // IANA (RN37)
}

export interface UpdateUserLayoutDTO {
  userId: string;
  layout: string;
}

export interface UpdateUserLayoutResponseDTO {
  userId: string;
  activeLayout: string;
  currentLevel: number;
}
