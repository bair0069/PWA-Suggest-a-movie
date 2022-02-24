"use strict";
const APP = {
  isOnline: "onLine" in navigator && navigator.onLine,

  //INIT
  init: () => {
    //- - Register SW
    APP.registerSW();
    APP.getConfig()
    //- - Create Search DB
  },
  //TODO: remove commented lines from SW
  //REGISTER SW
  SW: null,
  registerSW: () => {
    //if the worker is registered
    if ("serviceWorker" in navigator) {
      console.log("pretending to add service worker");
      navigator.serviceWorker.register("../sw.js").catch(function (err) {
        // Something went wrong during registration. The sw.js file
        // might be unavailable or contain a syntax error.
        console.warn(err);
      });
      navigator.serviceWorker.ready.then((registration) => {
        // .ready will never reject... just wait indefinitely
        APP.createSearchDB();
        APP.SW = registration.active;
        //save the reference to use later or use .ready again
      });
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
      APP.DB = dbOpenRequest.result;
      //- - Execute Page specific code
      APP.pageSpecific();
      console.log(APP.DB.name, "ready to be used");
    };
  },
  //TODO:PAGE SPECIFIC
  //- -TODO: home page
  //- -TODO: results page
  //- -TODO: suggest page
  //- -TODO: fourohfour page
  pageSpecific: () => {
    if (document.body.id === "home") {
      //get previousSearches
      APP.getPrevSearches()
    }
    if (document.body.id === "results") {
      APP.getResultsFromDB();
      //TODO:add listeners to results cards
    }
    if (document.body.id === "suggest") {
    }
    if (document.body.id === "fourohfour") {
      //get previousSearches
      APP.getPrevSearches()
    }
    APP.addListeners();
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
    console.log(search);
    //check db for matches
    if (search.length) {
      APP.checkForSearchMatches(search);
    }
    //if (match):
    //navigate to results
    //DONE in checkForSearchMatches
    //pull results from DB using url keyword
    // - DONE in pageSpecific
    //display results
    // -DONE in displayCards
    //Else If doesn't match:
    //fetch results
    // DONE in checkForSearchMatches
    //store results needs to be passed results and keyword
    // this is done in the fetch
    //navigate to results page
    //done in the addResultsToDB function
    //display results
  },
  //TODO:CHECK FOR SEARCH MATCHES
  //- -TODO: make matches return result not just true or false
  checkForSearchMatches: (search) => {
    // check search for matches if none then fetch
    let tx = APP.createTransaction("searchStore", "readonly");
    console.log({ tx });
    let searchStore = tx.objectStore("searchStore");
    console.log(search);
    let request = searchStore.get(search);
    console.log(request);
    request.onerror = (err) => {
      console.warn(err);
    };
    request.onsuccess = (ev) => {
      console.log(ev.target);
      if (ev.target.result == undefined) {
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
      console.log("transaction complete");
      return tx;
    };
    return tx;
  },
  //- -TODO: return results if match exists
  tmdbAPIKEY: "fd746aee539e0204da54b3425652e549",
  url: `https://api.themoviedb.org/3/configuration?api_key=fd746aee539e0204da54b3425652e549`,
  tmdbBASEURL: "https://api.themoviedb.org/3/",
  //FETCH
  getConfig: () => {
    fetch(APP.url)
      .then((response) => {
        return response.json();
      })
      .then((data) => {
        APP.tmdbIMAGEBASEURL = data.images.secure_base_url;
        APP.tmdbCONFIGDATA = data.images;
      })
      .catch((err) => {
        {
          console.log(err);
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
          APP.addResultsToDB(data.results, search);
          console.log(data.results);
        })
        .catch((err) => console.warn(`Fetch failed due to: ${err.message}`));
    }
    else{
      APP.navigate('offline')
    }
    
  },
  //ADD RESULTS TO DB
  addResultsToDB: (results, keyword) => {
    results.keyword = keyword;
    let tx = APP.createTransaction("searchStore", "readwrite");
    let searchStore = tx.objectStore("searchStore");
    let addRequest = searchStore.add(results);
    addRequest.onsuccess = (ev) => {
      console.log("success");
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
    }
    else if (searchType=="offline"){
      url=`http://127.0.0.1:5500/404.html`
    }

    window.location = url;
  },
  tmdbIMAGEBASEURL: null,
  tmdbCONFIGDATA: null,
  //GET RESULTS
  getResultsFromDB: () => {
    let url = new URL(window.location.href);
    let params = url.searchParams;
    let keyword = `${params.get("keyword")}`;
    let results = null;
    console.log(keyword);
    let tx = APP.createTransaction("searchStore", "readonly");

    let searchStore = tx.objectStore("searchStore");
    console.log(searchStore);

    let request = searchStore.get(keyword);
    console.log(request);

    request.onerror = (err) => {
      console.warn(err);
    };
    request.onsuccess = (ev) => {
      results = ev.target.result;
      APP.displayCards(results,keyword);
    };
  },
  //DISPLAY
  displayCards: (results,keyword) => {
    let titleArea = document.querySelector(".titleArea");
    titleArea.innerHTML = `<p class="resultsMessage"> Showing results for  "${keyword}" </p>`;

    //display all the movie cards based on the results array
    //in APP.results
    //these results could be from the database or from a fetch
    console.log(results);
    let resultsCards = document.getElementById('resultsCards')
    let df = document.createDocumentFragment()
    resultsCards.textContent="";
    console.log('clearing')
    console.log(`APP.tmdbIMAGEBASEURL}w185${results[0].poster_path}`)
    resultsCards.setAttribute("class", "resultsCards");
    results.forEach((item) => {
      let img = document.createElement("img")
      if(item.poster_path){img.src=`${APP.tmdbIMAGEBASEURL}w185${item.poster_path}`}
      else{img.src="../img/noimage.png"}
      img.setAttribute('alt',`A movie poster of ${item.title}`)
      let li = document.createElement("li");
      li.setAttribute("class", "card")
      li.setAttribute('data-id',item.id);
      li.innerHTML = `<h2>${item.title}</h2><div class="description"><p>${item.overview}</p></div> <h3 class="suggested"> <a data-id=${item.id}>Suggested Movies</a> </h3>`;
      li.innerHTML = `<h2>${item.title}</h2>`;
      li.prepend(img)
      df.append(li);
    });
    resultsCards.append(df)
  },
  //TODO:CLICK ON CARD
  //TODO:GET SUGGESTED MOVIES

  //TODO:STORE SUGGESTED MOVIES
  addSuggestToDB: (id, results) => {
    console.log("adding results to db");
    results.id = id;
    let tx = APP.createTransaction("suggestStore", "readwrite");
    console.log(results);
    let searchStore = tx.objectStore("suggestStore");

    let addRequest = searchStore.add(results);
    addRequest.onsuccess = (ev) => {
      console.log("success");
    };
    addRequest.onerror = (err) => {
      console.warn("Failed to add", err.message);
    };
  },
  //TODO:SHOW SUGGESTED MOVIES
  getPrevSearches:()=>{
    let tx = APP.createTransaction('searchStore','readonly')

    let searchStore = tx.objectStore('searchStore')

    let request = searchStore.getAllKeys()

    request.onerror = (err)=>{console.warn(err)}
    request.onsuccess = (ev)=>{
      APP.createPrevSearchesList(ev.target.result)
    }
  },
  createPrevSearchesList:(result)=>{
    let searches = document.querySelector('.previousSearches')
    searches.addEventListener('click',(ev)=>{
      let keyword = ev.target.closest('a').textContent
      APP.navigate('search',keyword)
    })
    let df = document.createDocumentFragment()
    result.forEach((item)=>{
      let li = document.createElement('li')
      li.innerHTML=`<a class="prevSearchItem">${item}</a>`
      df.append(li)
    })
    searches.append(df)

  },
  deferredPrompt: null,
  //TODO:INSTALL PROMPT
  //TODO:ONLINE/OFFLINE
  changeStatus: (status) => {
    if (status='online'){
    document.querySelector('.offline').style.display="none"
    }
    else{document.querySelector('.offline').style.display="inline-block"}
},
  //TODO:LIMIT CACHE
};

document.addEventListener("DOMContentLoaded", APP.init);
