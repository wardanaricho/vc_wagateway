export interface CreateSessionBody {
  name: string;
  phone?: string;
}

export interface UpdateSessionBody {
  name?: string;
  phone?: string;
}
