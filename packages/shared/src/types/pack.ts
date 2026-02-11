export interface SkillPack {
  id: string;
  name: string;
  slug: string;
  description: string;
  authorId: string;
  featured: boolean;
  installCount: number;
  skillIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SkillPackWithSkills extends SkillPack {
  skills: {
    id: string;
    name: string;
    slug: string;
    description: string;
    qualityScore: number;
  }[];
}
