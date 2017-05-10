import {initializeHotReloading} from './hot-reload.js';
import deepMerge from 'deepmerge';
import { shouldShowOverlay, getColorFromString, createOverlayWithText, addOverlayEventListener, setupListener } from './overlays.helpers.js'

setupListener()

const defaultOpts = {
	mainContentTransition: true,
	domElementGetter: null,
	childAppName: null,
	featureToggles: [],
	hotload: {
		warnCss: true,
		dev: {
			enabled: false, // You must opt in to hotload
			waitForUnmount: false,
		},
		deployed: {
			enabled: false,
			waitForUnmount: true,
		},
	},
	overlay: {}
};

const domParser = new DOMParser();

export default function singleSpaCanopy(userOpts) {
	if (typeof userOpts !== 'object') {
		throw new Error(`single-spa-canopy requires an opts object`);
	}

	const opts = deepMerge(defaultOpts, userOpts);

	if (opts.mainContentTransition && !opts.domElementGetter) {
		throw new Error(`In order to show a transition between apps, single-spa-canopy requires opts.domElementGetter function`);
	}

	if (typeof opts.childAppName !== 'string') {
		throw new Error(`single-spa-canopy requires opts.childAppName string`);
	}

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

function bootstrap(opts) {
	return new Promise((resolve, reject) => {
		const blockingPromises = [];
		const moduleName = `${opts.childAppName}!sofe`;
		blockingPromises.push(SystemJS
			.locate({
				name: moduleName,
				metadata: {},
				address: '',
			})
			.then(url => {
				const overriddenToLocal = url.indexOf('https://localhost') === 0 || url.indexOf('https://ielocal') === 0;
				const shouldHotload = overriddenToLocal && opts.hotload.dev.enabled;

				if (shouldHotload) {
					initializeHotReloading(opts, url, opts.hotload.dev.waitForUnmount);
				}

				if (window.Raven) {
					window.Raven.setTagsContext({
						[opts.childAppName]: url,
					});
				}
			})
		);

		if (opts.featureToggles.length > 0) {
			blockingPromises.push(
				SystemJS
				.import('feature-toggles!sofe')
				.then(featureToggles => {
					return featureToggles.fetchFeatureToggles(...opts.featureToggles)
				})
			);
		}

		Promise.all(blockingPromises).then(resolve).catch(reject);
	});
}

function mount(opts) {
	return new Promise((resolve, reject) => {
		let overlayArray = []
		if (opts.domElementGetter) {
			const el = getDomEl(opts);
			el.style.position = 'relative'
			if (opts.overlay.selectors) {
				overlayArray = overlayArray.concat(
					opts.overlay.selectors.map((selector, i) => {
						return createOverlayWithText(opts, document.querySelector(selector))
					}).filter(item => !!item)
				)
			} else {
				overlayArray = overlayArray.concat(createOverlayWithText(opts, el))
			}

			window.addEventListener('cp:show-overlay-keypress', shouldShowAllOverlays)

			const loaderEls = Array.prototype.forEach.call(el.querySelectorAll('.cps-loader'), function(loaderEl) {
				if (loaderEl.parentNode) {
					loaderEl.parentNode.removeChild(loaderEl);
				}
			});
		}

		opts.overlay._shouldShowAllOverlays = shouldShowAllOverlays
		resolve();

		function shouldShowAllOverlays() {
			overlayArray.forEach((overlayEl) => {
				shouldShowOverlay(overlayEl)
			})
		}
	});
}

function unmount(opts) {
	return new Promise((resolve, reject) => {
		window.removeEventListener('cp:show-overlay-keypress', opts.overlay._shouldShowAllOverlays)
		let el;

		if (opts.domElementGetter) {
			el = getDomEl(opts);
		}

		if (opts.mainContentTransition) {
			putLoaderIntoEl(el);
		}

		const cpMainContent = document.getElementById('cp-main-content');
		if (cpMainContent.childNodes.length === 0) {
			putLoaderIntoEl(cpMainContent);
		}

		resolve();
	});
}

function unload(opts, props) {
	if (SystemJS.reload) {
		return Promise
			.resolve()
			.then(() => {
				const optsChildAppSelector = opts.hotload.styleTagSelector; // This can be a className `.name` or an `#id` or any selector
				const propsChildAppSelector = `#${props.childAppName}-styles`;
				let didRemoveCss = attemptDeleteDomNode(opts.hotload.styleTagSelector) || attemptDeleteDomNode(optsChildAppSelector) || attemptDeleteDomNode(propsChildAppSelector);

				if (typeof __webpack_require__ !== 'undefined') {
					const installedModules = __webpack_require__.c;
					for (let moduleId in installedModules) {
						const module = installedModules[moduleId]
						if (module.hot) {
							module.hot._disposeHandlers.forEach(handler => handler());
						}
					}
					didRemoveCss = true;
				}
				if (!didRemoveCss && opts.hotload.warnCss) {
					console.error(`Hot-reload warning: Cannot unload css for app '${props.childAppName}'. Please provide opts.hotload.styleTagSelector, or put an id attribute on the <style> with '${optsChildAppSelector}' or '${propsChildAppSelector}'. If using webpack, try doing webpack --hot`);
				}
			})
			.then(() => SystemJS.reload(opts.childAppName));
	} else {
		return Promise.reject(`Cannot hotload app '${opts.childAppName}' because SystemJS.trace is false or SystemJS.reload is undefined. Try running localStorage.setItem('common-deps', 'dev') and refreshing the page.`);
	}
}

function putLoaderIntoEl(el) {
	const secondaryNavEl = document.querySelector('.cps-secondarynav');
	const topNavSecondaryEl = document.querySelector('.cps-topnav-secondary');
	const topNavEl = document.querySelector('.cps-topnav');
	const bannerEl = document.querySelector('.cps-banner-global');

	const leftOffset = secondaryNavEl ? secondaryNavEl.clientWidth / 2 : 0;
	const topOffset = (clientHeight(bannerEl) + clientHeight(topNavEl) + clientHeight(topNavSecondaryEl)) / 2;

	const parsedDoc = domParser.parseFromString(`
		<div class="cps-loader +page" style="position: fixed; left: calc(50% + ${leftOffset}px); top: calc(50% + ${topOffset}px); transform: translate(-50%, -50%)">
			<span></span>
			<span></span>
			<span></span>
		</div>
		`, 'text/html');

	el.appendChild(parsedDoc.documentElement.querySelector('body').children[0]);

	function clientHeight(el) {
		return el ? el.clientHeight : 0;
	}
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
