const version = 1;
const staticCache = `PWA-Static-Movie-APP-${version}`;
const dynamicCache = `PWA-Dynamic-Movie-APP-${version}`;
const cacheLimit = 100;
const cacheList = [
  //Pages
  "./",
  "./index.html",
  "./results.html",
  "./suggest.html",
  "./404.html",
  //manifest:
  "./manifest.json",
  //favicons:
  "./img/android-chrome-192x192.png",
  "./img/android-chrome-512x512.png",
  "./img/apple-touch-icon.png",
  "./img/favicon-16x16.png",
  "./img/favicon-32x32.png",
  "./img/mstile-150x150.png",
  "./img/safari-pinned-tab.svg",
  //fonts:
  "https://fonts.googleapis.com/css2?family=Expletus+Sans&display=swap",
  "https://fonts.googleapis.com/css2?family=Raleway&display=swap",
  "https://fonts.googleapis.com/css2?family=Faustina&display=swap",
  // any extra js files:
];

self.addEventListener("install", (ev) => {
  ev.waitUntil(
    caches.open(staticCache).then((cache) => cache.addAll(cacheList))
  );
});

self.addEventListener("activate", (ev) => {
  ev.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(
          keys
            .filter((key) => {
              if (key === staticCache || key === dynamicCache) {
                return false;
              } else {
                return true;
              }
            })
            .map((key) => caches.delete(key))
        ); //keys.filter().map() returns an array of Promises
      })
      .catch(console.warn)
  );
});

self.addEventListener("fetch", (ev) => {
  ev.respondWith(
    caches.match(ev.request).then((cacheRes) => {
      return (
        cacheRes ||
        fetch(ev.request)
          .then((fetchRes) => {
            //TODO: check here for the 404 error
            if (!fetchRes.ok) throw new Error(fetchRes.statusText);
            return caches.open(dynamicCache).then((cache) => {
              let copy = fetchRes.clone(); //make a copy of the response
              cache.put(ev.request, copy); //put the copy into the cache
              return fetchRes; //send the original response back up the chain
            });
          })
          .catch((err) => {
            console.log("SW fetch failed");
            console.warn(err);
            if (ev.request.mode == "navigate") {
              //send the 404 page
              return caches.match("/404.html").then((page404Response) => {
                return page404Response;
              });
            }
          })
      );
    })
  );
});

self.addEventListener("message", (ev) => {
  //check ev.data to get the message
});

function sendMessage(msg) {
  self.clients.matchAll().then((clients) => {
    if (clients && clients.length) {
      clients[0].postMessage(msg);
    }
  });
}

function limitCache(nm, size = 25) {
  //remove some files from the dynamic cache
  caches.open(nm).then((cache) => {
    cache.keys().then((keys) => {
      if (keys.length > size) {
        cache.delete(keys[0]).then(() => {
          limitCacheSize(nm, size);
        });
      }
    });
  });
}

function checkForConnection() {
  //try to talk to a server and do a fetch() with HEAD method.
  //to see if we are really online or offline
  //send a message back to the browser
}
