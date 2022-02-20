"use strict";
let log = console.log;

const APP = {
  isOnline: "onLine" in navigator && navigator.onLine,
  tmdbBASEURL: "https://api.themoviedb.org/3/",
  tmdbAPIKEY: "fd746aee539e0204da54b3425652e549",
  tmdbIMAGEBASEURL: null,
  tmdbCONFIGDATA: null,
  keyword:null,
  df :document.createDocumentFragment(),
  version:1,
  searchForm: document.getElementById("searchForm"),
  searchField: document.getElementById("inputSearch"),
  url: `https://api.themoviedb.org/3/configuration?api_key=fd746aee539e0204da54b3425652e549`,
  results: [],
  DB: null, //the indexedDB
  init: () => {
    //when the page loads
    //open the database
    APP.openDatabase(APP.registerSW()); //register the service worker after the DB is open
  },
  registerSW: () => {
    log('I see you')
    // //register the service worker
    // if ('serviceWorker' in navigator) {
    //   navigator.serviceWorker.register('/sw.js').catch(function (err) {
    //     // Something went wrong during registration. The sw.js file
    //     // might be unavailable or contain a syntax error.
    //     console.warn(err);
    //   });
    //   navigator.serviceWorker.ready.then((registration) => {
    //     // .ready will never reject... just wait indefinitely
    //     APP.sw = registration.active;
    //     //save the reference to use later or use .ready again
    //   })
    //};
    //then add listeners and run page specific code
    APP.pageSpecific();
    APP.addListeners();
  },

  openDatabase: (nextStep) => {
    let dBOpenReq = indexedDB.open('searchDB', 1 )

    dBOpenReq.onupgradeneeded = (ev)=>{
      APP.DB = ev.target.result; // APP.DB gets assigned to the result
      log(APP.DB);

      try {
        APP.DB.deleteObjectStore('searchStore')
      }
      catch (err){
        console.log(err.msg)
      }

      let options = {
        keyPath:'keyword', // this creates a required unique keyword for each stored document
        autoIncrement:false, // prevent auto Incrementing
      }

      let searchStore = APP.DB.createObjectStore('searchStore',options);
      searchStore.createIndex('by_title','title',{unique:false})
      APP.DB.createObjectStore('suggestStore',{keyPath:'movieid',autoIncrement:false})
      // create a new store that will hold search keywords and result

    }
      dBOpenReq.onerror = (err)=>log(err.msg); // log error message if errors occur when opening db.

      dBOpenReq.onsuccess = (ev) => {
        APP.DB = ev.target.result;
        // reference to database used.

        log(APP.DB.name, 'ready to be used')
        
      }
  },
  createTransaction: (storeName, mode) => {
    let tx = APP.DB.transaction(storeName,mode) // create transaction

    tx.onerror = (err)=>{log(err.msg)} // print error if any in transaction
    
    tx.oncomplete = (ev)=>{log('the transaction has completed successfully')
      //transaction has completed
    }


  },
  addResultsToDB: (tx, results, index = 0,keyword,store)=>{
      console.log({ tx });
      console.log(index);
      log(results)
      results.keyword = keyword
      results.movieid = keyword

      let storeName = tx.objectStore(store);
      let addRequest = storeName.add(results);
    
      //handle the successful completion of the add
      addRequest.onsuccess = (ev) => {
        log('successfully added', keyword)
        // index++;
        // if (index < results.length) {
        //   console.log('about to add movie', index);
        //   APP.addResultsToDB(tx, results, index);
        //   //inside the same transaction
        // } else {
        //   //done adding all the documents
        // }
      }
      addRequest.onerror = (err) => {
        console.warn('Failed to add', err);
      };
  },
  addListeners: () => {
    console.log("adding listeners");
    //add listeners
    if (navigator.standalone) {
      console.log('Launched: Installed (iOS)');
      APP.isStandalone = true;
    } else if (matchMedia('(display-mode: standalone)').matches) {
      console.log('Launched: Installed');
      APP.isStandalone = true;
    } else {
      // console.log('Launched: Browser Tab');
      APP.isStandalone = false;
    }

    //add event listeners for online and offline
    window.addEventListener('online', APP.changeOnlineStatus);
    window.addEventListener('offline', APP.changeOnlineStatus);

    //add listener for message
    navigator.serviceWorker.addEventListener('message', APP.gotMessage);

    //add listener for install event
    window.addEventListener('beforeinstallprompt', (ev) => {
      // Prevent the mini-infobar from appearing on mobile
      ev.preventDefault();
      // Save the event in a global property
      // so that it can be triggered later.
      APP.deferredPrompt = ev;
      console.log('deferredPrompt saved');
      // Build your own enhanced install experience
      // use the APP.deferredPrompt saved event
    });
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
    log('page specific called')
    //anything that happens specifically on each page
    if (document.body.id === "home") {
      //on the home page
    }
    if (document.body.id === "results") {
      log('on results')
      //on the results page
      //listener for clicking on the movie card container
      let resultsCards = document.getElementById('resultsCards')
      if(resultsCards){
      resultsCards.addEventListener('click',(ev)=>{
        let targetClass = ev.target.parentNode.getAttribute('class')
        switch(targetClass){
          case "suggested": APP.suggestedClicked(ev)
          break;
          case "card": APP.cardListClicked(ev)
          break;
        }
      })
      }
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
   //toggling between online and offline
    APP.isOnline = ev.type === 'online' ? true : false;
   //send message to sw about being online or offline
    navigator.serviceWorker.ready.then((registration) => {
      registration.active.postMessage({ ONLINE: APP.isOnline });
    });
  },
  messageReceived: (ev) => {
    //ev.data
    console.log(ev.data);
  },
  sendMessage: (msg) => {
     //send messages to the service worker
    navigator.serviceWorker.ready.then((registration) => {
      registration.active.postMessage(msg);
    });
  },
  searchFormSubmitted: (ev) => {
    ev.preventDefault();
    log(ev);
    console.log('search submitted');
    //get the keyword from teh input
    let search = APP.searchField.value;
    if (search.length) {
      APP.keyword=search
      APP.getConfig(search);
    }
    //make sure it is not empty
    //check the db for matches
    //do a fetch call for search results
    //save results to db
    //navigate to url
  },
  getConfig: () => {
    fetch(APP.url)
      .then((response) => {
        return response.json();
      })
      .then((data) => {
        APP.tmdbIMAGEBASEURL = data.images.secure_base_url;
        APP.configData = data.images;
        log(data)
        APP.getSearchResults();
      })
      .catch((err) => {
        {
          console.log(err);
        }
      });
  },
  cardListClicked: (ev) => {
    ev.target.closest('li').classList.toggle('active');
    // user clicked on a movie card
    
},
  suggestedClicked:(ev)=>{
    //do a fetch for the suggest results
//save results to db
//build a url
//navigate to the suggest page
    let id = ev.target.getAttribute('data-id')
    //check the db for matches]
    APP.getSuggestedResults(id)
    navigate()
  //will then trigger the tx.oncomplete
},
  checkStore:(storeName,id)=>{
  let tx = APP.DB.transaction(storeName, 'readonly');
  tx.onerror = (err) => {
    console.log('failed to successfully run the transaction');
  };
  tx.oncomplete = (ev) => {
    console.log('finished the transaction... wanna do something else');
  };
  let searchStore = tx.objectStore(storeName,'readonly');
  let getRequest = searchStore.get(id);
  getRequest.onerror = (err) => {
    //error with get request... will trigger the tx.onerror too
  };
  getRequest.onsuccess = (ev) => {
    let obj = getRequest.result;
    return obj
  }
},
// getData: (endpoint, callback) => {



  //   //do a fetch call to the endpoint
  //   let url =
  //   fetch(url)
  //     .then((resp) => {
  //       if (resp.status >= 400) {
  //         throw new NetworkError(
  //           `Failed fetch to ${url}`,
  //           resp.status,
  //           resp.statusText
  //         );
  //       }
  //       return resp.json();
  //     })
  //     .then((contents) => {
  //       let results = contents.results;
  //       //remove the properties we don't need
  //       //save the updated results to APP.results
  //       // call the callback
  //     })
  //     .catch((err) => {
  //       //handle the NetworkError
  //     });
  // },

  getSearchResults: () => {
    console.log("searching");
    //check if online
    if(APP.isOnline){
      //if no match in DB do a fetch
    let url = `https://api.themoviedb.org/3/search/movie?api_key=${APP.tmdbAPIKEY}&language=en-US&query=${APP.keyword}&page=1&include_adult=false`
    fetch(url)
      .then((response) => response.json())
      .then((data) => {
        APP.results = data.results;
        log(APP.results)
        let tx = APP.DB.transaction('searchStore', 'readwrite')
        log({tx});
        APP.addResultsToDB(tx,APP.results,0,APP.keyword,'searchStore')
        APP.displayCards()
      })
      .catch((err) => console.warn(`Fetch failed due to: ${err.message}`));
      // APP.displayCards is the callback
  
}
      //check in DB for match of keyword in searchStore
  },
  getSuggestedResults: (movieid) => {
    //check if online
    //check in DB for match of movieid in suggestStore
    if(APP.checkStore('suggestStore',movieid)){console.log("suggested movies");}
    //check if online
      if(APP.isOnline){
      //if no match in DB do a fetch
      let url = `https://api.themoviedb.org/3/movie/${movieid}/recommendations?api_key=${APP.tmdbAPIKEY}&language=en-US&page=1`
      fetch(url)
      .then((response) => response.json())
      .then((data) => {
        let suggestedResults = data.results;
        let tx = APP.DB.transaction('suggestStore', 'readwrite')
        log({tx});
        APP.addResultsToDB(tx,suggestedResults,0,movieid,'suggestStore')
        
      })
      .catch((err) => console.warn(`Fetch failed due to: ${err.message}`));}
      //if no match in DB do a fetch
      // APP.displayCards is the callback
    },
  displayCards: () => {
    let titleArea = document.querySelector('.titleArea')
    titleArea.innerHTML=`<p class="resultsMessage"> Showing results for  "${APP.keyword}" </p>`
    
    //display all the movie cards based on the results array
    // in APP.results
    //these results could be from the database or from a fetch
    console.log(APP.results);
    let resultsCards = document.getElementById('resultsCards')
    resultsCards.textContent="";
    console.log('clearing')
    resultsCards.setAttribute("class", "resultsCards");
    log(`${APP.tmdbIMAGEBASEURL}w185${APP.results[0].poster_path}`)
    APP.results.forEach((item) => {
      let img = document.createElement("img")
      if(item.poster_path){img.src=`${APP.tmdbIMAGEBASEURL}w185${item.poster_path}`}
      else{img.src="../img/noimage.png"}
      img.setAttribute('alt',`A movie poster of ${item.title}`)
      let li = document.createElement("li");
      li.setAttribute("class", "card")
      li.setAttribute('data-id',item.id);
      li.innerHTML = `<h2>${item.title}</h2><div class="description"><p>${item.overview}</p></div> <h3 class="suggested"> <a data-id=${item.id}>Suggested Movies</a> </h3>`;
      li.prepend(img)
      APP.df.append(li);
    });
    resultsCards.append(APP.df)
  },

  navigate: (url) => {
    //change the current page
    window.location = url; //this should include the querystring
}
}
document.addEventListener("DOMContentLoaded", APP.init);

class NetworkError extends Error {
  constructor(msg, status, statusText) {
    super(msg);
    this.status = status;
    this.statusText = statusText;
  }
}
