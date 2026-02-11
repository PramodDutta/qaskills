export interface Review {
  id: string;
  skillId: string;
  userId: string;
  rating: number;
  comment: string;
  helpfulCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewWithUser extends Review {
  user: {
    username: string;
    name: string;
    avatar: string;
  };
}
