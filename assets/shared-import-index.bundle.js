const LibraryLoader = function () {
  const types = {
    link: 'link',
    script: 'script'
  };
  const status = {
    requested: 'requested',
    loaded: 'loaded'
  };
  const cloudCdn = 'https://cdn.shopify.com/shopifycloud/';
  const libraries = {
    youtubeSdk: {
      tagId: 'youtube-sdk',
      src: 'https://www.youtube.com/iframe_api',
      type: types.script
    },
    vimeoSdk: {
      tagId: 'vimeo-sdk',
      src: 'https://player.vimeo.com/api/player.js',
      type: types.script
    },
    plyrShopifyStyles: {
      tagId: 'plyr-shopify-styles',
      src: cloudCdn + 'plyr/v2.0/shopify-plyr.css',
      type: types.link
    },
    shopifyXr: {
      tagId: 'shopify-model-viewer-xr',
      src: cloudCdn + 'shopify-xr-js/assets/v1.0/shopify-xr.en.js',
      type: types.script
    },
    modelViewerUi: {
      tagId: 'shopify-model-viewer-ui',
      src: cloudCdn + 'model-viewer-ui/assets/v1.0/model-viewer-ui.en.js',
      type: types.script
    },
    modelViewerUiStyles: {
      tagId: 'shopify-model-viewer-ui-styles',
      src: cloudCdn + 'model-viewer-ui/assets/v1.0/model-viewer-ui.css',
      type: types.link
    }
  };

  function load(libraryName, callback) {
    const library = libraries[libraryName];
    if (!library) return;
    if (library.status === status.requested) return;

    callback = callback || function () {};

    if (library.status === status.loaded) {
      callback();
      return;
    }

    library.status = status.requested;
    let tag;

    switch (library.type) {
      case types.script:
        tag = createScriptTag(library, callback);
        break;

      case types.link:
        tag = createLinkTag(library, callback);
        break;
    }

    tag.id = library.tagId;
    library.element = tag;
    const firstScriptTag = document.getElementsByTagName(library.type)[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
  }

  function createScriptTag(library, callback) {
    const tag = document.createElement('script');
    tag.src = library.src;
    tag.addEventListener('load', function () {
      library.status = status.loaded;
      callback();
    });
    return tag;
  }

  function createLinkTag(library, callback) {
    const tag = document.createElement('link');
    tag.href = library.src;
    tag.rel = 'stylesheet';
    tag.type = 'text/css';
    tag.addEventListener('load', function () {
      library.status = status.loaded;
      callback();
    });
    return tag;
  }

  return {
    load: load
  };
}();

export { LibraryLoader as L };
