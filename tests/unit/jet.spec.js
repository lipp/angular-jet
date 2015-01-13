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
          //console.log(73838);
        }, function(err) {
          //console.log(29872,err)
          done();
        });
        $timeout.flush();
      });



    });

  });

});
