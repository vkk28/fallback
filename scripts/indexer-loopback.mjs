// Envio 3.14 exposes a port but no host option. This explicit child-only preload
// confines its development console/metrics listener to the local machine.
import { Server } from 'node:net';
const listen = Server.prototype.listen;
Server.prototype.listen = function (...args) {
  if (Number(args[0]) === 9898) {
    if (typeof args[1] === 'string') args[1] = '127.0.0.1';
    else args.splice(1, 0, '127.0.0.1');
  } else if (typeof args[0] === 'object' && Number(args[0]?.port) === 9898) {
    args[0] = { ...args[0], host: '127.0.0.1' };
  }
  return Reflect.apply(listen, this, args);
};
