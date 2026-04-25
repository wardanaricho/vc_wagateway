export interface RegisterBody {
  name: string;
  email: string;
  username: string;
  password: string;
}

export interface LoginBody {
  email: string;
  password: string;
}

export interface RefreshBody {
  refreshToken: string;
}
