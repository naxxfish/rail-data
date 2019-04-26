# 🚦 Signals Service 

The Signals Service uses data from the [Network Rail datafeeds](https://datafeeds.networkrail.co.uk/), passed on from the [Train Describers](https://wiki.openraildata.com/index.php?title=TD) in each area.  

The Train Describer (or TD) outputs two types of messages - C-class and S-class.  This service handles [S-Class messages](https://wiki.openraildata.com/index.php?title=S_Class_Messages) - which pertains to the state of various signalling equipment in the area covered by the Train Describer. 

## Running

    docker-compose up

## Configuration

Environment variables are used to configure the components of this service.

### `MQTT_HOST`
Sets the hostname of the MQTT broker which has your copy of the Network Rail Datafeed on it.  (You'll need to have an ActiveMQ with the MQTT connector and Camel to subscribe to the actual NR datafeed topics for you - I'll make a component for that later...)

### `REDIS_HOST` & `REDIS_PORT`
You shouldn't need to change this, as the docker compose file brings up a redis for you - but in case you do wish to use another Redis server somewhere else, use these environment variables to point at it.  

## How it Works

The format of S-class TD messages is fully described on the OpenRailData Wiki page on [S-Class Messages](https://wiki.openraildata.com/index.php?title=S_Class_Messages).  

S-class messages are a little tricky to interpret.  They describe the state of signalling equipment, either on or off, within the area of control of a particular signal box (or, there abouts).  This is represented by a memory "table" of bytes, each bit of which represents a state about a piece of equipment.  For example, the aspect of a signal (proceed or danger) may be represented as the third bit of the byte at address 0x10 in the memory table.  

The S-class messages are transmitted as an address, and the byte which is placed into that address - so this message in fact tells you about 8 things simultaneously (although only one may have changed).  Additionally, there is no data which tells you what each bit actually means (this is a limitation of the datafeed generally, in fact).  

In order to make it easier to answer the question of "what is the status of this signal right now?", this service takes those messages and using the Serial OutPut tables (or SOP) converts those bits being flipped into named signal statuses changing.  

## REST API

You can query the status of a signal using the REST API
### `/signal/status/:area_id/:signal_id`
Find the area ID from the [List of train describers](https://wiki.openraildata.com/index.php?title=List_of_Train_Describers) wiki page (two alphnumeric characters, e.g. VC or X1), and the signal ID from the SOP tables or ECS tables (e.g. R123).  

If the signal exists, you'll get back something like this:

      {
          "status": "OFF",
          "lastUpdateTime": "Fri Apr 26 2019 00:06:51 GMT+0000 (Coordinated Universal Time)"
      }

### `/signal/history/:area_id/:signal_id`
As above, but you also get a list of the state transitions that signal has gone through. 

      {
          "status": "OFF",
          "lastUpdateTime": "Fri Apr 26 2019 00:06:51 GMT+0000 (Coordinated Universal Time)",
          "history": [
              {
                  "from": "ON",
                  "to": "OFF",
                  "time": "2019-04-26T00:06:51.000Z"
              },
              {
                  "from": "OFF",
                  "to": "ON",
                  "time": "2019-04-25T23:57:51.000Z"
              },
              {
                  "from": "ON",
                  "to": "OFF",
                  "time": "2019-04-25T23:57:36.000Z"
              }
          ]
      }

This will grow to at most 200 state transitions (probably)