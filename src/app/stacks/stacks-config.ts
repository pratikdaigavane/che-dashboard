/*
 * Copyright (c) 2015-2018 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */
'use strict';

import {ListStacksController} from './list-stacks/list-stacks.controller';
import {StackController, IStackInitData} from './stack-details/stack.controller';
import {DevfileRegistry, IDevfileMetaData} from '../../components/api/devfile-registry.factory';
import {CheWorkspace} from '../../components/api/workspace/che-workspace.factory';
import { StacksConfigService } from './stacks-config.service';

/**
 * @ngdoc controller
 * @name stacks:StacksConfig
 * @description This class is used for configuring all stacks stuff.
 * @author Ann Shumilova
 */
export class StacksConfig {

  constructor(register: che.IRegisterService) {
    register.controller('ListStacksController', ListStacksController);
    register.controller('StackController', StackController);

    register.service('stacksConfigService', StacksConfigService);

    // config routes
    register.app.config(['$routeProvider', ($routeProvider: che.route.IRouteProvider) => {
      $routeProvider.accessWhen('/stacks', {
        title: 'Stacks',
        templateUrl: 'app/stacks/list-stacks/list-stacks.html',
        controller: 'ListStacksController',
        controllerAs: 'listStacksController',
        resolve: {
          initData: ['stacksConfigService', (svc: StacksConfigService) => {
            return svc.allowStacksRoutes();
          }]
        }
      })
        .accessWhen('/stack/:stackId*', {
          title: (params: any) => {
            return params.stackId;
          },
          templateUrl: 'app/stacks/stack-details/stack.html',
          controller: 'StackController',
          controllerAs: 'stackController',
          resolve: {
            initData: ['$q', '$route', 'cheWorkspace', 'devfileRegistry', 'stacksConfigService', ($q: ng.IQService, $route: ng.route.IRouteService, cheWorkspace: CheWorkspace, devfileRegistry: DevfileRegistry, stacksConfigService: StacksConfigService) => {
              return stacksConfigService.allowStacksRoutes().then(() => {
                const location = cheWorkspace.getWorkspaceSettings().cheWorkspaceDevfileRegistryUrl;
                return devfileRegistry.fetchDevfiles(location);
              }).then((devfileMetaDatas: Array<IDevfileMetaData>) => {
                const location = cheWorkspace.getWorkspaceSettings().cheWorkspaceDevfileRegistryUrl;
                const { stackId } = $route.current.params;
                const selfLink = devfileRegistry.devfileIdToSelfLink(stackId);
                const devfileMetaData = devfileMetaDatas.find((devfileMetaData: IDevfileMetaData) => devfileMetaData.links.self === selfLink);
                if (!devfileMetaData) {
                  return $q.reject();
                }
                return devfileRegistry.fetchDevfile(devfileMetaData.location, selfLink).then(() => {
                  const devfileContent = devfileRegistry.getDevfile(devfileMetaData.location, selfLink);
                  return <IStackInitData>{ devfileMetaData, devfileContent };
                });
              });
            }]
          }
        });
    }]);
  }
}
