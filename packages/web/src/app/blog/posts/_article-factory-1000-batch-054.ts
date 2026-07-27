import type { BlogPost } from './index';

import { post as seleniumGridDynamicDockerHosts } from './selenium-grid-dynamic-docker-hosts';
import { post as seleniumGridEventBusLatency } from './selenium-grid-event-bus-latency';
import { post as seleniumGridExternalSessionDatastore } from './selenium-grid-external-session-datastore';
import { post as seleniumGridGraphqlSessionTelemetry } from './selenium-grid-graphql-session-telemetry';
import { post as cypressBrowserLaunchFlagPortability } from './cypress-browser-launch-flag-portability';

export const articleFactory1000Batch054Posts: Array<{
  slug: string;
  post: BlogPost;
}> = [
  {
    slug: 'selenium-grid-dynamic-docker-hosts',
    post: seleniumGridDynamicDockerHosts,
  },
  {
    slug: 'selenium-grid-event-bus-latency',
    post: seleniumGridEventBusLatency,
  },
  {
    slug: 'selenium-grid-external-session-datastore',
    post: seleniumGridExternalSessionDatastore,
  },
  {
    slug: 'selenium-grid-graphql-session-telemetry',
    post: seleniumGridGraphqlSessionTelemetry,
  },
  {
    slug: 'cypress-browser-launch-flag-portability',
    post: cypressBrowserLaunchFlagPortability,
  },
];
