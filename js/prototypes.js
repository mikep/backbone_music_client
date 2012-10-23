$(document).ready(function() {

    window.music = {};
    music.templates = {}
    music.prototypes = {};
    music.models = {};
    music.collections = {};
    music.views = {};
    music.views.playlist = {};
    music.settings = {};

    music.prototypes.File = Backbone.DeepModel.extend({
        urlRoot: 'api/list_dir/',
    });

    music.prototypes.ID3Tags = Backbone.DeepModel.extend({
        urlRoot: 'api/song_info/'
    });

    music.prototypes.Playlist = Backbone.DeepModel.extend({
        urlRoot: 'api/pl/'
    });

    music.prototypes.Playlists = Backbone.Collection.extend({
        model: music.prototypes.Playlist,
        url: 'api/pl/' ,
        comparator: function(model) {
            return model.get('name');
        },
        parse: function(response) {
            return response.playlists;
        }
    });

    music.prototypes.Files = Backbone.Collection.extend({
        model: music.prototypes.File,
        url: 'api/list_dir/',
        comparator: function(model) {
            return model.get('name');
        }
    });

    music.prototypes.MenuBarView = Backbone.View.extend({
        template:  _.template($(menu_bar_template).html()),
        events: {
            'click #randomAlbumView': 'randomAlbum',
            'click .panels a': 'changePanel'
        },
        initialize: function() {
            _.bindAll(this);
            this.render();
        },
        render: function() {
            this.$el.html(this.template());
        },
        randomAlbum: function() {
            var list = $('#file_browser > div');
            var random = Math.floor(Math.random()*list.length);

            $(list[random]).find('a').click();
            var pos = $(list[random]).position().top - 57; // Height of menubar
            var speed = 1000;
            if (pos < 1000) {
                speed = 500;
            }

            $('#file_browser').animate({scrollTop: pos}, speed);
        },
        changePanel: function(e) {
            this.views = {
                'libraryView': music.views.listView,
                'playlistView': music.views.playlistBrowserView
            };

            music.views.currentMainView.$el.fadeOut('fast');
            if (this.views.hasOwnProperty(e.target.id)) {
                this.views[e.target.id].$el.fadeIn('fast');
                music.views.currentMainView = this.views[e.target.id];
            }

            $('.panels a').removeClass('active');
            $(e.target).addClass('active');
        }
    });

    music.prototypes.PlaylistBrowserView = Backbone.View.extend({
        template: _.template($(list_template).html()),
        events: {
        },
        initialize: function() {
            _.bindAll(this);
            this.collection.bind('add', this.add, this);
            this.collection.bind('reset', this.render, this);
            this.render();
        },
        render: function() {
            this.$el.html(this.template());
            var self = this;
            this.collection.each(function(account){
                self.add(account);
            });
        },
        add: function(playlistFile) {
            var x = new music.prototypes.Playlist({
                model: playlistFile,
                parent: this,
            });
            this.$el.append(x.el);
        },
        fetchInitialList: function() {
            this.collection.fetch();
        }
    });

    music.prototypes.Playlist = Backbone.View.extend({
        template: _.template($(playlist_row_template).html()),
        events: {
        },
        initialize: function() {
            _.bindAll(this);
            this.render();
            this.modelBinder = new Backbone.ModelBinder();
            var bindings = Backbone.ModelBinder.createDefaultBindings(this.el, 'bind');
            bindings = _.extend(bindings, {
                directory: [
                    {
                        selector: '[bind=directory]',
                        elAttribute: 'text'
                    },
                ],
                file: [
                    {
                        selector: '[bind=file]',
                        elAttribute: 'text',
                    }
                ]
            });
            this.modelBinder.bind(this.model, this.el, bindings);
        },
        render: function() {
            this.$el.html(this.template());
        }
    });

    music.prototypes.NowPlayingInfoView = Backbone.View.extend({
        template: _.template($(now_playing_template).html()),
        events: {
        },
        initialize: function() {
            _.bindAll(this);
            this.render();
            this.setModelBindings();
        },
        setModelBindings: function() {
            if (!this.model) {
                this.model = new music.prototypes.ID3Tags();
            }

            this.modelBinder = new Backbone.ModelBinder();
            var bindings = Backbone.ModelBinder.createDefaultBindings(this.el, 'bind');
            bindings = _.extend(bindings, {
                image: [
                    {
                        selector: '#album_art',
                        elAttribute: 'src',
                        converter: function(direction, image) {
                            if (image && image !== '/album.jpg') {
                                return image;
                            } else {
                                return "img/album.jpg";
                            }
                        }
                    }
                ],
            });
            this.modelBinder.bind(this.model, this.el, bindings);

        },
        render: function() {
            this.$el.html(this.template());
        }
    });

    music.prototypes.PlayerControlsView = Backbone.View.extend({
        template: _.template($(player_controls_template).html()),
        events: {
            'click a.play': 'play',
            'click a.back': 'backward',
            'click a.stop': 'stop',
            'click a.forward': 'forward',
            'click a.volume': 'changeVolume',
            'click a.repeat': 'toggleRepeat',
        },
        initialize: function() {
            _.bindAll(this);
            this.render();
            this.$el.find('#player').bind('ended', this.forward);
            this.$el.find('#player').bind('play', this.setID3Data);
        },
        render: function() {
            this.$el.html(this.template());
        },
        play: function() {
            console.log('clicked play');
        },
        backward: function() {
            // Backwards button skips back 10 seconds
            $('#player')[0].currentTime = $('#player')[0].currentTime - 10;
        },
        stop: function() {
            console.log('clicked stop');
        },
        forward: function() {
            console.log('clicked forward');
            var index = music.collections.currentPlaylist.indexOf(this.model);
            var next = music.collections.currentPlaylist.at(index + 1);
            // FIXME Add settings.
            //if (!music.settings.repeat) {
                music.collections.currentPlaylist.remove(this.model);
                $('#' + this.model.id).remove();
            //}
            this.setSongToPlay(next);
        },
        changeVolume: function(e) {
            var volume = this.$el.find('#player')[0].volume;
            if (volume === 0) {
                if (!this.currentVolume) {
                    this.currentVolume = 1;
                };

                this.$el.find('#player')[0].volume = this.currentVolume;

                if (e.target.tagName === 'A') {
                    $(e.target).find('i').removeClass('icon-volume-off').addClass('icon-volume-up');
                } else {
                    $(e.target).removeClass('icon-volume-off').addClass('icon-volume-up');
                }
            } else {
                this.currentVolume = volume;

                this.$el.find('#player')[0].volume = 0;

                if (e.target.tagName === 'A') {
                    $(e.target).find('i').removeClass('icon-volume-up').addClass('icon-volume-off');
                } else {
                    $(e.target).removeClass('icon-volume-up').addClass('icon-volume-off');
                }
            }
            console.log('clicked changeVolume');
        },
        toggleRepeat: function() {
            console.log('clicked toggleRepeat');
        },
        setSongToPlay: function(model) {
            var playerEl = this.$el.find('#player');

            if (playerEl.attr('src') === "") {
                // If we aren't playing something, load the player with either the passed file
                // or the first item in the play list.

                if (model) {
                    playerEl.attr('src', model.get('path'));
                    this.model = model;
                } else {
                    playerEl.attr('src', music.collections.currentPlaylist.at(0).get('path'));
                    this.model = music.collections.currentPlaylist.at(0);
                }
            } else if (playerEl.attr('src') !== "" && model) {
                playerEl.attr('src', model.get('path'));
                this.model = model;
            }
        },
        setID3Data: function() {
            console.log(this.model);
            music.views.nowPlaying.model = this.model.get('id3Data');
            // FIXME: This should be bound to model change in the view.
            music.views.nowPlaying.setModelBindings();
        },
        logger: function(e) {
            console.log(this);
            console.log(e);
            console.trace();
        }
    });


    music.prototypes.PlaylistItemView = Backbone.View.extend({
        template: _.template($(playlist_item_row_template).html()),
        events: {
            'click': 'removeFromPlaylist'
        },
        initialize: function() {
            _.bindAll(this);
            this.render();
            music.collections.currentPlaylist.add(this.model);

            this.fetchID3Data();
        },
        setModelBindings: function() {
            this.modelBinder = new Backbone.ModelBinder();
            var bindings = Backbone.ModelBinder.createDefaultBindings(this.el, 'bind');
            bindings = _.extend(bindings, {
                id: [
                    {
                        selector: '[bind=id]',
                        elAttribute: 'id',
                    },
                ],
                id3Data: [
                    {
                        selector: '[bind=artist]',
                        elAttribute: 'text',
                        converter: function(direction, id3) {
                            return id3.get('artist')[0];
                        }
                    },
                    {
                        selector: '[bind=title]',
                        elAttribute: 'text',
                        converter: function(direction, id3) {
                            return id3.get('title')[0];
                        }
                    },
                ],
            });
            this.modelBinder.bind(this.model, this.el, bindings);
        },
        render: function() {
            this.$el.html(this.template());
        },
        removeFromPlaylist: function() {
            if (this.model.id === music.views.playerControls.model.id) {
                music.views.playerControls.forward();
            }
            console.log('removing: ', this.model);
            music.collections.currentPlaylist.remove(this.model.id);
            this.undelegateEvents();
            this.remove();
        },
        fetchID3Data: function() {
            this.model.set({
                'id3Data': new music.prototypes.ID3Tags({id: this.model.id})
            });

            var self = this;
            this.model.get('id3Data').fetch({
                success: function() {
                    self.setModelBindings();
                }
            });
        }
    });

    music.prototypes.FileView = Backbone.View.extend({
        template: _.template($(list_row_template).html()),
        events: {
            'click a.list_row_item': 'click',
            'click .addAlbumToPlaylist': 'addAlbumToPlaylist'
        },
        initialize: function() {
            _.bindAll(this);
            this.render();
            this.modelBinder = new Backbone.ModelBinder();
            var bindings = Backbone.ModelBinder.createDefaultBindings(this.el, 'bind');
            bindings = _.extend(bindings, {
                type: [
                {
                    selector: '[bind=type]',
                    elAttribute: 'class',
                    converter: function(direction, type) {
                    if (type === "directory") {
                        return "icon-folder-close";
                    } else {
                        return "icon-music";
                    }
                    }
                },
                {
                    selector: '[bind=name]',
                    elAttribute: 'text'
                },
                ],
                id: [
                {
                    selector: '[bind=id]',
                    elAttribute: 'id',
                }
                ]
            });
            this.modelBinder.bind(this.model, this.el, bindings);
        },
        render: function() {
            this.$el.html(this.template());
        },
        showAddAllIcon: function() {
            this.$el.find('.addAlbumToPlaylist:first').fadeIn('fast');
        },
        hideAddAllIcon: function() {
            this.$el.find('.addAlbumToPlaylist').fadeOut('fast');
        },
        addAlbumToPlaylist: function() {
            console.log(this.model);
            var self = this;
            this.model.get('files').each(function (model, i) {
                self.createPlaylistItem(model);
            });
            return false;
        },
        createPlaylistItem: function(fileModel) {
            var x = new music.prototypes.PlaylistItemView({
                model: fileModel
            });
            $('#playlist').append(x.el);
        },
        click: function(e) {
            console.log('you clicked ' + this.model.get('name'));
            var self = this;
            console.log(self.model.attributes);

            if (this.model.get('type') === "directory") {
                var el = this.model.id;
                console.log(el ,$('#' + el));
                if (this.model.get("open")) {
                    $('#' + el).slideUp('fast', function() {
                        $(this).html('');
                    })
                    this.model.unset('open');
                    this.$el.find('i[bind="type"]:first')
                        .removeClass('icon-folder-open')
                        .addClass('icon-folder-close');
                    self.hideAddAllIcon();
                } else {
                    this.model.fetch({
                        success: function(data) {
                            self.model.set({
                                'files': new music.prototypes.Files(data.get('files'))
                            });

                            var x = new music.prototypes.ListView({
                                collection: self.model.get('files'),
                                parent: self,
                                el: $('#' + el),
                            });
                            self.model.set('open', 1);
                            $('#' + el).slideDown();
                            self.showAddAllIcon();
                            self.$el.find('i[bind="type"]:first')
                                .removeClass('icon-folder-close')
                                .addClass('icon-folder-open');
                        }
                    });
                }
            } else {
                console.log("playAing song", this.model.get('path'));
                this.createPlaylistItem(this.model);
            }

            return false;
        }
    });

    music.prototypes.ListView = Backbone.View.extend({
        template: _.template($(list_template).html()),
        initialize: function() {
            _.bindAll(this);
            this.collection.bind('add', this.add, this);
            this.collection.bind('reset', this.render, this);
            this.render();
        },
        render: function() {
            this.$el.html(this.template());
            var self = this;
            this.collection.each(function(account){
                self.add(account);
            });
        },
        add: function(file) {
            var x = new music.prototypes.FileView({
                model: file,
                parent: this,
            });
            this.$el.append(x.el);
        }
    });
});
