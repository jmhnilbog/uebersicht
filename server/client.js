const redux = require('redux')
    , reducer = require('./src/reducer')
    , listenToRemote = require('./src/listen')
    , sharedSocket = require('./src/SharedSocket')
    , render = require('./src/render')
;

window.$ = require('jquery');

const __identity = (x) => x;
const __guard = (value, transform=__identity) => {
    return (typeof value !== 'undefined' && value !== null) 
        ? transform(value) 
        : undefined
    ;
};

const bail = (err, timeout=0) => {
    if (err) {
        console.log(err);
    }
    return setTimeout(()=> window.location.reload(true), timeout);
}

const getState = (cb) => {
    $.get('/state/')
        .done(response => cb(null, JSON.parse(response)))
        .fail(() => callback(response, null))
    ;
};

const onLoad = window.onload = () => {

    const { host, pathname } = window.location;
    sharedSocket.open(`ws://${host}`);
    
    const screenId = Number(pathname.replace(/\//g, ''))
        , contentEl = document.getElementById('__uebersicht')
    ;
  
    contentEl.innerHTML = '';

    const cb = (err, initialState) => {
        if (err) {
            return bail(err, 10000);
        }

        const store = redux.createStore(reducer, initialState);
        store.subscribe(() => render(store.getState(), screenId, contentEl, store.dispatch));

        listenToRemote((action) => {
            if (action.type === 'WIDGET_WANTS_REFRESH') {
                const payload = render.rendered[action.payload];
                return __guard(payload != null ? payload.instance : undefined, x => x.forceRefresh());
              } else {
                return store.dispatch(action);
              }
            }
        );

        return render(initialState, screenId, contentEl, store.dispatch);
    };

    return getState(cb);

};

// legacy
window.uebersicht = {
  makeBgSlice(canvas) {
    return console.warn(```makeBgSlice has been deprecated. Please use CSS backdrop-filter instead:
    https://developer.mozilla.org/en-US/docs/Web/CSS/backdrop-filter```
    );
  }
};

window.addEventListener('contextmenu', e => e.preventDefault());