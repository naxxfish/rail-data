# Network Rail STOMP message Router to AMQP

Routes messages from Network Rail's [Data Feeds](https://wiki.openraildata.com/index.php/About_the_Network_Rail_feeds) to an AMQP compatible broker such as [RabbitMQ](https://www.rabbitmq.com/).   

Fully configurable using environment variables or command line options.

## Options
`--stomp:host` - the hostname of the STOMP broker (i.e. Network Rail's)

`--stomp:port` - the port the STOMP broker is listening on

`--stomp:connectHeaders:username` - the username to user

`--stomp:connectHeaders:passcode` - your password

`--amqp:uri` - the [amqp uri](https://www.rabbitmq.com/uri-spec.html) for your broker.
