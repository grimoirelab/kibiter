/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { UpgradeAssistantTelemetryServer } from '../common/types';
import { credentialStoreFactory } from './lib/reindexing/credential_store';
import { makeUpgradeAssistantUsageCollector } from './lib/telemetry';
import { registerClusterCheckupRoutes } from './routes/cluster_checkup';
import { registerDeleteTasksRoutes } from './routes/delete_tasks';
import { registerDeprecationLoggingRoutes } from './routes/deprecation_logging';
import { registerQueryDefaultFieldRoutes } from './routes/query_default_field';
import { registerReindexIndicesRoutes, registerReindexWorker } from './routes/reindex_indices';
import { registerTelemetryRoutes } from './routes/telemetry';

export function initServer(server: Legacy.Server) {
  registerClusterCheckupRoutes(server);
  registerDeleteTasksRoutes(server);
  registerDeprecationLoggingRoutes(server);
  registerQueryDefaultFieldRoutes(server);

  // The ReindexWorker uses a map of request headers that contain the authentication credentials
  // for a given reindex. We cannot currently store these in an the .kibana index b/c we do not
  // want to expose these credentials to any unauthenticated users. We also want to avoid any need
  // to add a user for a special index just for upgrading. This in-memory cache allows us to
  // process jobs without the browser staying on the page, but will require that jobs go into
  // a paused state if no Kibana nodes have the required credentials.
  const credentialStore = credentialStoreFactory();

  const worker = registerReindexWorker(server, credentialStore);
  registerReindexIndicesRoutes(server, worker, credentialStore);

  // Bootstrap the needed routes and the collector for the telemetry
  registerTelemetryRoutes(server as UpgradeAssistantTelemetryServer);
  makeUpgradeAssistantUsageCollector(server as UpgradeAssistantTelemetryServer);
}
