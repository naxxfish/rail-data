# 🚄 UK Railway Data API 🚉
### Framework for synchronising realtime railway data and presenting it in a useful way

The Open Data feeds from Network Rail and National Rail provide a means of understanding the UK railway network - however, they're not particularly straightforward to consume.  Rail Data aims to perform the heavy lifting of parsing and storing this data so it can be queried by your application easily, without it needing to understand the plethora of different systems which exist that produce this data. 

# 🥞 How it works

There are two layers to the application - aquisition and presentation ...

## 📹 Acquisition
The Open Rail Data is presented in several forms - some static content, some periodically updated content and some realtime data.  The combination of all of these is a representation of the state of the UK rail network at any given time.  

The Acquisition half of the application deals with bringing these sources together and providing useful APIs to serve to the presentation layer...


## 📺 Presentation
The presentation layers take the data which has been aquired and stored, and transform it into a useful representation for clients.  This may mean, for example, bringing a schedule and realtime running information together into a single document to be rendered on a web page.  

# Installing

## Prerequisites

You will need some credentials for anything to work - namely an account on the [Network Rail Datafeeds](https://wiki.openraildata.com/index.php?title=About_the_Network_Rail_feeds).  Once you have an account, you'll need to register for the TD feed for All Signalling Areas (TD_ALL_SIG_AREA), VSTP and RTPPM. 

You'll also need Docker.

## Building and running

Create a .env file in this repository

    NETWORKRAIL_USER=<your email registered on datafeeds.networkrail.co.uk>
    NETWORKRAIL_PASSWORD=<your password registered on datafeeds.networkrail.co.uk>
    RAILDATA_BROKER_USER=<any username you like>
    RAILDATA_BROKER_PASSWORD=<any password you like>
    RAILDATA_SYSTEMNAME=<a unique system name, ideally including your email address, and with no spaces>

Once you have this, run

    make build

And once that's all done

    docker-compose up

And you'll see a bunch of containers spin up, and hopefully tell you about how they're processing messages :) 

## Using

You'll have an API on port 3000 on your machine (this will be configurable at some point), served via a nginx gateway, which provides access to the various backends (currently, just TDs).  At the moment, it only provides access to the raw input services.  Here's a URL that will work:

    /td/berth/VC/0144

Providing something has happened to that berth recently.  That will tell you what is in signalling berth 0144 in the VC (London Victoria TD).

    /td/signal/status/VC/TRSV11

That's a Train Ready to Start signal, on of the platforms in London Victoria station (I think?).  It will go ON when there is a train in the platform which is ready to go. 

You can also do things like:

    /td/signal/history/VC/TRSV11

Which will give you a history of all the times that signal changed (up to 200 transitions).  

Not much point writing much more up at this point, as it'll change as soon as I make more functionality!

## License

Copyright (c) 2019 @naxxfish

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice (including the next paragraph) shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.