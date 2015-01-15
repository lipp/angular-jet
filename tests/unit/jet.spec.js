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

      it('.$close is function', function() {
        expect(typeof peer.$close).toBe('function');
      });

      it('.$fetch is function', function() {
        expect(typeof peer.$fetch).toBe('function');
      });

      it('.$wait is function', function() {
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

      it('.$wait(...) returns a promise and gets resolved', function() {
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

        it('.$unfetch can be called immediatly', function() {
          fetcher.$unfetch();
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

      it('fetch states as map (default) from "node-jet/bin/some-service.js"', function(done) {
        var fetcher = peer.$fetch({path: {
          equalsOneOf: ['acceptOnlyNumbers', 'persons/1']
        }});
        setTimeout(function() {
          expect(typeof fetcher['acceptOnlyNumbers']).toBe('number');
          expect(typeof fetcher['persons/1']).toBe('object');
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

              expect(typeof topPlayers[0]).toBe('object');
              expect(typeof topPlayers[1]).toBe('object');
              expect(typeof topPlayers[2]).toBe('object');

              expect(topPlayers[0].score > topPlayers[1].score).toBe(true);
              expect(topPlayers[1].score > topPlayers[2].score).toBe(true);
              done();
            }
        },true);
        setTimeout(function() {
          $rootScope.$apply();
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
