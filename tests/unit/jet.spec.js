'use strict';
describe('$jet', function () {

  var $jet, $timeout, $rootScope;

  beforeEach(function() {
    inject(function (_$jet_, _$timeout_, _$rootScope_) {
      $jet = _$jet_;
      $timeout = _$timeout_;
      $rootScope = _$rootScope_;
    });
  });

  it('$Peer', function() {
      expect(typeof $jet.$Peer).toBe('function');
  });

});
