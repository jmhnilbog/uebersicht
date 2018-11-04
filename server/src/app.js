const path = require('path')
	, fs = require('fs')
;

const connect = require('connect')
	, serveStatic = require('serve-static')
	, redux = require('redux')
;

const MessageBus = require('./MessageBus');
const watchDir = require('./directory_watcher');
const WidgetBundler = require('./WidgetBundler');
const Settings = require('./Settings');
const StateServer = require('./StateServer');
const CommandServer = require('./command_server');
const serveClient = require('./serveClient');
const sharedSocket = require('./SharedSocket');
const actions = require('./actions');
const reducer = require('./reducer');
const resolveWidget = require('./resolveWidget');
const dispatchToRemote = require('./dispatch');
const listenToRemote = require('./listen');

module.exports = function(port, widgetPath, settingsPath, options, callback) {
  if (!options) { options = {}; }

  // global store for app state
  const store = redux.createStore(
    reducer,
    { widgets: {}, settings: {}, screens: [] }
  );

  // listen to remote actions
  listenToRemote(action => store.dispatch(action));

  // watch widget dir and dispatch correct actions
  widgetPath = path.resolve(__dirname, widgetPath);
  // follow symlink if widgetDirectory is one
  if (fs.lstatSync(widgetPath).isSymbolicLink()) {
    widgetPath = fs.readlinkSync(widgetPath);
  }
  widgetPath = widgetPath.normalize();

  const bundler = WidgetBundler(widgetPath);
  // TODO: use a stream/generator/promise pattern instead of nested callbacks
  const dirWatcher = watchDir(widgetPath, fileEvent =>
    bundler.push(resolveWidget(fileEvent), function(widgetEvent) {
      const action = actions.get(widgetEvent);
      if (action) {
        store.dispatch(action);
        return dispatchToRemote(action);
      }
    })
  );

  // load and replay settings
  const settings = Settings(settingsPath);

  const object = settings.load();
  for (let id in object) {
    const value = object[id];
    const action = actions.applyWidgetSettings(id, value);
    store.dispatch(action);
    dispatchToRemote(action);
  }

  store.subscribe(() => settings.persist(store.getState().settings));

  // set up the server
  let messageBus = null;
  var server = connect()
    .use(CommandServer(widgetPath, options.loginShell))
    .use(StateServer(store))
    .use(serveStatic(path.resolve(__dirname, './public')))
    .use(serveStatic(widgetPath))
    .use(serveClient)
    .listen(port, '127.0.0.1', function(err) {
      try {
        if (err) { return server.emit('error', err); }
        messageBus = MessageBus({server});
        sharedSocket.open(`ws://127.0.0.1:${port}`);
        return (typeof callback === 'function' ? callback() : undefined);
      } catch (e) {
        return server.emit('error', e);
      }
  });

  // api
  return {
    close(cb) {
      dirWatcher.stop();
      bundler.close();
      server.close();
      sharedSocket.close();
      return messageBus.close(cb);
    },

    on(ev, handler) {
      return server.on(ev, handler);
    }
  };
};

