export type CategoryType = 'testingType' | 'framework' | 'language' | 'domain';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  type: CategoryType;
  icon: string;
  color: string;
}
