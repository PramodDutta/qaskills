import type { BlogPost } from './index';

export interface SeoClusterArticle {
  slug: string;
  clusterId: string;
  post: BlogPost;
}

export function countArticleWords(content: string): number {
  return content.trim().split(/\s+/).filter(Boolean).length;
}

export function countMarkdownLinks(content: string): number {
  return (content.match(/\[[^\]]+\]\([^)]+\)/g) || []).length;
}

export function countCodeBlocks(content: string): number {
  return Math.floor((content.match(/^```/gm) || []).length / 2);
}
