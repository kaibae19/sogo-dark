/*
 * sogo-dark: light / dark / auto theme for SOGo 5.12 (https://github.com/kaibae19/sogo-dark)
 *
 * Mode, per browser: localStorage "sogo-theme" = "light" | "dark" | "auto" (default).
 * Auto follows prefers-color-scheme when the page loads. Users pick the mode in
 * Preferences > General > Theme (added by this script).
 *
 * Also remembers the toolbar's Expand button (folder list hidden) per module, Mail / Calendar /
 * Contacts, in localStorage "sogo-expand-<module>"; SOGo itself reopens the list on every page
 * load. Off switch: Preferences > General > Expanded view ("sogo-remember-expand" = "off").
 * Load with SOGoUIAdditionalJSFiles = ("js/sogo-dark.js") and SOGoUIxDebugEnabled = YES (see README).
 */
(function() {
  'use strict';
  var KEY = 'sogo-theme';
  var mode = 'auto';
  try { mode = localStorage.getItem(KEY) || 'auto'; } catch (e) {}
  if (['light', 'dark', 'auto'].indexOf(mode) < 0) mode = 'auto';
  var dark = mode === 'dark' || (mode === 'auto' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  var base = document.currentScript ? document.currentScript.src.replace(/js\/sogo-dark\.js.*$/, '') : '/SOGo.woa/WebServerResources/';

  if (dark) applyDarkTheme();
  if (/\/Preferences/.test(location.pathname)) watchForPreferences();

  var REMEMBER_KEY = 'sogo-remember-expand';
  var remember = get(REMEMBER_KEY) !== 'off';
  var module = (location.pathname.match(/\/so\/[^\/]+\/(Mail|Calendar|Contacts)\b/) || [])[1];
  if (module) whenReady(function() { return rememberExpand(module.toLowerCase()); });

  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  // Retry fn() until it returns true (Angular compiles the toolbar after load), for up to 15 s.
  function whenReady(fn) {
    var tries = 0;
    (function poll() { if (!fn() && ++tries < 60) setTimeout(poll, 250); })();
  }

  // The toolbar button calls toggleLeft() on the module's controller scope; leftIsClose is the
  // state, reset to open by the controller's $onInit and its gt-md watch. Wrap the function to
  // save the state, then restore it once those have run (only on wide screens, where the
  // button is the Expand icon; on narrow ones it opens a menu drawer).
  function rememberExpand(mod) {
    var btn = document.querySelector('[ng-click="toggleLeft()"]');
    var scope = btn && window.angular && angular.element(btn).scope();
    while (scope && !Object.prototype.hasOwnProperty.call(scope, 'toggleLeft')) scope = scope.$parent;
    if (!scope || typeof scope.isGtMedium === 'undefined') return false;
    var key = 'sogo-expand-' + mod, toggle = scope.toggleLeft;
    scope.toggleLeft = function() {
      var r = toggle.apply(this, arguments);
      if (remember && scope.isGtMedium) set(key, scope.leftIsClose ? 'closed' : 'open');
      return r;
    };
    if (remember && scope.isGtMedium && get(key) === 'closed') {
      scope.leftIsClose = true;
      scope.$applyAsync();
    }
    return true;
  }

  function applyDarkTheme() {
    // SOGo has SOGoUIAdditionalJSFiles but no CSS counterpart: load the override stylesheet from here.
    var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = base + 'css/sogo-dark.css';
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
  }

  // Preferences > General: add a "Theme" field after "Animation Level". It is saved in this
  // browser only (localStorage), and applies on the next page load: the Angular theme is fixed
  // at startup, and reloading on our own could drop other unsaved preferences.
  function watchForPreferences() {
    var add = function() { addThemeField(); addExpandField(); };
    var start = function() {
      add();
      new MutationObserver(add).observe(document.body, {childList: true, subtree: true});
    };
    if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
  }

  function addThemeField() {
    if (document.getElementById('sogo-dark-theme-field')) return;
    var anim = document.querySelector('md-radio-group[ng-model="app.preferences.defaults.SOGoAnimationMode"]');
    var after = anim && anim.closest('md-input-container');
    var injector = window.angular && angular.element(document.body).injector();
    if (!after || !injector) return;

    var scope = injector.get('$rootScope').$new(true);
    scope.sd = {mode: mode, changed: false};
    scope.sdSave = function() {
      try { localStorage.setItem(KEY, scope.sd.mode); } catch (e) {}
      scope.sd.changed = scope.sd.mode !== mode;
    };
    scope.sdReload = function() { location.reload(); };

    var field = injector.get('$compile')(
      '<md-input-container id="sogo-dark-theme-field" class="md-block md-input-has-value md-auto-horizontal-margin">' +
      '  <label>Theme</label>' +
      '  <md-radio-group ng-model="sd.mode" ng-change="sdSave()" aria-label="Theme">' +
      '    <md-radio-button value="auto">Auto (follow system)</md-radio-button>' +
      '    <md-radio-button value="light">Light</md-radio-button>' +
      '    <md-radio-button value="dark">Dark</md-radio-button>' +
      '  </md-radio-group>' +
      '  <div class="md-caption sogo-dark-hint">Saved in this browser only.' +
      '    <span ng-show="sd.changed"> Applies on the next page load.' +
      '      <md-button class="md-accent" ng-click="sdReload()">Reload now</md-button></span>' +
      '  </div>' +
      '</md-input-container>')(scope);
    after.parentNode.insertBefore(field[0], after.nextSibling);
    scope.$applyAsync();
  }

  // Preferences > General: "Expanded view" switch, after the Theme field. Browser only, like Theme;
  // applies on the next page load of Mail, Calendar or Contacts.
  function addExpandField() {
    if (document.getElementById('sogo-dark-expand-field')) return;
    var after = document.getElementById('sogo-dark-theme-field');
    var injector = window.angular && angular.element(document.body).injector();
    if (!after || !injector) return;

    var scope = injector.get('$rootScope').$new(true);
    scope.sx = {remember: remember};
    scope.sxSave = function() { set(REMEMBER_KEY, scope.sx.remember ? 'on' : 'off'); };

    var field = injector.get('$compile')(
      '<md-input-container id="sogo-dark-expand-field" class="md-block md-input-has-value md-auto-horizontal-margin">' +
      '  <label>Expanded view</label>' +
      '  <md-checkbox ng-model="sx.remember" ng-change="sxSave()" aria-label="Remember Expand">' +
      '    Remember the toolbar\'s Expand button separately for Mail, Calendar and Contacts</md-checkbox>' +
      '  <div class="md-caption sogo-dark-hint">Saved in this browser only.</div>' +
      '</md-input-container>')(scope);
    after.parentNode.insertBefore(field[0], after.nextSibling);
    scope.$applyAsync();
  }
})();
