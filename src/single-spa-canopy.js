import deepMerge from 'deepmerge';
import {setOrRemoveAllOverlays} from './overlays.helpers.js'

const defaultOpts = {
  domElementGetter: null,
  featureToggles: [],
  position: 'relative',
  hotload: {
    warnCss: true,
    module: null,
    __webpack_require__: null,
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
        name: `${props.childAppName}!sofe`,
        metadata: {},
        address: "",
      })
    : SystemJS.import("sofe").then(({ getServiceUrl, InvalidServiceName }) => {
          try {
            return getServiceUrl(props.childAppName);
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
    .then(sofe => sofe.isOverride(props.childAppName))
}

function bootstrap(opts, props) {
  return Promise
    .resolve()
    .then(() => {
      const blockingPromises = [];
      const moduleName = `${props.childAppName}!sofe`;

      blockingPromises.push(Promise.all([getUrl(props), isOverridden(props)]).then(values => {
        const [url, isOverridden] = values;
        const invalidName = url === 'INVALID';

        const shouldHotload = !invalidName && isOverridden && opts.hotload.dev.enabled;

        if (shouldHotload) {
          if (!opts.hotload.module) {
            console.warn(`single-spa-canopy: for application '${props.childAppName}', hot reloading is enabled but the opts.module is undefined. Either turn off hot reloading in singleSpaCanopy config, or pass in the module object to single-spa-canopy`);
          }

          if (opts.hotload.module && !opts.hotload.module.hot) {
            console.warn(`single-spa-canopy: for application '${props.childAppName}', hot reloading is enabled but webpack hot reloading is not (module.hot is undefined). Either turn off hot reloading in the singleSpaCanopy config, or enable webpack hot reloading`);
          }

          if (opts.hotload.__webpack_require__) {
            var webpackPublicPath = url.slice(0, url.lastIndexOf('/') + 1);
            opts.hotload.__webpack_require__.p = webpackPublicPath;
          } else {
            console.warn('single-spa-canopy: for application \'' + props.childAppName + '\', hot reloading is enabled but the application is not bundled with webpack, which is currently the only supported bundler for hot reloading. Please provide __webpack_require__ opt to singleSpaCanopprovide __webpack_require__ opt to singleSpaCanopy.');
          }

          if (opts.hotload.module && opts.hotload.module.hot) {
            opts.hotload.module.hot.accept();
            opts.hotload.module.hot.dispose(() => {
              SystemJS
                .import('single-spa')
                .then(singleSpa => {
                  singleSpa.unloadChildApplication(props.childAppName, {waitForUnmount: opts.hotload.dev.waitForUnmount});
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
            [props.childAppName]: url,
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
      const serviceName = props.childAppName + '!sofe';
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
