/* eslint-disable */
// @ts-ignore
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
    // @ts-ignore
    __webpack_public_path__ = chrome.runtime.getURL('');
}
