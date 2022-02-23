How this app works

OVERVIEW
##Initialization--------------------

If online register service worker
openDB and create searchDB
addListener for search and list click events
Execute page specific code.


##SEARCHING----------------------------
User submits a search
engine checks to see if there are previous searches stored
- if so:
navigates to results page 
pulls results from db
displays results

- else if not: 
fetches results from tmdb
stores results in searchDB under searchStore
navigates to results page
displays results from

##Navigating - - - - - - - - - - - - - 

Home page accessible from logo
user search brings you to results page
clicking on a result card brings you to the suggested movies page
when offline clicking on a stored result or entering a search previously entered works
anything else brings you to the 404 page.

##IndexedDB - - - - - - - - - - - - - 
Stores the searches under 'searchStore'
Stores the suggested results under 'suggestStore'

##Online or Offline - - - - - - - - - -
Displays a message to the user about being offline, informs them of what they
can do when they are offline.