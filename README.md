# 🚄 UK Railway Data API 🚉
### Framework for synchronising realtime railway data and presenting it in a useful way

This application uses a suite of microservices to acquire and keep up to date a variety of data available through the Network Rail Data Feeds.  

# 🥞 Layers

There are two halves to the application - aquisition and presentation.  

## 📹 Acquisition
The Open Rail Data is presented in several forms - some static content, some periodically updated content and some realtime data.  The combination of all of these is a representation of the state of the UK rail network at any given time.  

The Acquisition half of the application deals with bringing these sources together and making them available to the presentation layer.  

## 📺 Presentation
The presentation layers take the data which has been aquired and stored, and transform it into a useful representation for clients.  This may mean, for example, bringing a schedule and realtime running information together into a single document to be rendered on a web page.  
