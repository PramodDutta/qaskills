import type { BlogPost } from './index';

import { post as agentSkillDangerousCommandStaticAnalysisTests } from './agent-skill-dangerous-command-static-analysis-tests';
import { post as malformedSkillMdFrontmatterParserTests } from './malformed-skill-md-frontmatter-parser-tests';
import { post as skillMdCsvYamlArrayNormalizationTests } from './skill-md-csv-yaml-array-normalization-tests';
import { post as testingMarkdownXssReactMarkdownRehypeSanitize } from './testing-markdown-xss-react-markdown-rehype-sanitize';
import { post as testingSkillMdYamlFrontmatterRoundtrip } from './testing-skill-md-yaml-frontmatter-roundtrip';

export const articleFactoryMarkdownValidatorPosts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'testing-markdown-xss-react-markdown-rehype-sanitize',
    post: testingMarkdownXssReactMarkdownRehypeSanitize,
  },
  {
    slug: 'testing-skill-md-yaml-frontmatter-roundtrip',
    post: testingSkillMdYamlFrontmatterRoundtrip,
  },
  {
    slug: 'skill-md-csv-yaml-array-normalization-tests',
    post: skillMdCsvYamlArrayNormalizationTests,
  },
  {
    slug: 'malformed-skill-md-frontmatter-parser-tests',
    post: malformedSkillMdFrontmatterParserTests,
  },
  {
    slug: 'agent-skill-dangerous-command-static-analysis-tests',
    post: agentSkillDangerousCommandStaticAnalysisTests,
  },
];
