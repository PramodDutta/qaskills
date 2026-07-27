import type { BlogPost } from './index';

import { post as openaiPythonGraderSandboxTesting } from './openai-python-grader-sandbox-testing';
import { post as promptInjectionHtmlCommentTesting } from './prompt-injection-html-comment-testing';
import { post as promptfooChatThreadIsolationTesting } from './promptfoo-chat-thread-isolation-testing';
import { post as promptfooDefaulttestOverrideTesting } from './promptfoo-defaulttest-override-testing';
import { post as promptfooEvalTagProvenanceTesting } from './promptfoo-eval-tag-provenance-testing';

export const articleFactory1000Batch092Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'openai-python-grader-sandbox-testing',
    post: openaiPythonGraderSandboxTesting,
  },
  {
    slug: 'prompt-injection-html-comment-testing',
    post: promptInjectionHtmlCommentTesting,
  },
  {
    slug: 'promptfoo-chat-thread-isolation-testing',
    post: promptfooChatThreadIsolationTesting,
  },
  {
    slug: 'promptfoo-defaulttest-override-testing',
    post: promptfooDefaulttestOverrideTesting,
  },
  {
    slug: 'promptfoo-eval-tag-provenance-testing',
    post: promptfooEvalTagProvenanceTesting,
  },
];
