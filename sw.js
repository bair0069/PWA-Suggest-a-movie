"use strict";

const version = 1;
const isOnline = true;
const staticCache = `PWA-Static-Search-APP-${version}`;
const dynamicCache = `PWA-Dynamic-Search-APP-${version}`;
const cacheLimit = 35;
const cacheList = [
  //Pages
  "./",
  "./index.html",
  "./results.html",
  "./suggest.html",
  "./404.html",
  //styles
  "./css/main.css",
  //manifest:
  "./manifest.json",
  //favicons:
  "./img/android-chrome-192x192.png",
  "./img/android-chrome-512x512.png",
  "./img/apple-touch-icon.png",
  "./img/favicon-16x16.png",
  "./img/favicon-32x32.png",
  "./img/mstile-150x150.png",
  "./img/offline-1.png",
  "./img/noimage.png",
  "./img/safari-pinned-tab.svg",
  "./img/search_black_24dp.svg",
  //fonts:
  "https://fonts.googleapis.com/css2?family=Expletus+Sans&display=swap",
  "https://fonts.googleapis.com/css2?family=Raleway&display=swap",
  "https://fonts.googleapis.com/css2?family=Faustina&display=swap",
  // any extra js files:
  "./js/app.js",
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
            limitCache(dynamicCache,cacheLimit)
            console.log('A fetch call is made')
            if (!fetchRes.status >= 400) throw new Error(fetchRes.statusText);
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
  console.log(ev.data);
  //message received from script
  if (ev.data.ONLINE) {
    let isOnline = ev.data.ONLINE;
    sendMessage(isOnline);
  }
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
      if (keys.length >= size) {
        cache.delete(keys[0])
        limitCache(nm,size)
      }
    })
  });
}

function checkForConnection() {
  //try to talk to a server and do a fetch() with HEAD method.
  //to see if we are really online or offline
  //send a message back to the browser
}
