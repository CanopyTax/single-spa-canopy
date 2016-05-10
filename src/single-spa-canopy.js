let opts;

const defaultOpts = {
	mainContentTransition: true,
	domElementGetter: null,
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

	return {
		bootstrap,
		mount,
		unmount,
	};
}

function bootstrap() {
	return new Promise((resolve, reject) => {
		resolve();
	});
}

function mount() {
	return new Promise((resolve, reject) => {
		let el;

		if (opts.domElementGetter) {
			el = getDomEl();
		}

		const loaderEls = Array.prototype.forEach.call(el.querySelectorAll('.cps-loader'), function(loaderEl) {
			if (loaderEl.parentNode) {
				loaderEl.parentNode.removeChild(loaderEl);
			}
		});

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

		resolve();
	});
}

function getDomEl() {
	const el = opts.domElementGetter();
	if (!el) {
		throw new Error(`single-spa-canopy: domElementGetter did not return a valid DOM element`);
	}

	return el;
}
