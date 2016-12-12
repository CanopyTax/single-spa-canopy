import {initializeHotReloading} from './hot-reload.js';

const defaultOpts = {
	mainContentTransition: true,
	domElementGetter: null,
	childAppName: null,
	featureToggles: [],
	hotload: {
		dev: {
			enabled: false, // You must opt in to hotload
			waitForUnmount: false,
		},
		deployed: {
			enabled: false,
			waitForUnmount: true,
		},
	},
};

const domParser = new DOMParser();

export default function singleSpaCanopy(userOpts) {
	if (typeof userOpts !== 'object') {
		throw new Error(`single-spa-canopy requires an opts object`);
	}

	const opts = Object.assign({}, defaultOpts, userOpts);

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
				System
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
		if (opts.domElementGetter) {
			const el = getDomEl(opts);

			const loaderEls = Array.prototype.forEach.call(el.querySelectorAll('.cps-loader'), function(loaderEl) {
				if (loaderEl.parentNode) {
					loaderEl.parentNode.removeChild(loaderEl);
				}
			});
		}

		resolve();
	});
}

function unmount(opts) {
	return new Promise((resolve, reject) => {
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

function unload(opts) {
	if (SystemJS.reload) {
		return SystemJS.reload(opts.childAppName);
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

function getDomEl(opts) {
	const el = opts.domElementGetter();
	if (!el) {
		throw new Error(`single-spa-canopy: domElementGetter did not return a valid DOM element`);
	}

	return el;
}
