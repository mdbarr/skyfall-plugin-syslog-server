'use strict';

const syslog = require('simple-syslog-server') ;

function Syslog (skyfall, options = {}) {
  this.type = 'udp';
  this.host = '0.0.0.0';
  this.port = 'auto';

  this.onMessage = (message) => {
    const type = `syslog:${ message.facility }:${ message.severity }:${ message.tag }`;

    skyfall.events.emit({
      type,
      data: message,
    });
  };

  this.onError = (error) => {
    skyfall.events.emit({
      type: 'syslog:server:error',
      data: error,
    });
  };

  this.configure = (config) => {
    this.type = config.type || this.type;
    this.host = config.host || this.host;
    this.port = config.port || this.port;

    this.options = {};

    if (this.type === 'udp') {
      this.options.type = 'udp4';
      if (this.port === 'auto') {
        this.port = 514;
      }
    } else if (this.type === 'tls' && this.port === 'auto') {
      this.port = 6514;
    } else if (this.type === 'tcp' && this.port === 'auto') {
      this.port = 514;
    }

    if (config.key) {
      this.options.key = config.key;
    }
    if (config.cert) {
      this.options.cert = config.cert;
    }
    if (config.ca) {
      this.options.ca = config.cert;
    }

    if (this.type === 'udp') {
      this.server = syslog.UDP(this.options);
    } else if (this.type === 'tls') {
      this.server = syslog.TLS(this.options);
    } else {
      this.server = syslog.TCP(this.options);
    }

    this.server.on('msg', this.onMessage);
    this.server.on('error', this.onError);

    return this.server;
  };

  this.start = (callback) => {
    if (!callback) {
      callback = () => {};
    }

    if (this.server) {
      const listenOptions = {
        host: this.host,
        port: this.port,
      };

      skyfall.events.emit({
        type: 'syslog:server:starting',
        data: listenOptions,
      });

      return this.server.listen(listenOptions).
        then(() => {
          skyfall.events.emit({
            type: 'syslog:server:started',
            data: listenOptions,
          });

          return callback(null);
        }).
        catch((error) => {
          this.onError(error);
          return callback(error);
        });
    }

    const error = new Error('syslog not configured');
    this.onError(error);
    return callback(error);
  };

  this.configure(options);
}

module.exports = {
  name: 'syslog',
  install: (skyfall, options) => {
    skyfall.syslog = new Syslog(skyfall, options);
  },
};
