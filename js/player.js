$(document).ready(function() {

    // Override the backbine ajax fetch method with media.sync
    // and give it some extra options to show and hide a
    // loading spinner when the ajax request takes longer than
    // 150 ms
    //
    media.originalBackboneSync = Backbone.sync;

    media.beforeSync = function(xhr) {
        media.loadingSpinnerTimeout = setTimeout(function () {
            media.showLoadingSpinner();
        }, 150);
    };

    media.ajaxComplete = function() {
        clearTimeout(media.loadingSpinnerTimeout);
        setTimeout(function () {
            media.hideLoadingSpinner();
        }, 300);
    };

    media.sync = function(method, model, options) {
        options.beforeSend = media.beforeSync;
        options.complete = media.ajaxComplete;
        return media.originalBackboneSync(method, model, options);
    };

    Backbone.sync = media.sync;

    // Init Views.
    media.views.playerControls = new media.prototypes.PlayerControlsView({
        el: $('#player_controls'),
        parent: this
    });

    media.views.nowPlaying = new media.prototypes.NowPlayingInfoView({
        el: $('#now_playing'),
        parent: this
    });

    media.views.menuBarView = new media.prototypes.MenuBarView({
        el: $('#menu_bar'),
        parent: this
    });

    media.collections.playlists = new media.prototypes.Playlists();
    media.views.playlistBrowserView = new media.prototypes.PlaylistBrowserView({
        el: $('#playlist_browser'),
        collection: media.collections.playlists,
        parent: this
    });

    // Load Initial List
    //
    // Since we are just using jquery to do this we need to manually
    // show and hide the page loading spinner image.
    //
    media.showLoadingSpinner();

    $.getJSON('api/list_dir/', function(data) {
        media.collections.files = new media.prototypes.Files();
        media.collections.currentPlaylist = new media.prototypes.Files();

        media.collections.currentPlaylist.on("add", function(file) {
            if (media.collections.currentPlaylist.indexOf(file) === 0) {
                media.views.playerControls.setSongToPlay(file);
            }
        });

        media.views['listView'] = new media.prototypes.ListView({
            el: $('div[role="main"]'),
            collection: media.collections.files,
            parent: this
        });

        media.collections.files.reset(data.files);

        media.views.currentMainView = media.views.listView;
        media.hideLoadingSpinner();
    });

});
