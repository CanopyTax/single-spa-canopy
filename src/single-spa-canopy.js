import deepMerge from 'deepmerge';
import {setOrRemoveAllOverlays, getAppName} from './overlays.helpers.js'

const defaultOpts = {
  domElementGetter: null,
  featureToggles: [],
  position: 'relative',
  setPublicPath: null, // a function that should do `path => __webpack_public_path__ = path`. Necessary for hot reloading
  hotload: {
    module: null, // Webpack's "module" object for the root javascript module of the child application. (module.exports, module.hot, etc)
    __webpack_require__: null, // Webpack's require global variable, which let's us alter the public path dynamically at runtime
    dev: {
      enabled: false, // You must opt in to hotload
      waitForUnmount: false,
    },
    deployed: {
      enabled: false,
      waitForUnmount: true,
    },
  },
  overlay: {
    selectors: [],
  },
};

const domParser = new DOMParser();

export default function singleSpaCanopy(userOpts) {
  if (typeof userOpts !== 'object') {
    throw new Error(`single-spa-canopy requires an opts object`);
  }

  const opts = deepMerge(defaultOpts, userOpts);

  if (userOpts.featureToggles && !Array.isArray(userOpts.featureToggles)) {
    throw new Error(`single-spa-canopy opts.featureToggles must be an array of strings`);
  }

  return {
    bootstrap: bootstrap.bind(null, opts),
    mount: mount.bind(null, opts),
    unmount: unmount.bind(null, opts),
    unload: unload.bind(null, opts),
  };
}

function getUrl(props) {
  return SystemJS.locate
    ? SystemJS.locate({
        name: `${getAppName(props)}!sofe`,
        metadata: {},
        address: "",
      })
    : SystemJS.import("sofe").then(({ getServiceUrl, InvalidServiceName }) => {
          try {
            return getServiceUrl(getAppName(props));
          } catch (e) {
            if (e instanceof InvalidServiceName) {
              console.warn(
                `The single-spa child app name is not the same as the sofe service!
                This means that hotloading will not work!`
              );
              return 'INVALID';
            } else {
              throw e;
            }
          }
      });
}

function isOverridden(props) {
  return SystemJS
    .import('sofe')
    .then(sofe => sofe.isOverride(getAppName(props)))
}

function bootstrap(opts, props) {
  return Promise
    .resolve()
    .then(() => {
      const blockingPromises = [];
      const moduleName = `${getAppName(props)}!sofe`;

      blockingPromises.push(Promise.all([getUrl(props), isOverridden(props)]).then(values => {
        const [url, isOverridden] = values;
        const invalidName = url === 'INVALID';

        const webpackPublicPath = url.slice(0, url.lastIndexOf('/') + 1);
        let publicPathSet = false;

        if (opts.setPublicPath) {
          opts.setPublicPath(webpackPublicPath)
          publicPathSet = true
        }

        const shouldHotload = !invalidName && isOverridden && opts.hotload.dev.enabled;

        if (shouldHotload) {
          if (!opts.hotload.module) {
            console.warn(`single-spa-canopy: for application '${getAppName(props)}', hot reloading is enabled but the opts.module is undefined. Either turn off hot reloading in singleSpaCanopy config, or pass in the module object to single-spa-canopy`);
          }

          if (opts.hotload.module && !opts.hotload.module.hot) {
            console.warn(`single-spa-canopy: for application '${getAppName(props)}', hot reloading is enabled but webpack hot reloading is not (module.hot is undefined). Either turn off hot reloading in the singleSpaCanopy config, or enable webpack hot reloading`);
          }

          if (opts.hotload.__webpack_require__) {
            opts.hotload.__webpack_require__.p = webpackPublicPath;
            publicPathSet = true
          }

          if (!publicPathSet) {
            console.warn('single-spa-canopy: for application \'' + getAppName(props) + '\', hot reloading is enabled but the application is not bundled with webpack, which is currently the only supported bundler for hot reloading. Please provide __webpack_require__ opt to singleSpaCanopprovide __webpack_require__ opt to singleSpaCanopy.');
          }

          if (opts.hotload.module && opts.hotload.module.hot) {
            opts.hotload.module.hot.accept();
            opts.hotload.module.hot.dispose(() => {
              SystemJS
                .import('single-spa')
                .then(singleSpa => {
                  singleSpa.unloadChildApplication(getAppName(props), {waitForUnmount: opts.hotload.dev.waitForUnmount});
                })
                .catch(err => {
                  setTimeout(() => {
                    throw err;
                  });
                });
            });
          }
        }

        if (window.Raven) {
          window.Raven.setTagsContext({
            [getAppName(props)]: url,
          });
        }
      }))

      if (opts.featureToggles.length > 0) {
        blockingPromises.push(
          SystemJS
          .import('feature-toggles!sofe')
          .then(featureToggles => {
            return featureToggles.fetchFeatureToggles(...opts.featureToggles)
          })
        );
      }

      return Promise.all(blockingPromises);
    });
}

function mount(opts, props) {
  return Promise
    .resolve()
    .then(() => {
      let overlayArray = []
      if (opts.domElementGetter) {
        const el = getDomEl(opts);
        el.style.position = opts.position
        window.addEventListener('cp:show-overlay-keypress', toggleOverlays);
        window.addEventListener('single-spa:routing-event', toggleOverlays);

        opts.overlay._toggleOverlays = toggleOverlays;

        function toggleOverlays() {
          setOrRemoveAllOverlays(el, opts, props);
        }
      }
    });
}

function unmount(opts) {
  return Promise
    .resolve()
    .then(() => {
      window.removeEventListener('cp:show-overlay-keypress', opts.overlay._toggleOverlays)
      window.removeEventListener('single-spa:routing-event', opts.overlay._toggleOverlays)
    })
}

function unload(opts, props) {
  return Promise
    .resolve()
    .then(() => {
      const serviceName = getAppName(props) + '!sofe';
      const wasDeleted = SystemJS.delete(SystemJS.normalizeSync(serviceName));
      if (!wasDeleted) {
        throw new Error(`Could not unload application '${serviceName}'`);
      }
    })
}

function attemptDeleteDomNode(selector) {
  const element = document.querySelector(selector);
  if (!element) {
    return false;
  } else {
    element.parentNode.removeChild(element);
    return true;
  }
}

function getDomEl(opts) {
  const el = opts.domElementGetter();
  if (!el) {
    throw new Error(`single-spa-canopy: domElementGetter did not return a valid DOM element`);
  }

  return el;
}

function forceSetPublicPath(config) {
  validateConfig(config)
  return Promise
    .resolve()
    .then(() => {
      const blockingPromises = [];
      const moduleName = `${getAppName(config)}!sofe`;

      blockingPromises.push(Promise.all([getUrl(config), isOverridden(config)]).then(values => {
        const [url, isOverridden] = values;

        const webpackPublicPath = url.slice(0, url.lastIndexOf('/') + 1);

        if (config.setPublicPath) {
          config.setPublicPath(webpackPublicPath)
        }
      }))

      return Promise.all(blockingPromises).then(results => null);
    })
}

function validateConfig(config) {
  const name = getAppName(config)
  if (name === undefined) {
    throw new Error('cannot get appName - invalid config')
  } else if (!config.setPublicPath) {
    throw new Error('cannot set publicPath without a `setPublicPath` method on the configuration')
  }
}
