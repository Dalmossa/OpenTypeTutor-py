export interface GetUserResponseDTO {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  activeLayout: string;
  currentLevel: number;
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