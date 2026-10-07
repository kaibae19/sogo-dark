/*
 * sogo-dark: light / dark / auto theme for SOGo 5.12 (https://github.com/kaibae19/sogo-dark)
 *
 * Mode, per browser: localStorage "sogo-theme" = "light" | "dark" | "auto" (default).
 * Auto follows prefers-color-scheme when the page loads.
 * Load with SOGoUIAdditionalJSFiles = ("js/sogo-dark.js") and SOGoUIxDebugEnabled = YES (see README).
 */
(function() {
  'use strict';
  var mode = 'auto';
  try { mode = localStorage.getItem('sogo-theme') || 'auto'; } catch (e) {}
  var dark = mode === 'dark' || (mode === 'auto' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  if (!dark) return;   // light: leave SOGo's own theme alone

  // SOGo has SOGoUIAdditionalJSFiles but no CSS counterpart: load the override stylesheet from here.
  var l = document.createElement('link'); l.rel = 'stylesheet';
  l.href = (document.currentScript ? document.currentScript.src.replace(/js\/sogo-dark\.js.*$/, '') : '/SOGo.woa/WebServerResources/') + 'css/sogo-dark.css';
  document.head.appendChild(l);
  document.documentElement.classList.add('sogo-dark');
  document.documentElement.style.colorScheme = 'dark';

  angular.module('SOGo.Common').config(configure);
  configure.$inject = ['$mdThemingProvider'];
  function configure($mdThemingProvider) {
    var darkBg = $mdThemingProvider.extendPalette('grey', {
      '50': '2b2f36', '100': '262a30', '200': '30353d', '300': '1f2328', '400': '3a3f47',
      '500': '22262b', '600': '1b1e22', '700': '16181c', '800': '121417', '900': '0e1013',
      'A100': '1b1e22', 'A200': '2b2f36', 'A400': '3a3f47', 'A700': '4c525c', '1000': '4c566a'
    });
    $mdThemingProvider.definePalette('sogo-dark-bg', darkBg);
    $mdThemingProvider.theme('default')
      .primaryPalette('blue-grey', {'default': '800', 'hue-1': '700', 'hue-2': '900', 'hue-3': 'A700'})
      .accentPalette('teal', {'default': 'A400', 'hue-1': '800', 'hue-2': '700', 'hue-3': 'A700'})
      .backgroundPalette('sogo-dark-bg')
      .dark();
    $mdThemingProvider.generateThemesOnDemand(false);
  }
})();
