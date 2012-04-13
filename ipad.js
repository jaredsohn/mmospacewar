var ipad = navigator.userAgent.match(/iPad/i) != null;

if (ipad) {
  $(function () {
    $('#left-controls, #right-controls').show();
    $('body > *').hide();
    $('body').css('margin', '0px').css('background', 'black').prepend($('#game-container').remove());
    $('#game-container').width(1024).css('margin-top', 26).show();
    $('#canvas').attr('width', 1020).attr('height', 660).css('background', '#424547').css('margin', '0 1').css('background', 'url("stars.gif")');

    $('head').prepend($('<meta/>').attr('name', 'viewport').attr('content', 'width=device-width; height=device-height; initial-scale=1.0; maximum-scale=1.0; user-scalable=0;'));

    $('#left-controls, #right-controls').bind('touchstart touchmove touchend', function (e) {
      if (e.type != 'touchend') {
        for (k in KEY_STATUS) {
          KEY_STATUS[k] = false;
        }
      }
      var touches = e.type == 'touchend' ? e.originalEvent.changedTouches : e.originalEvent.touches
      for (var i = 0; i < touches.length; i++) {
        var ele = document.elementFromPoint(touches[i].pageX, touches[i].pageY);
        KEY_STATUS[ele.id] = (e.type != 'touchend');
      }
    });

    $(document).bind('touchstart', function (e) {
      window.gameStart = true;
      if (Game.FSM.state == 'boot')
      {
        Game.FSM.state = 'start';
      }
    });

    $(document).bind('gesturestart gesturechange gestureend touchstart touchmove touchend', function (e) {
      e.preventDefault();
    });
  });
}

