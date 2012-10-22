$(document).ready(function() {

    // Init Views.
    music.views.playerControls = new music.prototypes.PlayerControlsView({
        el: $('#player_controls'),
        parent: this
    });

    music.views.nowPlaying = new music.prototypes.NowPlayingInfoView({
        el: $('#now_playing'),
        parent: this
    });

    music.views.menuBarView = new music.prototypes.MenuBarView({
        el: $('#menu_bar'),
        parent: this
    });

    // Load Initial List
    $.getJSON('api/list_dir/', function(data) {
        music.collections.files = new music.prototypes.Files();
        music.collections.currentPlaylist = new music.prototypes.Files();

        music.collections.currentPlaylist.on("add", function(file) {
            if (music.collections.currentPlaylist.indexOf(file) === 0) {
                music.views.playerControls.setSongToPlay(file);
            }
        });

        music.views['listView'] = new music.prototypes.ListView({
            el: $('div[role="main"]'),
            collection: music.collections.files,
            parent: this
        });

        music.collections.files.reset(data.files);

        music.views.currentMainView = music.views.listView;
    });

});
