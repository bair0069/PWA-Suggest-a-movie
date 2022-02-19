"use strict";
let log = console.log;

const APP = {
  tmdbBASEURL: "https://api.themoviedb.org/3/",
  tmdbAPIKEY: "fd746aee539e0204da54b3425652e549",
  tmdbIMAGEBASEURL: null,
  tmdbCONFIGDATA: null,
  searchForm: document.getElementById("searchForm"),
  searchField: document.getElementById("inputSearch"),
  url: `https://api.themoviedb.org/3/configuration?api_key=fd746aee539e0204da54b3425652e549`,
  results: [],
  DB: null, //the indexedDB
  isOnline: "onLine" in navigator && navigator.onLine,
  init: () => {
    //when the page loads
    //open the database
    APP.openDatabase(APP.registerSW()); //register the service worker after the DB is open
  },
  registerSW: () => {
    //register the service worker
    log("pretending service worker is running things are happening");
    //TODO: uncomment service worker registration
    // navigator.serviceWorker.register("./sw.js")

    //then add listeners and run page specific code
    APP.pageSpecific();
    APP.addListeners();
  },

  openDatabase: (nextStep) => {
    //open the database
    let version = 1;
    let dbOpenRequest = indexedDB.open("searchDB", 2);
    //add the update, error, success listeners in here
    dbOpenRequest.onupgradeneeded = function (ev) {
      APP.DB = ev.target.result;

      try {
        APP.DB.deleteObjectStore("searchStore");
      } catch (err) {
        console.log("error deleting old DB");
      }

      let options = {
        keyPath: "id",
        autoIncrement: false,
      };

      let searchStore = APP.DB.createObjectStore("searchStore", options);
      searchStore.createIndex("by_title", "title", { unique: false });
    };
    //call nextStep onsuccess
    //create searchStore with keyword as keyPath
    //create suggestStore with movieid as keyPath
    dbOpenRequest.onerror = function (err) {
      //an error has happened during opening
      console.log(err.message);
    };

    dbOpenRequest.onsuccess = function () {
      APP.DB = dbOpenRequest.result;
      console.log(APP.DB.name, `ready to be used.`);
      nextStep;
      // console.log(DB.version);
      // console.log(DB.objectStoreNames); //list of all the store names.
      // DB is now usable
    };
  },
  createTransaction: (storeName) => {
    let version = 1;
    let tx = APP.DB.transaction(storeName, "readwrite");
    console.log({ tx });
    APP.addResultsToDB(tx, APP.results, "searchStore", 0);
    tx.oncomplete = function (ev) {
      //the transaction has run and given us the result, if any
      console.log("All results added");
      return tx;
    };
  },
  getDBResults: (storeName, keyValue) => {
    //return the results from storeName where it matches keyValue
  },
  addResultsToDB: (tx) => {
    log("adding results to db");
    let searchStore = tx.objectStore("searchStore");
    log(searchStore);
    document.getElementById("searchForm").reset();
  },
  addListeners: () => {
    console.log("adding listeners");
    //add listeners
    //when the search form is submitted
    APP.searchForm.addEventListener("submit", (ev)=>{
      ev.preventDefault();
      APP.searchFormSubmitted(ev)
    });
    //when clicking on the list of possible searches on home or 404 page
    //when a message is received
    //when online and offline
  },
  pageSpecific: () => {
    //anything that happens specifically on each page
    if (document.body.id === "home") {
      //on the home page
    }
    if (document.body.id === "results") {
      //on the results page
      //listener for clicking on the movie card container
    }
    if (document.body.id === "suggest") {
      //on the suggest page
      //listener for clicking on the movie card container
    }
    if (document.body.id === "fourohfour") {
      //on the 404 page
    }
  },
  changeOnlineStatus: (ev) => {
    //when the browser goes online or offline
  },
  messageReceived: (ev) => {
    //ev.data
  },
  sendMessage: (msg) => {
    //send a message to the service worker
  },
  searchFormSubmitted: (ev) => {
    ev.preventDefault();
    log(ev);
    console.log("WAKE UP");
    //get the keyword from teh input
    let search = APP.searchField.value;
    if (search.length) {
      APP.getConfig(search);
    }
    // APP.navigate(`http://127.0.0.1:5500/results.html?inputSearch=${search}`);
  },
  //make sure it is not empty
  //check the db for matches
  //do a fetch call for search results
  //save results to db
  //navigate to url
  getConfig: (keyword) => {
    fetch(APP.url)
      .then((response) => {
        return response.json();
      })
      .then((data) => {
        APP.tmdbIMAGEBASEURL = data.images.secure_base_url;
        APP.configData = data.images;
        log(data)
        APP.getSearchResults(keyword);
      })
      .catch((err) => {
        {
          console.log(err);
        }
      });
  },
  cardListClicked: (ev) => {
    // user clicked on a movie card
    //get the title and movie id
    //check the db for matches
    //do a fetch for the suggest results
    //save results to db
    //build a url
    //navigate to the suggest page
  },
  getData: (endpoint, callback) => {
    //do a fetch call to the endpoint
    fetch(url)
      .then((resp) => {
        if (resp.status >= 400) {
          throw new NetworkError(
            `Failed fetch to ${url}`,
            resp.status,
            resp.statusText
          );
        }
        return resp.json();
      })
      .then((contents) => {
        let results = contents.results;
        //remove the properties we don't need
        //save the updated results to APP.results
        // call the callback
      })
      .catch((err) => {
        //handle the NetworkError
      });
  },

  getSearchResults: (keyword) => {
    console.log("searching");
    //check if online
    let url = `https://api.themoviedb.org/3/search/movie?api_key=${APP.tmdbAPIKEY}&language=en-US&query=${keyword}&page=1&include_adult=false`;
    fetch(url)
      .then((response) => response.json())
      .then((data) => {
        APP.results = data.results;
        APP.displayCards()
      })
      .catch((err) => alert(`Fetch failed due to: ${err.message}`));
      //check in DB for match of keyword in searchStore
      //if no match in DB do a fetch
      // APP.displayCards is the callback
  },
  getSuggestedResults: (movieid) => {
    //check if online
    //check in DB for match of movieid in suggestStore
    //if no match in DB do a fetch
    // APP.displayCards is the callback
  },
  displayCards: () => {
    console.log(APP.results);
    let resultsCards = document.getElementById('resultsCards')
    resultsCards.textContent="";
    let cardsList = document.createElement("ul");
    console.log('clearing')
    cardsList.setAttribute("class", "movieCards");
    let df = document.createDocumentFragment();
    log(`${APP.tmdbIMAGEBASEURL}w500${APP.results[0].poster_path}`)
    APP.results.forEach((item) => {
      let li = document.createElement("li");
      li.setAttribute("class", "card");
      li.innerHTML = `<h2>${item.title}</h2><img src= ${APP.tmdbIMAGEBASEURL}w185${item.poster_path} alt= A movie poster of ${item.title}> <h3>Released: ${item.release_date}</h3> <p>${item.popularity}</p>`;
      df.append(li);
    });
    cardsList.append(df);
    resultsCards.append(cardsList)
  },
    //display all the movie cards based on the results array
    // in APP.results
    //these results could be from the database or from a fetch

  navigate: (url) => {
    //change the current page
    window.location = url; //this should include the querystring
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
