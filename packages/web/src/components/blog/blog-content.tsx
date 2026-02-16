'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';

interface BlogContentProps {
  content: string;
}

export function BlogContent({ content }: BlogContentProps) {
  return (
    <div className="prose prose-lg dark:prose-invert max-w-none prose-headings:font-bold prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4 prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3 prose-p:my-4 prose-p:leading-relaxed prose-li:my-1 prose-pre:bg-muted prose-pre:text-foreground prose-pre:rounded-lg prose-pre:border prose-pre:border-border prose-code:text-primary prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none prose-a:text-primary prose-a:underline hover:prose-a:text-primary/80 prose-table:border-collapse prose-th:border prose-th:border-border prose-th:px-4 prose-th:py-2 prose-th:bg-muted prose-td:border prose-td:border-border prose-td:px-4 prose-td:py-2 prose-hr:my-8 prose-hr:border-border prose-strong:text-foreground prose-blockquote:border-primary prose-img:rounded-lg">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
