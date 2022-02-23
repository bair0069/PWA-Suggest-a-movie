"use strict";
const APP = {
  isOnline: "onLine" in navigator && navigator.onLine,

  //TODO:INIT
  init: async () => {
    //- - Register SW
    APP.registerSW();
    //- - Create Search DB
    APP.createSearchDB();
    //- - Execute Page specific code
    APP.pageSpecific();
    //- - ADD Listeners
    APP.addListeners();
  },
  //TODO: remove commented lines from SW
  //REGISTER SW
  SW: null,
  registerSW: () => {
    //if the worker is registered
    if ("serviceWorker" in navigator) {
      console.log("pretending to add service worker");
      // navigator.serviceWorker.register('../sw.js').catch(function (err) {
      //   // Something went wrong during registration. The sw.js file
      //   // might be unavailable or contain a syntax error.
      //   console.warn(err);
      // });
      // navigator.serviceWorker.ready.then((registration) => {
      //   // .ready will never reject... just wait indefinitely
      //   APP.SW = registration.active;
      //   //save the reference to use later or use .ready again
      // });
    }
  },
  //CREATE SEARCH DB
  //- - create searchStore
  //- - create suggestStore
  DB: null,
  version: 1,
  createSearchDB: () => {
    console.log("creating DB");
    let dbOpenRequest = indexedDB.open("searchDB", APP.version);
    dbOpenRequest.onupgradeneeded = (ev) => {
      APP.DB = ev.target.result; // set DB equal to result of onupgradeneeded

      try {
        APP.DB.deleteObjectStore("searchStore");
        APP.DB.deleteObjectStore("suggestStore");
      } catch (err) {
        console.warn("error deleting old DB stores");
      }

      // store searches under their search keyword in searchStore
      let searchOptions = {
        keyPath: 'keyword',
        autoIncrement: false,
      };

      APP.DB.createObjectStore("searchStore", searchOptions);

      let suggestOptions = {
        keyPath: "id",
        autoIncrement: false,
      };
      APP.DB.createObjectStore(
        "suggestStore",
        suggestOptions
      );
    };
    dbOpenRequest.onerror = (err) => {
      console.warn(err.message);
    };
    dbOpenRequest.onsuccess = (ev) => {
      APP.DB = dbOpenRequest.result;
      console.log(APP.DB.name, "ready to be used");
    };
  },
  //TODO:PAGE SPECIFIC
  //- -TODO: home page
  //- -TODO: results page
  //- -TODO: suggest page
  //- -TODO: fourohfour page
  pageSpecific: () => {
    console.log("adding page specific");
    if (document.body.id === "home") {
      //TODO:add listeners to previousSearches
    }
    if (document.body.id === "results") {
      //TODO:add listeners to results cards
    }
    if (document.body.id === "suggest") {
    }
    if (document.body.id === "fourohfour") {
      //TODO: add listeners to previousSearches
    }
  },
  //TODO:ADD LISTENERS
  addListeners: () => {
    console.log("adding listeners");
    //add event listeners for DOM
    //check if already installed
    if (navigator.standalone) {
      console.log("Launched: Installed (iOS)");
      APP.isStandalone = true;
    } else if (matchMedia("(display-mode: standalone)").matches) {
      console.log("Launched: Installed");
      APP.isStandalone = true;
    } else {
      // console.log('Launched: Browser Tab');
      APP.isStandalone = false;
    }
    //listen for pageshow event to update the nav counter
    window.addEventListener("pageshow", APP.updateNavCount);

    //add event listeners for online and offline
    window.addEventListener("online", APP.changeStatus);
    window.addEventListener("offline", APP.changeStatus);

    //add listener for message
    navigator.serviceWorker.addEventListener("message", APP.gotMessage);

    //add listener for install event
    window.addEventListener("beforeinstallprompt", (ev) => {
      // Prevent the mini-infobar from appearing on mobile
      ev.preventDefault();
      // Save the event in a global property
      // so that it can be triggered later.
      APP.deferredPrompt = ev;
      console.log("deferredPrompt saved");
      // Build your own enhanced install experience
      // use the APP.deferredPrompt saved event
    });

    let searchForm = document.getElementById("searchForm");
    // add listener for search form submitted
    searchForm.addEventListener("submit", APP.searchFormSubmitted);
  },
  results: null,
  //TODO:SEARCH
  searchFormSubmitted: async (ev) => {
    let search = document.getElementById("inputSearch");
    search = search.value;
    ev.preventDefault();
    let match = await APP.checkForSearchMatches(search);
    //check db for matches
    //if (match):
    //TODO:navigate to results
    //TODO:pull results from DB using url keyword
    //TODO: display results
    //Else If doesn't match:
    //TODO:fetch results
    await APP.fetchResults(search);
    //TODO:store results
    // this is done in the fetch
    //TODO:navigate to results page
    //TODO:display results
  },
  //TODO:CHECK FOR SEARCH MATCHES
  //- -TODO: make matches return result not just true or false
  checkForSearchMatches: (search) => {
    // check search for matches if none then fetch
    let bool = null;
    let tx = APP.createTransaction("searchStore", "readonly");
    console.log({ tx });
    let searchStore = tx.objectStore("searchStore");
    let request = searchStore.get(search);
    request.onerror = (err) => {
      console.warn(err);
      bool = false;
      return bool;
    };
    request.onsuccess = (ev) => {
      //TODO: Display CArds
      bool = true;
      return bool;
    };
    return bool;
  },
  //- - create transaction
  createTransaction: (storeName, mode) => {
    let tx = APP.DB.transaction(storeName, mode);

    tx.onerror = (err) => {
      console.log(err);
    };
    // Do something when all the data is added to the database.
    tx.oncomplete = (ev) => {
      tx = ev.result;
      console.log("transaction complete");
      return tx;
    };
    return tx;
  },
  //- -TODO: return results if match exists


  tmdbAPIKEY: "fd746aee539e0204da54b3425652e549",
  
  tmdbBASEURL: "https://api.themoviedb.org/3/",
  //TODO:FETCH
  fetchResults: (search) => {
    //check if online
    console.log(APP.isOnline);
    if (APP.isOnline) {
      let url = `https://api.themoviedb.org/3/search/movie?api_key=${APP.tmdbAPIKEY}&language=en-US&query=${search}&page=1&include_adult=false`;
      fetch(url)
        .then((response) => response.json())
        .then((data) => {
          APP.addResultsToDB(data.results, search);
        })
        .catch((err) => console.warn(`Fetch failed due to: ${err.message}`));
      // APP.addResultsToDB is the callback
    }
  },
  //TODO:ADD RESULTS TO DB
  addResultsToDB: (results, keyword) => {
    console.log("adding results to db");
    results.keyword = keyword;
    let tx = APP.createTransaction("searchStore", "readwrite");
    console.log(results)
    let searchStore = tx.objectStore("searchStore");

    let addRequest = searchStore.add(results);
    addRequest.onsuccess = (ev) => {
      console.log("success");
    };
    addRequest.onerror = (err) => {
      console.warn("Failed to add", err.message);
    };
  },
  //TODO:NAVIGATE
  tmdbIMAGEBASEURL: null,
  tmdbCONFIGDATA: null,
  //TODO:DISPLAY
  //TODO:CLICK ON CARD
  //TODO:GET SUGGESTED MOVIES

  //TODO:STORE SUGGESTED MOVIES
  addSuggestToDB: () => {
    console.log("adding suggested to db");
  },
  //TODO:SHOW SUGGESTED MOVIES
  deferredPrompt: null,
  //TODO:INSTALL PROMPT
  //TODO:ONLINE/OFFLINE
  changeStatus: (ev) => {
    console.log(ev);
  },
  //TODO:LIMIT CACHE
};

document.addEventListener("DOMContentLoaded", APP.init);
