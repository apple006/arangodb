'use strict';

// //////////////////////////////////////////////////////////////////////////////
// / DISCLAIMER
// /
// / Copyright 2015-2016 ArangoDB GmbH, Cologne, Germany
// /
// / Licensed under the Apache License, Version 2.0 (the "License")
// / you may not use this file except in compliance with the License.
// / You may obtain a copy of the License at
// /
// /     http://www.apache.org/licenses/LICENSE-2.0
// /
// / Unless required by applicable law or agreed to in writing, software
// / distributed under the License is distributed on an "AS IS" BASIS,
// / WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// / See the License for the specific language governing permissions and
// / limitations under the License.
// /
// / Copyright holder is ArangoDB GmbH, Cologne, Germany
// /
// / @author Alan Plum
// //////////////////////////////////////////////////////////////////////////////

const _ = require('lodash');
const dd = require('dedent');
const InternalServerError = require('http-errors').InternalServerError;
const internal = require('internal');
const assert = require('assert');
const Module = require('module');
const semver = require('semver');
const path = require('path');
const fs = require('fs');
const ArangoError = require('@arangodb').ArangoError;
const errors = require('@arangodb').errors;
const defaultTypes = require('@arangodb/foxx/types');
const FoxxContext = require('@arangodb/foxx/context');
const parameterTypes = require('@arangodb/foxx/manager-utils').parameterTypes;
const getReadableName = require('@arangodb/foxx/manager-utils').getReadableName;
const Router = require('@arangodb/foxx/router/router');
const Tree = require('@arangodb/foxx/router/tree');

const $_MODULE_ROOT = Symbol.for('@arangodb/module.root');
const $_MODULE_CONTEXT = Symbol.for('@arangodb/module.context');

const APP_PATH = internal.appPath ? path.resolve(internal.appPath) : undefined;
const STARTUP_PATH = internal.startupPath ? path.resolve(internal.startupPath) : undefined;
const DEV_APP_PATH = internal.devAppPath ? path.resolve(internal.devAppPath) : undefined;

const LEGACY_ALIASES = [
  ['@arangodb/foxx/authentication', '@arangodb/foxx/legacy/authentication'],
  ['@arangodb/foxx/console', '@arangodb/foxx/legacy/console'],
  ['@arangodb/foxx/controller', '@arangodb/foxx/legacy/controller'],
  ['@arangodb/foxx/model', '@arangodb/foxx/legacy/model'],
  ['@arangodb/foxx/query', '@arangodb/foxx/legacy/query'],
  ['@arangodb/foxx/repository', '@arangodb/foxx/legacy/repository'],
  ['@arangodb/foxx/schema', '@arangodb/foxx/legacy/schema'],
  ['@arangodb/foxx/sessions', '@arangodb/foxx/legacy/sessions'],
  ['@arangodb/foxx/template_middleware', '@arangodb/foxx/legacy/template_middleware'],
  ['@arangodb/foxx', '@arangodb/foxx/legacy']
];

module.exports =
  class FoxxService {
    constructor (data) {
      assert(data, 'no arguments');
      assert(data.mount, 'mount path required');
      assert(data.path, `local path required for app "${data.mount}"`);
      assert(data.manifest, `called without manifest for app "${data.mount}"`);

      // mount paths always start with a slash
      this.mount = data.mount;
      this.path = data.path;
      this.basePath = path.resolve(this.root, this.path);
      this.isDevelopment = Boolean(data.isDevelopment);

      this.manifest = data.manifest;
      if (!this.manifest.dependencies) {
        this.manifest.dependencies = {};
      }
      if (!this.manifest.configuration) {
        this.manifest.configuration = {};
      }

      this.options = data.options;
      if (!this.options.configuration) {
        this.options.configuration = {};
      }
      if (!this.options.dependencies) {
        this.options.dependencies = {};
      }

      this.configuration = createConfiguration(this.manifest.configuration);
      this.dependencies = createDependencies(this.manifest.dependencies, this.options.dependencies);

      const warnings = this.applyConfiguration(this.options.configuration, false);
      if (warnings) {
        console.warnLines(`Stored configuration for service "${data.mount}" has errors:\n  ${
          Object.keys(warnings).map((key) => warnings[key]).join('\n  ')
        }\nValues for unknown options will be discarded if you save the configuration in production mode using the web interface.`);
      }

      this.thumbnail = null;
      if (this.manifest.thumbnail) {
        const thumb = path.resolve(this.root, this.path, this.manifest.thumbnail);
        if (fs.exists(thumb)) {
          this.thumbnail = thumb;
        }
      }

      const range = this.manifest.engines && this.manifest.engines.arangodb;
      this.legacy = range ? semver.gtr('3.0.0', range) : false;
      if (this.legacy) {
        console.debugLines(dd`
          Service "${this.mount}" is running in legacy compatibility mode.
          Requested version "${range}" is lower than "3.0.0".
        `);
      }

      this._reset();
    }

    applyConfiguration (config, replace) {
      if (!config) {
        config = {};
      }
      const definitions = this.manifest.configuration;
      const configNames = Object.keys(config);
      const knownNames = Object.keys(definitions);
      const omittedNames = knownNames.filter((name) => !configNames.includes(name));
      const names = replace ? configNames.concat(omittedNames) : configNames;
      const warnings = {};

      for (const name of names) {
        if (!knownNames.includes(name)) {
          warnings[name] = 'is not allowed';
          continue;
        }
        const def = definitions[name];
        const rawValue = config[name];

        if (rawValue === undefined || rawValue === null || rawValue === '') {
          this.options.configuration[name] = undefined;
          this.configuration[name] = def.default;
          if (def.required !== false) {
            warnings[name] = 'is required';
          }
          continue;
        }

        const validate = parameterTypes[def.type];
        let parsedValue = rawValue;
        let warning;

        if (validate.isJoi) {
          const result = validate.required().validate(rawValue);
          if (result.error) {
            warning = result.error.message.replace(/^"value"\s+/, '');
          } else {
            parsedValue = result.value;
          }
        } else {
          try {
            parsedValue = validate(rawValue);
          } catch (e) {
            warning = e.message;
          }
        }

        if (warning) {
          warnings[name] = warning;
        } else {
          this.options.configuration[name] = rawValue;
          this.configuration[name] = parsedValue;
        }
      }

      return Object.keys(warnings).length ? warnings : undefined;
    }

    applyDependencies (deps, replace) {
      if (!deps) {
        deps = {};
      }
      const definitions = this.manifest.dependencies;
      const depsNames = Object.keys(deps);
      const knownNames = Object.keys(definitions);
      const omittedNames = knownNames.filter((name) => !depsNames.includes(name));
      const names = replace ? depsNames.concat(omittedNames) : depsNames;
      const warnings = {};

      for (const name of names) {
        if (!knownNames.includes(name)) {
          warnings[name] = 'is not allowed';
          continue;
        }
        const def = definitions[name];
        const value = deps[name];

        if (def.multiple) {
          this.options.dependencies[name] = deps;
          const values = Array.isArray(value) ? value : (
            (value === undefined || value === null || value === '')
            ? []
            : [value]
          );

          if (!values.length) {
            if (def.required !== false) {
              warnings[name] = 'is required';
            }
            continue;
          }

          for (let i = 0; i < values.length; i++) {
            const value = values[i];
            if (typeof value !== 'string') {
              warnings[name] = `at ${i} must be a string`;
            } else {
              this.options.dependencies[name].push(value);
            }
          }
        } else {
          this.options.dependencies[name] = undefined;

          if (value === undefined || value === null || value === '') {
            if (def.required !== false) {
              warnings[name] = 'is required';
            }
            continue;
          }

          if (typeof value !== 'string') {
            warnings[name] = 'must be a string';
          } else {
            this.options.dependencies[name] = value;
          }
        }
      }

      return Object.keys(warnings).length ? warnings : undefined;
    }

    buildRoutes () {
      const service = this;
      this.tree = new Tree(this.main.context, this.router);
      let paths = [];
      try {
        paths = this.tree.buildSwaggerPaths();
      } catch (e) {
        console.errorLines(e.stack);
        let err = e.cause;
        while (err && err.stack) {
          console.errorLines(`via ${err.stack}`);
          err = err.cause;
        }
        console.warnLines(dd`
          Failed to build API documentation for "${this.mount}"!
          This is likely a bug in your Foxx service.
          Check the route methods you are using to document your API.
        `);
      }
      this.docs = {
        swagger: '2.0',
        basePath: this.main.context.baseUrl,
        paths: paths,
        info: {
          title: this.manifest.name,
          description: this.manifest.description,
          version: this.manifest.version,
          license: {
            name: this.manifest.license
          }
        }
      };
      this.routes.routes.push({
        url: {match: '/*'},
        action: {
          callback(req, res, opts, next) {
            let handled = true;

            try {
              handled = service.tree.dispatch(req, res);
            } catch (e) {
              const logLevel = (
              !e.statusCode ? 'error' : // Unhandled
                e.statusCode >= 500 ? 'warn' : // Internal
                  service.isDevelopment ? 'info' : // Debug
                    undefined
              );
              let error = e;
              if (!e.statusCode) {
                error = new InternalServerError();
                error.cause = e;
              }
              if (logLevel) {
                console[logLevel](`Service "${
                  service.mount
                }" encountered error ${
                  e.statusCode || 500
                } while handling ${
                  req.requestType
                } ${
                  req.absoluteUrl()
                }`);
                console[`${logLevel}Lines`](e.stack);
                let err = e.cause;
                while (err && err.stack) {
                  console[`${logLevel}Lines`](`via ${err.stack}`);
                  err = err.cause;
                }
              }
              const body = {
                error: true,
                errorNum: error.errorNum || error.statusCode,
                errorMessage: error.message,
                code: error.statusCode
              };
              if (error.statusCode === 405 && error.methods) {
                if (!res.headers) {
                  res.headers = {};
                }
                res.headers.allow = error.methods.join(', ');
              }
              if (service.isDevelopment) {
                const err = error.cause || error;
                body.exception = String(err);
                body.stacktrace = err.stack.replace(/\n+$/, '').split('\n');
              }
              if (error.extra) {
                Object.keys(error.extra).forEach(function (key) {
                  body[key] = error.extra[key];
                });
              }
              res.responseCode = error.statusCode;
              res.contentType = 'application/json';
              res.body = JSON.stringify(body);
            }

            if (!handled) {
              next();
            }
          }
        }
      });
    }

    _PRINT (context) {
      context.output += `[FoxxService at "${this.mount}"]`;
    }

    toJSON () {
      const result = {
        name: this.manifest.name,
        version: this.manifest.version,
        manifest: this.manifest,
        path: this.path,
        options: this.options,
        mount: this.mount,
        root: this.root,
        isSystem: this.isSystem,
        isDevelopment: this.isDevelopment
      };
      if (this.error) {
        result.error = this.error;
      }
      if (this.manifest.author) {
        result.author = this.manifest.author;
      }
      if (this.manifest.description) {
        result.description = this.manifest.description;
      }
      if (this.thumbnail) {
        try {
          result.thumbnail = fs.read64(this.thumbnail);
        } catch (e) {
          // noop
        }
      }
      return result;
    }

    simpleJSON () {
      return {
        name: this.manifest.name,
        version: this.manifest.version,
        mount: this.mount
      };
    }

    development (isDevelopment) {
      this.isDevelopment = isDevelopment;
    }

    getConfiguration (simple) {
      const config = {};
      const definitions = this.manifest.configuration;
      const options = this.options.configuration;
      for (const name of Object.keys(definitions)) {
        const dfn = definitions[name];
        const value = options[name] === undefined ? dfn.default : options[name];
        config[name] = simple ? value : Object.assign({}, dfn, {
          title: getReadableName(name),
          current: value
        });
      }
      return config;
    }

    getDependencies (simple) {
      const deps = {};
      const definitions = this.manifest.dependencies;
      const options = this.options.dependencies;
      for (const name of Object.keys(definitions)) {
        const dfn = definitions[name];
        const value = options[name];
        deps[name] = simple ? value : Object.assign({}, dfn, {
          title: getReadableName(name),
          current: value
        });
      }
      return deps;
    }

    needsConfiguration () {
      const config = this.getConfiguration();
      const deps = this.getDependencies();
      return (
        _.some(config, (cfg) => cfg.current === undefined && cfg.required) ||
        _.some(deps, (dep) => (dep.multiple ? (!dep.current || !dep.current.length) : !dep.current) && dep.required)
      );
    }

    run (filename, options) {
      options = options || {};
      filename = path.resolve(this.main[$_MODULE_CONTEXT].__dirname, filename);

      const module = new Module(filename, this.main);
      module.context = Object.assign(
        new FoxxContext(this),
        this.main.context,
        options.foxxContext
      );

      if (options.context) {
        Object.keys(options.context).forEach(function (key) {
          module[$_MODULE_CONTEXT][key] = options.context[key];
        });
      }

      if (this.legacy) {
        module[$_MODULE_CONTEXT].console = this.main[$_MODULE_CONTEXT].console;
        module[$_MODULE_CONTEXT].applicationContext = module.context;
      }

      module.load(filename);
      return module.exports;
    }

    getScripts () {
      const names = {};
      for (const name of Object.keys(this.manifest.scripts)) {
        names[name] = getReadableName(name);
      }
      return names;
    }

    executeScript (name, argv) {
      var scripts = this.manifest.scripts;
      // Only run setup/teardown scripts if they exist
      if (!scripts[name]) {
        if (name === 'setup' || name === 'teardown') {
          return undefined;
        }
        throw new ArangoError({
          errorNum: errors.ERROR_SERVICE_UNKNOWN_SCRIPT.code,
          errorMessage: dd`
            ${errors.ERROR_SERVICE_UNKNOWN_SCRIPT.message}
            Name: ${name}
          `
        });
      }
      return this.run(scripts[name], {
        foxxContext: {
          argv: argv ? (Array.isArray(argv) ? argv : [argv]) : []
        }
      });
    }

    _reset () {
      this.requireCache = {};
      const lib = this.manifest.lib || '.';
      const moduleRoot = path.resolve(this.root, this.path, lib);
      this.main = new Module(`foxx:${this.mount}`);
      this.main.filename = path.resolve(moduleRoot, '.foxx');
      this.main[$_MODULE_ROOT] = moduleRoot;
      this.main.require.aliases = new Map(this.legacy ? LEGACY_ALIASES : []);
      this.main.require.cache = this.requireCache;
      this.main.context = new FoxxContext(this);
      this.router = new Router();
      this.types = new Map(defaultTypes);
      this.routes = {
        name: `foxx("${this.mount}")`,
        routes: []
      };

      if (this.legacy) {
        this.main.context.path = this.main.context.fileName;
        this.main.context.fileName = (filename) => fs.safeJoin(this.basePath, filename);
        this.main.context.foxxFilename = this.main.context.fileName;
        this.main.context.version = this.version = this.manifest.version;
        this.main.context.name = this.name = this.manifest.name;
        this.main.context.options = this.options;
        this.main.context.use = undefined;
        this.main.context.apiDocumentation = undefined;
        this.main.context.graphql = undefined;
        this.main.context.registerType = undefined;
        const foxxConsole = require('@arangodb/foxx/legacy/console')(this.mount);
        this.main[$_MODULE_CONTEXT].console = foxxConsole;
      }
    }

    get exports () {
      return this.main.exports;
    }

    get isSystem () {
      return this.mount.charAt(1) === '_';
    }

    get root () {
      if (this.isSystem) {
        return FoxxService._systemAppPath;
      }
      return FoxxService._appPath;
    }

    get collectionPrefix () {
      return this.mount.substr(1).replace(/[-.:/]/g, '_') + '_';
    }

    static get _startupPath () {
      return STARTUP_PATH;
    }

    static get _appPath () {
      return APP_PATH ? (
        path.join(APP_PATH, '_db', internal.db._name())
        ) : undefined;
    }

    static get _systemAppPath () {
      return APP_PATH ? (
        path.join(STARTUP_PATH, 'apps', 'system')
        ) : undefined;
    }

    static get _oldAppPath () {
      return APP_PATH ? (
        path.join(APP_PATH, 'databases', internal.db._name())
        ) : undefined;
    }

    static get _devAppPath () {
      return DEV_APP_PATH ? (
        path.join(DEV_APP_PATH, 'databases', internal.db._name())
        ) : undefined;
    }
};

function createConfiguration (definitions) {
  const config = {};
  for (const name of Object.keys(definitions)) {
    const def = definitions[name];
    if (def.default !== undefined) {
      config[name] = def.default;
    }
  }
  return config;
}

function createDependencies (definitions, options) {
  const deps = {};
  for (const name of Object.keys(definitions)) {
    const dfn = definitions[name];
    Object.defineProperty(deps, name, {
      enumerable: true,
      get () {
        const fm = require('@arangodb/foxx/manager');
        const value = options[name];
        if (!dfn.multiple) {
          return value ? fm.requireService(value) : null;
        }
        const multi = [];
        if (value) {
          for (let i = 0; i < value.length; i++) {
            const item = value[i];
            Object.defineProperty(multi, String(i), {
              enumerable: true,
              get: () => item ? fm.requireService(item) : null
            });
          }
        }
        Object.freeze(multi);
        Object.seal(multi);
        return multi;
      }
    });
  }
  Object.freeze(deps);
  Object.seal(deps);
  return deps;
}