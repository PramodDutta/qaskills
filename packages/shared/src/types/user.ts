export interface User {
  id: string;
  clerkId: string;
  email: string;
  username: string;
  name: string;
  avatar: string;
  bio: string;
  githubHandle: string;
  verifiedPublisher: boolean;
  totalInstalls: number;
  skillsPublished: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  username: string;
  name: string;
  avatar: string;
  bio: string;
  githubHandle: string;
  verifiedPublisher: boolean;
  totalInstalls: number;
  skillsPublished: number;
}
