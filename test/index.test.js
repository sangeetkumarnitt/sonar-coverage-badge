var chai = require('chai'),
  assert = chai.assert,
  http = require('http'),
  index = require('../src/index.js'),
  parseString = require('xml2js').parseString;

chai.should();

// utility function for test
var isPortTaken = function(port, fn) {
  var net = require('net');
  var tester = net.createServer()
    .once('error', function(err) {
      if (err.code != 'EADDRINUSE') return fn(err);
      fn(null, true);
    })
    .once('listening', function() {
      tester.once('close', function() {
        fn(null, false);
      }).close();
    })
    .listen(port);
};

var error = function(err) {
  assert.isNull(err);
};

describe('Index ', function() {

  it('should default port to 8087', function(done) {
    var port = index.GetPort();
    port.should.equal(8087);
    done();
  });

  it('should start a server on specific port', function(done) {
    var port = 9999;

    isPortTaken(port, function(err, state) {
      assert.false(state);
      done();
    });

    index.StartServer(port);

    isPortTaken(port, function(err, state) {
      assert.true(state);
      done();
    });

    done();
  });

  it('should return svg MIME type', function(done) {
    var port = 7078;
    var server = index.StartServer(port);
    server.on('listening', function() {

      var options = {
        host: 'localhost',
        path: '/?server=nemo.sonarqube.org&resource=org.codehaus.sonar-plugins.php:parent&metrics=coverage',
        port: port,
      };

      http.get(options, function(res) {
        assert.equal(res.headers['content-type'], 'image/svg+xml;charset=utf-8');
        server.close();
        done();
      }).on('error', function(e) {
        error(e);
      });
    }); // listenining
  }); // return svg MIME type

  it('should return cache control no-cache', function(done) {
    var port = 8082;
    var server = index.StartServer(port);
    server.on('listening', function() {

      var options = {
        host: 'localhost',
        path: '/?server=nemo.sonarqube.org&resource=org.codehaus.sonar-plugins.php:parent&metrics=coverage',
        port: port,
      };

      http.get(options, function(res) {
        assert.equal(res.headers['cache-control'], 'no-cache');
        server.close();
        done();
      }).on('error', function(e) {
        error(e);
      });
    }); // listenining
  }); // return cache control

  it('should return new etag each time', function(done) {
    var port = 8082;
    var server = index.StartServer(port);

    var getEtag = function(onfound) {
      var options = {
        host: 'localhost',
        path: '/?server=nemo.sonarqube.org&resource=org.codehaus.sonar-plugins.php:parent&metrics=coverage',
        port: port,
      };

      http.get(options, function(res) {
        onfound(res.headers.etag);
      }).on('error', function(e) {
        error(e);
      });
    };

    server.on('listening', function() {
      getEtag(function(etag1) {
        getEtag(function(etag2) {
          assert.notEqual(etag1, etag2);
          done();
        });
      });
    }); // listenining
  }); // return cache control

  it('should return 106x20 image', function(done) {
    var port = 8083;
    var server = index.StartServer(port);
    server.on('listening', function() {
      var options = {
        host: 'localhost',
        path: '/?server=nemo.sonarqube.org&resource=org.codehaus.sonar-plugins.php:parent&metrics=coverage',
        port: port,
      };
      http.get(options, function(res) {
        var str = '';
        res.setEncoding('utf8');
        res.on('data', function(chunk) {
          str += chunk;
        });
        res.on('end', function() {
          try {
            parseString(str, function(err, result) {
              assert.equal(result.svg.$.width, 106);
              server.close();
              done();
            });
          } catch (e) {
            error(e);
          }
        });

      }).on('error', function(e) {
        error(e);
      });

    }); // listening
  }); // return image size

  it('should return 500 status code when error', function(done) {
    var port = 8083;
    var server = index.StartServer(port);
    server.on('listening', function() {
      var options = {
        host: 'localhost',
        path: '/?server=nemo.sonarqube.org&resource=org.codehaus.sonar-plugins.php:parent&metrics=nothing',
        port: port,
      };

      http.get(options, function(res) {
        assert.equal(res.statusCode, 500);
        server.close();
        done();
      }).on('error', function(e) {
        error(e);
      });

    }); // listening
  }); // return error test

}); // describe
