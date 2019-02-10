import * as $Datastream from '@auroradao/datastream-types';

// check for a pong packet without parsing it to an object
const PONG_RE = /^[^{]*{[^"]*"pong"[^:]*:"[^:]+:[^"]+"[^}"a-zA-Z0-9]*}/;

export default function createDatastreamConnector(
  config: $Datastream.Connection$Configuration,
  callback: $Datastream.Connection$Callback
): $Datastream.Connection$Socket {
  const socket = new WebSocket(config.url);

  socket.addEventListener('open', () => callback('open'));
  socket.addEventListener('close', ({ code, reason, wasClean }) =>
    callback('close', code, reason, wasClean)
  );
  socket.addEventListener('message', event => {
    /* ping max length is 25 characters, check if the response
       is a "pong" response without parsing it needlessly so
       we can do the required callback as expected.
       @see connection.ping() notes */
    if (event.data.length <= 35 && PONG_RE.test(event.data)) {
      return callback('pong', JSON.parse(event.data).pong);
    }
    callback('message', event.data);
  });
  socket.addEventListener('error', () =>
    /* We don't get any real information on web */
    callback('error', new Error('ConnectionError'))
  );

  return {
    OPEN: socket.OPEN,
    CONNECTING: socket.CONNECTING,
    CLOSING: socket.CLOSING,
    CLOSED: socket.CLOSED,
    get readyState() {
      return socket.readyState;
    },
    send(data: any, cb: (err?: Error) => void) {
      try {
        socket.send(data);
        cb();
      } catch (err) {
        cb(err);
      }
    },
    ping(sid: string) {
      /* Since the HTML5 API does not provide `ping` capabilities
         we need to utilize the (currently undocumented) ping api
         which the Datastream Server provides.  This will cause a 
         disconnect if `sid` is over 25 characters of length, isn't
         a string, or if the connection is not handshaked, it must 
         also be the value the server has for the `sid` or it will
         cause a disconnect as well. */
      socket.send(
        JSON.stringify({
          ping: sid,
        })
      );
    },
    close: socket.close,
    terminate: socket.close,
  };
}
