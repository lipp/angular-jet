'use strict';
describe('$jet', function () {

  var $jet, $timeout, $rootScope;

  beforeEach(function() {
    module('jet');

    inject(function (_$jet_, _$timeout_, _$rootScope_) {
      $jet = _$jet_;
      $timeout = _$timeout_;
      $rootScope = _$rootScope_;
    });
  });

  describe('$Peer', function() {

    it('<ctor> is function', function() {
      expect(typeof $jet.$Peer).toBe('function');
    });

    describe('instance', function() {
      var peer;

      beforeEach(function() {
        peer = new $jet.$Peer();
      });

      afterEach(function() {
        peer.$close();
      });

      it('is an object', function() {
        expect(typeof peer).toBe('object');
      });

      it('.$closed is initially false', function() {
        var $closed = peer.$closed;
        expect(angular.isObject($closed)).toBe(true);
        expect(typeof $closed.then).toBe('function');
      });

      it('.$closed is true after scope destroy', function() {
        var scope = $rootScope.$new();
        var peer = new $jet.$Peer({
          scope: scope
        });
        expect(peer.$$closed).toBe(false);
        scope.$destroy();
        expect(peer.$$closed).toBe(true);
      });

      it('.$close is function', function() {
        expect(typeof peer.$close).toBe('function');
      });

      it('.$close resolves $closed promise', function(done) {
        peer.$close();
        peer.$closed.then(function() {
          done();
        });
      });

      it('.$fetch is function', function() {
        expect(typeof peer.$fetch).toBe('function');
      });

      it('.$wait is function', function() {
        expect(typeof peer.$wait).toBe('function');
      });

      it('.$set is function', function() {
        expect(typeof peer.$wait).toBe('function');
      });

      it('.$connected is promise', function() {
        var $connected = peer.$connected;
        expect(angular.isObject($connected)).toBe(true);
        expect(typeof $connected.then).toBe('function');
      });

      it('.$connected promise gets resolved', function(done) {
        peer.$connected.then(function() {
            done();
        });
      });

      it('.$connected promise gets rejected (using a non-valid url)', function(done) {
        var peer2 = new $jet.$Peer({
          url: 'ws://this.is.dead'
        });
        peer2.$connected.then(function() {
        }, function(err) {

          done();
        });
        $timeout.flush();
      });

      it('.$set returns promise', function() {
        var set = peer.$set('doesnotexist');
        expect(angular.isObject(set)).toBe(true);
        expect(typeof set.then).toBe('function');
      });

      it('.$set gets resolved', function(done) {
        peer.$set('acceptOnlyNumbers', 421).then(function(result) {
          expect(result).toBe(true);
          done();
        });
      });

      it('.$set gets rejected', function(done) {
        peer.$set('acceptOnlyNumbers', {x:1}).then(function() {
          expect(false).toBe('this should not happen');
        }, function(err) {
          expect(err.message).toBe('Internal error');
          done();
        });
      });

      it('.$call returns promise', function() {
        var call = peer.$call('doesnotexist');
        expect(angular.isObject(call)).toBe(true);
        expect(typeof call.then).toBe('function');
      });

      it('.$call checks arg type', function() {
        [false, 123, 'foo'].forEach(function(unsupported) {
          expect( function() {peer.$call('asd', unsupported);} ).toThrow(new Error('second arg to $call must be undefined, Array or Object'));
        });
        [{},[]].forEach(function(supported) {
          expect( function() {peer.$call('asd', supported);} ).not.toThrow();
        });
      });

      it('.$call gets resolved', function(done) {
        peer.$call('syncHello',['Joe']).then(function(greet) {
          expect(greet).toBe('Hello Joe');
          done();
        });
      });

      it('.$call gets rejected', function(done) {
        peer.$call('letsFailSync').then(function(greet) {
          expect(false).toBe('this should not happen');
        }, function(err) {
          expect(err.message).toBe('Internal error');
          done();
        });
      });

      it('.$wait(...) returns a promise and gets resolved', function(done) {
        var wait = peer.$wait('syncHello', 'asyncHello');
        expect(angular.isObject(wait)).toBe(true);
        expect(typeof wait.then).toBe('function');
        wait.then(function() {
          done();
        });
      }); // wait

      describe('.$fetch', function() {

        describe('basics', function() {
        var fetcher;

        beforeEach(function() {
          fetcher = peer.$fetch();
        });

        it('returns an object', function() {
          expect(typeof fetcher).toBe('object');
        });

        it('.$ready is a promise', function() {
          expect(angular.isObject(fetcher.$ready)).toBe(true);
          expect(typeof fetcher.$ready.then).toBe('function');
        });

        it('.$active should be initially false', function() {
          expect(fetcher.$active).toBe(false);
        });

        it('.$unfetch is a function', function() {
          expect(typeof fetcher.$unfetch).toBe('function');
        });

        it('.$unfetch can be called immediatly and gets resolved', function(done) {
          fetcher.$unfetch().then(function() {
            done();
          });
        });

        it('.$ready promise gets resolved and .$active is true', function(done) {
          fetcher.$ready.then(function() {
            expect(fetcher.$active).toBe(true);
            done();
          });
        });

        xit('.$ready promise gets rejected and $active is still false', function(done) {
          var fetcher = peer.$fetch({path: {
            invalidRule: 'asd'
          }});
          fetcher.$ready.then(function() {
            expect('this should not happen').toBe(false);
          }, function(err) {
            expect(fetcher.$active).toBe(false);
            done();
          });
        });

      }); // basics

      it('fetch unsorted states from "node-jet/bin/some-service.js"', function(done) {
        var fetcher = peer.$fetch({path: {
          equalsOneOf: ['acceptOnlyNumbers', 'persons/1']
        }});
        setTimeout(function() {
          var pathSortedFetcher = fetcher.sort(function(a,b) {
            return a.$path - b.$path;
          });
          expect(pathSortedFetcher[0].$path).toBe('acceptOnlyNumbers');
          expect(typeof pathSortedFetcher[0].$value).toBe('number');
          expect(typeof pathSortedFetcher[0].$save).toBe('function');
          expect(typeof pathSortedFetcher[0].$index).toBe('undefined');
          expect(pathSortedFetcher[1].$path).toBe('persons/1');
          done();
        },70);
      });

      it('fetch states as array from "node-jet/bin/some-service.js"', function(done) {
        var topPlayers = peer.$fetch({
          path: {
            startsWith: 'persons/'
          },
          sort: {
            byValueField: {
              score: 'number'
            },
            descending: true,
            from: 1,
            to: 3
          }
        });

        expect(topPlayers.length).toBe(0);
        expect(typeof topPlayers.filter).toBe('function');

        $rootScope.topPlayers = topPlayers;
        // test watch gets called
        $rootScope.$watch('topPlayers', function(topPlayers, old) {
            expect(typeof topPlayers.$unfetch).toBe('function');
            if (topPlayers.length !== 0) {
              expect(topPlayers.$active).toBe(true);
              expect(topPlayers.length).toBe(3)
              expect(typeof topPlayers[0].$value).toBe('object');
              expect(typeof topPlayers[1].$value).toBe('object');
              expect(typeof topPlayers[2].$value).toBe('object');

              expect(topPlayers[0].$value.score > topPlayers[1].$value.score).toBe(true);
              expect(topPlayers[1].$value.score > topPlayers[2].$value.score).toBe(true);

              expect(typeof topPlayers[0].$save).toBe('function');
              expect(typeof topPlayers[0].$path).toBe('string');
              expect(topPlayers[0].$index).toBe(1);
              done();
            }
        },true);
        setTimeout(function() {
          $timeout.flush();
        },70);
      });

      it('unfetches on scope $destroy', function(done) {
        var scope = $rootScope.$new();
        var fetcher = peer.$fetch({}, scope);
        fetcher.$ready.then(function() {
          expect(fetcher.$active).toBe(true);
          scope.$destroy();
          expect(fetcher.$active).toBe(false);
          done();
        });
      });

    }); //$fetch

    });

  });

});
