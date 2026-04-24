(function () {
  var READY_FLAG = 'mediaCollageReady';

  function bindItem(item) {
    var video = item.querySelector('video');
    if (!video) return;

    function play() {
      try {
        var result = video.play();
        if (result && typeof result.catch === 'function') {
          result.catch(function () {});
        }
      } catch (e) {}
    }

    function pause() {
      try {
        video.pause();
        video.currentTime = 0;
      } catch (e) {}
    }

    item.addEventListener('mouseenter', play);
    item.addEventListener('mouseleave', pause);
    item.addEventListener('focusin', play);
    item.addEventListener('focusout', pause);
  }

  function init(section) {
    if (!section || section.dataset[READY_FLAG] === 'true') return;
    section.dataset[READY_FLAG] = 'true';
    var items = section.querySelectorAll('[data-hover-video]');
    for (var i = 0; i < items.length; i++) {
      bindItem(items[i]);
    }
  }

  function initAll() {
    var sections = document.querySelectorAll('.section-image-collage');
    for (var i = 0; i < sections.length; i++) {
      init(sections[i]);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  document.addEventListener('shopify:section:load', function (e) {
    if (!e.target) return;
    var section = e.target.querySelector
      ? e.target.querySelector('.section-image-collage')
      : null;
    if (section) init(section);
  });
})();
