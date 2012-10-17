$(document).ready(function() {

    // Init Views.
    music.views.playerControls = new music.prototypes.PlayerControlsView({
        el: $('#player_controls'),
        parent: this
    });

    // Load Initial List 
    $.getJSON('api/list_dir/', function(data) {
        music.collections.files = new music.prototypes.Files();
        music.collections.currentPlaylist = new music.prototypes.Files();

        music.views['listView'] = new music.prototypes.ListView({
            el: $('div[role="main"]'),
            collection: music.collections.files,
            parent: this
        });

        music.collections.files.reset(data.files);
    });

});
