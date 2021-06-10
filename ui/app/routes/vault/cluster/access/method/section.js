import AdapterError from '@ember-data/adapter/error';
import { set } from '@ember/object';
import { inject as service } from '@ember/service';
import Route from '@ember/routing/route';

export default Route.extend({
  wizard: service(),
  pathHelp: service('path-help'),

  modelType(backendType, section) {
    // TODO: Update endpoints from PR#10997
    const MODELS = {
      'aws-client': 'auth-config/aws/client',
      'aws-identity-whitelist': 'auth-config/aws/identity-whitelist',
      'aws-roletag-blacklist': 'auth-config/aws/roletag-blacklist',
      'azure-configuration': 'auth-config/azure',
      'github-configuration': 'auth-config/github',
      'gcp-configuration': 'auth-config/gcp',
      'jwt-configuration': 'auth-config/jwt',
      'oidc-configuration': 'auth-config/oidc',
      'kubernetes-configuration': 'auth-config/kubernetes',
      'ldap-configuration': 'auth-config/ldap',
      'okta-configuration': 'auth-config/okta',
      'radius-configuration': 'auth-config/radius',
    };
    return MODELS[`${backendType}-${section}`];
  },

  beforeModel() {
    const p = this.paramsFor(this.routeName);
    let backend = this.modelFor('vault.cluster.access.method');
    console.log(backend, 'backend');
    const modelType = this.modelType(backend.type, p.section_name);
    console.log('fetching new model', modelType, backend.type, backend.apiPath);
    return this.pathHelp.getNewModel(modelType, backend.type, backend.apiPath).then(() => {
      return this.store.find(modelType, 'ldap');
    });
    // return this.pathHelp.getNewModel(modelType, backend.type, backend.apiPath);
    // return this.pathHelp.getNewModel(modelType, method, backend.apiPath);
  },

  model(params) {
    console.log('model params', params);
    const { section_name: section } = params;
    if (section !== 'configuration') {
      const error = new AdapterError();
      set(error, 'httpStatus', 404);
      throw error;
    }
    let backend = this.modelFor('vault.cluster.access.method');
    console.log({ backend });
    this.wizard.transitionFeatureMachine(this.wizard.featureState, 'DETAILS', backend.type);
    return this.store.findRecord(backend.type, 'ldap', {
      include: 'authConfig',
    });
    return backend;
  },

  setupController(controller) {
    const { section_name: section } = this.paramsFor(this.routeName);
    console.log('setup controller', section);
    this._super(...arguments);
    controller.set('section', section);
    let method = this.modelFor('vault.cluster.access.method');
    controller.set('paths', method.paths.paths.filter(path => path.navigation));
    let typeFields = this.store.peekRecord('auth-config/ldap', 'ldap');
    controller.set('special', typeFields);
  },
});
