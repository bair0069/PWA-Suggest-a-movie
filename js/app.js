"use strict";

//-- make a small footer for the bottom that credits TMDB


const APP = {
  isOnline: "onLine" in navigator && navigator.onLine,
  tmdbAPIKEY: "fd746aee539e0204da54b3425652e549",
  url: `https://api.themoviedb.org/3/configuration?api_key=fd746aee539e0204da54b3425652e549`,
  tmdbBASEURL: "https://api.themoviedb.org/3/",
  tmdbIMGURL: null,
  tmdbCONFIGDATA : null,
  //INIT
  init: async ()  => {
    //- - Register SW
    await APP.getConfig();
    APP.registerSW();
    APP.addListeners();
    setTimeout(APP.checkNavCount, 10000)
    //- - Create Search DB
  },

  //REGISTER SW
  SW: null,
  registerSW: () => {
    //if the worker is registered
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("../sw.js").catch(function (err) {
        // Something went wrong during registration. The sw.js file
        // might be unavailable or contain a syntax error.
        console.warn(err);
      });
      navigator.serviceWorker.ready.then((registration) => {
        // .ready will never reject... just wait indefinitely
        APP.createSearchDB();
        registration.active.postMessage({ ONLINE: APP.isOnline });
        APP.SW = registration.active;
        //save the reference to use later or use .ready again
      });
    }
  },
  //ONLINE/OFFLINE
  changeStatus: (status) => {
    console.log('online status changed')
    if (status == "online") {
      document.querySelector(".offline").style.display = "none";
      APP.sendMessage("Browser is online");
    } else {
      document.querySelector(".offline").style.display = "inline-block";
      APP.sendMessage("Browser is offline");
    }
  },
  sendMessage: (msg) => {
    //send messages to the service worker
    navigator.serviceWorker.ready.then((registration) => {
      registration.active.postMessage(msg);
    });
  },
  gotMessage: (ev) => {
    //received message from service worker
    console.log("Service worker online:", ev.data);
  },
  //CREATE SEARCH DB
  //- - create searchStore
  //- - create suggestStore
  DB: null,
  version: 1,
  createSearchDB: () => {
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
        keyPath: "keyword",
        autoIncrement: false,
      };

      APP.DB.createObjectStore("searchStore", searchOptions);

      let suggestOptions = {
        keyPath: "id",
        autoIncrement: false,
      };
      APP.DB.createObjectStore("suggestStore", suggestOptions);
    };
    dbOpenRequest.onerror = (err) => {
      console.warn(err.message);
    };
    dbOpenRequest.onsuccess = (ev) => {
      APP.DB = ev.target.result;
      //- - Execute Page specific code
      APP.pageSpecific();
    };
  },
  //PAGE SPECIFIC
  pageSpecific: () => {
    if (document.body.id === "home") {
      //get previousSearches
      APP.getPrevSearches();
    }
    if (document.body.id === "results") {
      APP.getResultsFromDB();
    }
    if (document.body.id === "suggest") {
      APP.getSuggestFromDB();
    }
    if (document.body.id === "fourohfour") {
      //get previousSearches
      APP.getPrevSearches();
    }
  },
  //TODO:ADD LISTENERS
  addListeners: () => {
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
    //check db for matches
    if (search.length) {
      APP.checkForSearchMatches(search);
    }
    //if match
    //navigate to results
    //DONE in checkForSearchMatches
    //pull results from DB using url keyword
    // happens in pageSpecific
    //display results
    // happens in displayCards
    //Else If doesn't match:
    //fetch results
    // happens in checkForSearchMatches
    //store results needs to be passed results and keyword
    // this is done in the fetch
    //navigate to results page
    //done in the addResultsToDB function
    //display results
  },
  //CHECK FOR SEARCH MATCHES
  //make matches return result not just true or false
  checkForSearchMatches: (search) => {
    // check search for matches if none then fetch
    let tx = APP.createTransaction("searchStore", "readonly");
    let searchStore = tx.objectStore("searchStore");
    let request = searchStore.get(search);
    request.onerror = (err) => {
      console.warn(err);
    };
    request.onsuccess = (ev) => {
      console.log(ev.target);
      if (ev.target.result == undefined) {
        console.log("no match found");
        APP.fetchResults(search);
      } else {
        APP.navigate("search", search);
      }
    };
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
      return tx;
    };
    return tx;
  },
  
  //FETCH
  getConfig: async () => {
    await fetch(APP.url)
      .then((response) => {
        return response.json();
      })
      .then((data) => {
        console.log("setting base image url");
        APP.tmdbIMAGEBASEURL = data.images.secure_base_url;
        APP.tmdbCONFIGDATA = data.images;
      })
      .catch((err) => {
        {
          console.log(err);
          throw new NetworkError('failed to fetch', APP.url)
          
        }
      });
  },

  fetchResults: (search) => {
    //check if online
    //if not online navigate to 404 page
    if (APP.isOnline) {
      let url = `https://api.themoviedb.org/3/search/movie?api_key=${APP.tmdbAPIKEY}&language=en-US&query=${search}&page=1&include_adult=false`;
      fetch(url)
        .then((response) => response.json())
        .then((data) => {
          if(data.results.length>1){
          let mappedResults = data.results.map((item) => {
            let { id, poster_path, release_date, title, popularity } = item;
            return { id, poster_path, release_date, title, popularity };
          });
          console.log(mappedResults);

        APP.addResultsToDB(mappedResults, search);
        }
        else{
          APP.navigate('offline')
        }
          
        })
        .catch((err) => console.warn(`Fetch failed due to: ${err.message}`));
    } else {
      APP.navigate("offline");
    }
  },
  //ADD RESULTS TO DB
  addResultsToDB: (results, keyword) => {
    let storedObject = { results, keyword };

    let tx = APP.createTransaction("searchStore", "readwrite");
    let searchStore = tx.objectStore("searchStore");
    let addRequest = searchStore.add(storedObject);
    addRequest.onsuccess = (ev) => {
      APP.navigate("search", keyword);
    };
    addRequest.onerror = (err) => {
      console.warn("Failed to add", err.target.error);
    };
  },
  //NAVIGATE
  navigate: (searchType, keyword, id, title) => {
    //build custom url for suggest or search
    let url = "";
    if (searchType == "search") {
      url = `http://127.0.0.1:5500/results.html?keyword=${keyword}`;
      APP.getResultsFromDB();
    } else if (searchType == "suggest") {
      url = `http://127.0.0.1:5500/suggest.html?id=${id}&title=${title}`;
    } else if (searchType == "offline") {
      url = `http://127.0.0.1:5500/404.html`;
    }

    window.location = url;
  },
  //GET RESULTS
  getResultsFromDB: () => {
    let url = new URL(window.location.href);
    let params = url.searchParams;
    let keyword = `${params.get("keyword")}`;
    let results = null;
    let tx = APP.createTransaction("searchStore", "readonly");
    let searchStore = tx.objectStore("searchStore");

    let request = searchStore.get(keyword);

    request.onerror = (err) => {
      console.warn(err);
    };
    request.onsuccess = async (ev) => {
      results = ev.target.result.results;
      await APP.displayCards(results, keyword);
    };
  },
  //DISPLAY
  displayCards: async (results, keyword) => {
    document.title = `Results for "${keyword}"`;

    let titleArea = document.querySelector(".titleArea");
    titleArea.innerHTML = `<p class="resultsMessage"> Showing results for  "${keyword}" </p>`;

    // create df to store cards for search results and for suggest results
    let resultsCards = document.getElementById("resultsCards");
    let df = document.createDocumentFragment();
    resultsCards.textContent = "";
    resultsCards.setAttribute("class", "resultsCards");
    await results.forEach((item) => {
      let img = document.createElement("img");
      if (item.poster_path) {
        img.src = `${APP.tmdbIMAGEBASEURL}w342${item.poster_path}`;
      } else {
        img.src = "../img/noimage.png";
      }
      img.setAttribute("alt", `A movie poster of ${item.title}`);
      let li = document.createElement("li");
      li.setAttribute("class", "card");
      li.setAttribute("data-id", item.id);
      li.setAttribute("data-title", item.title);
      li.innerHTML = `
      <h2>${item.title}</h2>
      <small>Release Date: ${item.release_date}</small>
      <small>Popularity rating: ${item.popularity}</small>`;
      li.prepend(img);
      df.append(li);
    });
    resultsCards.append(df);
    resultsCards.addEventListener("click", (ev) => {
      APP.resultsCardClicked(ev);
    });
  },
  //CLICK ON CARD
  resultsCardClicked: (ev) => {
    let evClass = ev.target.parentNode.getAttribute("class");
    if (evClass == "card") {
      let id = ev.target.parentNode.getAttribute("data-id");
      let title = ev.target.parentNode.getAttribute("data-title");
      APP.getSuggest(id, title);
    }
  },
  //GET SUGGESTED MOVIES
  getSuggest: (id, title) => {
    let tx = APP.createTransaction("suggestStore", "readonly");
    let suggestStore = tx.objectStore("suggestStore");
    let request = suggestStore.get(id);

    request.onerror = (err) => {
      console.warn(err);
    };
    request.onsuccess = (ev) => {
      if (ev.target.result === undefined) {
        APP.fetchSuggestions(id, title);
      } else {
        APP.navigate("suggest", " ", id, title);
      }
    };
  },

  fetchSuggestions: (id, title) => {
    //check if online
    //if not online navigate to 404 page
    if (APP.isOnline) {
      let url = `https://api.themoviedb.org/3/movie/${id}/recommendations?api_key=${APP.tmdbAPIKEY}&language=en-US&page=1`;
      fetch(url)
        .then((response) => response.json())
        .then((data) => {
          console.log(data.results);
          if (data.results.length) {
            let mappedResults = data.results.map((item) => {
              let { id, poster_path, release_date, title, popularity } = item;
              return { id, poster_path, release_date, title, popularity };
            });
            APP.addSuggestToDB(id, mappedResults, title);
          } else {APP.navigate("offline")}
        })
        .catch((err) => console.warn(`Fetch failed due to: ${err.message}`));
    } else {
      APP.navigate("offline");
    }
  },

  //STORE SUGGESTED MOVIES
  addSuggestToDB: (id, results, title) => {
    let tx = APP.createTransaction("suggestStore", "readwrite");
    console.log(results);
    let searchStore = tx.objectStore("suggestStore");

    let addRequest = searchStore.add({ results, id });
    addRequest.onsuccess = (ev) => {
      APP.navigate("suggest", " ", id, title);
    };
    addRequest.onerror = (err) => {
      console.warn("Failed to add", err.message);
    };
  },
  getSuggestFromDB: () => {
    let url = new URL(window.location.href);
    let params = url.searchParams;
    let id = params.get("id");
    let title = params.get("title");

    let tx = APP.createTransaction("suggestStore", "readonly");
    let searchStore = tx.objectStore("suggestStore");
    let getRequest = searchStore.get(id);
    getRequest.onsuccess = async (ev)  => {
      await APP.displayCards(ev.target.result.results, title);
    };
    getRequest.onerror = (err) => {
      console.warn("Failed to add", err.message);
    };
  },
  //SHOW SUGGESTED MOVIES

  //GET PREV SEARCHES FOR 404 and INDEX.html
  getPrevSearches: () => {
    let tx = APP.createTransaction("searchStore", "readonly");

    let searchStore = tx.objectStore("searchStore");

    let request = searchStore.getAllKeys();

    request.onerror = (err) => {
      console.warn(err);
    };
    request.onsuccess = (ev) => {
      APP.createPrevSearchesList(ev.target.result);
    };
  },
  createPrevSearchesList: (result) => {
    let searches = document.querySelector(".previousSearches");
    searches.addEventListener("click", (ev) => {
      let keyword = ev.target.closest("a").textContent;
      APP.navigate("search", keyword);
    });
    let df = document.createDocumentFragment();
    result.forEach((item) => {
      let li = document.createElement("li");
      li.innerHTML = `<a class="prevSearchItem">${item}</a>`;
      df.append(li);
    });
    searches.append(df);
  },
  deferredPrompt: null,
  //INSTALL PROMPT
  updateNavCount: (ev) => {
    // when the app loads check to see if the sessionStorage key exists
    // if the number exists then increment by 1.
    // triggered by the pageshow event
    console.log(ev);
    //don't need to do this if the app is already installed...
    if (!APP.isStandalone) {
      APP.navCount = 0;
      let storage = sessionStorage.getItem('navCount');
      if (storage) {
        APP.navCount = Number(storage) + 1;
      } else {
        APP.navCount = 1;
      }
      sessionStorage.setItem('navCount', APP.navCount);
    }
  },
  checkNavCount: () => {
    //page has just loaded if the count is high enough then show the prompt
    let storage = sessionStorage.getItem('navCount');
    if (storage) {
      APP.navCount = Number(storage);
      if (APP.navCount > 4) {
        console.log('show the prompt'); //only works on user interaction
        document.body.addEventListener(
          'click',
          () => {
            if (APP.deferredPrompt) {
              APP.deferredPrompt.prompt();
              APP.deferredPrompt.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                  //user says yes
                  console.log('User accepted the install prompt');
                  APP.deferredPrompt = null; //we will not need it again.
                  //and clear out sessionStorage
                  sessionStorage.clear();
                } else {
                  //user says not now
                  console.log('User dismissed the install prompt');
                }
              });
            } else {
              window.addEventListener('beforeinstallprompt', (ev) => {
                console.log('beforeinstallprompt');
                ev.preventDefault();
                APP.deferredPrompt = ev;
              });
            }
          },
          { once: true }
        );
      }
    }
  },

};

document.addEventListener("DOMContentLoaded", APP.init);

class NetworkError extends Error {
  constructor(msg, status, statusText) {
    super(msg);
    this.status = status;
    this.statusText = statusText;
  }
}
