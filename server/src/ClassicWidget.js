/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let ClassicWidget;
const $ = require('jquery');
window.jQuery = $;

const Timer = require('./Timer');
const runCommand = require('./runCommand');
const runShellCommand = require('./runShellCommand');

const defaults = {
  id: 'widget',
  refreshFrequency: 1000,
  render(output) { return output; },
  afterRender() {}
};

// This is a wrapper (something like a base class), around the
// specific implementation of a widget.
module.exports = (ClassicWidget = function(widgetObject) {
  let refresh, run, start, stop;
  const api = {};
  const internalApi = {};

  let el = null;
  let contentEl = null;
  const timer = null;
  const started = false;
  let rendered = false;
  const mounted = false;
  let commandLoop = null;
  let implementation = {};

  const init = function(widget) {
    let v;
    implementation = eval(widget.body)(widget.id);
    implementation.id === widget.id;

    for (var k in defaults) { v = defaults[k]; if (implementation[k] == null) { implementation[k] = v; } }
    for (k in internalApi) { v = internalApi[k]; if (!implementation[k]) { implementation[k] = v; } }

    commandLoop = Timer().map(done =>
      runCommand(implementation, function(err, output) {
        redraw(err, output);
        return done(implementation.refreshFrequency);
      })
    );

    return api;
  };

  // renders and returns the widget's dom element
  api.create = function() {
    el = document.createElement('div');
    contentEl = document.createElement('div');
    contentEl.id = implementation.id;
    contentEl.className = 'widget';
    el.innerHTML = `<style>${implementation.css}</style>\n`;
    el.appendChild(contentEl);

    start();
    return el;
  };

  api.destroy = function() {
    stop();
    if (el == null) { return; }
    if (el.parentNode != null) {
      el.parentNode.removeChild(el);
    }
    el = null;
    contentEl = null;
    return rendered = false;
  };

  api.update = function(newImplementation) {
    const parentEl = el.parentNode;
    api.destroy();
    init(newImplementation);
    return parentEl.appendChild(api.create());
  };

  api.domEl = () => el;

  api.isRendered = () => !!el;

  api.internalApi = () => internalApi;

  api.implementation = () => implementation;

  api.forceRefresh = () => internalApi.refresh();

  // starts the widget refresh cycle
  internalApi.start = (start = () => commandLoop.start());

  // stops the widget refresh cycle
  internalApi.stop = (stop = () => commandLoop.stop());

  // run widget command and redraw the widget
  internalApi.refresh = (refresh = function() {
    if (implementation.command == null) { return redraw(); }
    return commandLoop.forceTick();
  });

  // runs command in the shell and calls callback with the result (err, stdout)
  internalApi.run = (run = (command, callback) => runShellCommand(command, callback));

  var redraw = function(error, output) {
    if (error) {
      contentEl.innerHTML = error;
      console.error(`${implementation.id}:`, error);
      return rendered = false;
    }

    try {
      return renderOutput(output);
    } catch (e) {
      return contentEl.innerHTML = e.message;
    }
  };
      //throw e

  var renderOutput = function(output) {
    if ((implementation.update != null) && rendered) {
      return implementation.update(output, contentEl);
    } else {
      contentEl.innerHTML = implementation.render(output);
      loadScripts(contentEl);

      implementation.afterRender(contentEl);
      rendered = true;
      if (implementation.update != null) { return implementation.update(output, contentEl); }
    }
  };

  var loadScripts = domEl =>
    (() => {
      const result = [];
      for (let script of Array.from(domEl.getElementsByTagName('script'))) {
        const s = document.createElement('script');
        s.src = script.src;
        result.push(domEl.replaceChild(s, script));
      }
      return result;
    })()
  ;

  const errorToString = function(err) {
    let str = `[${implementation.id}] ${(typeof err.toString === 'function' ? err.toString() : undefined) || err.message}`;
    if (err.stack) { str += `\n  in ${err.stack.split('\n')[0]}()`; }
    return str;
  };

  return init(widgetObject);
});
