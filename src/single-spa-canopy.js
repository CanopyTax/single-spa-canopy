let opts;

const defaultOpts = {
	mainContentTransition: true,
	domElementGetter: null,
	childAppName: null,
	React: null,
	featureToggles: [],
};

const domParser = new DOMParser();

export default function singleSpaCanopy(userOpts) {
	if (typeof userOpts !== 'object') {
		throw new Error(`single-spa-canopy requires an opts object`);
	}

	opts = {
		...defaultOpts,
		...userOpts,
	};

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
		bootstrap,
		mount,
		unmount,
	};
}

function bootstrap() {
	return new Promise((resolve, reject) => {
		const blockingPromises = [];
		if (window.Raven) {
			blockingPromises.push(SystemJS
				.locate({
					name: `${opts.childAppName}!sofe`,
					metadata: {},
					address: '',
				})
				.then(url => {
					window.Raven.setTagsContext({
						[opts.childAppName]: url,
					});
				})
			);
		}

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

		/* Non-blocking after everything else -- check that if we're bundling our own version of react, instead
		 * of using common-dependencies-bundle's version of React, that we are using exactly the same version
		 * of react as what will be used when this is deployed to production.
		 */
		if (opts.React) {
			System
			.import('react')
			.then(spalpatineReact => {
				if (spalpatineReact.version !== opts.React.version) {
					System
					.import('sofe')
					.then(sofe => {
						if (sofe.isOverride(opts.childAppName)) {
							warn(localStorage.getItem(`sofe:${opts.childAppName}`));
						} else {
							sofe
							.getAllManifests()
							.then(manifests => {
								warn(manifests.flat[opts.childAppName]);
							});
						}
					})

					function warn(url) {
						console.warn(`For application '${opts.childAppName}' hosted at url '${url}', the version of React (${opts.React.version}) is different than the spalpatine React version (${spalpatineReact.version}).`);
					}
				}
			})
		}
	});
}

function mount() {
	return new Promise((resolve, reject) => {
		if (opts.domElementGetter) {
			const el = getDomEl();

			const loaderEls = Array.prototype.forEach.call(el.querySelectorAll('.cps-loader'), function(loaderEl) {
				if (loaderEl.parentNode) {
					loaderEl.parentNode.removeChild(loaderEl);
				}
			});
		}

		resolve();
	});
}

function unmount() {
	return new Promise((resolve, reject) => {
		let el;

		if (opts.domElementGetter) {
			el = getDomEl();
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

function getDomEl() {
	const el = opts.domElementGetter();
	if (!el) {
		throw new Error(`single-spa-canopy: domElementGetter did not return a valid DOM element`);
	}

	return el;
}
