import { tracked } from '@glimmer/tracking';

import { isString } from 'lodash';
import config from 'ember-get-config';

import DatapackageModel from '@opendatafit/ember-models/models/datapackage';
import UserModel from '@opendatafit/ember-models/models/user';
import ViewModel from '@opendatafit/ember-models/models/view';
import DisplayModel from '@opendatafit/ember-models/models/display';
import AlgorithmModel from '@opendatafit/ember-models/models/algorithm';
import ResourceModel from '@opendatafit/ember-models/models/resource';

// Utility types for getDisplayPanes

// Override type for 'views' in display tab item
// See: https://stackoverflow.com/questions/41285211/overriding-interface-property-type-defined-in-typescript-d-ts-file
export type TabItem = Omit<
  ReturnType<Datapackage['getDisplayTabByName']>,
  'views'
> & {
  views: ReturnType<Datapackage['getViewsByName']>;
};

export type TabList = Array<TabItem>;

export default class Datapackage {
  @tracked record;

  @tracked executionDisabled: boolean = false;

  @tracked isExecutionError: boolean = false;
  @tracked error: string = '';

  private datapackagesURL = `${config.storeURL}/${config.storeURLPrefix}/datapackages`;

  constructor(datapackage: DatapackageModel) {
    this.record = datapackage;
  }

  isOwner(user: UserModel) {
    return this.record.owner.get('id') == user.get('id');
  }

  readOnly(user: UserModel) {
    return this.record.owner.get('id') != user.get('id');
  }

  resetError() {
    this.error = '';
    this.isExecutionError = false;
  }

  getViewByName(name: string): ViewModel {
    let view = this.record.views.find((view) => {
      return view.name === name;
    });

    if (view) {
      return view;
    } else {
      throw new Error('getViewByName: view ' + name + ' not found');
    }
  }

  getViewsByName(names: string[]): Array<ViewModel> {
    // Preserves order of names array (required for rendering display tabs)
    return names.map((name) => {
      let view = this.record.views.find((view) => {
        return view.name === name;
      });

      if (view) {
        return view;
      } else {
        throw new Error('View ' + name + ' not found');
      }
    });
  }

  getDisplayTabByName(
    display: DisplayModel,
    name: string
  ): DisplayModel['layout']['spec']['tabs'][0] {
    let tab = display.layout.spec.tabs.find((tab) => {
      return tab.name === name;
    });

    if (tab) {
      return tab;
    } else {
      throw new Error(
        'getDisplayTabByName: tab ' +
          name +
          ' not found in display ' +
          display.name
      );
    }
  }

  getDisplayTabsByName(
    display: DisplayModel,
    names: string[]
  ): DisplayModel['layout']['spec']['tabs'] {
    return names.map((name) => {
      return this.getDisplayTabByName(display, name);
    });
  }

  getDisplayPanes(display: DisplayModel): Array<{ tabs: TabList }> {
    let panes = [];

    // Populate tab content
    for (const pane of display.layout.spec.panes) {
      let paneObj = {
        tabs: this.getDisplayTabsByName(
          display,
          pane.tabs
        ) as unknown as TabList,
      };

      for (const tab of paneObj.tabs) {
        // Bit of a hack required to populate tab content here
        // tab.views on the right is still a string, and is overwritten by the
        // result of this.getViewsByName
        // @ts-ignore
        tab.views = this.getViewsByName(tab.views);
      }

      panes.push(paneObj);
    }

    return panes;
  }

  getAlgorithmByName(name: string): AlgorithmModel {
    let algorithm = this.record.algorithms.find((algorithm) => {
      return algorithm.name === name;
    });

    if (algorithm) {
      return algorithm;
    } else {
      throw new Error('getAlgorithmByName: algorithm ' + name + ' not found');
    }
  }

  getAlgorithmInputResourceByName(
    algorithmName: string,
    inputName: string
  ): ResourceModel {
    const algorithm = this.record.algorithms.find((algorithm) => {
      return algorithm.name === algorithmName;
    });

    if (algorithm) {
      const input = algorithm.inputs.find((input) => {
        return input.name === inputName;
      });
      if (input) {
        if (isString(input.resource)) {
          return this.getResourceByName(input.resource);
        } else {
          throw new Error(
            'getAlgorithmInputResourceByName: algorithm input resource is not a string'
          );
        }
      } else {
        throw new Error(
          'getAlgorithmInputResourceByName: input ' + inputName + ' not found'
        );
      }
    } else {
      throw new Error(
        'getAlgorithmInputResourceByName: algorithm ' +
          algorithmName +
          ' not found'
      );
    }
  }

  getResourceByName(name: string): ResourceModel {
    let resource = this.record.resources.find((resource) => {
      return resource.name === name;
    });

    if (resource) {
      return resource;
    } else {
      throw new Error('getResourceByName: resource ' + name + ' not found');
    }
  }

  getResourcesByName(names: string[]): Array<ResourceModel> {
    return this.record.resources.filter((resource) => {
      return names.includes(resource.name);
    });
  }
}
