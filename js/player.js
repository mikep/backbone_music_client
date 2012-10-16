$(document).ready(function() {
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
