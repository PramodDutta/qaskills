import type { BlogPost } from './index';

import { post as androidTalkbackTraversalOrderTesting } from './android-talkback-traversal-order-testing';
import { post as k6ConnectionReusePerformanceTesting } from './k6-connection-reuse-performance-testing';
import { post as kafkaConsumerOffsetResetTesting } from './kafka-consumer-offset-reset-testing';
import { post as audioTranscriptSynchronizationTesting } from './audio-transcript-synchronization-testing';
import { post as ciTestResultMergeCompleteness } from './ci-test-result-merge-completeness';

export const articleFactory1000Batch104Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'android-talkback-traversal-order-testing',
    post: androidTalkbackTraversalOrderTesting,
  },
  {
    slug: 'k6-connection-reuse-performance-testing',
    post: k6ConnectionReusePerformanceTesting,
  },
  {
    slug: 'kafka-consumer-offset-reset-testing',
    post: kafkaConsumerOffsetResetTesting,
  },
  {
    slug: 'audio-transcript-synchronization-testing',
    post: audioTranscriptSynchronizationTesting,
  },
  {
    slug: 'ci-test-result-merge-completeness',
    post: ciTestResultMergeCompleteness,
  },
];
