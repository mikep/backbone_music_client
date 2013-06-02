$(document).ready(function() {

    window.media = {};
    media.templates = {}
    media.prototypes = {};
    media.models = {};
    media.collections = {};
    media.views = {};
    media.views.playlist = {};
    media.settings = {};

    media.prototypes.File = Backbone.DeepModel.extend({
        urlRoot: 'api/list_dir/',
    });

    media.prototypes.ID3Tags = Backbone.DeepModel.extend({
        urlRoot: 'api/song_info/'
    });

    media.prototypes.Playlist = Backbone.DeepModel.extend({
        urlRoot: 'api/pl/'
    });

    media.prototypes.Playlists = Backbone.Collection.extend({
        model: media.prototypes.Playlist,
        url: 'api/pl/',
        comparator: function(model) {
            if (model.get('track_number')) {
                return model.get('track_number')[0];
            } else {
                return model.get('name');
            }
        },
        parse: function(response) {
            return response.playlists;
        }
    });

    media.prototypes.Files = Backbone.Collection.extend({
        model: media.prototypes.File,
        url: 'api/list_dir/',
        comparator: function(model) {
            if (model.get('track_number')) {
                return model.get('track_number');
            } else {
                return model.get('name');
            }
        }
    });

    media.prototypes.MenuBarView = Backbone.View.extend({
        template:  _.template($(menu_bar_template).html()),
        events: {
            'click #randomAlbumView': 'randomAlbum',
            'click .panels a': 'changePanel',
            'click #logout': 'logout'
        },
        initialize: function() {
            _.bindAll(this);
            this.render();
        },
        render: function() {
            this.$el.html(this.template());
        },
        randomAlbum: function() {
            // Scroll to the top first.
            //
            $('#file_browser').scrollTop(0);

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
                'libraryView': media.views.listView,
                'playlistView': media.views.playlistBrowserView
            };

            media.views.currentMainView.$el.fadeOut('fast');
            if (this.views.hasOwnProperty(e.target.id)) {
                this.views[e.target.id].$el.fadeIn('fast');
                media.views.currentMainView = this.views[e.target.id];

                if (media.views.currentMainView.hasOwnProperty('activate')) {
                    media.views.currentMainView.activate();
                }
            }

            $('.panels a').removeClass('active');
            $(e.target).addClass('active');
        },
        logout: function(e) {
            e.preventDefault();
            $.ajax({
                url: '/api/logout',
                type: 'POST',
                dataType: 'json',
                data: {},
                success:function (data) {
                    media.views.listView.collection.reset();
                    media.showLogin();
                }
            });
        }
    });

    media.prototypes.PlaylistBrowserView = Backbone.View.extend({
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
            var x = new media.prototypes.Playlist({
                model: playlistFile,
                parent: this,
            });
            this.$el.append(x.el);
        },
        activate: function() {
            // Actions to preform when view becomes active
            this.fetchInitialList();
        },
        fetchInitialList: function() {
            console.log('fetching list of playlists');
            this.collection.fetch();
        }
    });

    media.prototypes.Playlist = Backbone.View.extend({
        template: _.template($(playlist_row_template).html()),
        events: {
            'click a.list_row_item': 'click',
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
        },
        click: function(e) {
            var self = this;
            console.log(self.model.attributes);

            var el = this.model.id;
            console.log(el ,$('#' + el));
            this.model.fetch({
                success: function(data) {
                    self.model.set({
                        'files': new media.prototypes.Files(data.get('files'))
                    });
                    self.model.get('files').each(function (model, i) {
                        var x = new media.prototypes.PlaylistItemView({
                            model: model
                        });
                        $('#playlist').append(x.el);
                    });
                }
            });

            return false;
        }
    });

    media.prototypes.NowPlayingInfoView = Backbone.View.extend({
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
                this.model = new media.prototypes.ID3Tags();
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

    media.prototypes.PlayerControlsView = Backbone.View.extend({
        template: _.template($(player_controls_template).html()),
        events: {
            'click a.play': 'play',
            'click a.back': 'backward',
            'click a.stop': 'stop',
            'click a.forward': 'forward',
            'click a.volume': 'changeVolume',
            'click a.repeat': 'toggleRepeat',
            'click #mobile_playlist_toggle': 'toggleMobileView',
        },
        initialize: function() {
            _.bindAll(this);
            this.render();
            this.$el.find('#player').bind('ended', this.forward);
            this.$el.find('#player').bind('play', this.playing);
        },
        render: function() {
            this.$el.html(this.template());
        },
        toggleMobileView: function(el) {
            console.log(el);
            console.log($(el.targetElement));
            if ($('#file_browser:visible').length > 0) {
                $('#file_browser').fadeOut('fast', function() {
                    $('#playlist').appendTo('#right');
                    $('#right #playlist').fadeIn('fast');
                    $(el.target).text('Show File Browser');
                });
            } else {
                $('#playlist').fadeOut('fast', function() {
                    $('#file_browser').fadeIn('fast');
                    $(el.target).text('Show Playlist');
                });
            }
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
            var index = media.collections.currentPlaylist.indexOf(this.model);
            var next = media.collections.currentPlaylist.at(index + 1);
            // FIXME Add settings.
            //if (!media.settings.repeat) {
                media.collections.currentPlaylist.remove(this.model);
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
                    playerEl.attr('src', media.collections.currentPlaylist.at(0).get('path'));
                    this.model = media.collections.currentPlaylist.at(0);
                }
            } else if (playerEl.attr('src') !== "" && model) {
                playerEl.attr('src', model.get('path'));
                this.model = model;
            }
        },
        setID3Data: function() {
            console.log(this.model);
            media.views.nowPlaying.model = this.model.get('id3Data');
            // FIXME: This should be bound to model change in the view.
            media.views.nowPlaying.setModelBindings();
        },
        scrollTitle: function(title) {
            if (title) {
                document.title = title;
                clearTimeout(this.titleScrollTimeout);
            }
            document.title = document.title.substring(1)+document.title.substring(0,1);
            this.titleScrollTimeout = setTimeout(this.scrollTitle, 500);
        },
        playing: function(e) {
            this.setID3Data();
            var title = this.model.get('id3Data').get('artist') + ' - ' + this.model.get('id3Data').get('title');
            this.scrollTitle(title);
        },
        logger: function(e) {
            console.log(this);
            console.log(e);
            console.trace();
        }
    });

    media.prototypes.PlaylistItemView = Backbone.View.extend({
        template: _.template($(playlist_item_row_template).html()),
        events: {
            'click': 'removeFromPlaylist'
        },
        initialize: function() {
            _.bindAll(this);
            this.render();
            media.collections.currentPlaylist.add(this.model);

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
            if (this.model.id === media.views.playerControls.model.id) {
                media.views.playerControls.forward();
            }
            console.log('removing: ', this.model);
            media.collections.currentPlaylist.remove(this.model.id);
            this.undelegateEvents();
            this.remove();
        },
        fetchID3Data: function() {
            this.model.set({
                'id3Data': new media.prototypes.ID3Tags({id: this.model.id})
            });

            var self = this;
            this.model.get('id3Data').fetch({
                success: function() {
                    self.setModelBindings();
                }
            });
        }
    });

    media.prototypes.FileView = Backbone.View.extend({
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
                        return "icon-media";
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
            var x = new media.prototypes.PlaylistItemView({
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
                                'files': new media.prototypes.Files(data.get('files'))
                            });

                            var x = new media.prototypes.ListView({
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

    media.prototypes.ListView = Backbone.View.extend({
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
            var x = new media.prototypes.FileView({
                model: file,
                parent: this,
            });
            this.$el.append(x.el);
        }
    });

    media.prototypes.LoginView = Backbone.View.extend({
        template: _.template($(login_template).html()),
        events: {
            'click a.login': 'login'
        },
        initialize: function() {
            _.bindAll(this);
            this.render();
        },
        render: function () {
            this.$el.html(this.template());
        },
        login: function (event) {
            event.preventDefault();
            var formValues = {
                email: this.$el.find('input[name="email"]').val(),
                password: this.$el.find('input[name="password"]').val()
            };

            $.ajax({
                url: '/api/login',
                type:'POST',
                dataType:"json",
                data: formValues,
                success:function (data) {
                    console.log(["Login request details: ", data]);
                    media.loginView.$el.remove();
                    $('#login_lightbox').remove();
                    media.showLoadingSpinner();
                    media.fetchInitialList();
                },
                error: function (a,b,c) {
                    console.log(a,b,c);
                }
            });

        }
    });

    media.showLogin = function () {
        media.hideLoadingSpinner();

        console.log("in showLogin");
        img_pos_x = ($(document).width() / 2) - 103 + "px";
        img_style = " left:" + img_pos_x + ";";

        if ($('#login_lightbox').length === 0) {
            $("<div id='login_lightbox' class='lightbox'>").appendTo('body');
            $('#login_lightbox').append("<div id='login_container' style='"+img_style+"'>");
            $('#login_lightbox').width($(document).width()).height($(document).height());
            $('#login_lightbox').fadeIn('fast');
        }

        media.loginView = new media.prototypes.LoginView({
            el: $('#login_container'),
            parent: this
        });
    };

    media.fetchInitialList = function () {
        $.ajax({
            dataType: "json",
            url: "api/list_dir/",
            success: function(data) {
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
            },
            error: function(xhr, status, status_code) {
                if (xhr.status === 401) {
                    media.showLogin();
                }
            }
        });
    };

    media.showLoadingSpinner = function() {
        img_pos_x = ($(document).width() / 2) - 30 + "px";
        img_style = " left:" + img_pos_x + ";";

        if ($('#lightbox').length === 0) {
            $("<div id='lightbox' class='lightbox'>").appendTo('body');
            $('#lightbox').append("<img src='/img/spinner.gif' style='"+img_style+"' />");
            $('#lightbox').width($(document).width()).height($(document).height());
            $('#lightbox').fadeIn('fast');
        }
    };

    media.hideLoadingSpinner = function () {
        $('#lightbox').fadeOut('fast', function () {
            $('#lightbox').remove();
        });
    };

    media.error = function (xhr, error, error_status) {
        if (xhr.status === 401) {
            media.showLogin();
            return false;
        }

        if (response.status === 403) {
            console.log('not authorized');
            return false;
        }

        if (media.originalBackboneError) {
            media.originalBackboneError(model, response);
        };
    };
});
